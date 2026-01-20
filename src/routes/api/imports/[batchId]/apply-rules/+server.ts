import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { classifyTransaction } from '$lib/server/classify/classifier';
import { computeBatchSummary } from '$lib/server/imports/summary';
import type { MerchantRule, TransactionKind } from '$lib/types';
import type { ParsedRow } from '$lib/server/csv/parse';

export const POST: RequestHandler = async ({ params, locals }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		throw error(401, 'Unauthorized');
	}

	const { batchId } = params;

	// Verify batch belongs to user
	const { data: batch } = await locals.supabase
		.from('import_batches')
		.select('id')
		.eq('id', batchId)
		.eq('user_id', user.id)
		.single();

	if (!batch) {
		throw error(404, 'Batch not found');
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

	// Fetch all raw transactions for this batch
	const { data: rawRows } = await locals.supabase
		.from('raw_transactions')
		.select('*')
		.eq('batch_id', batchId);

	if (!rawRows || rawRows.length === 0) {
		return json({ ok: true, data: { updated: 0 } });
	}

	// Re-classify each row with the rules
	let updatedCount = 0;

	for (const raw of rawRows) {
		const parsedRow: ParsedRow = {
			rowIndex: raw.row_index,
			raw: raw.raw,
			parseStatus: raw.parse_status as 'ok' | 'error',
			parseError: raw.parse_error,
			dateRaw: raw.date_raw,
			dateChosen: raw.date_chosen,
			amountRaw: raw.amount_raw,
			amountSigned: raw.amount_signed,
			descriptionRaw: raw.description_raw,
			merchantRaw: raw.merchant_raw,
			merchantNorm: raw.merchant_norm
		};

		const classification = classifyTransaction(parsedRow, merchantRules);

		// Only update if classification changed
		if (
			classification.kind !== raw.kind ||
			classification.includedInSpend !== raw.included_in_spend ||
			classification.category !== raw.category
		) {
			await locals.supabase
				.from('raw_transactions')
				.update({
					kind: classification.kind,
					kind_reason: classification.kindReason,
					included_in_spend: classification.includedInSpend,
					category: classification.category
				})
				.eq('id', raw.id);

			// Clear any override for this row since the rule now handles it
			await locals.supabase
				.from('transaction_overrides')
				.delete()
				.eq('raw_transaction_id', raw.id);

			updatedCount++;
		}
	}

	// Recompute summary
	const { data: allRows } = await locals.supabase
		.from('raw_transactions')
		.select('id, parse_status, amount_signed, date_chosen, kind, included_in_spend, is_duplicate')
		.eq('batch_id', batchId);

	const summaryRows = (allRows || []).map((r) => ({
		parseStatus: r.parse_status as 'ok' | 'error',
		amountSigned: r.amount_signed,
		dateChosen: r.date_chosen,
		systemKind: r.kind as TransactionKind,
		systemIncludedInSpend: r.included_in_spend,
		effectiveKind: r.kind as TransactionKind,
		effectiveIncludedInSpend: r.included_in_spend,
		isDuplicate: r.is_duplicate
	}));

	const summary = computeBatchSummary(summaryRows);

	// Update batch summary
	await locals.supabase
		.from('import_batches')
		.update({
			rows_included: summary.rowsIncluded,
			rows_excluded: summary.rowsExcluded,
			rows_needs_review: summary.rowsNeedsReview,
			total_included_spend: summary.totalIncludedSpend,
			total_excluded_amount: summary.totalExcludedAmount
		})
		.eq('id', batchId);

	return json({
		ok: true,
		data: { updated: updatedCount, summary }
	});
};
