import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createPriceService } from '$lib/server/prices/priceService';
import { parseISO, addDays } from 'date-fns';
import type { TransactionKind } from '$lib/types';

export const POST: RequestHandler = async ({ params, request, locals }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		throw error(401, 'Unauthorized');
	}

	const { batchId } = params;

	// Verify batch belongs to user and is not already committed
	const { data: batch } = await locals.supabase
		.from('import_batches')
		.select('id, status')
		.eq('id', batchId)
		.eq('user_id', user.id)
		.single();

	if (!batch) {
		throw error(404, 'Batch not found');
	}

	if (batch.status === 'committed') {
		throw error(400, 'Batch already committed');
	}

	const body = await request.json().catch(() => ({}));
	const requestedTicker = body.ticker as string | undefined;

	// Get user preferences
	const { data: prefs } = await locals.supabase
		.from('user_prefs')
		.select('*')
		.eq('user_id', user.id)
		.single();

	const ticker = requestedTicker || prefs?.default_ticker || 'SPY';
	const delayDays = prefs?.invest_delay_trading_days ?? 1;
	const allowFallback = prefs?.allow_fallback_for_all_tickers ?? false;

	// Fetch all raw transactions with effective values
	const { data: rawRows } = await locals.supabase
		.from('raw_transactions')
		.select('*')
		.eq('batch_id', batchId);

	if (!rawRows || rawRows.length === 0) {
		throw error(400, 'No transactions to commit');
	}

	// Fetch overrides
	const rowIds = rawRows.map((r) => r.id);
	const { data: overrides } = await locals.supabase
		.from('transaction_overrides')
		.select('*')
		.in('raw_transaction_id', rowIds);

	const overrideMap = new Map((overrides || []).map((o) => [o.raw_transaction_id, o]));

	// Initialize price service
	const priceService = createPriceService(locals.supabase);

	// Prepare transactions to commit
	const transactionsToCommit = [];
	let committedCount = 0;
	let excludedCount = 0;

	for (const raw of rawRows) {
		const override = overrideMap.get(raw.id);

		const effectiveKind = (override?.override_kind ?? raw.kind) as TransactionKind;
		const effectiveIncluded = override?.override_included_in_spend ?? raw.included_in_spend;
		const effectiveCategory = override?.override_category ?? raw.category;

		// Skip duplicates
		if (raw.is_duplicate) {
			excludedCount++;
			continue;
		}

		// Skip parse errors
		if (raw.parse_status === 'error') {
			excludedCount++;
			continue;
		}

		// Only commit purchases and refunds
		if (effectiveKind !== 'purchase' && effectiveKind !== 'refund') {
			excludedCount++;
			continue;
		}

		// Skip if no valid date or amount
		if (!raw.date_chosen || raw.amount_signed === null) {
			excludedCount++;
			continue;
		}

		const purchaseDate = parseISO(raw.date_chosen);
		const amount = Math.abs(raw.amount_signed);

		// Calculate opportunity cost
		const costResult = await priceService.calculateOpportunityCost(
			amount,
			purchaseDate,
			ticker,
			delayDays,
			allowFallback
		);

		transactionsToCommit.push({
			user_id: user.id,
			batch_id: batchId,
			date: raw.date_chosen,
			invest_date: costResult.investDate,
			amount: amount,
			direction: raw.amount_signed < 0 ? 'debit' : 'credit',
			merchant: raw.merchant_raw,
			merchant_norm: raw.merchant_norm,
			description: raw.description_raw,
			kind: effectiveKind,
			category: effectiveCategory,
			included_in_spend: effectiveIncluded,
			ticker_symbol: ticker,
			future_value: costResult.futureValue,
			growth_delta: costResult.growthDelta,
			calc_method: costResult.calcMethod,
			calc_error: costResult.calcError
		});

		committedCount++;
	}

	// Insert committed transactions
	if (transactionsToCommit.length > 0) {
		const { error: insertError } = await locals.supabase
			.from('transactions')
			.insert(transactionsToCommit);

		if (insertError) {
			console.error('Commit error:', insertError);
			throw error(500, 'Failed to commit transactions');
		}
	}

	// Update batch status
	await locals.supabase
		.from('import_batches')
		.update({ status: 'committed' })
		.eq('id', batchId);

	return json({
		ok: true,
		data: {
			committedCount,
			excludedCount,
			computeStatus: 'done'
		}
	});
};
