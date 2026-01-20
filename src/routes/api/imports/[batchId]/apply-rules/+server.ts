import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { computeBatchSummary } from '$lib/server/imports/summary';
import type { TransactionKind, MerchantRule } from '$lib/types';

export const POST: RequestHandler = async ({ params, locals }) => {
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

	// Fetch user's merchant rules
	const { data: rules } = await locals.supabase
		.from('merchant_rules')
		.select('*')
		.eq('user_id', user.id)
		.eq('enabled', true)
		.order('priority', { ascending: true });

	if (!rules || rules.length === 0) {
		return json({ ok: true, data: { applied: 0 } });
	}

	// Fetch all raw transactions for this batch
	const { data: rawRows } = await locals.supabase
		.from('raw_transactions')
		.select('id, merchant_norm, description_raw, kind, included_in_spend, category')
		.eq('batch_id', batchId);

	if (!rawRows || rawRows.length === 0) {
		return json({ ok: true, data: { applied: 0 } });
	}

	let appliedCount = 0;

	// Apply rules to each row
	for (const row of rawRows) {
		for (const rule of rules) {
			const fieldValue = rule.match_field === 'merchant_norm' 
				? row.merchant_norm 
				: row.description_raw;

			if (!fieldValue) continue;

			let matches = false;

			switch (rule.match_type) {
				case 'contains':
					matches = fieldValue.toUpperCase().includes(rule.match_value.toUpperCase());
					break;
				case 'equals':
					matches = fieldValue.toUpperCase() === rule.match_value.toUpperCase();
					break;
				case 'regex':
					try {
						matches = new RegExp(rule.match_value, 'i').test(fieldValue);
					} catch {
						matches = false;
					}
					break;
			}

			if (matches) {
				// Check if there's an existing override for this row
				const { data: existingOverride } = await locals.supabase
					.from('transaction_overrides')
					.select('id')
					.eq('raw_transaction_id', row.id)
					.eq('user_id', user.id)
					.single();

				const overrideData: Record<string, unknown> = {
					user_id: user.id,
					raw_transaction_id: row.id
				};

				if (rule.set_kind) {
					overrideData.override_kind = rule.set_kind;
				}
				if (rule.action_exclude !== undefined) {
					overrideData.override_included_in_spend = !rule.action_exclude;
				}
				if (rule.set_category) {
					overrideData.override_category = rule.set_category;
				}

				if (existingOverride) {
					// Update existing
					await locals.supabase
						.from('transaction_overrides')
						.update(overrideData)
						.eq('id', existingOverride.id);
				} else {
					// Insert new
					await locals.supabase
						.from('transaction_overrides')
						.insert(overrideData);
				}

				appliedCount++;
				break; // Only apply first matching rule (highest priority)
			}
		}
	}

	// Recompute summary
	const { data: allRows } = await locals.supabase
		.from('raw_transactions')
		.select('id, parse_status, amount_signed, date_chosen, kind, included_in_spend, is_duplicate')
		.eq('batch_id', batchId);

	const { data: allOverrides } = await locals.supabase
		.from('transaction_overrides')
		.select('raw_transaction_id, override_kind, override_included_in_spend')
		.in('raw_transaction_id', (allRows || []).map((r) => r.id));

	const allOverrideMap = new Map(
		(allOverrides || []).map((o) => [o.raw_transaction_id, o])
	);

	const summaryRows = (allRows || []).map((r) => {
		const override = allOverrideMap.get(r.id);
		return {
			parseStatus: r.parse_status as 'ok' | 'error',
			amountSigned: r.amount_signed,
			dateChosen: r.date_chosen,
			systemKind: r.kind as TransactionKind,
			systemIncludedInSpend: r.included_in_spend,
			effectiveKind: (override?.override_kind ?? r.kind) as TransactionKind,
			effectiveIncludedInSpend: override?.override_included_in_spend ?? r.included_in_spend,
			isDuplicate: r.is_duplicate
		};
	});

	const summary = computeBatchSummary(summaryRows);

	// Update batch summary
	await locals.supabase
		.from('import_batches')
		.update({
			rows_included: summary.rowsIncluded,
			rows_excluded: summary.rowsExcluded,
			rows_needs_review: summary.rowsNeedsReview,
			total_included_spend: summary.totalIncludedSpend,
			total_excluded_amount: summary.totalExcludedAmount
		})
		.eq('id', batchId);

	return json({
		ok: true,
		data: { applied: appliedCount, summary }
	});
};
