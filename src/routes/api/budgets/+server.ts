import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { BudgetWithProgress } from '$lib/types';
import { canCreateBudget } from '$lib/server/tierLimits';

// Calculate opportunity cost for a one-time amount with 7% annual compound return over 10 years
function calculateOpportunityCost(oneTimeAmount: number, years: number = 10): number {
	// Validate input
	if (!isFinite(oneTimeAmount) || oneTimeAmount <= 0 || !isFinite(years) || years <= 0) {
		return 0;
	}
	// Simple compound interest: amount * (1 + rate)^years
	const futureValue = oneTimeAmount * Math.pow(1.07, years);
	return Math.round(futureValue * 100) / 100;
}

// GET all budgets with progress for user
export const GET: RequestHandler = async ({ locals }) => {
	try {
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
			console.error('Error fetching budgets:', fetchError);
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
		// Only include purchases (kind = 'purchase') to exclude refunds/income from budget calculations
		const { data: allTxs, error: txError } = await locals.supabase
			.from('transactions')
			.select('amount, category, date')
			.eq('user_id', user.id)
			.eq('included_in_spend', true)
			.eq('kind', 'purchase')
			.gte('date', prevMonthStart)
			.lte('date', currentMonthEnd);

		if (txError) {
			console.error('Error fetching transactions:', txError);
			// Continue with empty transactions rather than failing
		}

		// Group transactions by category and month
		const categorySpending: Record<string, { current: number; previous: number }> = {};
		
		for (const tx of (allTxs || [])) {
			try {
				const category = tx?.category || 'Uncategorized';
				if (!categorySpending[category]) {
					categorySpending[category] = { current: 0, previous: 0 };
				}
				
				const txDate = tx?.date;
				const amount = Math.abs(tx?.amount || 0);
				
				if (txDate && amount > 0) {
					if (txDate >= currentMonthStart && txDate <= currentMonthEnd) {
						categorySpending[category].current += amount;
					} else if (txDate >= prevMonthStart && txDate <= prevMonthEnd) {
						categorySpending[category].previous += amount;
					}
				}
			} catch (e) {
				console.error('Error processing transaction:', tx, e);
				// Continue with next transaction
			}
		}

		// Build budget progress data
		const budgetsWithProgress: BudgetWithProgress[] = (budgets || []).map(budget => {
			try {
				const spending = categorySpending[budget.category] || { current: 0, previous: 0 };
				const currentSpent = Math.round((spending.current || 0) * 100) / 100;
				const previousSpent = Math.round((spending.previous || 0) * 100) / 100;
				const monthlyLimit = budget.monthly_limit || 0;
				
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
				
				if (overUnder < 0 && isFinite(overUnder)) {
					// Over budget - show what that overspending costs
					opportunityCostLost = calculateOpportunityCost(Math.abs(overUnder));
				} else if (overUnder > 0 && isFinite(overUnder)) {
					// Under budget - show what you'll gain by investing the savings
					opportunityCostGained = calculateOpportunityCost(overUnder);
				}

				return {
					id: budget.id || '',
					userId: budget.user_id || '',
					category: budget.category || 'Uncategorized',
					monthlyLimit: monthlyLimit,
					enabled: budget.enabled ?? true,
					createdAt: budget.created_at || new Date().toISOString(),
					updatedAt: budget.updated_at || new Date().toISOString(),
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
			} catch (e) {
				console.error('Error processing budget:', budget, e);
				// Return a safe default budget object
				return {
					id: budget?.id || '',
					userId: budget?.user_id || '',
					category: budget?.category || 'Uncategorized',
					monthlyLimit: budget?.monthly_limit || 0,
					enabled: budget?.enabled ?? true,
					createdAt: budget?.created_at || new Date().toISOString(),
					updatedAt: budget?.updated_at || new Date().toISOString(),
					currentSpent: 0,
					previousSpent: 0,
					percentUsed: 0,
					remaining: budget?.monthly_limit || 0,
					overUnder: budget?.monthly_limit || 0,
					opportunityCostLost: 0,
					opportunityCostGained: 0,
					trend: 'stable' as const,
					trendAmount: 0
				};
			}
		});

		// Calculate totals
		const totalBudget = budgetsWithProgress.reduce((sum, b) => sum + (b.monthlyLimit || 0), 0);
		const totalSpent = budgetsWithProgress.reduce((sum, b) => sum + (b.currentSpent || 0), 0);
		const totalPreviousSpent = budgetsWithProgress.reduce((sum, b) => sum + (b.previousSpent || 0), 0);
		const totalOverUnder = (totalBudget || 0) - (totalSpent || 0);
		const totalRemaining = Math.max(0, isFinite(totalOverUnder) ? totalOverUnder : 0); // Remaining = budget - spent (can't be negative)
		
		// Overall opportunity cost - calculate from total remaining/overspending, not sum of individual budgets
		const totalOpportunityCostLost = totalOverUnder < 0 && isFinite(totalOverUnder) ? calculateOpportunityCost(Math.abs(totalOverUnder)) : 0;
		const totalOpportunityCostGained = totalOverUnder > 0 && isFinite(totalOverUnder) ? calculateOpportunityCost(totalOverUnder) : 0;

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
	} catch (e) {
		console.error('Error in GET /api/budgets:', e);
		if (e && typeof e === 'object' && 'status' in e) {
			throw e; // Re-throw SvelteKit errors
		}
		throw error(500, `Internal server error: ${e instanceof Error ? e.message : 'Unknown error'}`);
	}
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

	// Check tier limit for budgets (only if creating new, not updating existing)
	const budgetCheck = await canCreateBudget(locals.supabase, user.id);
	if (!budgetCheck.allowed) {
		throw error(403, budgetCheck.message || 'Budget limit reached');
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

