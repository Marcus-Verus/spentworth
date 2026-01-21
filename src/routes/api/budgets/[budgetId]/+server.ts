import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// PUT update budget
export const PUT: RequestHandler = async ({ params, request, locals }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		throw error(401, 'Unauthorized');
	}

	const { budgetId } = params;
	const body = await request.json();
	const { monthlyLimit, enabled } = body;

	const updates: Record<string, unknown> = {
		updated_at: new Date().toISOString()
	};

	if (monthlyLimit !== undefined) {
		if (monthlyLimit < 0) {
			throw error(400, 'Monthly limit must be non-negative');
		}
		updates.monthly_limit = monthlyLimit;
	}

	if (enabled !== undefined) {
		updates.enabled = enabled;
	}

	const { data: budget, error: updateError } = await locals.supabase
		.from('budgets')
		.update(updates)
		.eq('id', budgetId)
		.eq('user_id', user.id)
		.select()
		.single();

	if (updateError) {
		throw error(500, `Failed to update budget: ${updateError.message}`);
	}

	if (!budget) {
		throw error(404, 'Budget not found');
	}

	return json({ ok: true, data: budget });
};

// DELETE budget
export const DELETE: RequestHandler = async ({ params, locals }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		throw error(401, 'Unauthorized');
	}

	const { budgetId } = params;

	const { error: deleteError } = await locals.supabase
		.from('budgets')
		.delete()
		.eq('id', budgetId)
		.eq('user_id', user.id);

	if (deleteError) {
		throw error(500, `Failed to delete budget: ${deleteError.message}`);
	}

	return json({ ok: true });
};

