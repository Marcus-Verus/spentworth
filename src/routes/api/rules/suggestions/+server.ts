import { json, type RequestHandler } from '@sveltejs/kit';
import { createClient } from '$lib/server/supabase';
import type { SuggestedRule } from '$lib/types';

// GET /api/rules/suggestions - Get pending rule suggestions
export const GET: RequestHandler = async ({ locals, url }) => {
	const supabase = createClient(locals);
	const { data: { user } } = await supabase.auth.getUser();

	if (!user) {
		return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const batchId = url.searchParams.get('batchId');
		const status = url.searchParams.get('status') || 'pending';
		const limit = parseInt(url.searchParams.get('limit') || '10');

		let query = supabase
			.from('suggested_rules')
			.select('*')
			.eq('user_id', user.id)
			.eq('status', status)
			.order('confidence', { ascending: false })
			.order('affected_count', { ascending: false })
			.limit(limit);

		if (batchId) {
			query = query.eq('batch_id', batchId);
		}

		const { data, error } = await query;

		if (error) throw error;

		const suggestions: SuggestedRule[] = (data || []).map(s => ({
			id: s.id,
			userId: s.user_id,
			batchId: s.batch_id,
			matchType: s.match_type,
			matchValue: s.match_value,
			matchField: s.match_field,
			suggestedCategory: s.suggested_category,
			suggestedKind: s.suggested_kind,
			suggestedExclude: s.suggested_exclude,
			confidence: parseFloat(s.confidence),
			affectedCount: s.affected_count,
			affectedAmount: parseFloat(s.affected_amount),
			sampleMerchants: s.sample_merchants || [],
			status: s.status,
			createdAt: s.created_at,
			respondedAt: s.responded_at
		}));

		return json({ ok: true, data: suggestions });
	} catch (error) {
		console.error('Error fetching suggestions:', error);
		return json({ ok: false, error: 'Failed to fetch suggestions' }, { status: 500 });
	}
};

// POST /api/rules/suggestions - Generate suggestions after import
export const POST: RequestHandler = async ({ request, locals }) => {
	const supabase = createClient(locals);
	const { data: { user } } = await supabase.auth.getUser();

	if (!user) {
		return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const body = await request.json();
		const { batchId, action } = body;

		// Handle accept/reject actions
		if (action === 'accept' || action === 'reject') {
			const { id, applyToExisting } = body;
			
			if (!id) {
				return json({ ok: false, error: 'Missing suggestion id' }, { status: 400 });
			}

			// Get the suggestion
			const { data: suggestion, error: fetchError } = await supabase
				.from('suggested_rules')
				.select('*')
				.eq('id', id)
				.eq('user_id', user.id)
				.single();

			if (fetchError || !suggestion) {
				return json({ ok: false, error: 'Suggestion not found' }, { status: 404 });
			}

			if (action === 'accept') {
				// Create the actual merchant rule
				const { error: ruleError } = await supabase
					.from('merchant_rules')
					.insert({
						user_id: user.id,
						match_type: suggestion.match_type,
						match_value: suggestion.match_value,
						match_field: suggestion.match_field,
						set_category: suggestion.suggested_category,
						set_kind: suggestion.suggested_kind,
						action_exclude: suggestion.suggested_exclude,
						enabled: true,
						priority: 100
					});

				if (ruleError) throw ruleError;

				// Optionally apply to existing transactions
				if (applyToExisting && suggestion.suggested_category) {
					await supabase
						.from('transactions')
						.update({ 
							category: suggestion.suggested_category,
							updated_at: new Date().toISOString()
						})
						.eq('user_id', user.id)
						.ilike('merchant_norm', `%${suggestion.match_value}%`);
				}
			}

			// Update suggestion status
			await supabase
				.from('suggested_rules')
				.update({
					status: action === 'accept' ? 'accepted' : 'rejected',
					responded_at: new Date().toISOString()
				})
				.eq('id', id)
				.eq('user_id', user.id);

			return json({ ok: true, data: { action, id } });
		}

		// Generate new suggestions for a batch
		if (!batchId) {
			return json({ ok: false, error: 'Missing batchId' }, { status: 400 });
		}

		const suggestions = await generateSuggestions(supabase, user.id, batchId);

		return json({ ok: true, data: { generated: suggestions.length, suggestions } });
	} catch (error) {
		console.error('Error processing suggestions:', error);
		return json({ ok: false, error: 'Failed to process suggestions' }, { status: 500 });
	}
};

