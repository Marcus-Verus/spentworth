import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		throw error(401, 'Unauthorized');
	}

	const { data: prefs } = await locals.supabase
		.from('user_prefs')
		.select('*')
		.eq('user_id', user.id)
		.single();

	// If no prefs exist, return defaults
	if (!prefs) {
		return json({
			ok: true,
			data: {
				defaultTicker: 'SPY',
				customTicker: null,
				investDelayTradingDays: 1,
				allowFallbackForAllTickers: false,
				fallbackAnnualReturn: 0.07,
				monthlyIncome: null
			}
		});
	}

	return json({
		ok: true,
		data: {
			defaultTicker: prefs.default_ticker,
			customTicker: prefs.custom_ticker || null,
			investDelayTradingDays: prefs.invest_delay_trading_days,
			allowFallbackForAllTickers: prefs.allow_fallback_for_all_tickers,
			fallbackAnnualReturn: prefs.fallback_annual_return ?? 0.07,
			monthlyIncome: prefs.monthly_income
		}
	});
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		throw error(401, 'Unauthorized');
	}

	const body = await request.json();
	const { 
		defaultTicker, 
		customTicker, 
		investDelayTradingDays, 
		allowFallbackForAllTickers, 
		fallbackAnnualReturn,
		monthlyIncome 
	} = body;

	// Validate custom ticker format (1-5 uppercase letters)
	if (customTicker && !/^[A-Z]{1,5}$/.test(customTicker.toUpperCase())) {
		throw error(400, 'Invalid ticker symbol. Use 1-5 letters (e.g., AAPL, MSFT).');
	}

	// Validate fallback rate (between 0% and 50%)
	const fallbackRate = fallbackAnnualReturn ?? 0.07;
	if (fallbackRate < 0 || fallbackRate > 0.5) {
		throw error(400, 'Fallback rate must be between 0% and 50%.');
	}

	// Upsert user prefs
	const { error: upsertError } = await locals.supabase.from('user_prefs').upsert({
		user_id: user.id,
		default_ticker: defaultTicker ?? 'SPY',
		custom_ticker: customTicker ? customTicker.toUpperCase() : null,
		invest_delay_trading_days: investDelayTradingDays ?? 1,
		allow_fallback_for_all_tickers: allowFallbackForAllTickers ?? false,
		fallback_annual_return: fallbackRate,
		monthly_income: monthlyIncome || null
	});

	if (upsertError) {
		throw error(500, 'Failed to update settings');
	}

	return json({
		ok: true,
		data: { updated: true }
	});
};
