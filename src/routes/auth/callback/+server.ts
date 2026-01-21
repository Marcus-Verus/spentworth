import { redirect, error as svelteError } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, cookies, locals: { supabase } }) => {
	try {
		const code = url.searchParams.get('code');
		const next = url.searchParams.get('next') || '/dashboard';

		if (code) {
			const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
			if (!exchangeError) {
				throw redirect(303, next);
			}
			// Log error for debugging
			console.error('OAuth exchange error:', exchangeError);
		}

		// If there's an error or no code, redirect to login
		throw redirect(303, '/login');
	} catch (e) {
		// Re-throw redirects
		if (e && typeof e === 'object' && 'status' in e && e.status >= 300 && e.status < 400) {
			throw e;
		}
		// Log unexpected errors
		console.error('OAuth callback error:', e);
		throw redirect(303, '/login');
	}
};
