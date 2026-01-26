import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// POST - Generate review inbox items from existing transactions
// This scans for uncategorized items, potential rules, subscription candidates, etc.
export const POST: RequestHandler = async ({ locals }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		throw error(401, 'Unauthorized');
	}

	const itemsToCreate: Array<{
		user_id: string;
		item_type: string;
		transaction_id: string | null;
		data: Record<string, unknown>;
		priority: number;
	}> = [];

	// 1. Find uncategorized transactions
	const { data: uncategorized } = await locals.supabase
		.from('transactions')
		.select('id, merchant, amount, date, category')
		.eq('user_id', user.id)
		.eq('included_in_spend', true)
		.or('category.is.null,category.eq.Uncategorized')
		.order('date', { ascending: false })
		.limit(50);

	// Check which ones already have inbox items
	const uncategorizedIds = (uncategorized || []).map(t => t.id);
	const { data: existingUncategorized } = await locals.supabase
		.from('review_inbox')
		.select('transaction_id')
		.eq('user_id', user.id)
		.eq('item_type', 'uncategorized')
		.eq('status', 'pending')
		.in('transaction_id', uncategorizedIds);

	const existingUncategorizedSet = new Set((existingUncategorized || []).map(e => e.transaction_id));

	for (const tx of uncategorized || []) {
		if (!existingUncategorizedSet.has(tx.id)) {
			itemsToCreate.push({
				user_id: user.id,
				item_type: 'uncategorized',
				transaction_id: tx.id,
				data: {
					merchant: tx.merchant,
					amount: Math.abs(tx.amount),
					date: tx.date
				},
				priority: 60 // Higher priority for uncategorized
			});
		}
	}

	// 2. Find potential rule suggestions (merchants appearing 3+ times without rules)
	const { data: merchantCounts } = await locals.supabase
		.from('transactions')
		.select('merchant_norm, merchant, category')
		.eq('user_id', user.id)
		.eq('included_in_spend', true)
		.not('merchant_norm', 'is', null);

	// Group by merchant_norm
	const merchantGroups = new Map<string, { merchant: string; category: string | null; count: number }>();
	for (const tx of merchantCounts || []) {
		if (!tx.merchant_norm) continue;
		const existing = merchantGroups.get(tx.merchant_norm);
		if (existing) {
			existing.count++;
		} else {
			merchantGroups.set(tx.merchant_norm, {
				merchant: tx.merchant || tx.merchant_norm,
				category: tx.category,
				count: 1
			});
		}
	}

	// Get existing rules
	const { data: existingRules } = await locals.supabase
		.from('merchant_rules')
		.select('match_value')
		.eq('user_id', user.id)
		.eq('match_field', 'merchant_norm');

	const existingRuleValues = new Set((existingRules || []).map(r => r.match_value.toUpperCase()));

	// Check existing rule suggestion items
	const { data: existingRuleSuggestions } = await locals.supabase
		.from('review_inbox')
		.select('data')
		.eq('user_id', user.id)
		.eq('item_type', 'rule_suggestion')
		.eq('status', 'pending');

	const existingRuleSuggestionMerchants = new Set(
		(existingRuleSuggestions || []).map(e => (e.data as { suggestedRule?: { matchValue?: string } })?.suggestedRule?.matchValue?.toUpperCase())
	);

	for (const [merchantNorm, data] of merchantGroups) {
		// Only suggest rules for merchants appearing 3+ times without existing rules
		if (data.count >= 3 && 
			!existingRuleValues.has(merchantNorm.toUpperCase()) &&
			!existingRuleSuggestionMerchants.has(merchantNorm.toUpperCase()) &&
			data.category && 
			data.category !== 'Uncategorized') {
			itemsToCreate.push({
				user_id: user.id,
				item_type: 'rule_suggestion',
				transaction_id: null,
				data: {
					merchant: data.merchant,
					suggestedRule: {
						matchType: 'contains',
						matchValue: merchantNorm,
						setCategory: data.category
					},
					similarCount: data.count
				},
				priority: 40
			});
		}
	}

	// 3. Find subscription candidates (regular recurring charges)
	const { data: potentialSubs } = await locals.supabase
		.from('transactions')
		.select('id, merchant, merchant_norm, amount, date, category')
		.eq('user_id', user.id)
		.eq('included_in_spend', true)
		.neq('category', 'Subscriptions')
		.order('merchant_norm')
		.order('date', { ascending: false });

	// Group by merchant and check for recurring patterns
	const subCandidates = new Map<string, Array<{ id: string; amount: number; date: string }>>();
	for (const tx of potentialSubs || []) {
		if (!tx.merchant_norm) continue;
		const existing = subCandidates.get(tx.merchant_norm) || [];
		existing.push({ id: tx.id, amount: Math.abs(tx.amount), date: tx.date });
		subCandidates.set(tx.merchant_norm, existing);
	}

	// Check existing subscription candidate items
	const { data: existingSubCandidates } = await locals.supabase
		.from('review_inbox')
		.select('data')
		.eq('user_id', user.id)
		.eq('item_type', 'subscription_candidate')
		.eq('status', 'pending');

	const existingSubMerchants = new Set(
		(existingSubCandidates || []).map(e => (e.data as { merchant?: string })?.merchant?.toUpperCase())
	);

	for (const [merchantNorm, transactions] of subCandidates) {
		if (transactions.length < 2) continue;
		if (existingSubMerchants.has(merchantNorm.toUpperCase())) continue;

		// Check if amounts are consistent (within 10%)
		const amounts = transactions.map(t => t.amount);
		const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
		const isConsistent = amounts.every(a => Math.abs(a - avgAmount) / avgAmount < 0.1);

		if (!isConsistent) continue;

		// Check if dates are roughly monthly (25-35 days apart)
		const dates = transactions.map(t => new Date(t.date).getTime()).sort((a, b) => b - a);
		let isMonthly = true;
		for (let i = 0; i < dates.length - 1; i++) {
			const daysDiff = (dates[i] - dates[i + 1]) / (1000 * 60 * 60 * 24);
			if (daysDiff < 25 || daysDiff > 35) {
				isMonthly = false;
				break;
			}
		}

		if (isMonthly && transactions.length >= 2) {
			itemsToCreate.push({
				user_id: user.id,
				item_type: 'subscription_candidate',
				transaction_id: transactions[0].id,
				data: {
					merchant: transactions[0].id ? (potentialSubs || []).find(t => t.id === transactions[0].id)?.merchant : merchantNorm,
					frequency: 'monthly',
					avgAmount: Math.round(avgAmount * 100) / 100,
					occurrences: transactions.length
				},
				priority: 50
			});
		}
	}

	// Insert all items
	if (itemsToCreate.length > 0) {
		const { error: insertError } = await locals.supabase
			.from('review_inbox')
			.insert(itemsToCreate);

		if (insertError) {
			console.error('Failed to insert review items:', insertError);
			throw error(500, `Failed to generate inbox items: ${insertError.message}`);
		}
	}

	return json({
		ok: true,
		data: {
			generated: itemsToCreate.length,
			breakdown: {
				uncategorized: itemsToCreate.filter(i => i.item_type === 'uncategorized').length,
				ruleSuggestions: itemsToCreate.filter(i => i.item_type === 'rule_suggestion').length,
				subscriptionCandidates: itemsToCreate.filter(i => i.item_type === 'subscription_candidate').length
			}
		}
	});
};

