import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { computeBatchSummary } from '$lib/server/imports/summary';
import type { RawRowEffective, TransactionKind, PreviewTab, SortOption } from '$lib/types';

// v2: Filter by effective values after overrides

export const GET: RequestHandler = async ({ params, url, locals }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		throw error(401, 'Unauthorized');
	}

	const { batchId } = params;
	const tab = (url.searchParams.get('tab') || 'included') as PreviewTab;
	const q = url.searchParams.get('q') || '';
	const page = parseInt(url.searchParams.get('page') || '1');
	const pageSize = parseInt(url.searchParams.get('pageSize') || '50');
	const sort = (url.searchParams.get('sort') || 'date_desc') as SortOption;

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

	// Fetch ALL raw transactions for this batch (we'll filter by effective values in JS)
	const { data: rawRows, error: fetchError } = await locals.supabase
		.from('raw_transactions')
		.select(
			`
			id,
			row_index,
			date_chosen,
			amount_signed,
			merchant_raw,
			merchant_norm,
			description_raw,
			kind,
			kind_reason,
			included_in_spend,
			category,
			parse_status,
			parse_error,
			is_duplicate,
			duplicate_of
		`
		)
		.eq('batch_id', batchId)
		.order('date_chosen', { ascending: false, nullsFirst: false });

	if (fetchError) {
		throw error(500, 'Failed to fetch rows');
	}

	// Fetch ALL overrides for this batch's rows
	const allRowIds = (rawRows || []).map((r) => r.id);
	const { data: overrides } = await locals.supabase
		.from('transaction_overrides')
		.select('raw_transaction_id, override_kind, override_included_in_spend, override_category')
		.in('raw_transaction_id', allRowIds);

	const overrideMap = new Map(
		(overrides || []).map((o) => [o.raw_transaction_id, o])
	);

	// Map ALL rows to effective rows
	const allEffectiveRows: RawRowEffective[] = (rawRows || []).map((r) => {
		const override = overrideMap.get(r.id);

		return {
			id: r.id,
			rowIndex: r.row_index,
			dateChosen: r.date_chosen,
			amountSigned: r.amount_signed,
			merchantRaw: r.merchant_raw,
			merchantNorm: r.merchant_norm,
			descriptionRaw: r.description_raw,

			systemKind: r.kind as TransactionKind,
			systemIncludedInSpend: r.included_in_spend,
			systemCategory: r.category,
			systemReason: r.kind_reason,

			effectiveKind: (override?.override_kind ?? r.kind) as TransactionKind,
			effectiveIncludedInSpend: override?.override_included_in_spend ?? r.included_in_spend,
			effectiveCategory: override?.override_category ?? r.category,

			parseStatus: r.parse_status as 'ok' | 'error',
			parseError: r.parse_error,

			isDuplicate: r.is_duplicate,
			duplicateOf: r.duplicate_of
		};
	});

	// Filter by tab based on EFFECTIVE values
	let filteredRows = allEffectiveRows.filter((row) => {
		switch (tab) {
			case 'included':
				return row.effectiveIncludedInSpend && !row.isDuplicate;
			case 'excluded':
				return !row.effectiveIncludedInSpend && !row.isDuplicate && row.effectiveKind !== 'unknown' && row.parseStatus !== 'error';
			case 'needs_review':
				return !row.isDuplicate && (row.parseStatus === 'error' || row.effectiveKind === 'unknown');
			case 'duplicates':
				return row.isDuplicate;
			default:
				return true;
		}
	});

	// Apply search filter
	if (q) {
		const searchLower = q.toLowerCase();
		filteredRows = filteredRows.filter((row) =>
			(row.merchantNorm?.toLowerCase().includes(searchLower)) ||
			(row.descriptionRaw?.toLowerCase().includes(searchLower))
		);
	}

	// Apply sort
	filteredRows.sort((a, b) => {
		switch (sort) {
			case 'date_desc':
				return (b.dateChosen || '').localeCompare(a.dateChosen || '');
			case 'date_asc':
				return (a.dateChosen || '').localeCompare(b.dateChosen || '');
			case 'amount_desc':
				return (a.amountSigned || 0) - (b.amountSigned || 0); // More negative = higher spend
			case 'amount_asc':
				return (b.amountSigned || 0) - (a.amountSigned || 0);
			default:
				return 0;
		}
	});

	// Get total count AFTER filtering
	const totalRows = filteredRows.length;

	// Apply pagination
	const offset = (page - 1) * pageSize;
	const paginatedRows = filteredRows.slice(offset, offset + pageSize);

	// Compute fresh summary from all effective rows
	const summaryRows = allEffectiveRows.map((r) => ({
		parseStatus: r.parseStatus,
		amountSigned: r.amountSigned,
		dateChosen: r.dateChosen,
		systemKind: r.systemKind,
		systemIncludedInSpend: r.systemIncludedInSpend,
		effectiveKind: r.effectiveKind,
		effectiveIncludedInSpend: r.effectiveIncludedInSpend,
		isDuplicate: r.isDuplicate
	}));

	const summary = computeBatchSummary(summaryRows);

	return json({
		ok: true,
		data: {
			rows: paginatedRows,
			page,
			pageSize,
			totalRows,
			summary
		}
	});
};
