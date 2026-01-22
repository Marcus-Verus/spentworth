import { json, type RequestHandler } from '@sveltejs/kit';
import { TURNSTILE_SECRET_KEY, RESEND_API_KEY } from '$env/static/private';
import { Resend } from 'resend';

interface TurnstileResponse {
	success: boolean;
	'error-codes'?: string[];
	challenge_ts?: string;
	hostname?: string;
}

async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
	const formData = new URLSearchParams();
	formData.append('secret', TURNSTILE_SECRET_KEY);
	formData.append('response', token);
	formData.append('remoteip', ip);

	const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
		method: 'POST',
		body: formData
	});

	const result: TurnstileResponse = await response.json();
	return result.success;
}

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	try {
		const body = await request.json();
		const { name, email, message, turnstileToken } = body;

		// Validate required fields
		if (!name || !email || !message) {
			return json({ error: 'Please fill in all fields' }, { status: 400 });
		}

		if (!turnstileToken) {
			return json({ error: 'Please complete the security check' }, { status: 400 });
		}

		// Validate email format
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			return json({ error: 'Please enter a valid email address' }, { status: 400 });
		}

		// Validate message length
		if (message.length < 10) {
			return json({ error: 'Message must be at least 10 characters' }, { status: 400 });
		}

		if (message.length > 5000) {
			return json({ error: 'Message must be less than 5000 characters' }, { status: 400 });
		}

		// Verify Turnstile token
		const clientIp = getClientAddress();
		const isValid = await verifyTurnstile(turnstileToken, clientIp);

		if (!isValid) {
			return json({ error: 'Security verification failed. Please try again.' }, { status: 400 });
		}

		// Send email to support
		const html = `
			<div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
				<h2 style="color: #0d9488;">New Contact Form Submission</h2>
				<div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
					<p style="margin: 0 0 10px 0;"><strong>From:</strong> ${escapeHtml(name)}</p>
					<p style="margin: 0 0 10px 0;"><strong>Email:</strong> ${escapeHtml(email)}</p>
					<p style="margin: 0;"><strong>IP:</strong> ${clientIp}</p>
				</div>
				<h3 style="color: #333;">Message:</h3>
				<div style="background: #fff; padding: 20px; border: 1px solid #e5e5e5; border-radius: 8px;">
					<p style="margin: 0; white-space: pre-wrap;">${escapeHtml(message)}</p>
				</div>
				<p style="color: #666; font-size: 12px; margin-top: 20px;">
					Sent from SpentWorth Contact Form on ${new Date().toISOString()}
				</p>
			</div>
		`;

		const resend = new Resend(RESEND_API_KEY);
		await resend.emails.send({
			from: 'SpentWorth <hello@updates.spentworth.com>',
			to: 'support@spentworth.com',
			subject: `[SpentWorth Contact] Message from ${name}`,
			html,
			reply_to: email,
			tags: [{ name: 'email_type', value: 'contact_form' }]
		});

		return json({ success: true, message: 'Your message has been sent! We\'ll get back to you soon.' });
	} catch (error) {
		console.error('Contact form error:', error);
		return json({ error: 'Failed to send message. Please try again later.' }, { status: 500 });
	}
};

function escapeHtml(text: string): string {
	const map: Record<string, string> = {
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		"'": '&#039;'
	};
	return text.replace(/[&<>"']/g, (m) => map[m]);
}

