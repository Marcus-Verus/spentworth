import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// DELETE a goal
export const DELETE: RequestHandler = async ({ params, locals }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		throw error(401, 'Unauthorized');
	}

	const { goalId } = params;

	const { error: deleteError } = await locals.supabase
		.from('spending_goals')
		.delete()
		.eq('id', goalId)
		.eq('user_id', user.id);

	if (deleteError) {
		throw error(500, `Failed to delete goal: ${deleteError.message}`);
	}

	return json({ ok: true });
};

// PATCH update a goal
export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		throw error(401, 'Unauthorized');
	}

	const { goalId } = params;
	const body = await request.json();

	const updates: Record<string, unknown> = {};
	if (body.name !== undefined) updates.name = body.name;
	if (body.target_amount !== undefined) updates.target_amount = body.target_amount;
	if (body.enabled !== undefined) updates.enabled = body.enabled;
	if (body.project_years !== undefined) {
		updates.project_years = body.project_years;
		// Recalculate projected value
		const monthlyContribution = body.target_amount || 0;
		const years = body.project_years;
		let projected_value = 0;
		for (let month = 0; month < years * 12; month++) {
			projected_value = (projected_value + monthlyContribution) * Math.pow(1.07, 1 / 12);
		}
		updates.projected_value = Math.round(projected_value * 100) / 100;
	}
	updates.updated_at = new Date().toISOString();

	const { data: goal, error: updateError } = await locals.supabase
		.from('spending_goals')
		.update(updates)
		.eq('id', goalId)
		.eq('user_id', user.id)
		.select()
		.single();

	if (updateError) {
		throw error(500, `Failed to update goal: ${updateError.message}`);
	}

	return json({ ok: true, data: goal });
};
