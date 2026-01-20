import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// GET all goals for user
export const GET: RequestHandler = async ({ locals }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		throw error(401, 'Unauthorized');
	}

	const { data: goals, error: fetchError } = await locals.supabase
		.from('spending_goals')
		.select('*')
		.eq('user_id', user.id)
		.order('created_at', { ascending: false });

	if (fetchError) {
		throw error(500, `Failed to fetch goals: ${fetchError.message}`);
	}

	// Calculate progress for each goal
	const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
	const monthStart = `${currentMonth}-01`;
	const nextMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1);
	const monthEnd = nextMonth.toISOString().slice(0, 10);

	for (const goal of goals || []) {
		let query = locals.supabase
			.from('transactions')
			.select('amount')
			.eq('user_id', user.id)
			.eq('included_in_spend', true)
			.gte('date', monthStart)
			.lt('date', monthEnd);

		if (goal.goal_type === 'reduce_category' && goal.target_category) {
			query = query.eq('category', goal.target_category);
		} else if (goal.goal_type === 'reduce_merchant' && goal.target_merchant) {
			query = query.ilike('merchant', `%${goal.target_merchant}%`);
		}

		const { data: txs } = await query;
		goal.current_period_spent = (txs || []).reduce((sum, tx) => sum + (tx.amount || 0), 0);
		goal.progress_pct = goal.target_amount > 0 
			? Math.min((goal.current_period_spent / goal.target_amount) * 100, 100) 
			: 0;
		goal.remaining = Math.max(0, goal.target_amount - goal.current_period_spent);
		goal.over_budget = goal.current_period_spent > goal.target_amount;
	}

	return json({ ok: true, data: goals });
};

// POST create new goal
export const POST: RequestHandler = async ({ request, locals }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		throw error(401, 'Unauthorized');
	}

	const body = await request.json();
	const { name, goal_type, target_category, target_merchant, target_amount, project_years } = body;

	if (!name || !goal_type || target_amount === undefined) {
		throw error(400, 'Missing required fields: name, goal_type, target_amount');
	}

	// Calculate projected value (7% annual return)
	const monthlyContribution = target_amount;
	const years = project_years || 10;
	let projected_value = 0;
	for (let month = 0; month < years * 12; month++) {
		projected_value = (projected_value + monthlyContribution) * Math.pow(1.07, 1 / 12);
	}

	const { data: goal, error: insertError } = await locals.supabase
		.from('spending_goals')
		.insert({
			user_id: user.id,
			name,
			goal_type,
			target_category: goal_type === 'reduce_category' ? target_category : null,
			target_merchant: goal_type === 'reduce_merchant' ? target_merchant : null,
			target_amount,
			project_years: years,
			projected_value: Math.round(projected_value * 100) / 100,
			period_start: new Date().toISOString().slice(0, 10)
		})
		.select()
		.single();

	if (insertError) {
		throw error(500, `Failed to create goal: ${insertError.message}`);
	}

	return json({ ok: true, data: goal });
};