// Generate rule suggestions based on transaction patterns
async function generateSuggestions(
	supabase: ReturnType<typeof createClient>, 
	userId: string, 
	batchId: string
): Promise<SuggestedRule[]> {
	// Get raw transactions from this batch
	const { data: rawTxs } = await supabase
		.from('raw_transactions')
		.select('merchant_norm, merchant_raw, amount_signed, category, kind')
		.eq('batch_id', batchId)
		.eq('user_id', userId);

	if (!rawTxs || rawTxs.length === 0) return [];

	// Get existing rules to avoid duplicates
	const { data: existingRules } = await supabase
		.from('merchant_rules')
		.select('match_value, match_type')
		.eq('user_id', userId)
		.eq('enabled', true);

	const existingPatterns = new Set(
		(existingRules || []).map(r => `${r.match_type}:${r.match_value.toLowerCase()}`)
	);

	// Group transactions by normalized merchant
	const merchantGroups: Record<string, {
		merchants: string[];
		amounts: number[];
		categories: string[];
		count: number;
	}> = {};

	for (const tx of rawTxs) {
		const key = tx.merchant_norm || 'unknown';
		if (!merchantGroups[key]) {
			merchantGroups[key] = {
				merchants: [],
				amounts: [],
				categories: [],
				count: 0
			};
		}
		
		merchantGroups[key].count++;
		if (tx.merchant_raw && !merchantGroups[key].merchants.includes(tx.merchant_raw)) {
			merchantGroups[key].merchants.push(tx.merchant_raw);
		}
		if (tx.amount_signed) {
			merchantGroups[key].amounts.push(Math.abs(parseFloat(tx.amount_signed)));
		}
		if (tx.category) {
			merchantGroups[key].categories.push(tx.category);
		}
	}

	// Also get historical transactions for better suggestions
	const { data: historicalTxs } = await supabase
		.from('transactions')
		.select('merchant_norm, category')
		.eq('user_id', userId)
		.not('category', 'is', null);

	// Build category frequency map from history
	const historicalCategories: Record<string, Record<string, number>> = {};
	for (const tx of historicalTxs || []) {
		if (!tx.merchant_norm || !tx.category) continue;
		if (!historicalCategories[tx.merchant_norm]) {
			historicalCategories[tx.merchant_norm] = {};
		}
		historicalCategories[tx.merchant_norm][tx.category] = 
			(historicalCategories[tx.merchant_norm][tx.category] || 0) + 1;
	}

	const suggestions: SuggestedRule[] = [];

	for (const [merchantNorm, data] of Object.entries(merchantGroups)) {
		// Skip if too few occurrences (need at least 2)
		if (data.count < 2) continue;

		// Skip if we already have a rule for this
		if (existingPatterns.has(`contains:${merchantNorm}`)) continue;

		// Determine the best category suggestion
		let suggestedCategory: string | null = null;
		let confidence = 0.7;

		// Check if all transactions in batch have same category
		const batchCategories = [...new Set(data.categories)].filter(c => c);
		if (batchCategories.length === 1) {
			suggestedCategory = batchCategories[0];
			confidence = 0.85;
		} else if (historicalCategories[merchantNorm]) {
			// Use most frequent category from history
			const catCounts = historicalCategories[merchantNorm];
			const topCat = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0];
			if (topCat) {
				suggestedCategory = topCat[0];
				const total = Object.values(catCounts).reduce((a, b) => a + b, 0);
				confidence = Math.min(0.95, 0.6 + (topCat[1] / total) * 0.35);
			}
		}

		// Skip if no category suggestion
		if (!suggestedCategory) continue;

		// Calculate total amount affected
		const totalAmount = data.amounts.reduce((a, b) => a + b, 0);

		// Create suggestion
		const suggestion: SuggestedRule = {
			id: '', // Will be set by DB
			userId,
			batchId,
			matchType: 'contains',
			matchValue: merchantNorm,
			matchField: 'merchant_norm',
			suggestedCategory,
			suggestedKind: null,
			suggestedExclude: false,
			confidence,
			affectedCount: data.count,
			affectedAmount: Math.round(totalAmount * 100) / 100,
			sampleMerchants: data.merchants.slice(0, 3),
			status: 'pending',
			createdAt: new Date().toISOString(),
			respondedAt: null
		};

		suggestions.push(suggestion);
	}

	// Sort by confidence * affected count (impact score)
	suggestions.sort((a, b) => {
		const scoreA = a.confidence * a.affectedCount;
		const scoreB = b.confidence * b.affectedCount;
		return scoreB - scoreA;
	});

	// Take top 5 suggestions
	const topSuggestions = suggestions.slice(0, 5);

	// Insert into database
	for (const suggestion of topSuggestions) {
		const { data: inserted, error } = await supabase
			.from('suggested_rules')
			.insert({
				user_id: userId,
				batch_id: batchId,
				match_type: suggestion.matchType,
				match_value: suggestion.matchValue,
				match_field: suggestion.matchField,
				suggested_category: suggestion.suggestedCategory,
				suggested_kind: suggestion.suggestedKind,
				suggested_exclude: suggestion.suggestedExclude,
				confidence: suggestion.confidence,
				affected_count: suggestion.affectedCount,
				affected_amount: suggestion.affectedAmount,
				sample_merchants: suggestion.sampleMerchants
			})
			.select()
			.single();

		if (!error && inserted) {
			suggestion.id = inserted.id;
		}
	}

	return topSuggestions;
}

