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
				monthlyIncome: null,
				onboardingCompleted: false,
				philosophyPreset: 'comfortable_saver'
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
			monthlyIncome: prefs.monthly_income,
			onboardingCompleted: prefs.onboarding_completed ?? false,
			philosophyPreset: prefs.philosophy_preset ?? 'comfortable_saver'
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
		monthlyIncome,
		onboardingCompleted,
		philosophyPreset
	} = body;

	// Validate custom ticker format (1-5 uppercase letters)
	if (customTicker !== undefined && customTicker && !/^[A-Z]{1,5}$/.test(customTicker.toUpperCase())) {
		throw error(400, 'Invalid ticker symbol. Use 1-5 letters (e.g., AAPL, MSFT).');
	}

	// Validate fallback rate (between 0% and 50%)
	if (fallbackAnnualReturn !== undefined && (fallbackAnnualReturn < 0 || fallbackAnnualReturn > 0.5)) {
		throw error(400, 'Fallback rate must be between 0% and 50%.');
	}

	// Build update data - only include fields that were explicitly provided
	// This prevents overwriting existing settings when only updating one field (like onboardingCompleted)
	const updateData: Record<string, unknown> = {
		user_id: user.id
	};
	
	if (defaultTicker !== undefined) {
		updateData.default_ticker = defaultTicker;
	}
	if (customTicker !== undefined) {
		updateData.custom_ticker = customTicker ? customTicker.toUpperCase() : null;
	}
	if (investDelayTradingDays !== undefined) {
		updateData.invest_delay_trading_days = investDelayTradingDays;
	}
	if (allowFallbackForAllTickers !== undefined) {
		updateData.allow_fallback_for_all_tickers = allowFallbackForAllTickers;
	}
	if (fallbackAnnualReturn !== undefined) {
		updateData.fallback_annual_return = fallbackAnnualReturn;
	}
	if (monthlyIncome !== undefined) {
		updateData.monthly_income = monthlyIncome || null;
	}
	if (onboardingCompleted !== undefined) {
		updateData.onboarding_completed = onboardingCompleted;
	}
	if (philosophyPreset !== undefined) {
		// Validate philosophy preset
		const validPresets = ['comfortable_saver', 'aggressive_builder', 'debt_first', 'family_budget'];
		if (!validPresets.includes(philosophyPreset)) {
			throw error(400, 'Invalid philosophy preset');
		}
		updateData.philosophy_preset = philosophyPreset;
	}
	
	const { error: upsertError } = await locals.supabase.from('user_prefs').upsert(updateData)

	if (upsertError) {
		console.error('Settings upsert error:', upsertError);
		throw error(500, 'Failed to update settings');
	}

	return json({
		ok: true,
		data: { updated: true }
	});
};
