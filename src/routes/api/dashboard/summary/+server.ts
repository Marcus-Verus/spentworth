import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { DashboardSummary, CategorySummary } from '$lib/types';

export const GET: RequestHandler = async ({ url, locals }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		throw error(401, 'Unauthorized');
	}

	const from = url.searchParams.get('from');
	const to = url.searchParams.get('to');

	// Get user preferences
	const { data: prefs } = await locals.supabase
		.from('user_prefs')
		.select('default_ticker')
		.eq('user_id', user.id)
		.single();

	const ticker = prefs?.default_ticker || 'SPY';

	// Build query for included purchases
	let query = locals.supabase
		.from('transactions')
		.select('id, date, amount, future_value, growth_delta, category, calc_method, merchant')
		.eq('user_id', user.id)
		.eq('included_in_spend', true)
		.eq('kind', 'purchase');

	if (from) {
		query = query.gte('date', from);
	}
	if (to) {
		query = query.lte('date', to);
	}

	const { data: transactions, error: fetchError } = await query;

	if (fetchError) {
		throw error(500, 'Failed to fetch transactions');
	}

	// Calculate totals
	let totalSpent = 0;
	let totalFutureValue = 0;
	let usingRealPrices = 0;
	let usingFallback = 0;
	let dateMin: string | null = null;
	let dateMax: string | null = null;
	const categoryMap = new Map<string, { spent: number; future: number }>();
	const monthlyMap = new Map<string, { spent: number; future: number }>();
	
	// Track top growth transactions
	const topGrowth: Array<{
		merchant: string;
		date: string;
		amount: number;
		futureValue: number;
		growth: number;
		growthPct: number;
	}> = [];
	
	// Track merchant frequency
	const merchantMap = new Map<string, { 
		count: number; 
		totalSpent: number; 
		totalFuture: number;
		lastDate: string;
	}>();

	for (const tx of transactions || []) {
		const amount = tx.amount || 0;
		const future = tx.future_value || amount;
		const category = tx.category || 'Uncategorised';
		const date = tx.date;

		totalSpent += amount;
		totalFutureValue += future;

		// Track date range
		if (date) {
			if (!dateMin || date < dateMin) dateMin = date;
			if (!dateMax || date > dateMax) dateMax = date;
			
			// Monthly aggregation (YYYY-MM)
			const month = date.substring(0, 7);
			if (!monthlyMap.has(month)) {
				monthlyMap.set(month, { spent: 0, future: 0 });
			}
			const m = monthlyMap.get(month)!;
			m.spent += amount;
			m.future += future;
		}

		if (tx.calc_method === 'adj_close_ratio') {
			usingRealPrices++;
		} else {
			usingFallback++;
		}

		if (!categoryMap.has(category)) {
			categoryMap.set(category, { spent: 0, future: 0 });
		}
		const cat = categoryMap.get(category)!;
		cat.spent += amount;
		cat.future += future;
		
		// Track for top growth
		const growth = tx.growth_delta || 0;
		if (amount > 0) {
			topGrowth.push({
				merchant: tx.merchant || 'Unknown',
				date: tx.date,
				amount,
				futureValue: future,
				growth,
				growthPct: (growth / amount) * 100
			});
		}
		
		// Track merchant frequency
		const merchantName = tx.merchant || 'Unknown';
		if (!merchantMap.has(merchantName)) {
			merchantMap.set(merchantName, { count: 0, totalSpent: 0, totalFuture: 0, lastDate: date });
		}
		const m = merchantMap.get(merchantName)!;
		m.count++;
		m.totalSpent += amount;
		m.totalFuture += future;
		if (date > m.lastDate) m.lastDate = date;
	}
	
	// Sort and take top 10 by absolute growth
	topGrowth.sort((a, b) => b.growth - a.growth);
	const topTransactions = topGrowth.slice(0, 10);
	
	// Build monthly data sorted by date
	const monthly = Array.from(monthlyMap.entries())
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([month, data]) => ({
			month,
			spent: Math.round(data.spent * 100) / 100,
			future: Math.round(data.future * 100) / 100,
			delta: Math.round((data.future - data.spent) * 100) / 100
		}));
	
	// Build merchant frequency data - sort by count (most frequent first)
	const topMerchants = Array.from(merchantMap.entries())
		.map(([merchant, data]) => ({
			merchant,
			count: data.count,
			totalSpent: Math.round(data.totalSpent * 100) / 100,
			totalFuture: Math.round(data.totalFuture * 100) / 100,
			totalGrowth: Math.round((data.totalFuture - data.totalSpent) * 100) / 100,
			avgTransaction: Math.round((data.totalSpent / data.count) * 100) / 100,
			lastDate: data.lastDate
		}))
		.sort((a, b) => b.count - a.count)
		.slice(0, 15);
	
	// Also sort by total spent
	const topMerchantsBySpend = Array.from(merchantMap.entries())
		.map(([merchant, data]) => ({
			merchant,
			count: data.count,
			totalSpent: Math.round(data.totalSpent * 100) / 100,
			totalFuture: Math.round(data.totalFuture * 100) / 100,
			totalGrowth: Math.round((data.totalFuture - data.totalSpent) * 100) / 100,
			avgTransaction: Math.round((data.totalSpent / data.count) * 100) / 100,
			lastDate: data.lastDate
		}))
		.sort((a, b) => b.totalSpent - a.totalSpent)
		.slice(0, 15);
	
	// Fun stats
	const avgTransaction = totalSpent / (transactions?.length || 1);
	const biggestPurchase = topGrowth.length > 0 
		? topGrowth.reduce((max, tx) => tx.amount > max.amount ? tx : max)
		: null;

	// Build category summaries
	const categories: CategorySummary[] = Array.from(categoryMap.entries())
		.map(([category, data]) => ({
			category,
			spent: Math.round(data.spent * 100) / 100,
			future: Math.round(data.future * 100) / 100,
			delta: Math.round((data.future - data.spent) * 100) / 100
		}))
		.sort((a, b) => b.spent - a.spent);

	const summary: DashboardSummary = {
		totalSpent: Math.round(totalSpent * 100) / 100,
		totalFutureValue: Math.round(totalFutureValue * 100) / 100,
		totalDelta: Math.round((totalFutureValue - totalSpent) * 100) / 100,
		categories,
		ticker,
		usingRealPrices,
		usingFallback,
		transactionCount: (transactions || []).length,
		dateMin,
		dateMax,
		monthly,
		topTransactions,
		topMerchants,
		topMerchantsBySpend,
		avgTransaction: Math.round(avgTransaction * 100) / 100,
		biggestPurchase
	};

	return json({
		ok: true,
		data: summary
	});
};
