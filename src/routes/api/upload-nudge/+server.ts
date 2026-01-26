import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { UploadNudgeData } from '$lib/types';

// GET - Get upload nudge data for dashboard
export const GET: RequestHandler = async ({ locals }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		throw error(401, 'Unauthorized');
	}

	const now = new Date();

	// Check notification preferences
	const { data: prefs } = await locals.supabase
		.from('notification_prefs')
		.select('show_upload_nudges')
		.eq('user_id', user.id)
		.single();

	// If user has disabled nudges, don't show
	if (prefs && prefs.show_upload_nudges === false) {
		return json({
			ok: true,
			data: {
				show: false,
				daysSinceLastUpload: null,
				sourcesNeedingUpload: [],
				message: ''
			} as UploadNudgeData
		});
	}

	// Get last import date
	const { data: lastImport } = await locals.supabase
		.from('import_batches')
		.select('uploaded_at')
		.eq('user_id', user.id)
		.eq('status', 'committed')
		.order('uploaded_at', { ascending: false })
		.limit(1)
		.single();

	let daysSinceLastUpload: number | null = null;
	if (lastImport?.uploaded_at) {
		const lastUploadDate = new Date(lastImport.uploaded_at);
		daysSinceLastUpload = Math.floor((now.getTime() - lastUploadDate.getTime()) / (1000 * 60 * 60 * 24));
	}

	// Get sources needing upload
	const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
	const { data: sources } = await locals.supabase
		.from('user_sources')
		.select('id, name, last_uploaded_at, upload_reminder_days')
		.eq('user_id', user.id)
		.eq('enabled', true);

	const sourcesNeedingUpload: UploadNudgeData['sourcesNeedingUpload'] = [];
	
	for (const source of sources || []) {
		let daysSinceUpload = 0;
		if (source.last_uploaded_at) {
			const lastUpload = new Date(source.last_uploaded_at);
			daysSinceUpload = Math.floor((now.getTime() - lastUpload.getTime()) / (1000 * 60 * 60 * 24));
		} else {
			daysSinceUpload = 999; // Never uploaded
		}

		if (daysSinceUpload >= source.upload_reminder_days) {
			sourcesNeedingUpload.push({
				id: source.id,
				name: source.name,
				daysSinceUpload,
				uploadReminderDays: source.upload_reminder_days
			});
		}
	}

	// Determine if we should show the nudge
	let show = false;
	let message = '';

	if (sourcesNeedingUpload.length > 0) {
		show = true;
		if (sourcesNeedingUpload.length === 1) {
			message = `Time to upload from ${sourcesNeedingUpload[0].name}`;
		} else {
			message = `${sourcesNeedingUpload.length} sources need fresh data`;
		}
	} else if (daysSinceLastUpload !== null && daysSinceLastUpload >= 7) {
		show = true;
		message = `It's been ${daysSinceLastUpload} days since your last upload`;
	} else if (daysSinceLastUpload === null) {
		// Never uploaded - but only show if they have sources set up
		if ((sources || []).length > 0) {
			show = true;
			message = 'Upload your first statement to get started';
		}
	}

	const nudgeData: UploadNudgeData = {
		show,
		daysSinceLastUpload,
		sourcesNeedingUpload,
		message
	};

	return json({ ok: true, data: nudgeData });
};

