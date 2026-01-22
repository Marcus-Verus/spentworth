import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	const { session, user } = await locals.safeGetSession();
	if (!session || !user) {
		throw error(401, 'Unauthorized');
	}

	try {
		const body = await request.json();
		const { merchant, category, subcategory, createRule, transactionIds } = body;

		if (!category) {
			return json({ ok: false, error: 'Category is required' }, { status: 400 });
		}

		// Must have either merchant or transactionIds
		if (!merchant && (!transactionIds || !Array.isArray(transactionIds) || transactionIds.length === 0)) {
			return json({ ok: false, error: 'Merchant or transactionIds required' }, { status: 400 });
		}

		let updatedCount = 0;
		let merchantForRule = merchant;

		// Build update object
		const updateData: { category: string; subcategory?: string | null } = { category };
		if (subcategory !== undefined) {
			updateData.subcategory = subcategory;
		}

		if (transactionIds && Array.isArray(transactionIds) && transactionIds.length > 0) {
			// Bulk update by transaction IDs (multi-select mode)
			const { data: updated, error: updateError } = await locals.supabase
				.from('transactions')
				.update(updateData)
				.eq('user_id', user.id)
				.in('id', transactionIds)
				.select('id, merchant');

			if (updateError) {
				console.error('Failed to bulk update by IDs:', updateError);
				return json({ ok: false, error: 'Failed to update transactions' }, { status: 500 });
			}

			updatedCount = updated?.length || 0;

			// If createRule and all transactions have the same merchant, use that for the rule
			if (createRule && updated && updated.length > 0) {
				const merchants = [...new Set(updated.map(t => t.merchant).filter(Boolean))];
				if (merchants.length === 1) {
					merchantForRule = merchants[0];
				} else {
					// Can't create a rule for multiple different merchants
					merchantForRule = null;
				}
			}
		} else if (merchant) {
			// Original mode: Update all transactions with this merchant
			const { data: updated, error: updateError } = await locals.supabase
				.from('transactions')
				.update(updateData)
				.eq('user_id', user.id)
				.ilike('merchant', merchant)
				.select('id');

			if (updateError) {
				console.error('Failed to bulk update:', updateError);
				return json({ ok: false, error: 'Failed to update transactions' }, { status: 500 });
			}

			updatedCount = updated?.length || 0;
		}

		// Optionally create a classification rule for future imports
		let ruleCreated = false;
		if (createRule && merchantForRule) {
			// Check if rule already exists
			const { data: existingRule } = await locals.supabase
				.from('merchant_rules')
				.select('id')
				.eq('user_id', user.id)
				.ilike('match_value', merchantForRule)
				.eq('match_field', 'merchant_norm')
				.single();

			if (!existingRule) {
				const { error: ruleError } = await locals.supabase
					.from('merchant_rules')
					.insert({
						user_id: user.id,
						match_field: 'merchant_norm',
						match_type: 'contains',
						match_value: merchantForRule,
						set_category: category,
						set_subcategory: subcategory || null,
						priority: 10,
						enabled: true
					});

				if (ruleError) {
					console.error('Failed to create rule:', ruleError);
					// Don't fail the whole request, transactions were already updated
				} else {
					ruleCreated = true;
				}
			} else {
				// Update existing rule
				await locals.supabase
					.from('merchant_rules')
					.update({ set_category: category, set_subcategory: subcategory || null })
					.eq('id', existingRule.id);
				ruleCreated = true;
			}
		}

		return json({
			ok: true,
			data: {
				updatedCount,
				ruleCreated
			}
		});
	} catch (e) {
		console.error('Bulk categorize error:', e);
		return json({ ok: false, error: 'Server error' }, { status: 500 });
	}
};

// GET: Check how many transactions would be affected
export const GET: RequestHandler = async ({ url, locals }) => {
	const { session, user } = await locals.safeGetSession();
	if (!session || !user) {
		throw error(401, 'Unauthorized');
	}

	const merchant = url.searchParams.get('merchant');
	const excludeCategory = url.searchParams.get('excludeCategory');

	if (!merchant) {
		return json({ ok: false, error: 'Merchant is required' }, { status: 400 });
	}

	// Count transactions with this merchant that have a different category
	let query = locals.supabase
		.from('transactions')
		.select('id, category', { count: 'exact' })
		.eq('user_id', user.id)
		.ilike('merchant', merchant);

	if (excludeCategory) {
		query = query.neq('category', excludeCategory);
	}

	const { count, error: queryError } = await query;

	if (queryError) {
		console.error('Failed to count:', queryError);
		return json({ ok: false, error: 'Failed to count transactions' }, { status: 500 });
	}

	return json({
		ok: true,
		data: {
			count: count || 0
		}
	});
};
