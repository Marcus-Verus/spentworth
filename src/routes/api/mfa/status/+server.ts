import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Get current MFA status and factors
export const GET: RequestHandler = async ({ locals: { supabase, safeGetSession } }) => {
	const { session, user } = await safeGetSession();
	
	if (!session || !user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const { data, error } = await supabase.auth.mfa.listFactors();

		if (error) {
			console.error('MFA list factors error:', error);
			return json({ error: error.message }, { status: 400 });
		}

		// Filter to only verified TOTP factors
		const verifiedFactors = data.totp.filter(f => f.status === 'verified');
		const pendingFactors = data.totp.filter(f => f.status === 'unverified');

		return json({
			enabled: verifiedFactors.length > 0,
			factors: verifiedFactors.map(f => ({
				id: f.id,
				friendlyName: f.friendly_name,
				createdAt: f.created_at
			})),
			pendingFactors: pendingFactors.map(f => ({
				id: f.id,
				friendlyName: f.friendly_name
			}))
		});
	} catch (err) {
		console.error('MFA status exception:', err);
		return json({ error: 'Failed to get MFA status' }, { status: 500 });
	}
};

