import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { computeBatchSummary } from '$lib/server/imports/summary';
import type { TransactionKind, OverridePatch } from '$lib/types';

export const POST: RequestHandler = async ({ params, request, locals }) => {
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

	const body = await request.json();
	const { rawTransactionIds, patch, applyToAllWithMerchant } = body as {
		rawTransactionIds: string[];
		patch: OverridePatch;
		applyToAllWithMerchant?: string;
	};

	if (!rawTransactionIds || rawTransactionIds.length === 0) {
		throw error(400, 'No transaction IDs provided');
	}

	// If applyToAllWithMerchant is set, find ALL rows with that merchant in the batch
	let idsToUpdate = rawTransactionIds;
	if (applyToAllWithMerchant) {
		const { data: merchantRows } = await locals.supabase
			.from('raw_transactions')
			.select('id')
			.eq('batch_id', batchId)
			.eq('user_id', user.id)
			.eq('merchant_norm', applyToAllWithMerchant);
		
		if (merchantRows && merchantRows.length > 0) {
			idsToUpdate = merchantRows.map(r => r.id);
		}
	}

	// Upsert overrides for each row
	for (const rawId of idsToUpdate) {
		// Check if override exists
		const { data: existing } = await locals.supabase
			.from('transaction_overrides')
			.select('id')
			.eq('raw_transaction_id', rawId)
			.eq('user_id', user.id)
			.single();

		if (existing) {
			// Update existing override
			const updates: Record<string, unknown> = {};
			if (patch.kind !== undefined) updates.override_kind = patch.kind;
			if (patch.includedInSpend !== undefined) updates.override_included_in_spend = patch.includedInSpend;
			if (patch.category !== undefined) updates.override_category = patch.category;
			if (patch.merchant !== undefined) updates.override_merchant = patch.merchant;

			await locals.supabase
				.from('transaction_overrides')
				.update(updates)
				.eq('id', existing.id);
		} else {
			// Insert new override
			await locals.supabase.from('transaction_overrides').insert({
				user_id: user.id,
				raw_transaction_id: rawId,
				override_kind: patch.kind,
				override_included_in_spend: patch.includedInSpend,
				override_category: patch.category,
				override_merchant: patch.merchant
			});
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
		.in(
			'raw_transaction_id',
			(allRows || []).map((r) => r.id)
		);

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
		data: { summary }
	});
};
