import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Verify TOTP code and complete MFA enrollment
export const POST: RequestHandler = async ({ request, locals: { supabase, safeGetSession } }) => {
	const { session } = await safeGetSession();
	
	if (!session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const { factorId, code } = await request.json();

		if (!factorId || !code) {
			return json({ error: 'Missing factorId or code' }, { status: 400 });
		}

		// Create a challenge for this factor
		const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
			factorId
		});

		if (challengeError) {
			console.error('MFA challenge error:', challengeError);
			return json({ error: challengeError.message }, { status: 400 });
		}

		// Verify the challenge with the provided code
		const { data, error } = await supabase.auth.mfa.verify({
			factorId,
			challengeId: challengeData.id,
			code
		});

		if (error) {
			console.error('MFA verify error:', error);
			return json({ error: 'Invalid code. Please try again.' }, { status: 400 });
		}

		return json({ success: true });
	} catch (err) {
		console.error('MFA verify exception:', err);
		return json({ error: 'Failed to verify MFA code' }, { status: 500 });
	}
};

