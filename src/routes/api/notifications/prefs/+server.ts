import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { NotificationPrefs } from '$lib/types';

// GET - Fetch notification preferences
export const GET: RequestHandler = async ({ locals }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		throw error(401, 'Unauthorized');
	}

	const { data: prefs, error: fetchError } = await locals.supabase
		.from('notification_prefs')
		.select('*')
		.eq('user_id', user.id)
		.single();

	if (fetchError && fetchError.code !== 'PGRST116') {
		throw error(500, `Failed to fetch preferences: ${fetchError.message}`);
	}

	// If no prefs exist, return defaults
	if (!prefs) {
		return json({
			ok: true,
			data: {
				userId: user.id,
				dailyBriefEnabled: false,
				dailyBriefTime: '09:00:00',
				dailyBriefTimezone: 'America/New_York',
				dailyBriefLastSent: null,
				uploadReminderEnabled: true,
				uploadReminderEmail: false,
				reviewInboxEnabled: true,
				reviewInboxDailyGoal: 5,
				weeklyPulseEnabled: true,
				weeklyPulseDay: 1,
				weeklyPulseLastSent: null,
				showUploadNudges: true,
				showAchievementBadges: true
			} as NotificationPrefs
		});
	}

	// Transform to camelCase
	const transformedPrefs: NotificationPrefs = {
		userId: prefs.user_id,
		dailyBriefEnabled: prefs.daily_brief_enabled,
		dailyBriefTime: prefs.daily_brief_time,
		dailyBriefTimezone: prefs.daily_brief_timezone,
		dailyBriefLastSent: prefs.daily_brief_last_sent,
		uploadReminderEnabled: prefs.upload_reminder_enabled,
		uploadReminderEmail: prefs.upload_reminder_email,
		reviewInboxEnabled: prefs.review_inbox_enabled,
		reviewInboxDailyGoal: prefs.review_inbox_daily_goal,
		weeklyPulseEnabled: prefs.weekly_pulse_enabled,
		weeklyPulseDay: prefs.weekly_pulse_day,
		weeklyPulseLastSent: prefs.weekly_pulse_last_sent,
		showUploadNudges: prefs.show_upload_nudges,
		showAchievementBadges: prefs.show_achievement_badges,
		createdAt: prefs.created_at,
		updatedAt: prefs.updated_at
	};

	return json({ ok: true, data: transformedPrefs });
};

// POST/PATCH - Update notification preferences
export const POST: RequestHandler = async ({ request, locals }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		throw error(401, 'Unauthorized');
	}

	const body = await request.json();

	// Build update object with snake_case keys
	const updates: Record<string, unknown> = {
		updated_at: new Date().toISOString()
	};

	if (body.dailyBriefEnabled !== undefined) updates.daily_brief_enabled = body.dailyBriefEnabled;
	if (body.dailyBriefTime !== undefined) updates.daily_brief_time = body.dailyBriefTime;
	if (body.dailyBriefTimezone !== undefined) updates.daily_brief_timezone = body.dailyBriefTimezone;
	if (body.uploadReminderEnabled !== undefined) updates.upload_reminder_enabled = body.uploadReminderEnabled;
	if (body.uploadReminderEmail !== undefined) updates.upload_reminder_email = body.uploadReminderEmail;
	if (body.reviewInboxEnabled !== undefined) updates.review_inbox_enabled = body.reviewInboxEnabled;
	if (body.reviewInboxDailyGoal !== undefined) updates.review_inbox_daily_goal = body.reviewInboxDailyGoal;
	if (body.weeklyPulseEnabled !== undefined) updates.weekly_pulse_enabled = body.weeklyPulseEnabled;
	if (body.weeklyPulseDay !== undefined) updates.weekly_pulse_day = body.weeklyPulseDay;
	if (body.showUploadNudges !== undefined) updates.show_upload_nudges = body.showUploadNudges;
	if (body.showAchievementBadges !== undefined) updates.show_achievement_badges = body.showAchievementBadges;

	// Upsert the preferences
	const { error: upsertError } = await locals.supabase
		.from('notification_prefs')
		.upsert({
			user_id: user.id,
			...updates
		}, {
			onConflict: 'user_id'
		});

	if (upsertError) {
		throw error(500, `Failed to update preferences: ${upsertError.message}`);
	}

	return json({ ok: true });
};

