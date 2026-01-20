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
				investDelayTradingDays: 1,
				allowFallbackForAllTickers: false
			}
		});
	}

	return json({
		ok: true,
		data: {
			defaultTicker: prefs.default_ticker,
			investDelayTradingDays: prefs.invest_delay_trading_days,
			allowFallbackForAllTickers: prefs.allow_fallback_for_all_tickers
		}
	});
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		throw error(401, 'Unauthorized');
	}

	const body = await request.json();
	const { defaultTicker, investDelayTradingDays, allowFallbackForAllTickers } = body;

	// Upsert user prefs
	const { error: upsertError } = await locals.supabase.from('user_prefs').upsert({
		user_id: user.id,
		default_ticker: defaultTicker ?? 'SPY',
		invest_delay_trading_days: investDelayTradingDays ?? 1,
		allow_fallback_for_all_tickers: allowFallbackForAllTickers ?? false
	});

	if (upsertError) {
		throw error(500, 'Failed to update settings');
	}

	return json({
		ok: true,
		data: { updated: true }
	});
};
