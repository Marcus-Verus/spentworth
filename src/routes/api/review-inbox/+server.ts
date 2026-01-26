import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { ReviewInboxItem, ReviewItemStatus } from '$lib/types';

// GET - Fetch review inbox items
export const GET: RequestHandler = async ({ url, locals }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		throw error(401, 'Unauthorized');
	}

	const status = url.searchParams.get('status') || 'pending';
	const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 50);
	const offset = parseInt(url.searchParams.get('offset') || '0');

	// Fetch inbox items
	const { data: items, error: fetchError, count } = await locals.supabase
		.from('review_inbox')
		.select('*', { count: 'exact' })
		.eq('user_id', user.id)
		.eq('status', status)
		.order('priority', { ascending: false })
		.order('created_at', { ascending: false })
		.range(offset, offset + limit - 1);

	if (fetchError) {
		throw error(500, `Failed to fetch inbox: ${fetchError.message}`);
	}

	// Transform to camelCase
	const transformedItems: ReviewInboxItem[] = (items || []).map((item) => ({
		id: item.id,
		userId: item.user_id,
		itemType: item.item_type,
		transactionId: item.transaction_id,
		rawTransactionId: item.raw_transaction_id,
		data: item.data || {},
		status: item.status,
		priority: item.priority,
		createdAt: item.created_at,
		completedAt: item.completed_at,
		expiresAt: item.expires_at
	}));

	// Also fetch streaks for gamification
	const { data: streaks } = await locals.supabase
		.from('user_streaks')
		.select('*')
		.eq('user_id', user.id)
		.single();

	// Count items completed today
	const today = new Date().toISOString().slice(0, 10);
	const { count: completedTodayCount } = await locals.supabase
		.from('review_inbox')
		.select('*', { count: 'exact', head: true })
		.eq('user_id', user.id)
		.eq('status', 'completed')
		.gte('completed_at', `${today}T00:00:00.000Z`)
		.lt('completed_at', `${today}T23:59:59.999Z`);

	return json({
		ok: true,
		data: {
			items: transformedItems,
			total: count || 0,
			completedToday: completedTodayCount || 0,
			streaks: streaks ? {
				reviewStreakCurrent: streaks.review_streak_current,
				reviewStreakBest: streaks.review_streak_best,
				totalItemsCleared: streaks.total_items_cleared
			} : null
		}
	});
};

// POST - Create review inbox items (usually called internally after import)
export const POST: RequestHandler = async ({ request, locals }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		throw error(401, 'Unauthorized');
	}

	const body = await request.json();
	const { items } = body as { items: Partial<ReviewInboxItem>[] };

	if (!items || !Array.isArray(items) || items.length === 0) {
		throw error(400, 'Items array is required');
	}

	// Transform to snake_case and add user_id
	const insertItems = items.map((item) => ({
		user_id: user.id,
		item_type: item.itemType,
		transaction_id: item.transactionId || null,
		raw_transaction_id: item.rawTransactionId || null,
		data: item.data || {},
		priority: item.priority || 50,
		status: 'pending',
		expires_at: item.expiresAt || null
	}));

	const { data, error: insertError } = await locals.supabase
		.from('review_inbox')
		.insert(insertItems)
		.select();

	if (insertError) {
		throw error(500, `Failed to create inbox items: ${insertError.message}`);
	}

	return json({ ok: true, data: { created: data?.length || 0 } });
};

// PATCH - Update item status (complete/dismiss)
export const PATCH: RequestHandler = async ({ request, locals }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		throw error(401, 'Unauthorized');
	}

	const body = await request.json();
	const { id, status, action } = body as { 
		id: string; 
		status?: ReviewItemStatus;
		action?: 'complete' | 'dismiss' | 'apply_rule' | 'set_category';
	};

	if (!id) {
		throw error(400, 'Item ID is required');
	}

	const newStatus = status || (action === 'dismiss' ? 'dismissed' : 'completed');

	// Update the item
	const { error: updateError } = await locals.supabase
		.from('review_inbox')
		.update({
			status: newStatus,
			completed_at: new Date().toISOString()
		})
		.eq('id', id)
		.eq('user_id', user.id);

	if (updateError) {
		throw error(500, `Failed to update item: ${updateError.message}`);
	}

	// Update streaks if completed
	if (newStatus === 'completed') {
		const today = new Date().toISOString().slice(0, 10);
		
		// Get current streaks
		const { data: currentStreaks } = await locals.supabase
			.from('user_streaks')
			.select('*')
			.eq('user_id', user.id)
			.single();

		if (currentStreaks) {
			const lastCompleted = currentStreaks.review_last_completed_at;
			const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
			
			let newStreak = currentStreaks.review_streak_current;
			
			// If last completed was yesterday, increment streak
			if (lastCompleted === yesterday) {
				newStreak += 1;
			} else if (lastCompleted !== today) {
				// If not today and not yesterday, reset to 1
				newStreak = 1;
			}
			// If already completed today, don't change streak

			await locals.supabase
				.from('user_streaks')
				.update({
					review_streak_current: newStreak,
					review_streak_best: Math.max(newStreak, currentStreaks.review_streak_best),
					review_last_completed_at: today,
					total_items_cleared: currentStreaks.total_items_cleared + 1,
					updated_at: new Date().toISOString()
				})
				.eq('user_id', user.id);
		}
	}

	return json({ ok: true });
};

