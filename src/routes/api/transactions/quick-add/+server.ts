import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// POST - Add a quick manual transaction
export const POST: RequestHandler = async ({ request, locals }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		throw error(401, 'Unauthorized');
	}

	const body = await request.json();
	const { amount, category, merchant, description, date } = body;

	if (!amount || amount <= 0) {
		throw error(400, 'Amount must be greater than 0');
	}

	if (!category) {
		throw error(400, 'Category is required');
	}

	const transactionDate = date || new Date().toISOString().slice(0, 10);

	// Insert the transaction
	const { data: transaction, error: insertError } = await locals.supabase
		.from('transactions')
		.insert({
			user_id: user.id,
			date: transactionDate,
			invest_date: transactionDate,
			amount: -Math.abs(amount), // Negative for spending
			direction: 'debit',
			merchant: merchant || category,
			merchant_norm: (merchant || category).toUpperCase().replace(/[^A-Z0-9\s]/g, ''),
			description: description || `Manual entry: ${category}`,
			kind: 'purchase',
			category: category,
			included_in_spend: true,
			ticker_symbol: 'SPY',
			calc_method: 'manual_entry'
		})
		.select()
		.single();

	if (insertError) {
		throw error(500, `Failed to add transaction: ${insertError.message}`);
	}

	return json({ ok: true, data: transaction });
};

