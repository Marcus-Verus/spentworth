import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { nanoid } from 'nanoid';

// Generate share report data
export const GET: RequestHandler = async ({ url, locals }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		throw error(401, 'Unauthorized');
	}

	const year = parseInt(url.searchParams.get('year') || new Date().getFullYear().toString());
	const projectionYears = parseInt(url.searchParams.get('projectionYears') || '20');
	const projectionYear = year + projectionYears;

	// Get user's spending data for the specified year
	const startDate = `${year}-01-01`;
	const endDate = `${year}-12-31`;

	const { data: transactions } = await locals.supabase
		.from('transactions')
		.select('amount, category, date')
		.eq('user_id', user.id)
		.eq('included_in_spend', true)
		.gte('date', startDate)
		.lte('date', endDate);

	if (!transactions || transactions.length === 0) {
		return json({
			ok: true,
			data: {
				hasData: false,
				year,
				projectionYear,
				message: `No spending data found for ${year}`
			}
		});
	}

	// Calculate totals
	const totalSpent = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);

	// Calculate category breakdown
	const categoryTotals: Record<string, number> = {};
	for (const t of transactions) {
		const cat = t.category || 'Uncategorized';
		categoryTotals[cat] = (categoryTotals[cat] || 0) + Math.abs(t.amount);
	}

	// Sort categories by spend
	const sortedCategories = Object.entries(categoryTotals)
		.sort(([, a], [, b]) => b - a)
		.slice(0, 5)
		.map(([name, spent]) => ({
			name,
			spent,
			percentage: Math.round((spent / totalSpent) * 100)
		}));

	const topCategory = sortedCategories[0];

	// Calculate projected future value (7% annual return)
	const annualReturn = 0.07;
	const projectedFutureValue = totalSpent * Math.pow(1 + annualReturn, projectionYears);

	// Get user's philosophy preset
	const { data: prefs } = await locals.supabase
		.from('user_prefs')
		.select('philosophy_preset')
		.eq('user_id', user.id)
		.single();

	return json({
		ok: true,
		data: {
			hasData: true,
			year,
			projectionYear,
			projectionYears,
			totalSpent: Math.round(totalSpent),
			projectedFutureValue: Math.round(projectedFutureValue),
			topCategory: topCategory?.name || null,
			topCategorySpent: topCategory?.spent ? Math.round(topCategory.spent) : null,
			topCategories: sortedCategories,
			transactionCount: transactions.length,
			philosophy: prefs?.philosophy_preset || 'comfortable_saver',
			generatedAt: new Date().toISOString()
		}
	});
};

// Create a shareable report (with optional share token)
export const POST: RequestHandler = async ({ request, locals }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		throw error(401, 'Unauthorized');
	}

	const body = await request.json();
	const { 
		year = new Date().getFullYear(),
		projectionYears = 20,
		createShareLink = false 
	} = body;

	const projectionYear = year + projectionYears;

	// Get spending data
	const startDate = `${year}-01-01`;
	const endDate = `${year}-12-31`;

	const { data: transactions } = await locals.supabase
		.from('transactions')
		.select('amount, category')
		.eq('user_id', user.id)
		.eq('included_in_spend', true)
		.gte('date', startDate)
		.lte('date', endDate);

	if (!transactions || transactions.length === 0) {
		throw error(400, `No spending data found for ${year}`);
	}

	const totalSpent = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
	
	// Top category
	const categoryTotals: Record<string, number> = {};
	for (const t of transactions) {
		const cat = t.category || 'Uncategorized';
		categoryTotals[cat] = (categoryTotals[cat] || 0) + Math.abs(t.amount);
	}
	const topCategory = Object.entries(categoryTotals).sort(([, a], [, b]) => b - a)[0];

	// Calculate future value
	const annualReturn = 0.07;
	const projectedFutureValue = totalSpent * Math.pow(1 + annualReturn, projectionYears);

	// Generate share token if requested
	const shareToken = createShareLink ? nanoid(12) : null;

	// Save to database
	const { data: report, error: insertError } = await locals.supabase
		.from('share_reports')
		.insert({
			user_id: user.id,
			report_type: 'year_projection',
			report_year: year,
			projection_year: projectionYear,
			total_spent: Math.round(totalSpent),
			projected_future_value: Math.round(projectedFutureValue),
			top_category: topCategory?.[0] || null,
			top_category_spent: topCategory ? Math.round(topCategory[1]) : null,
			share_token: shareToken
		})
		.select()
		.single();

	if (insertError) {
		console.error('Failed to create share report:', insertError);
		throw error(500, 'Failed to create share report');
	}

	return json({
		ok: true,
		data: {
			id: report.id,
			shareToken,
			shareUrl: shareToken ? `/share/${shareToken}` : null,
			year,
			projectionYear,
			totalSpent: Math.round(totalSpent),
			projectedFutureValue: Math.round(projectedFutureValue)
		}
	});
};

