import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { parseCSV } from '$lib/server/csv/parse';
import { classifyBatch } from '$lib/server/classify/classifier';
import { detectDuplicatesInBatch } from '$lib/server/dedupe/dedupe';
import { computeBatchSummary } from '$lib/server/imports/summary';
import { canCreateImport } from '$lib/server/tierLimits';
import type { MerchantRule, TransactionKind } from '$lib/types';

export const POST: RequestHandler = async ({ request, locals }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		throw error(401, 'Unauthorized');
	}

	try {
		// Check tier limit for imports
		const importCheck = await canCreateImport(locals.supabase, user.id);
		if (!importCheck.allowed) {
			throw error(403, importCheck.message || 'Import limit reached');
		}

		const formData = await request.formData();
		const file = formData.get('file') as File | null;
		const sourceName = formData.get('sourceName') as string | null;

		if (!file) {
			throw error(400, 'No file provided');
		}

		// Validate file type
		if (!file.name.endsWith('.csv')) {
			throw error(400, 'File must be a CSV');
		}

		// Read file content
		const csvContent = await file.text();

		// Parse CSV
		const { rows: parsedRows, headers } = parseCSV(csvContent);

		if (parsedRows.length === 0) {
			throw error(400, 'CSV file is empty or could not be parsed');
		}

		// Fetch user's merchant rules
		const { data: rules } = await locals.supabase
			.from('merchant_rules')
			.select('*')
			.eq('user_id', user.id)
			.eq('enabled', true)
			.order('priority', { ascending: true });

		const merchantRules: MerchantRule[] = (rules || []).map((r) => ({
			id: r.id,
			userId: r.user_id,
			matchType: r.match_type,
			matchValue: r.match_value,
			matchField: r.match_field,
			actionExclude: r.action_exclude,
			setKind: r.set_kind,
			setCategory: r.set_category,
			priority: r.priority,
			enabled: r.enabled,
			createdAt: r.created_at
		}));

		// Classify transactions
		const classifications = classifyBatch(parsedRows, merchantRules);

		// Detect duplicates within batch
		const duplicates = detectDuplicatesInBatch(parsedRows, user.id);

		// Create import batch
		const { data: batch, error: batchError } = await locals.supabase
			.from('import_batches')
			.insert({
				user_id: user.id,
				source_name: sourceName || 'CSV Import',
				original_filename: file.name,
				status: 'parsed',
				rows_total: parsedRows.length
			})
			.select()
			.single();

		if (batchError || !batch) {
			throw error(500, 'Failed to create import batch');
		}

		// Insert raw transactions
		const rawTransactions = parsedRows.map((row, index) => {
			const classification = classifications[index];
			const dedupe = duplicates.get(index) || { isDuplicate: false, duplicateOf: null };

			return {
				batch_id: batch.id,
				user_id: user.id,
				row_index: row.rowIndex,
				raw: row.raw,
				parse_status: row.parseStatus,
				parse_error: row.parseError,
				date_raw: row.dateRaw,
				date_chosen: row.dateChosen,
				amount_raw: row.amountRaw,
				amount_signed: row.amountSigned,
				description_raw: row.descriptionRaw,
				merchant_raw: row.merchantRaw,
				merchant_norm: row.merchantNorm,
				kind: dedupe.isDuplicate ? 'duplicate' : classification.kind,
				kind_reason: dedupe.isDuplicate ? 'Duplicate detected' : classification.kindReason,
				included_in_spend: dedupe.isDuplicate ? false : classification.includedInSpend,
				category: classification.category,
				is_duplicate: dedupe.isDuplicate,
				duplicate_of: dedupe.duplicateOf
			};
		});

		const { error: insertError } = await locals.supabase
			.from('raw_transactions')
			.insert(rawTransactions);

		if (insertError) {
			// Clean up batch on failure
			await locals.supabase.from('import_batches').delete().eq('id', batch.id);
			throw error(500, 'Failed to insert transactions');
		}

		// Compute summary
		const summaryRows = parsedRows.map((row, index) => {
			const classification = classifications[index];
			const dedupe = duplicates.get(index) || { isDuplicate: false, duplicateOf: null };

			return {
				parseStatus: row.parseStatus,
				amountSigned: row.amountSigned,
				dateChosen: row.dateChosen,
				systemKind: classification.kind as TransactionKind,
				systemIncludedInSpend: classification.includedInSpend,
				effectiveKind: (dedupe.isDuplicate ? 'duplicate' : classification.kind) as TransactionKind,
				effectiveIncludedInSpend: dedupe.isDuplicate ? false : classification.includedInSpend,
				isDuplicate: dedupe.isDuplicate
			};
		});

		const summary = computeBatchSummary(summaryRows);

		// Update batch with summary
		await locals.supabase
			.from('import_batches')
			.update({
				rows_included: summary.rowsIncluded,
				rows_excluded: summary.rowsExcluded,
				rows_needs_review: summary.rowsNeedsReview,
				rows_duplicates: summary.rowsDuplicates,
				total_included_spend: summary.totalIncludedSpend,
				total_excluded_amount: summary.totalExcludedAmount,
				date_min: summary.dateMin,
				date_max: summary.dateMax
			})
			.eq('id', batch.id);

		return json({
			ok: true,
			data: {
				batchId: batch.id,
				summary
			}
		});
	} catch (err) {
		console.error('Import error:', err);
		if (err instanceof Error && 'status' in err) {
			throw err;
		}
		throw error(500, 'Import failed');
	}
};
