import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async ({ params, locals }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		throw error(401, 'Unauthorized');
	}

	const { batchId } = params;

	// Verify batch belongs to user
	const { data: batch } = await locals.supabase
		.from('import_batches')
		.select('id')
		.eq('id', batchId)
		.eq('user_id', user.id)
		.single();

	if (!batch) {
		throw error(404, 'Batch not found');
	}

	// Delete committed transactions for this batch
	await locals.supabase.from('transactions').delete().eq('batch_id', batchId);

	// Delete raw transactions (this will cascade delete overrides due to FK)
	await locals.supabase.from('raw_transactions').delete().eq('batch_id', batchId);

	// Delete the batch
	await locals.supabase.from('import_batches').delete().eq('id', batchId);

	return json({
		ok: true,
		data: { deleted: true }
	});
};
