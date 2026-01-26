import { json, type RequestHandler } from '@sveltejs/kit';
import { createClient } from '$lib/server/supabase';
import type { FinancialScore, ScoreBreakdown, ScoreInsight, ScoreImprovement } from '$lib/types';

// GET /api/score - Get financial health score
export const GET: RequestHandler = async ({ locals }) => {
	const supabase = createClient(locals);
	const { data: { user } } = await supabase.auth.getUser();

	if (!user) {
		return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
	}

	try {
		// Get existing score or calculate fresh
		let { data: scoreData } = await supabase
			.from('financial_scores')
			.select('*')
			.eq('user_id', user.id)
			.single();

		// If no score exists or it's stale (> 24 hours), recalculate
		const needsRecalc = !scoreData || 
			new Date().getTime() - new Date(scoreData.last_calculated_at).getTime() > 24 * 60 * 60 * 1000;

		if (needsRecalc) {
			scoreData = await calculateScore(supabase, user.id);
		}

		if (!scoreData) {
			return json({ ok: false, error: 'Could not calculate score' }, { status: 500 });
		}

		const score: FinancialScore = {
			userId: scoreData.user_id,
			overallScore: scoreData.overall_score,
			budgetAdherenceScore: scoreData.budget_adherence_score,
			spendingConsistencyScore: scoreData.spending_consistency_score,
			subscriptionHealthScore: scoreData.subscription_health_score,
			savingsRateScore: scoreData.savings_rate_score,
			goalProgressScore: scoreData.goal_progress_score,
			monthlyInvestableDelta: parseFloat(scoreData.monthly_investable_delta),
			annualInvestableDelta: parseFloat(scoreData.annual_investable_delta),
			leakScore: scoreData.leak_score,
			monthlyLeakAmount: parseFloat(scoreData.monthly_leak_amount),
			scoreTrend: scoreData.score_trend,
			scoreChange30d: scoreData.score_change_30d,
			lastCalculatedAt: scoreData.last_calculated_at,
			calculationPeriodStart: scoreData.calculation_period_start,
			calculationPeriodEnd: scoreData.calculation_period_end
		};

		// Generate insights and improvements
		const insights = generateInsights(score);
		const improvements = generateImprovements(score);

		const breakdown: ScoreBreakdown = {
			score,
			insights,
			improvements
		};

		return json({ ok: true, data: breakdown });
	} catch (error) {
		console.error('Error fetching score:', error);
		return json({ ok: false, error: 'Failed to fetch score' }, { status: 500 });
	}
};

// POST /api/score - Force recalculate score
export const POST: RequestHandler = async ({ locals }) => {
	const supabase = createClient(locals);
	const { data: { user } } = await supabase.auth.getUser();

	if (!user) {
		return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const scoreData = await calculateScore(supabase, user.id);
		
		if (!scoreData) {
			return json({ ok: false, error: 'Could not calculate score' }, { status: 500 });
		}

		return json({ ok: true, data: { recalculated: true } });
	} catch (error) {
		console.error('Error recalculating score:', error);
		return json({ ok: false, error: 'Failed to recalculate score' }, { status: 500 });
	}
};

