import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { BudgetWithProgress } from '$lib/types';

// Calculate opportunity cost with 7% annual compound return over 10 years
function calculateOpportunityCost(monthlyAmount: number, years: number = 10): number {
	let total = 0;
	for (let month = 0; month < years * 12; month++) {
		total = (total + monthlyAmount) * Math.pow(1.07, 1 / 12);
	}
	return Math.round(total * 100) / 100;
}

// GET all budgets with progress for user
export const GET: RequestHandler = async ({ locals }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		throw error(401, 'Unauthorized');
	}

	// Fetch budgets
	const { data: budgets, error: fetchError } = await locals.supabase
		.from('budgets')
		.select('*')
		.eq('user_id', user.id)
		.order('category', { ascending: true });

	if (fetchError) {
		throw error(500, `Failed to fetch budgets: ${fetchError.message}`);
	}

	// Get current month boundaries
	const now = new Date();
	const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
	const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
	
	// Get previous month boundaries
	const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
	const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);

	// Fetch all transactions for current and previous month in one query
	const { data: allTxs } = await locals.supabase
		.from('transactions')
		.select('amount, category, date')
		.eq('user_id', user.id)
		.eq('included_in_spend', true)
		.gte('date', prevMonthStart)
		.lte('date', currentMonthEnd);

	// Group transactions by category and month
	const categorySpending: Record<string, { current: number; previous: number }> = {};
	
	for (const tx of allTxs || []) {
		const category = tx.category || 'Uncategorized';
		if (!categorySpending[category]) {
			categorySpending[category] = { current: 0, previous: 0 };
		}
		
		const txDate = tx.date;
		if (txDate >= currentMonthStart && txDate <= currentMonthEnd) {
			categorySpending[category].current += Math.abs(tx.amount || 0);
		} else if (txDate >= prevMonthStart && txDate <= prevMonthEnd) {
			categorySpending[category].previous += Math.abs(tx.amount || 0);
		}
	}

	// Build budget progress data
	const budgetsWithProgress: BudgetWithProgress[] = (budgets || []).map(budget => {
		const spending = categorySpending[budget.category] || { current: 0, previous: 0 };
		const currentSpent = Math.round(spending.current * 100) / 100;
		const previousSpent = Math.round(spending.previous * 100) / 100;
		const monthlyLimit = budget.monthly_limit;
		
		const remaining = Math.max(0, monthlyLimit - currentSpent);
		const overUnder = monthlyLimit - currentSpent; // positive = under budget
		const percentUsed = monthlyLimit > 0 ? Math.round((currentSpent / monthlyLimit) * 100) : 0;
		
		// Calculate trend vs last month
		const trendAmount = previousSpent - currentSpent; // positive = spending less
		let trend: 'improving' | 'worsening' | 'stable' = 'stable';
		if (trendAmount > 10) trend = 'improving';
		else if (trendAmount < -10) trend = 'worsening';
		
		// Calculate opportunity costs
		let opportunityCostLost = 0;
		let opportunityCostGained = 0;
		
		if (overUnder < 0) {
			// Over budget - show what that overspending costs
			opportunityCostLost = calculateOpportunityCost(Math.abs(overUnder));
		} else if (overUnder > 0) {
			// Under budget - show what you'll gain by investing the savings
			opportunityCostGained = calculateOpportunityCost(overUnder);
		}

		return {
			id: budget.id,
			userId: budget.user_id,
			category: budget.category,
			monthlyLimit: monthlyLimit,
			enabled: budget.enabled,
			createdAt: budget.created_at,
			updatedAt: budget.updated_at,
			currentSpent,
			previousSpent,
			percentUsed,
			remaining,
			overUnder,
			opportunityCostLost,
			opportunityCostGained,
			trend,
			trendAmount: Math.round(trendAmount * 100) / 100
		};
	});

	// Calculate totals
	const totalBudget = budgetsWithProgress.reduce((sum, b) => sum + b.monthlyLimit, 0);
	const totalSpent = budgetsWithProgress.reduce((sum, b) => sum + b.currentSpent, 0);
	const totalPreviousSpent = budgetsWithProgress.reduce((sum, b) => sum + b.previousSpent, 0);
	const totalRemaining = budgetsWithProgress.reduce((sum, b) => sum + b.remaining, 0);
	const totalOverUnder = totalBudget - totalSpent;
	
	// Overall opportunity cost
	const totalOpportunityCostLost = budgetsWithProgress.reduce((sum, b) => sum + b.opportunityCostLost, 0);
	const totalOpportunityCostGained = budgetsWithProgress.reduce((sum, b) => sum + b.opportunityCostGained, 0);

	return json({ 
		ok: true, 
		data: {
			budgets: budgetsWithProgress,
			summary: {
				totalBudget,
				totalSpent,
				totalPreviousSpent,
				totalRemaining,
				totalOverUnder,
				totalOpportunityCostLost,
				totalOpportunityCostGained,
				overallTrend: totalPreviousSpent - totalSpent > 10 ? 'improving' : 
							  totalPreviousSpent - totalSpent < -10 ? 'worsening' : 'stable',
				overallTrendAmount: Math.round((totalPreviousSpent - totalSpent) * 100) / 100
			}
		}
	});
};

// POST create new budget
export const POST: RequestHandler = async ({ request, locals }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		throw error(401, 'Unauthorized');
	}

	const body = await request.json();
	const { category, monthlyLimit } = body;

	if (!category || monthlyLimit === undefined || monthlyLimit < 0) {
		throw error(400, 'Missing or invalid fields: category, monthlyLimit');
	}

	// Check if budget already exists for this category
	const { data: existing } = await locals.supabase
		.from('budgets')
		.select('id')
		.eq('user_id', user.id)
		.eq('category', category)
		.single();

	if (existing) {
		throw error(409, `Budget already exists for ${category}. Update it instead.`);
	}

	const { data: budget, error: insertError } = await locals.supabase
		.from('budgets')
		.insert({
			user_id: user.id,
			category,
			monthly_limit: monthlyLimit
		})
		.select()
		.single();

	if (insertError) {
		throw error(500, `Failed to create budget: ${insertError.message}`);
	}

	return json({ ok: true, data: budget });
};

