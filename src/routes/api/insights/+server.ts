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

interface Insight {
	id: string;
	type: 'opportunity' | 'trend' | 'subscription' | 'achievement' | 'tip';
	priority: 'high' | 'medium' | 'low';
	title: string;
	description: string;
	category?: string;
	merchant?: string;
	amount?: number;
	opportunityCost?: number;
	actionText?: string;
	actionHref?: string;
	icon: string;
	color: string;
}

export const GET: RequestHandler = async ({ locals }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		throw error(401, 'Unauthorized');
	}

	const insights: Insight[] = [];

	// Get date ranges
	const now = new Date();
	const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
	const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
	const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
	const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);
	const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString().slice(0, 10);

	// Fetch all transactions for analysis
	const { data: transactions } = await locals.supabase
		.from('transactions')
		.select('amount, category, merchant, merchant_norm, date')
		.eq('user_id', user.id)
		.eq('included_in_spend', true)
		.gte('date', threeMonthsAgo)
		.order('date', { ascending: false });

	if (!transactions || transactions.length === 0) {
		return json({
			ok: true,
			data: {
				insights: [{
					id: 'no-data',
					type: 'tip',
					priority: 'high',
					title: 'Import your transactions',
					description: 'Upload your bank statements to get personalized insights about your spending habits.',
					icon: 'fa-file-arrow-up',
					color: '#0d9488',
					actionText: 'Import Now',
					actionHref: '/imports'
				}],
				summary: {
					totalInsights: 1,
					highPriority: 1,
					potentialSavings: 0
				}
			}
		});
	}

	// Group transactions by category and month
	const categoryByMonth: Record<string, { current: number; previous: number; older: number }> = {};
	const merchantByMonth: Record<string, { current: number; previous: number; count: number; category: string }> = {};

	for (const tx of transactions) {
		const category = tx.category || 'Uncategorized';
		const merchant = tx.merchant_norm || tx.merchant || 'Unknown';
		const amount = Math.abs(tx.amount || 0);
		const date = tx.date;

		// Category tracking
		if (!categoryByMonth[category]) {
			categoryByMonth[category] = { current: 0, previous: 0, older: 0 };
		}
		if (date >= currentMonthStart && date <= currentMonthEnd) {
			categoryByMonth[category].current += amount;
		} else if (date >= prevMonthStart && date <= prevMonthEnd) {
			categoryByMonth[category].previous += amount;
		} else {
			categoryByMonth[category].older += amount;
		}

		// Merchant tracking (current month only for detailed analysis)
		if (date >= currentMonthStart && date <= currentMonthEnd) {
			if (!merchantByMonth[merchant]) {
				merchantByMonth[merchant] = { current: 0, previous: 0, count: 0, category };
			}
			merchantByMonth[merchant].current += amount;
			merchantByMonth[merchant].count++;
		} else if (date >= prevMonthStart && date <= prevMonthEnd) {
			if (!merchantByMonth[merchant]) {
				merchantByMonth[merchant] = { current: 0, previous: 0, count: 0, category };
			}
			merchantByMonth[merchant].previous += amount;
		}
	}

	// === INSIGHT 1: Top Opportunity Cost Categories ===
	const categoryOpportunities = Object.entries(categoryByMonth)
		.map(([category, data]) => ({
			category,
			monthlyAvg: (data.current + data.previous) / 2,
			current: data.current,
			previous: data.previous,
			opportunityCost: calculateOpportunityCost((data.current + data.previous) / 2)
		}))
		.filter(c => c.monthlyAvg >= 50) // Only categories with significant spending
		.sort((a, b) => b.opportunityCost - a.opportunityCost);

	// Top 3 opportunity cost drains
	categoryOpportunities.slice(0, 3).forEach((cat, index) => {
		const cutPercentage = index === 0 ? 30 : index === 1 ? 25 : 20;
		const potentialSavings = cat.monthlyAvg * (cutPercentage / 100);
		const potentialGain = calculateOpportunityCost(potentialSavings);

		insights.push({
			id: `opp-${cat.category}`,
			type: 'opportunity',
			priority: index === 0 ? 'high' : 'medium',
			title: index === 0 ? `Your #1 opportunity cost: ${cat.category}` : `${cat.category} is costing you`,
			description: `You spend ~${formatCurrency(cat.monthlyAvg)}/month on ${cat.category}. Cut ${cutPercentage}% and invest the ${formatCurrency(potentialSavings)}/month savings → ${formatCurrency(potentialGain)} in 10 years.`,
			category: cat.category,
			amount: cat.monthlyAvg,
			opportunityCost: cat.opportunityCost,
			actionText: 'Set Budget',
			actionHref: '/budgets',
			icon: 'fa-chart-line',
			color: index === 0 ? '#ef4444' : '#f59e0b'
		});
	});

	// === INSIGHT 2: Spending Trends (improvements and warnings) ===
	const trendInsights = Object.entries(categoryByMonth)
		.map(([category, data]) => ({
			category,
			current: data.current,
			previous: data.previous,
			change: data.previous > 0 ? ((data.current - data.previous) / data.previous) * 100 : 0,
			absoluteChange: data.current - data.previous
		}))
		.filter(t => Math.abs(t.change) >= 20 && Math.abs(t.absoluteChange) >= 30); // Significant changes only

	// Improvements (spending less)
	const improvements = trendInsights.filter(t => t.change < -20).sort((a, b) => a.change - b.change);
	improvements.slice(0, 2).forEach(imp => {
		const savings = Math.abs(imp.absoluteChange);
		const futureValue = calculateOpportunityCost(savings);
		insights.push({
			id: `trend-good-${imp.category}`,
			type: 'achievement',
			priority: 'low',
			title: `Great job on ${imp.category}!`,
			description: `You spent ${formatCurrency(savings)} less than last month. If you keep this up and invest the difference, that's ${formatCurrency(futureValue)} in 10 years!`,
			category: imp.category,
			amount: savings,
			opportunityCost: futureValue,
			icon: 'fa-trophy',
			color: '#10b981'
		});
	});

	// Warnings (spending more)
	const warnings = trendInsights.filter(t => t.change > 30).sort((a, b) => b.change - a.change);
	warnings.slice(0, 2).forEach(warn => {
		const increase = Math.abs(warn.absoluteChange);
		const opportunityCost = calculateOpportunityCost(increase);
		insights.push({
			id: `trend-warn-${warn.category}`,
			type: 'trend',
			priority: 'high',
			title: `${warn.category} spending up ${Math.round(warn.change)}%`,
			description: `You spent ${formatCurrency(increase)} more than last month. That's ${formatCurrency(opportunityCost)} in lost opportunity over 10 years if this continues.`,
			category: warn.category,
			amount: increase,
			opportunityCost: opportunityCost,
			actionText: 'Review',
			actionHref: '/dashboard',
			icon: 'fa-arrow-trend-up',
			color: '#ef4444'
		});
	});

	// === INSIGHT 3: Frequent Small Purchases (death by a thousand cuts) ===
	const frequentSmall = Object.entries(merchantByMonth)
		.filter(([_, data]) => data.count >= 5 && data.current / data.count < 20) // 5+ purchases under $20 avg
		.map(([merchant, data]) => ({
			merchant,
			...data,
			avgPurchase: data.current / data.count
		}))
		.sort((a, b) => b.current - a.current);

	if (frequentSmall.length > 0) {
		const top = frequentSmall[0];
		const annualized = top.current * 12;
		const opportunityCost = calculateOpportunityCost(top.current);
		insights.push({
			id: `frequent-${top.merchant}`,
			type: 'tip',
			priority: 'medium',
			title: 'Small purchases add up',
			description: `${top.count} visits to ${top.merchant} this month (~${formatCurrency(top.avgPurchase)} each) = ${formatCurrency(top.current)}/month → ${formatCurrency(opportunityCost)} opportunity cost in 10 years.`,
			merchant: top.merchant,
			amount: top.current,
			opportunityCost: opportunityCost,
			icon: 'fa-receipt',
			color: '#8b5cf6'
		});
	}

	// === INSIGHT 4: Subscription Check ===
	const subscriptionCategories = ['Subscriptions', 'Entertainment'];
	const subscriptionSpend = Object.entries(categoryByMonth)
		.filter(([cat]) => subscriptionCategories.includes(cat))
		.reduce((sum, [_, data]) => sum + data.current, 0);

	if (subscriptionSpend > 100) {
		const annualized = subscriptionSpend * 12;
		const opportunityCost = calculateOpportunityCost(subscriptionSpend);
		insights.push({
			id: 'subscription-audit',
			type: 'subscription',
			priority: 'medium',
			title: 'Time for a subscription audit?',
			description: `You're spending ${formatCurrency(subscriptionSpend)}/month on subscriptions. That's ${formatCurrency(annualized)}/year → ${formatCurrency(opportunityCost)} if invested over 10 years. Any you could cancel?`,
			amount: subscriptionSpend,
			opportunityCost: opportunityCost,
			actionText: 'View Subscriptions',
			actionHref: '/dashboard#subscriptions',
			icon: 'fa-rotate',
			color: '#0d9488'
		});
	}

	// === INSIGHT 5: General Tips (if not many insights) ===
	if (insights.length < 3) {
		insights.push({
			id: 'tip-50-30-20',
			type: 'tip',
			priority: 'low',
			title: 'The 50/30/20 Rule',
			description: '50% needs, 30% wants, 20% savings/investments. SpentWorth helps you see where your money actually goes and what that means for your future.',
			icon: 'fa-lightbulb',
			color: '#0d9488'
		});
	}

	// Sort insights by priority
	const priorityOrder = { high: 0, medium: 1, low: 2 };
	insights.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

	// Calculate summary
	const potentialSavings = insights
		.filter(i => i.type === 'opportunity')
		.reduce((sum, i) => sum + (i.opportunityCost || 0), 0);

	return json({
		ok: true,
		data: {
			insights,
			summary: {
				totalInsights: insights.length,
				highPriority: insights.filter(i => i.priority === 'high').length,
				potentialSavings: Math.round(potentialSavings)
			}
		}
	});
};

function formatCurrency(amount: number): string {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: 0,
		maximumFractionDigits: 0
	}).format(amount);
}

