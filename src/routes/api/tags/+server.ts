import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// GET all tags for user
export const GET: RequestHandler = async ({ locals }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		throw error(401, 'Unauthorized');
	}

	const { data: tags, error: fetchError } = await locals.supabase
		.from('custom_tags')
		.select('*, transaction_tags(count)')
		.eq('user_id', user.id)
		.order('name');

	if (fetchError) {
		throw error(500, `Failed to fetch tags: ${fetchError.message}`);
	}

	// Transform to include count
	const tagsWithCount = (tags || []).map(tag => ({
		...tag,
		transactionCount: tag.transaction_tags?.[0]?.count || 0
	}));

	return json({ ok: true, data: tagsWithCount });
};

// POST create new tag
export const POST: RequestHandler = async ({ request, locals }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		throw error(401, 'Unauthorized');
	}

	const body = await request.json();
	const { name, color } = body;

	if (!name) {
		throw error(400, 'Missing required field: name');
	}

	const { data: tag, error: insertError } = await locals.supabase
		.from('custom_tags')
		.insert({
			user_id: user.id,
			name,
			color: color || '#10b981'
		})
		.select()
		.single();

	if (insertError) {
		if (insertError.code === '23505') {
			throw error(400, 'Tag with this name already exists');
		}
		throw error(500, `Failed to create tag: ${insertError.message}`);
	}

	return json({ ok: true, data: tag });
};
