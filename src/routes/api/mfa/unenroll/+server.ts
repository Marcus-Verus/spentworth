import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Remove MFA factor
export const POST: RequestHandler = async ({ request, locals: { supabase, safeGetSession } }) => {
	const { session } = await safeGetSession();
	
	if (!session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const { factorId } = await request.json();

		if (!factorId) {
			return json({ error: 'Missing factorId' }, { status: 400 });
		}

		const { error } = await supabase.auth.mfa.unenroll({
			factorId
		});

		if (error) {
			console.error('MFA unenroll error:', error);
			return json({ error: error.message }, { status: 400 });
		}

		return json({ success: true });
	} catch (err) {
		console.error('MFA unenroll exception:', err);
		return json({ error: 'Failed to disable MFA' }, { status: 500 });
	}
};

