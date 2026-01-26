import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { UserSource } from '$lib/types';

// GET - List user sources
export const GET: RequestHandler = async ({ locals }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		throw error(401, 'Unauthorized');
	}

	const { data: sources, error: fetchError } = await locals.supabase
		.from('user_sources')
		.select('*')
		.eq('user_id', user.id)
		.order('name');

	if (fetchError) {
		throw error(500, `Failed to fetch sources: ${fetchError.message}`);
	}

	// Transform to camelCase
	const transformedSources: UserSource[] = (sources || []).map((s) => ({
		id: s.id,
		userId: s.user_id,
		name: s.name,
		sourceType: s.source_type,
		institution: s.institution,
		lastUploadedAt: s.last_uploaded_at,
		uploadReminderDays: s.upload_reminder_days,
		csvMapping: s.csv_mapping,
		enabled: s.enabled,
		createdAt: s.created_at,
		updatedAt: s.updated_at
	}));

	// Calculate days since upload for each source
	const now = new Date();
	const sourcesWithStatus = transformedSources.map((s) => {
		let daysSinceUpload: number | null = null;
		let needsUpload = false;

		if (s.lastUploadedAt) {
			const lastUpload = new Date(s.lastUploadedAt);
			daysSinceUpload = Math.floor((now.getTime() - lastUpload.getTime()) / (1000 * 60 * 60 * 24));
			needsUpload = daysSinceUpload >= s.uploadReminderDays;
		} else {
			needsUpload = true; // Never uploaded
		}

		return {
			...s,
			daysSinceUpload,
			needsUpload
		};
	});

	return json({ ok: true, data: sourcesWithStatus });
};

// POST - Create a new source
export const POST: RequestHandler = async ({ request, locals }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		throw error(401, 'Unauthorized');
	}

	const body = await request.json();
	const { name, sourceType, institution, uploadReminderDays } = body;

	if (!name) {
		throw error(400, 'Name is required');
	}

	const { data: source, error: insertError } = await locals.supabase
		.from('user_sources')
		.insert({
			user_id: user.id,
			name,
			source_type: sourceType || 'bank',
			institution: institution || null,
			upload_reminder_days: uploadReminderDays || 7
		})
		.select()
		.single();

	if (insertError) {
		throw error(500, `Failed to create source: ${insertError.message}`);
	}

	return json({ ok: true, data: source });
};

// PATCH - Update a source
export const PATCH: RequestHandler = async ({ request, locals }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		throw error(401, 'Unauthorized');
	}

	const body = await request.json();
	const { id, name, sourceType, institution, uploadReminderDays, enabled, lastUploadedAt } = body;

	if (!id) {
		throw error(400, 'Source ID is required');
	}

	const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
	if (name !== undefined) updates.name = name;
	if (sourceType !== undefined) updates.source_type = sourceType;
	if (institution !== undefined) updates.institution = institution;
	if (uploadReminderDays !== undefined) updates.upload_reminder_days = uploadReminderDays;
	if (enabled !== undefined) updates.enabled = enabled;
	if (lastUploadedAt !== undefined) updates.last_uploaded_at = lastUploadedAt;

	const { error: updateError } = await locals.supabase
		.from('user_sources')
		.update(updates)
		.eq('id', id)
		.eq('user_id', user.id);

	if (updateError) {
		throw error(500, `Failed to update source: ${updateError.message}`);
	}

	return json({ ok: true });
};

// DELETE - Remove a source
export const DELETE: RequestHandler = async ({ request, locals }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		throw error(401, 'Unauthorized');
	}

	const body = await request.json();
	const { id } = body;

	if (!id) {
		throw error(400, 'Source ID is required');
	}

	const { error: deleteError } = await locals.supabase
		.from('user_sources')
		.delete()
		.eq('id', id)
		.eq('user_id', user.id);

	if (deleteError) {
		throw error(500, `Failed to delete source: ${deleteError.message}`);
	}

	return json({ ok: true });
};