// Calculate financial score from transaction data
async function calculateScore(supabase: ReturnType<typeof createClient>, userId: string) {
	const now = new Date();
	const thirtyDaysAgo = new Date(now);
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
	const threeMonthsAgo = new Date(now);
	threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

	// Fetch relevant data in parallel
	const [
		transactionsResult,
		budgetsResult,
		goalsResult,
		subscriptionsResult,
		previousScoreResult
	] = await Promise.all([
		supabase
			.from('transactions')
			.select('amount, date, category, kind, included_in_spend')
			.eq('user_id', userId)
			.gte('date', threeMonthsAgo.toISOString().slice(0, 10)),
		supabase
			.from('budgets')
			.select('*')
			.eq('user_id', userId)
			.eq('enabled', true),
		supabase
			.from('spending_goals')
			.select('*')
			.eq('user_id', userId)
			.eq('enabled', true),
		supabase
			.from('tracked_subscriptions')
			.select('*')
			.eq('user_id', userId)
			.eq('enabled', true)
			.neq('status', 'canceled'),
		supabase
			.from('score_history')
			.select('overall_score')
			.eq('user_id', userId)
			.order('score_date', { ascending: false })
			.limit(1)
	]);

	const transactions = transactionsResult.data || [];
	const budgets = budgetsResult.data || [];
	const goals = goalsResult.data || [];
	const subscriptions = subscriptionsResult.data || [];
	const previousScore = previousScoreResult.data?.[0]?.overall_score || 50;

	// Calculate component scores
	
	// 1. Budget Adherence Score (0-100)
	let budgetAdherenceScore = 70; // Default if no budgets
	if (budgets.length > 0) {
		const currentMonth = now.toISOString().slice(0, 7);
		let budgetsUnder = 0;
		
		for (const budget of budgets) {
			const spent = transactions
				.filter(t => 
					t.category === budget.category && 
					t.date.startsWith(currentMonth) &&
					t.included_in_spend
				)
				.reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0);
			
			if (spent <= parseFloat(budget.monthly_limit)) {
				budgetsUnder++;
			}
		}
		
		budgetAdherenceScore = Math.round((budgetsUnder / budgets.length) * 100);
	}

	// 2. Spending Consistency Score (0-100) - Lower variance = higher score
	let spendingConsistencyScore = 70;
	const monthlyTotals: number[] = [];
	const months = new Set(transactions.filter(t => t.included_in_spend).map(t => t.date.slice(0, 7)));
	
	for (const month of months) {
		const total = transactions
			.filter(t => t.date.startsWith(month) && t.included_in_spend)
			.reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0);
		monthlyTotals.push(total);
	}

	if (monthlyTotals.length >= 2) {
		const avg = monthlyTotals.reduce((a, b) => a + b, 0) / monthlyTotals.length;
		const variance = monthlyTotals.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / monthlyTotals.length;
		const stdDev = Math.sqrt(variance);
		const coefficientOfVariation = avg > 0 ? stdDev / avg : 0;
		
		// CV of 0 = perfect consistency (100), CV of 0.5+ = poor consistency (40)
		spendingConsistencyScore = Math.max(40, Math.round(100 - coefficientOfVariation * 120));
	}

	// 3. Subscription Health Score (0-100) - Essential ratio
	let subscriptionHealthScore = 80; // Default if no subscriptions
	if (subscriptions.length > 0) {
		const essentialCount = subscriptions.filter(s => s.is_essential).length;
		const trialCount = subscriptions.filter(s => s.status === 'trial').length;
		
		const essentialRatio = essentialCount / subscriptions.length;
		const trialPenalty = trialCount * 5; // Each trial reduces score slightly
		
		subscriptionHealthScore = Math.max(30, Math.round(essentialRatio * 80 + 20 - trialPenalty));
	}

	// 4. Savings Rate Score (0-100) - Based on investable delta
	const totalSpentLast30Days = transactions
		.filter(t => t.date >= thirtyDaysAgo.toISOString().slice(0, 10) && t.included_in_spend)
		.reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0);
	
	// Estimate income (very rough - look for large credits)
	const incomeTransactions = transactions
		.filter(t => t.kind === 'income' && t.date >= thirtyDaysAgo.toISOString().slice(0, 10));
	const estimatedIncome = incomeTransactions.length > 0
		? incomeTransactions.reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0)
		: totalSpentLast30Days * 1.3; // Assume 30% savings rate as baseline

	const savingsRate = estimatedIncome > 0 
		? Math.max(0, (estimatedIncome - totalSpentLast30Days) / estimatedIncome) 
		: 0;
	
	// 0% savings = 30, 10% = 50, 20% = 70, 30%+ = 85+
	const savingsRateScore = Math.min(95, Math.round(30 + savingsRate * 200));

	// 5. Goal Progress Score (0-100)
	let goalProgressScore = 70; // Default if no goals
	if (goals.length > 0) {
		let goalsOnTrack = 0;
		
		for (const goal of goals) {
			const targetAmount = parseFloat(goal.target_amount);
			const currentSpent = parseFloat(goal.current_period_spent || 0);
			
			// Under target = on track
			if (currentSpent <= targetAmount) {
				goalsOnTrack++;
			}
		}
		
		goalProgressScore = Math.round((goalsOnTrack / goals.length) * 100);
	}

	// Calculate leak score and amount (non-essential spending that could be invested)
	const nonEssentialCategories = ['Entertainment', 'Dining & Restaurants', 'Coffee & Drinks', 'Shopping', 'Food Delivery'];
	const leakAmount = transactions
		.filter(t => 
			t.date >= thirtyDaysAgo.toISOString().slice(0, 10) && 
			t.included_in_spend &&
			nonEssentialCategories.includes(t.category || '')
		)
		.reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0);
	
	const leakRatio = totalSpentLast30Days > 0 ? leakAmount / totalSpentLast30Days : 0;
	// Lower leak = higher score
	const leakScore = Math.max(30, Math.round(100 - leakRatio * 150));

	// Calculate investable delta
	const monthlyInvestableDelta = Math.max(0, estimatedIncome - totalSpentLast30Days);
	const annualInvestableDelta = monthlyInvestableDelta * 12;

	// Calculate overall score (weighted average)
	const overallScore = Math.round(
		budgetAdherenceScore * 0.25 +
		spendingConsistencyScore * 0.15 +
		subscriptionHealthScore * 0.15 +
		savingsRateScore * 0.25 +
		goalProgressScore * 0.20
	);

	// Determine trend
	const scoreChange = overallScore - previousScore;
	const scoreTrend = scoreChange >= 5 ? 'improving' : scoreChange <= -5 ? 'declining' : 'stable';

	// Upsert score
	const { data, error } = await supabase
		.from('financial_scores')
		.upsert({
			user_id: userId,
			overall_score: overallScore,
			budget_adherence_score: budgetAdherenceScore,
			spending_consistency_score: spendingConsistencyScore,
			subscription_health_score: subscriptionHealthScore,
			savings_rate_score: savingsRateScore,
			goal_progress_score: goalProgressScore,
			monthly_investable_delta: monthlyInvestableDelta,
			annual_investable_delta: annualInvestableDelta,
			leak_score: leakScore,
			monthly_leak_amount: leakAmount,
			score_trend: scoreTrend,
			score_change_30d: scoreChange,
			last_calculated_at: now.toISOString(),
			calculation_period_start: threeMonthsAgo.toISOString().slice(0, 10),
			calculation_period_end: now.toISOString().slice(0, 10),
			updated_at: now.toISOString()
		}, {
			onConflict: 'user_id'
		})
		.select()
		.single();

	if (error) {
		console.error('Error upserting score:', error);
		return null;
	}

	// Record score history
	await supabase
		.from('score_history')
		.upsert({
			user_id: userId,
			score_date: now.toISOString().slice(0, 10),
			overall_score: overallScore,
			components: {
				budgetAdherence: budgetAdherenceScore,
				spendingConsistency: spendingConsistencyScore,
				subscriptionHealth: subscriptionHealthScore,
				savingsRate: savingsRateScore,
				goalProgress: goalProgressScore,
				leak: leakScore
			}
		}, {
			onConflict: 'user_id,score_date'
		});

	return data;
}

