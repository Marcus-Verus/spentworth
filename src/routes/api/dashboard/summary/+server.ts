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
		dates: string[];
	}>();
	
	// Day of week tracking (0 = Sunday, 6 = Saturday)
	const dayOfWeekSpend = [0, 0, 0, 0, 0, 0, 0];
	const dayOfWeekCount = [0, 0, 0, 0, 0, 0, 0];

	for (const tx of transactions || []) {
		const amount = tx.amount || 0;
		const future = tx.future_value || amount;
		const category = tx.category || 'Uncategorized';
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
			merchantMap.set(merchantName, { count: 0, totalSpent: 0, totalFuture: 0, lastDate: date, dates: [] });
		}
		const m = merchantMap.get(merchantName)!;
		m.count++;
		m.totalSpent += amount;
		m.totalFuture += future;
		m.dates.push(date);
		if (date > m.lastDate) m.lastDate = date;
		
		// Track day of week
		if (date) {
			const dayOfWeek = new Date(date + 'T00:00:00').getDay();
			dayOfWeekSpend[dayOfWeek] += amount;
			dayOfWeekCount[dayOfWeek]++;
		}
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
	
	// Day of week patterns
	const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
	const dayOfWeek = dayNames.map((name, i) => ({
		day: name,
		dayShort: name.slice(0, 3),
		spent: Math.round(dayOfWeekSpend[i] * 100) / 100,
		count: dayOfWeekCount[i],
		avg: dayOfWeekCount[i] > 0 ? Math.round((dayOfWeekSpend[i] / dayOfWeekCount[i]) * 100) / 100 : 0
	}));
	
	// Find biggest spending day
	const biggestSpendingDay = dayOfWeek.reduce((max, d) => d.spent > max.spent ? d : max);
	const mostFrequentDay = dayOfWeek.reduce((max, d) => d.count > max.count ? d : max);
	
	// Detect recurring charges (merchants with regular intervals)
	const recurringCharges: Array<{
		merchant: string;
		avgAmount: number;
		frequency: string;
		monthlyEstimate: number;
		yearlyEstimate: number;
		count: number;
	}> = [];
	
	for (const [merchant, data] of merchantMap.entries()) {
		if (data.count >= 2 && data.dates.length >= 2) {
			// Sort dates and calculate intervals
			const sortedDates = data.dates.sort();
			const intervals: number[] = [];
			
			for (let i = 1; i < sortedDates.length; i++) {
				const d1 = new Date(sortedDates[i - 1]);
				const d2 = new Date(sortedDates[i]);
				const daysDiff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
				intervals.push(daysDiff);
			}
			
			if (intervals.length > 0) {
				const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
				const avgAmount = data.totalSpent / data.count;
				
				// Detect patterns
				let frequency = '';
				let monthlyEstimate = 0;
				
				if (avgInterval >= 25 && avgInterval <= 35) {
					frequency = 'Monthly';
					monthlyEstimate = avgAmount;
				} else if (avgInterval >= 12 && avgInterval <= 16) {
					frequency = 'Bi-weekly';
					monthlyEstimate = avgAmount * 2;
				} else if (avgInterval >= 5 && avgInterval <= 9) {
					frequency = 'Weekly';
					monthlyEstimate = avgAmount * 4;
				} else if (avgInterval >= 85 && avgInterval <= 95) {
					frequency = 'Quarterly';
					monthlyEstimate = avgAmount / 3;
				} else if (avgInterval >= 355 && avgInterval <= 375) {
					frequency = 'Yearly';
					monthlyEstimate = avgAmount / 12;
				}
				
				if (frequency && data.count >= 2) {
					recurringCharges.push({
						merchant,
						avgAmount: Math.round(avgAmount * 100) / 100,
						frequency,
						monthlyEstimate: Math.round(monthlyEstimate * 100) / 100,
						yearlyEstimate: Math.round(monthlyEstimate * 12 * 100) / 100,
						count: data.count
					});
				}
			}
		}
	}
	
	// Sort recurring by yearly estimate (biggest impact first)
	recurringCharges.sort((a, b) => b.yearlyEstimate - a.yearlyEstimate);
	
	// Year-over-Year comparison (if we have data from last year)
	let yoyComparison = null;
	if (dateMin && dateMax) {
		const currentStart = new Date(dateMin);
		const currentEnd = new Date(dateMax);
		const lastYearStart = new Date(currentStart);
		lastYearStart.setFullYear(lastYearStart.getFullYear() - 1);
		const lastYearEnd = new Date(currentEnd);
		lastYearEnd.setFullYear(lastYearEnd.getFullYear() - 1);
		
		// Get last year's data for same period
		const { data: lastYearTx } = await locals.supabase
			.from('transactions')
			.select('amount, category')
			.eq('user_id', user.id)
			.eq('included_in_spend', true)
			.eq('kind', 'purchase')
			.gte('date', lastYearStart.toISOString().slice(0, 10))
			.lte('date', lastYearEnd.toISOString().slice(0, 10));
		
		if (lastYearTx && lastYearTx.length > 0) {
			const lastYearTotal = lastYearTx.reduce((sum, tx) => sum + (tx.amount || 0), 0);
			const lastYearByCategory = new Map<string, number>();
			
			for (const tx of lastYearTx) {
				const cat = tx.category || 'Uncategorized';
				lastYearByCategory.set(cat, (lastYearByCategory.get(cat) || 0) + (tx.amount || 0));
			}
			
			const changeAmount = totalSpent - lastYearTotal;
			const changePct = lastYearTotal > 0 ? ((totalSpent - lastYearTotal) / lastYearTotal) * 100 : 0;
			
			// Category changes
			const categoryChanges = categories.map(cat => {
				const lastYear = lastYearByCategory.get(cat.category) || 0;
				const change = cat.spent - lastYear;
				const changePct = lastYear > 0 ? ((cat.spent - lastYear) / lastYear) * 100 : (cat.spent > 0 ? 100 : 0);
				return {
					category: cat.category,
					currentYear: cat.spent,
					lastYear: Math.round(lastYear * 100) / 100,
					change: Math.round(change * 100) / 100,
					changePct: Math.round(changePct * 10) / 10
				};
			}).sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
			
			yoyComparison = {
				lastYearTotal: Math.round(lastYearTotal * 100) / 100,
				currentYearTotal: Math.round(totalSpent * 100) / 100,
				changeAmount: Math.round(changeAmount * 100) / 100,
				changePct: Math.round(changePct * 10) / 10,
				lastYearTxCount: lastYearTx.length,
				categoryChanges: categoryChanges.slice(0, 10)
			};
		}
	}

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
		biggestPurchase,
		dayOfWeek,
		biggestSpendingDay,
		mostFrequentDay,
		recurringCharges,
		yoyComparison
	};

	return json({
		ok: true,
		data: summary
	});
};
