import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { DailyBriefData } from '$lib/types';

// GET - Generate daily brief data for a user
export const GET: RequestHandler = async ({ locals }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		throw error(401, 'Unauthorized');
	}

	const now = new Date();
	const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM
	const dayOfMonth = now.getDate();
	const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
	const daysRemaining = daysInMonth - dayOfMonth;

	// Get current month spending
	const startOfMonth = `${currentMonth}-01`;
	const { data: monthlyTx } = await locals.supabase
		.from('transactions')
		.select('amount, category, merchant, date')
		.eq('user_id', user.id)
		.eq('included_in_spend', true)
		.gte('date', startOfMonth)
		.lte('date', now.toISOString().slice(0, 10));

	const currentMonthSpent = (monthlyTx || []).reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

	// Project monthly spend based on daily average
	const dailyAvg = dayOfMonth > 0 ? currentMonthSpent / dayOfMonth : 0;
	const projectedMonthSpend = dailyAvg * daysInMonth;

	// Get budget total
	const { data: budgets } = await locals.supabase
		.from('budgets')
		.select('monthly_limit')
		.eq('user_id', user.id)
		.eq('enabled', true);

	const budgetTotal = (budgets || []).reduce((sum, b) => sum + b.monthly_limit, 0);

	// Determine pace status
	let paceStatus: 'on_track' | 'ahead' | 'behind' = 'on_track';
	if (budgetTotal > 0) {
		const expectedSpend = (budgetTotal / daysInMonth) * dayOfMonth;
		if (currentMonthSpent < expectedSpend * 0.9) {
			paceStatus = 'ahead';
		} else if (currentMonthSpent > expectedSpend * 1.1) {
			paceStatus = 'behind';
		}
	}

	// Get top category this week
	const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
	const { data: weeklyTx } = await locals.supabase
		.from('transactions')
		.select('amount, category')
		.eq('user_id', user.id)
		.eq('included_in_spend', true)
		.gte('date', weekAgo);

	const categorySpend = new Map<string, number>();
	for (const tx of weeklyTx || []) {
		const cat = tx.category || 'Uncategorized';
		categorySpend.set(cat, (categorySpend.get(cat) || 0) + Math.abs(tx.amount));
	}

	let topCategoryThisWeek: { category: string; spent: number } | null = null;
	let maxSpend = 0;
	for (const [category, spent] of categorySpend) {
		if (spent > maxSpend) {
			maxSpend = spent;
			topCategoryThisWeek = { category, spent };
		}
	}

	// Get pending review items count
	const { count: pendingReviewItems } = await locals.supabase
		.from('review_inbox')
		.select('*', { count: 'exact', head: true })
		.eq('user_id', user.id)
		.eq('status', 'pending');

	// Get last upload date
	const { data: lastImport } = await locals.supabase
		.from('import_batches')
		.select('uploaded_at')
		.eq('user_id', user.id)
		.order('uploaded_at', { ascending: false })
		.limit(1)
		.single();

	let daysSinceLastUpload: number | null = null;
	if (lastImport?.uploaded_at) {
		const lastUploadDate = new Date(lastImport.uploaded_at);
		daysSinceLastUpload = Math.floor((now.getTime() - lastUploadDate.getTime()) / (1000 * 60 * 60 * 24));
	}

	// Get sources needing upload
	const { data: sources } = await locals.supabase
		.from('user_sources')
		.select('name')
		.eq('user_id', user.id)
		.eq('enabled', true)
		.or(`last_uploaded_at.is.null,last_uploaded_at.lt.${new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()}`);

	const sourcesNeedingUpload = (sources || []).map(s => s.name);

	// Find unusual spending (transactions > 2x the average for that merchant)
	let unusualSpending: { merchant: string; amount: number; reason: string } | null = null;
	
	// Get recent large transactions
	const { data: recentLarge } = await locals.supabase
		.from('transactions')
		.select('merchant, amount, date')
		.eq('user_id', user.id)
		.eq('included_in_spend', true)
		.gte('date', weekAgo)
		.order('amount', { ascending: true }) // Most negative (largest spend) first
		.limit(5);

	if (recentLarge && recentLarge.length > 0) {
		const avgTransaction = currentMonthSpent / (monthlyTx?.length || 1);
		for (const tx of recentLarge) {
			if (Math.abs(tx.amount) > avgTransaction * 3) {
				unusualSpending = {
					merchant: tx.merchant || 'Unknown',
					amount: Math.abs(tx.amount),
					reason: 'Much larger than your average transaction'
				};
				break;
			}
		}
	}

	// Opportunity cost highlight (biggest purchase this week)
	let opportunityCostHighlight: { description: string; amount: number; futureValue: number } | null = null;
	if (recentLarge && recentLarge.length > 0) {
		const biggest = recentLarge[0];
		const amount = Math.abs(biggest.amount);
		// Simple 7% annual return over 10 years
		const futureValue = amount * Math.pow(1.07, 10);
		opportunityCostHighlight = {
			description: biggest.merchant || 'Your biggest purchase',
			amount,
			futureValue: Math.round(futureValue)
		};
	}

	const briefData: DailyBriefData = {
		currentMonthSpent: Math.round(currentMonthSpent),
		projectedMonthSpend: Math.round(projectedMonthSpend),
		budgetTotal: Math.round(budgetTotal),
		paceStatus,
		daysRemaining,
		topCategoryThisWeek,
		unusualSpending,
		subscriptionAlert: null,
		opportunityCostHighlight,
		pendingReviewItems: pendingReviewItems || 0,
		daysSinceLastUpload,
		sourcesNeedingUpload
	};

	return json({ ok: true, data: briefData });
};

