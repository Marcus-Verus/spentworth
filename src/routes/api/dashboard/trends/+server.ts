import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Calculate opportunity cost with 7% annual compound return
function calculateOpportunityCost(monthlyAmount: number, years: number = 10): number {
	let total = 0;
	for (let month = 0; month < years * 12; month++) {
		total = (total + monthlyAmount) * Math.pow(1.07, 1 / 12);
	}
	return Math.round(total * 100) / 100;
}

interface MonthData {
	month: string; // YYYY-MM
	label: string; // "Jan 2026"
	totalSpent: number;
	transactionCount: number;
	categories: Record<string, number>;
}

interface TrendData {
	currentMonth: MonthData;
	previousMonth: MonthData;
	change: number; // positive = spending more, negative = spending less
	changePercent: number;
	opportunityCostChange: number; // what the difference means over 10 years
	categoryChanges: Array<{
		category: string;
		current: number;
		previous: number;
		change: number;
		changePercent: number;
	}>;
	streaks: {
		improving: number; // consecutive months of lower spending
		categories: Array<{ category: string; months: number }>; // categories improving
	};
}

export const GET: RequestHandler = async ({ locals }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		throw error(401, 'Unauthorized');
	}

	const now = new Date();
	
	// Get current month boundaries
	const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
	const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
	
	// Get previous month boundaries
	const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
	const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
	
	// Get 2 months ago for streak calculation
	const twoMonthsAgoStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);
	
	// Format dates
	const currentStart = currentMonthStart.toISOString().slice(0, 10);
	const currentEnd = currentMonthEnd.toISOString().slice(0, 10);
	const prevStart = prevMonthStart.toISOString().slice(0, 10);
	const prevEnd = prevMonthEnd.toISOString().slice(0, 10);
	const twoMonthsStart = twoMonthsAgoStart.toISOString().slice(0, 10);

	// Fetch all transactions for the last 3 months
	const { data: transactions, error: fetchError } = await locals.supabase
		.from('transactions')
		.select('date, amount, category')
		.eq('user_id', user.id)
		.eq('included_in_spend', true)
		.eq('kind', 'purchase')
		.gte('date', twoMonthsStart)
		.lte('date', currentEnd)
		.order('date', { ascending: false });

	if (fetchError) {
		throw error(500, `Failed to fetch transactions: ${fetchError.message}`);
	}

	// Initialize month data
	const currentMonthLabel = currentMonthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
	const prevMonthLabel = prevMonthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

	const currentMonth: MonthData = {
		month: currentStart.slice(0, 7),
		label: currentMonthLabel,
		totalSpent: 0,
		transactionCount: 0,
		categories: {}
	};

	const previousMonth: MonthData = {
		month: prevStart.slice(0, 7),
		label: prevMonthLabel,
		totalSpent: 0,
		transactionCount: 0,
		categories: {}
	};

	const twoMonthsAgo: MonthData = {
		month: twoMonthsStart.slice(0, 7),
		label: '',
		totalSpent: 0,
		transactionCount: 0,
		categories: {}
	};

	// Process transactions
	for (const tx of transactions || []) {
		const amount = Math.abs(tx.amount || 0);
		const category = tx.category || 'Uncategorized';
		const date = tx.date;

		if (date >= currentStart && date <= currentEnd) {
			currentMonth.totalSpent += amount;
			currentMonth.transactionCount++;
			currentMonth.categories[category] = (currentMonth.categories[category] || 0) + amount;
		} else if (date >= prevStart && date <= prevEnd) {
			previousMonth.totalSpent += amount;
			previousMonth.transactionCount++;
			previousMonth.categories[category] = (previousMonth.categories[category] || 0) + amount;
		} else if (date >= twoMonthsStart && date < prevStart) {
			twoMonthsAgo.totalSpent += amount;
			twoMonthsAgo.transactionCount++;
			twoMonthsAgo.categories[category] = (twoMonthsAgo.categories[category] || 0) + amount;
		}
	}

	// Calculate overall change
	const change = currentMonth.totalSpent - previousMonth.totalSpent;
	const changePercent = previousMonth.totalSpent > 0 
		? Math.round((change / previousMonth.totalSpent) * 100) 
		: 0;
	
	// Calculate opportunity cost of the change
	const opportunityCostChange = calculateOpportunityCost(Math.abs(change));

	// Calculate category changes
	const allCategories = new Set([
		...Object.keys(currentMonth.categories),
		...Object.keys(previousMonth.categories)
	]);

	const categoryChanges = Array.from(allCategories)
		.map(category => {
			const current = currentMonth.categories[category] || 0;
			const previous = previousMonth.categories[category] || 0;
			const catChange = current - previous;
			const catChangePercent = previous > 0 ? Math.round((catChange / previous) * 100) : (current > 0 ? 100 : 0);
			return { category, current, previous, change: catChange, changePercent: catChangePercent };
		})
		.filter(c => Math.abs(c.change) >= 10) // Only significant changes
		.sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
		.slice(0, 5); // Top 5 changes

	// Calculate streaks
	let improvingStreak = 0;
	if (currentMonth.totalSpent < previousMonth.totalSpent) {
		improvingStreak = 1;
		if (previousMonth.totalSpent < twoMonthsAgo.totalSpent) {
			improvingStreak = 2;
		}
	}

	// Find categories that are improving
	const improvingCategories = categoryChanges
		.filter(c => c.change < 0)
		.map(c => ({ category: c.category, months: 1 }));

	const trends: TrendData = {
		currentMonth,
		previousMonth,
		change,
		changePercent,
		opportunityCostChange,
		categoryChanges,
		streaks: {
			improving: improvingStreak,
			categories: improvingCategories
		}
	};

	return json({ ok: true, data: trends });
};