function generateInsights(score: FinancialScore): ScoreInsight[] {
	const insights: ScoreInsight[] = [];

	// Budget adherence insight
	if (score.budgetAdherenceScore >= 80) {
		insights.push({
			type: 'positive',
			title: 'Budget Champion',
			description: 'You\'re staying within your budgets consistently.',
			impact: 15
		});
	} else if (score.budgetAdherenceScore < 50) {
		insights.push({
			type: 'negative',
			title: 'Over Budget',
			description: 'Several categories are exceeding their limits.',
			impact: -15
		});
	}

	// Spending consistency insight
	if (score.spendingConsistencyScore >= 75) {
		insights.push({
			type: 'positive',
			title: 'Steady Spender',
			description: 'Your spending is predictable month to month.',
			impact: 10
		});
	}

	// Subscription insight
	if (score.subscriptionHealthScore < 50) {
		insights.push({
			type: 'negative',
			title: 'Subscription Creep',
			description: 'You have many non-essential subscriptions.',
			impact: -10
		});
	}

	// Leak score insight
	if (score.monthlyLeakAmount > 500) {
		insights.push({
			type: 'negative',
			title: 'Spending Leak Detected',
			description: `$${Math.round(score.monthlyLeakAmount)}/mo going to discretionary spending.`,
			impact: -12
		});
	}

	// Investable delta insight
	if (score.monthlyInvestableDelta > 0) {
		const futureValue = Math.round(score.monthlyInvestableDelta * 12 * Math.pow(1.07, 10));
		insights.push({
			type: 'positive',
			title: 'Investment Potential',
			description: `$${Math.round(score.monthlyInvestableDelta)}/mo could grow to $${futureValue.toLocaleString()} in 10 years.`,
			impact: 20
		});
	}

	// Score trend insight
	if (score.scoreTrend === 'improving') {
		insights.push({
			type: 'positive',
			title: 'On the Rise',
			description: `Your score improved by ${score.scoreChange30d} points this month.`,
			impact: score.scoreChange30d
		});
	} else if (score.scoreTrend === 'declining') {
		insights.push({
			type: 'negative',
			title: 'Needs Attention',
			description: `Your score dropped by ${Math.abs(score.scoreChange30d)} points this month.`,
			impact: score.scoreChange30d
		});
	}

	return insights.slice(0, 4); // Return top 4 insights
}

