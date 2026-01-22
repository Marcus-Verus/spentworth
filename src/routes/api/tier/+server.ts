import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getTierUsage } from '$lib/server/tierLimits';

export const GET: RequestHandler = async ({ locals }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		throw error(401, 'Unauthorized');
	}

	try {
		const usage = await getTierUsage(locals.supabase, user.id);
		return json({ ok: true, data: usage });
	} catch (err) {
		console.error('Tier usage fetch error:', err);
		throw error(500, 'Failed to fetch tier usage');
	}
};

