import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// GET - Get a single transaction
export const GET: RequestHandler = async ({ params, locals }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		throw error(401, 'Unauthorized');
	}

	const { id } = params;

	const { data: transaction, error: fetchError } = await locals.supabase
		.from('transactions')
		.select('*')
		.eq('id', id)
		.eq('user_id', user.id)
		.single();

	if (fetchError || !transaction) {
		throw error(404, 'Transaction not found');
	}

	return json({ ok: true, data: transaction });
};

// PUT - Update a transaction
export const PUT: RequestHandler = async ({ params, request, locals }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		throw error(401, 'Unauthorized');
	}

	const { id } = params;
	const body = await request.json();

	// Only allow updating certain fields
	const allowedFields = ['merchant', 'category', 'subcategory', 'amount', 'date', 'description', 'kind', 'included_in_spend'];
	const updates: Record<string, unknown> = {};

	for (const field of allowedFields) {
		if (body[field] !== undefined) {
			updates[field] = body[field];
		}
	}

	// Handle amount - ensure it's stored correctly (negative for purchases)
	if (updates.amount !== undefined) {
		const amount = Number(updates.amount);
		if (isNaN(amount) || amount === 0) {
			throw error(400, 'Invalid amount');
		}
		// Store as positive amount (the direction field handles debit/credit)
		updates.amount = Math.abs(amount);
	}

	// Normalize merchant if updated
	if (updates.merchant !== undefined) {
		updates.merchant_norm = String(updates.merchant).toUpperCase().replace(/[^A-Z0-9\s]/g, '');
	}

	// Update invest_date if date changes
	if (updates.date !== undefined) {
		updates.invest_date = updates.date;
	}

	// Add updated_at timestamp
	updates.updated_at = new Date().toISOString();

	// First verify the transaction belongs to the user
	const { data: existing, error: checkError } = await locals.supabase
		.from('transactions')
		.select('id')
		.eq('id', id)
		.eq('user_id', user.id)
		.single();

	if (checkError || !existing) {
		throw error(404, 'Transaction not found');
	}

	// Perform the update
	const { data: transaction, error: updateError } = await locals.supabase
		.from('transactions')
		.update(updates)
		.eq('id', id)
		.eq('user_id', user.id)
		.select()
		.single();

	if (updateError) {
		throw error(500, `Failed to update transaction: ${updateError.message}`);
	}

	return json({ ok: true, data: transaction });
};

// DELETE - Delete a transaction
export const DELETE: RequestHandler = async ({ params, locals }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		throw error(401, 'Unauthorized');
	}

	const { id } = params;

	// First verify the transaction belongs to the user
	const { data: existing, error: checkError } = await locals.supabase
		.from('transactions')
		.select('id')
		.eq('id', id)
		.eq('user_id', user.id)
		.single();

	if (checkError || !existing) {
		throw error(404, 'Transaction not found');
	}

	// Delete the transaction
	const { error: deleteError } = await locals.supabase
		.from('transactions')
		.delete()
		.eq('id', id)
		.eq('user_id', user.id);

	if (deleteError) {
		throw error(500, `Failed to delete transaction: ${deleteError.message}`);
	}

	return json({ ok: true, message: 'Transaction deleted' });
};
