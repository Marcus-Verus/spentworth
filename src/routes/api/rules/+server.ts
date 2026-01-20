import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		throw error(401, 'Unauthorized');
	}

	const { data: rules, error: fetchError } = await locals.supabase
		.from('merchant_rules')
		.select('*')
		.eq('user_id', user.id)
		.order('priority', { ascending: true });

	if (fetchError) {
		throw error(500, 'Failed to fetch rules');
	}

	return json({
		ok: true,
		data: {
			rules: (rules || []).map((r) => ({
				id: r.id,
				matchType: r.match_type,
				matchValue: r.match_value,
				matchField: r.match_field,
				actionExclude: r.action_exclude,
				setKind: r.set_kind,
				setCategory: r.set_category,
				priority: r.priority,
				enabled: r.enabled,
				createdAt: r.created_at
			}))
		}
	});
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		throw error(401, 'Unauthorized');
	}

	const body = await request.json();
	const { matchType, matchField, matchValue, actionExclude, setKind, setCategory, priority } = body;

	if (!matchValue) {
		throw error(400, 'Match value is required');
	}

	// Normalize match value for contains/equals
	const normalizedValue =
		matchType === 'regex' ? matchValue : matchValue.toUpperCase();

	const { data: rule, error: insertError } = await locals.supabase
		.from('merchant_rules')
		.insert({
			user_id: user.id,
			match_type: matchType || 'contains',
			match_field: matchField || 'merchant_norm',
			match_value: normalizedValue,
			action_exclude: actionExclude || false,
			set_kind: setKind || null,
			set_category: setCategory || null,
			priority: priority || 100,
			enabled: true
		})
		.select()
		.single();

	if (insertError || !rule) {
		throw error(500, 'Failed to create rule');
	}

	return json({
		ok: true,
		data: { ruleId: rule.id }
	});
};
