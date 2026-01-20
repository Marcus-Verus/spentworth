import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createPriceService } from '$lib/server/prices/priceService';
import { parseISO } from 'date-fns';

// Recalculate opportunity costs with real stock prices
export const POST: RequestHandler = async ({ request, locals }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		throw error(401, 'Unauthorized');
	}

	// Get user preferences
	const { data: prefs } = await locals.supabase
		.from('user_prefs')
		.select('*')
		.eq('user_id', user.id)
		.single();

	const ticker = prefs?.default_ticker || 'SPY';
	const delayDays = prefs?.invest_delay_trading_days ?? 1;

	const priceService = createPriceService(locals.supabase);

	// Pre-load all prices for the ticker (single API call!)
	console.log(`Loading prices for ${ticker}...`);
	const pricesLoaded = await priceService.ensurePricesLoaded(ticker);

	if (!pricesLoaded) {
		return json({
			ok: false,
			error: 'Failed to fetch price data. API may be rate limited - try again in a minute.'
		});
	}

	// Fetch all committed transactions
	const { data: transactions, error: fetchError } = await locals.supabase
		.from('transactions')
		.select('id, date, amount, ticker_symbol, calc_method')
		.eq('user_id', user.id)
		.eq('included_in_spend', true);

	if (fetchError) {
		throw error(500, `Failed to fetch transactions: ${fetchError.message}`);
	}

	if (!transactions || transactions.length === 0) {
		return json({
			ok: true,
			data: { updated: 0, message: 'No transactions to recalculate' }
		});
	}

	// Recalculate each transaction
	let updated = 0;
	let usingRealPrices = 0;
	let usingFallback = 0;

	// Process in batches
	const batchSize = 50;
	for (let i = 0; i < transactions.length; i += batchSize) {
		const batch = transactions.slice(i, i + batchSize);
		const updates = [];

		for (const tx of batch) {
			const purchaseDate = parseISO(tx.date);

			const result = await priceService.calculateOpportunityCost(
				tx.amount,
				purchaseDate,
				ticker,
				delayDays
			);

			updates.push({
				id: tx.id,
				invest_date: result.investDate,
				ticker_symbol: ticker,
				future_value: result.futureValue,
				growth_delta: result.growthDelta,
				calc_method: result.calcMethod,
				calc_error: result.calcError
			});

			if (result.calcMethod === 'adj_close_ratio') {
				usingRealPrices++;
			} else {
				usingFallback++;
			}
		}

		// Update in database
		for (const update of updates) {
			const { error: updateError } = await locals.supabase
				.from('transactions')
				.update({
					invest_date: update.invest_date,
					ticker_symbol: update.ticker_symbol,
					future_value: update.future_value,
					growth_delta: update.growth_delta,
					calc_method: update.calc_method,
					calc_error: update.calc_error
				})
				.eq('id', update.id);

			if (!updateError) {
				updated++;
			}
		}
	}

	return json({
		ok: true,
		data: {
			updated,
			usingRealPrices,
			usingFallback,
			ticker,
			message: usingRealPrices > 0
				? `Recalculated ${updated} transactions using ${ticker} prices`
				: `Recalculated ${updated} transactions (using 7% fallback - price data unavailable)`
		}
	});
};
