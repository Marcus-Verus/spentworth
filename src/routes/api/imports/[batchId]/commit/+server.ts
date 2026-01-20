import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { parseISO, format, addBusinessDays } from 'date-fns';
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

	// Prepare transactions to commit
	const transactionsToCommit = [];
	let committedCount = 0;
	let excludedCount = 0;

	const today = new Date();
	const ANNUAL_RETURN = 0.07; // 7% fallback return

	for (const raw of rawRows) {
		const override = overrideMap.get(raw.id);

		const effectiveKind = (override?.override_kind ?? raw.kind) as TransactionKind;
		const effectiveIncluded = override?.override_included_in_spend ?? raw.included_in_spend;
		const effectiveCategory = override?.override_category ?? raw.category;

		// Skip if not included (respects user overrides for duplicates too)
		if (!effectiveIncluded) {
			excludedCount++;
			continue;
		}

		// Skip parse errors unless user explicitly included
		if (raw.parse_status === 'error' && !override?.override_included_in_spend) {
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

		// Calculate invest date (add delay days)
		const investDate = addBusinessDays(purchaseDate, delayDays);
		const investDateStr = format(investDate, 'yyyy-MM-dd');

		// Use 7% annual return fallback (avoids API timeout)
		// Real price calculation can be done later via a separate "recalculate" action
		const years = (today.getTime() - investDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
		const futureValue = amount * Math.pow(1 + ANNUAL_RETURN, Math.max(0, years));
		const growthDelta = futureValue - amount;

		transactionsToCommit.push({
			user_id: user.id,
			batch_id: batchId,
			date: raw.date_chosen,
			invest_date: investDateStr,
			amount: amount,
			direction: raw.amount_signed < 0 ? 'debit' : 'credit',
			merchant: raw.merchant_raw,
			merchant_norm: raw.merchant_norm,
			description: raw.description_raw,
			kind: effectiveKind,
			category: effectiveCategory,
			included_in_spend: effectiveIncluded,
			ticker_symbol: ticker,
			future_value: Math.round(futureValue * 100) / 100,
			growth_delta: Math.round(growthDelta * 100) / 100,
			calc_method: 'fallback_7pct',
			calc_error: null
		});

		committedCount++;
	}

	// Insert committed transactions in batches to avoid timeout
	if (transactionsToCommit.length > 0) {
		// Insert in chunks of 50
		const chunkSize = 50;
		for (let i = 0; i < transactionsToCommit.length; i += chunkSize) {
			const chunk = transactionsToCommit.slice(i, i + chunkSize);
			const { error: insertError } = await locals.supabase
				.from('transactions')
				.insert(chunk);

			if (insertError) {
				console.error('Commit error:', insertError);
				throw error(500, `Failed to commit transactions: ${insertError.message}`);
			}
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
