import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sendWelcomeEmail } from '$lib/server/email';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';

// This endpoint can be called by Supabase webhooks or internally
export const POST: RequestHandler = async ({ request, locals }) => {
	// Verify this is either from Supabase webhook or authenticated admin
	const authHeader = request.headers.get('authorization');
	const isServiceRole = authHeader === `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`;
	
	// Also allow if user just signed up (called from client after signup)
	const session = await locals.supabase.auth.getSession();
	const isAuthenticated = !!session.data.session;

	if (!isServiceRole && !isAuthenticated) {
		throw error(401, 'Unauthorized');
	}

	try {
		const body = await request.json();
		const { email, name } = body;

		if (!email) {
			throw error(400, 'Email is required');
		}

		await sendWelcomeEmail({
			to: email,
			name: name || email.split('@')[0]
		});

		return json({ success: true });
	} catch (err) {
		console.error('Failed to send welcome email:', err);
		throw error(500, 'Failed to send email');
	}
};

