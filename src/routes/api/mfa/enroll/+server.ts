import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Start MFA enrollment - returns QR code and secret
export const POST: RequestHandler = async ({ locals: { supabase, safeGetSession } }) => {
	const { session } = await safeGetSession();
	
	if (!session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const { data, error } = await supabase.auth.mfa.enroll({
			factorType: 'totp',
			friendlyName: 'Authenticator App'
		});

		if (error) {
			console.error('MFA enroll error:', error);
			return json({ error: error.message }, { status: 400 });
		}

		return json({
			factorId: data.id,
			qrCode: data.totp.qr_code,
			secret: data.totp.secret,
			uri: data.totp.uri
		});
	} catch (err) {
		console.error('MFA enroll exception:', err);
		return json({ error: 'Failed to start MFA enrollment' }, { status: 500 });
	}
};

