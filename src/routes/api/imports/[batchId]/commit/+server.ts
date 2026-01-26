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

	// Generate review inbox items in the background (don't block response)
	generateReviewInboxItems(locals.supabase, user.id).catch((e) => {
		console.error('Failed to generate review inbox items:', e);
	});

	// Update any matching source's last_uploaded_at
	updateSourceLastUpload(locals.supabase, user.id).catch((e) => {
		console.error('Failed to update source last upload:', e);
	});

	return json({
		ok: true,
		data: {
			committedCount,
			excludedCount,
			computeStatus: 'done'
		}
	});
};

// Generate review inbox items from committed transactions
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function generateReviewInboxItems(supabase: any, userId: string) {
	const itemsToCreate: Array<{
		user_id: string;
		item_type: string;
		transaction_id: string | null;
		data: Record<string, unknown>;
		priority: number;
	}> = [];

	// 1. Find uncategorized transactions
	const { data: uncategorized } = await supabase
		.from('transactions')
		.select('id, merchant, amount, date, category')
		.eq('user_id', userId)
		.eq('included_in_spend', true)
		.or('category.is.null,category.eq.Uncategorized')
		.order('date', { ascending: false })
		.limit(20);

	// Check which ones already have inbox items
	const uncategorizedIds = (uncategorized || []).map((t) => t.id);
	if (uncategorizedIds.length > 0) {
		const { data: existingUncategorized } = await supabase
			.from('review_inbox')
			.select('transaction_id')
			.eq('user_id', userId)
			.eq('item_type', 'uncategorized')
			.eq('status', 'pending')
			.in('transaction_id', uncategorizedIds);

		const existingSet = new Set((existingUncategorized || []).map((e) => e.transaction_id));

		for (const tx of uncategorized || []) {
			if (!existingSet.has(tx.id)) {
				itemsToCreate.push({
					user_id: userId,
					item_type: 'uncategorized',
					transaction_id: tx.id,
					data: {
						merchant: tx.merchant,
						amount: Math.abs(tx.amount),
						date: tx.date
					},
					priority: 60
				});
			}
		}
	}

	// 2. Find potential rule suggestions (merchants appearing 3+ times)
	const { data: merchantCounts } = await supabase
		.from('transactions')
		.select('merchant_norm, merchant, category')
		.eq('user_id', userId)
		.eq('included_in_spend', true)
		.not('merchant_norm', 'is', null);

	const merchantGroups = new Map<string, { merchant: string; category: string | null; count: number }>();
	for (const tx of merchantCounts || []) {
		if (!tx.merchant_norm) continue;
		const existing = merchantGroups.get(tx.merchant_norm);
		if (existing) {
			existing.count++;
		} else {
			merchantGroups.set(tx.merchant_norm, {
				merchant: tx.merchant || tx.merchant_norm,
				category: tx.category,
				count: 1
			});
		}
	}

	// Get existing rules
	const { data: existingRules } = await supabase
		.from('merchant_rules')
		.select('match_value')
		.eq('user_id', userId)
		.eq('match_field', 'merchant_norm');

	const existingRuleValues = new Set((existingRules || []).map((r) => r.match_value.toUpperCase()));

	for (const [merchantNorm, data] of merchantGroups) {
		if (
			data.count >= 3 &&
			!existingRuleValues.has(merchantNorm.toUpperCase()) &&
			data.category &&
			data.category !== 'Uncategorized'
		) {
			// Check if we already have this suggestion
			const { data: existingSuggestion } = await supabase
				.from('review_inbox')
				.select('id')
				.eq('user_id', userId)
				.eq('item_type', 'rule_suggestion')
				.eq('status', 'pending')
				.limit(1);

			// Only add a few rule suggestions at a time
			if ((existingSuggestion || []).length < 5) {
				itemsToCreate.push({
					user_id: userId,
					item_type: 'rule_suggestion',
					transaction_id: null,
					data: {
						merchant: data.merchant,
						suggestedRule: {
							matchType: 'contains',
							matchValue: merchantNorm,
							setCategory: data.category
						},
						similarCount: data.count
					},
					priority: 40
				});
			}
		}
	}

	// Insert items if any
	if (itemsToCreate.length > 0) {
		await supabase.from('review_inbox').insert(itemsToCreate.slice(0, 20)); // Limit to 20
	}
}

// Update the source's last_uploaded_at timestamp
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function updateSourceLastUpload(supabase: any, userId: string) {
	// Simply update all enabled sources to current time
	// In a more sophisticated version, you'd match by source name
	await supabase
		.from('user_sources')
		.update({ last_uploaded_at: new Date().toISOString() })
		.eq('user_id', userId)
		.eq('enabled', true);
}
