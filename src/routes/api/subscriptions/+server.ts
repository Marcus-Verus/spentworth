import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export interface UserSubscription {
	id: string;
	name: string;
	amount: number;
	frequency: 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'semi-annually' | 'yearly';
	category: string | null;
	notes: string | null;
	isCancelled: boolean;
	cancelledAt: string | null;
	createdAt: string;
	// Computed
	monthlyEstimate: number;
	yearlyEstimate: number;
}

function getMonthlyEstimate(amount: number, frequency: string): number {
	switch (frequency) {
		case 'weekly': return amount * 4;
		case 'bi-weekly': return amount * 2;
		case 'monthly': return amount;
		case 'quarterly': return amount / 3;
		case 'semi-annually': return amount / 6;
		case 'yearly': return amount / 12;
		default: return amount;
	}
}

// GET - List all user subscriptions
export const GET: RequestHandler = async ({ locals }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		throw error(401, 'Unauthorized');
	}

	const { data: subs, error: fetchError } = await locals.supabase
		.from('user_subscriptions')
		.select('*')
		.eq('user_id', user.id)
		.order('created_at', { ascending: false });

	if (fetchError) {
		throw error(500, 'Failed to fetch subscriptions');
	}

	const subscriptions: UserSubscription[] = (subs || []).map(s => {
		const monthlyEstimate = getMonthlyEstimate(s.amount, s.frequency);
		return {
			id: s.id,
			name: s.name,
			amount: s.amount,
			frequency: s.frequency,
			category: s.category,
			notes: s.notes,
			isCancelled: s.is_cancelled,
			cancelledAt: s.cancelled_at,
			createdAt: s.created_at,
			monthlyEstimate: Math.round(monthlyEstimate * 100) / 100,
			yearlyEstimate: Math.round(monthlyEstimate * 12 * 100) / 100
		};
	});

	return json({
		ok: true,
		data: subscriptions
	});
};

// POST - Create a new subscription
export const POST: RequestHandler = async ({ request, locals }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		throw error(401, 'Unauthorized');
	}

	const body = await request.json();
	const { name, amount, frequency, category, notes } = body;

	if (!name || typeof amount !== 'number' || amount <= 0) {
		throw error(400, 'Name and amount are required');
	}

	const validFrequencies = ['weekly', 'bi-weekly', 'monthly', 'quarterly', 'semi-annually', 'yearly'];
	if (!validFrequencies.includes(frequency)) {
		throw error(400, 'Invalid frequency');
	}

	const { data: sub, error: insertError } = await locals.supabase
		.from('user_subscriptions')
		.insert({
			user_id: user.id,
			name,
			amount,
			frequency,
			category: category || null,
			notes: notes || null
		})
		.select()
		.single();

	if (insertError) {
		throw error(500, 'Failed to create subscription');
	}

	const monthlyEstimate = getMonthlyEstimate(sub.amount, sub.frequency);
	
	return json({
		ok: true,
		data: {
			id: sub.id,
			name: sub.name,
			amount: sub.amount,
			frequency: sub.frequency,
			category: sub.category,
			notes: sub.notes,
			isCancelled: sub.is_cancelled,
			cancelledAt: sub.cancelled_at,
			createdAt: sub.created_at,
			monthlyEstimate: Math.round(monthlyEstimate * 100) / 100,
			yearlyEstimate: Math.round(monthlyEstimate * 12 * 100) / 100
		}
	});
};

// DELETE - Delete a subscription
export const DELETE: RequestHandler = async ({ url, locals }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		throw error(401, 'Unauthorized');
	}

	const id = url.searchParams.get('id');
	if (!id) {
		throw error(400, 'id required');
	}

	const { error: deleteError } = await locals.supabase
		.from('user_subscriptions')
		.delete()
		.eq('id', id)
		.eq('user_id', user.id);

	if (deleteError) {
		throw error(500, 'Failed to delete subscription');
	}

	return json({ ok: true });
};

// PATCH - Toggle cancelled status
export const PATCH: RequestHandler = async ({ request, locals }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		throw error(401, 'Unauthorized');
	}

	const body = await request.json();
	const { id, isCancelled } = body;

	if (!id) {
		throw error(400, 'id required');
	}

	const { error: updateError } = await locals.supabase
		.from('user_subscriptions')
		.update({
			is_cancelled: isCancelled,
			cancelled_at: isCancelled ? new Date().toISOString() : null,
			updated_at: new Date().toISOString()
		})
		.eq('id', id)
		.eq('user_id', user.id);

	if (updateError) {
		throw error(500, 'Failed to update subscription');
	}

	return json({ ok: true });
};
