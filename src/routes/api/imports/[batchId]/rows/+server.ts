import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { computeBatchSummary } from '$lib/server/imports/summary';
import type { RawRowEffective, TransactionKind, PreviewTab, SortOption } from '$lib/types';

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

	// Fetch raw transactions with overrides
	let query = locals.supabase
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
		.eq('batch_id', batchId);

	// Apply tab filter
	switch (tab) {
		case 'included':
			query = query.eq('included_in_spend', true).eq('is_duplicate', false);
			break;
		case 'excluded':
			query = query.eq('included_in_spend', false).eq('is_duplicate', false).neq('kind', 'unknown');
			break;
		case 'needs_review':
			query = query.or('parse_status.eq.error,kind.eq.unknown').eq('is_duplicate', false);
			break;
		case 'duplicates':
			query = query.eq('is_duplicate', true);
			break;
	}

	// Apply search
	if (q) {
		query = query.or(`merchant_norm.ilike.%${q}%,description_raw.ilike.%${q}%`);
	}

	// Apply sort
	switch (sort) {
		case 'date_desc':
			query = query.order('date_chosen', { ascending: false, nullsFirst: false });
			break;
		case 'date_asc':
			query = query.order('date_chosen', { ascending: true, nullsFirst: true });
			break;
		case 'amount_desc':
			query = query.order('amount_signed', { ascending: true }); // More negative = higher spend
			break;
		case 'amount_asc':
			query = query.order('amount_signed', { ascending: false });
			break;
	}

	// Count total before pagination
	const { count } = await locals.supabase
		.from('raw_transactions')
		.select('id', { count: 'exact', head: true })
		.eq('batch_id', batchId);

	// Apply pagination
	const offset = (page - 1) * pageSize;
	query = query.range(offset, offset + pageSize - 1);

	const { data: rawRows, error: fetchError } = await query;

	if (fetchError) {
		throw error(500, 'Failed to fetch rows');
	}

	// Fetch overrides for these rows
	const rowIds = (rawRows || []).map((r) => r.id);
	const { data: overrides } = await locals.supabase
		.from('transaction_overrides')
		.select('raw_transaction_id, override_kind, override_included_in_spend, override_category')
		.in('raw_transaction_id', rowIds);

	const overrideMap = new Map(
		(overrides || []).map((o) => [o.raw_transaction_id, o])
	);

	// Map to effective rows
	const rows: RawRowEffective[] = (rawRows || []).map((r) => {
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

	// Compute fresh summary
	const { data: allRows } = await locals.supabase
		.from('raw_transactions')
		.select('id, parse_status, amount_signed, date_chosen, kind, included_in_spend, is_duplicate')
		.eq('batch_id', batchId);

	const { data: allOverrides } = await locals.supabase
		.from('transaction_overrides')
		.select('raw_transaction_id, override_kind, override_included_in_spend')
		.in(
			'raw_transaction_id',
			(allRows || []).map((r) => r.id)
		);

	const allOverrideMap = new Map(
		(allOverrides || []).map((o) => [o.raw_transaction_id, o])
	);

	const summaryRows = (allRows || []).map((r) => {
		const override = allOverrideMap.get(r.id);
		return {
			parseStatus: r.parse_status as 'ok' | 'error',
			amountSigned: r.amount_signed,
			dateChosen: r.date_chosen,
			systemKind: r.kind as TransactionKind,
			systemIncludedInSpend: r.included_in_spend,
			effectiveKind: (override?.override_kind ?? r.kind) as TransactionKind,
			effectiveIncludedInSpend: override?.override_included_in_spend ?? r.included_in_spend,
			isDuplicate: r.is_duplicate
		};
	});

	const summary = computeBatchSummary(summaryRows);

	return json({
		ok: true,
		data: {
			rows,
			page,
			pageSize,
			totalRows: count || 0,
			summary
		}
	});
};
