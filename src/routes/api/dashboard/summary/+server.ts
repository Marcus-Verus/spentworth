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

	// Build query for included purchases
	let query = locals.supabase
		.from('transactions')
		.select('amount, future_value, category')
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
	const categoryMap = new Map<string, { spent: number; future: number }>();

	for (const tx of transactions || []) {
		const amount = tx.amount || 0;
		const future = tx.future_value || amount;
		const category = tx.category || 'Uncategorised';

		totalSpent += amount;
		totalFutureValue += future;

		if (!categoryMap.has(category)) {
			categoryMap.set(category, { spent: 0, future: 0 });
		}
		const cat = categoryMap.get(category)!;
		cat.spent += amount;
		cat.future += future;
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
		categories
	};

	return json({
		ok: true,
		data: summary
	});
};
