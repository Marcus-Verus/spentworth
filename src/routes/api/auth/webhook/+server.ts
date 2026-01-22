import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sendWelcomeEmail, sendPasswordChangedEmail } from '$lib/server/email';
import { SUPABASE_WEBHOOK_SECRET } from '$env/static/private';
import crypto from 'crypto';

// Verify Supabase webhook signature
function verifySignature(payload: string, signature: string, secret: string): boolean {
	const hmac = crypto.createHmac('sha256', secret);
	hmac.update(payload);
	const expectedSignature = hmac.digest('hex');
	return crypto.timingSafeEqual(
		Buffer.from(signature),
		Buffer.from(expectedSignature)
	);
}

// Supabase Auth Webhook Handler
// Configure this in Supabase Dashboard > Authentication > Webhooks
export const POST: RequestHandler = async ({ request }) => {
	const payload = await request.text();
	const signature = request.headers.get('x-supabase-signature');

	// Verify webhook signature if secret is configured
	if (SUPABASE_WEBHOOK_SECRET && signature) {
		if (!verifySignature(payload, signature, SUPABASE_WEBHOOK_SECRET)) {
			console.error('Invalid webhook signature');
			throw error(401, 'Invalid signature');
		}
	}

	try {
		const event = JSON.parse(payload);
		const { type, record, old_record } = event;

		switch (type) {
			case 'INSERT': {
				// New user signed up
				if (record?.email) {
					await sendWelcomeEmail({
						to: record.email,
						name: record.raw_user_meta_data?.full_name || record.email.split('@')[0]
					});
				}
				break;
			}

			case 'UPDATE': {
				// Check if password was changed (encrypted_password field changed)
				if (
					old_record?.encrypted_password &&
					record?.encrypted_password &&
					old_record.encrypted_password !== record.encrypted_password
				) {
					const now = new Date();
					await sendPasswordChangedEmail({
						to: record.email,
						name: record.raw_user_meta_data?.full_name || record.email.split('@')[0],
						date: now.toLocaleDateString('en-US', {
							weekday: 'long',
							year: 'numeric',
							month: 'long',
							day: 'numeric'
						}),
						time: now.toLocaleTimeString('en-US', {
							hour: '2-digit',
							minute: '2-digit',
							timeZoneName: 'short'
						}),
						// These would come from request headers in a real implementation
						location: 'Unknown location',
						device: 'Unknown device',
						ipAddress: 'Unknown'
					});
				}
				break;
			}
		}

		return json({ success: true });
	} catch (err) {
		console.error('Auth webhook error:', err);
		throw error(500, 'Webhook processing failed');
	}
};

