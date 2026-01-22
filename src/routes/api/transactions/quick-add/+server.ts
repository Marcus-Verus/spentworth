import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// GET - List transactions with pagination and filtering
export const GET: RequestHandler = async ({ url, locals }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		throw error(401, 'Unauthorized');
	}

	// Pagination
	const page = parseInt(url.searchParams.get('page') || '1');
	const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
	const offset = (page - 1) * limit;

	// Filters
	const from = url.searchParams.get('from');
	const to = url.searchParams.get('to');
	const category = url.searchParams.get('category');
	const merchant = url.searchParams.get('merchant');
	const kind = url.searchParams.get('kind');
	const search = url.searchParams.get('search');

	// Sort
	const sortBy = url.searchParams.get('sortBy') || 'date';
	const sortOrder = url.searchParams.get('sortOrder') === 'asc' ? true : false;

	// Build query
	let query = locals.supabase
		.from('transactions')
		.select('id, date, amount, merchant, category, kind, description, included_in_spend, future_value, growth_delta, created_at, updated_at', { count: 'exact' })
		.eq('user_id', user.id);

	// Apply filters
	if (from) {
		query = query.gte('date', from);
	}
	if (to) {
		query = query.lte('date', to);
	}
	if (category) {
		query = query.eq('category', category);
	}
	if (merchant) {
		query = query.ilike('merchant', `%${merchant}%`);
	}
	if (kind) {
		query = query.eq('kind', kind);
	}
	if (search) {
		query = query.or(`merchant.ilike.%${search}%,description.ilike.%${search}%`);
	}

	// Apply sorting and pagination
	query = query
		.order(sortBy, { ascending: sortOrder })
		.range(offset, offset + limit - 1);

	const { data: transactions, error: fetchError, count } = await query;

	if (fetchError) {
		throw error(500, `Failed to fetch transactions: ${fetchError.message}`);
	}

	return json({
		ok: true,
		data: {
			transactions: transactions || [],
			pagination: {
				page,
				limit,
				total: count || 0,
				totalPages: Math.ceil((count || 0) / limit)
			}
		}
	});
};

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

