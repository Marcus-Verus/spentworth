import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		throw error(401, 'Unauthorized');
	}

	const { data: batches, error: fetchError } = await locals.supabase
		.from('import_batches')
		.select('*')
		.eq('user_id', user.id)
		.neq('status', 'deleted')
		.order('uploaded_at', { ascending: false });

	if (fetchError) {
		throw error(500, 'Failed to fetch imports');
	}

	return json({
		ok: true,
		data: {
			batches: (batches || []).map((b) => ({
				id: b.id,
				sourceName: b.source_name,
				originalFilename: b.original_filename,
				uploadedAt: b.uploaded_at,
				status: b.status,
				dateMin: b.date_min,
				dateMax: b.date_max,
				rowsTotal: b.rows_total,
				rowsIncluded: b.rows_included,
				rowsExcluded: b.rows_excluded,
				rowsNeedsReview: b.rows_needs_review,
				totalIncludedSpend: b.total_included_spend
			}))
		}
	});
};