function generateImprovements(score: FinancialScore): ScoreImprovement[] {
	const improvements: ScoreImprovement[] = [];

	if (score.budgetAdherenceScore < 70) {
		improvements.push({
			title: 'Tighten Budgets',
			description: 'Review categories where you consistently overspend.',
			potentialPoints: 15,
			difficulty: 'medium',
			category: 'budgets'
		});
	}

	if (score.subscriptionHealthScore < 60) {
		improvements.push({
			title: 'Audit Subscriptions',
			description: 'Mark essential subscriptions and consider canceling others.',
			potentialPoints: 12,
			difficulty: 'easy',
			category: 'subscriptions'
		});
	}

	if (score.monthlyLeakAmount > 300) {
		const potential10yr = Math.round(score.monthlyLeakAmount * 0.5 * 12 * Math.pow(1.07, 10));
		improvements.push({
			title: 'Reduce Discretionary Spending',
			description: `Cutting $${Math.round(score.monthlyLeakAmount * 0.5)}/mo could mean $${potential10yr.toLocaleString()} in 10 years.`,
			potentialPoints: 18,
			difficulty: 'hard',
			category: 'spending'
		});
	}

	if (score.goalProgressScore < 70) {
		improvements.push({
			title: 'Adjust Goals',
			description: 'Set more realistic targets or reduce spending to meet them.',
			potentialPoints: 10,
			difficulty: 'medium',
			category: 'goals'
		});
	}

	if (score.savingsRateScore < 60) {
		improvements.push({
			title: 'Boost Savings Rate',
			description: 'Aim to save at least 20% of your income.',
			potentialPoints: 20,
			difficulty: 'hard',
			category: 'savings'
		});
	}

	return improvements.sort((a, b) => b.potentialPoints - a.potentialPoints).slice(0, 3);
}

