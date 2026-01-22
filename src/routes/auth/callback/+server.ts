import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, cookies, locals: { supabase } }) => {
	const code = url.searchParams.get('code');
	const next = url.searchParams.get('next') || '/dashboard';
	const errorParam = url.searchParams.get('error');
	const errorDescription = url.searchParams.get('error_description');

	// If there's an OAuth error from Supabase, redirect to login with error message
	if (errorParam) {
		console.error('OAuth error:', errorParam, errorDescription);
		const errorMessage = encodeURIComponent(errorDescription || errorParam || 'Authentication failed');
		throw redirect(303, `/login?error=${errorMessage}`);
	}

	if (!code) {
		// No code provided - redirect to login without causing a loop
		throw redirect(303, '/login');
	}

	try {
		const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
		
		if (exchangeError) {
			console.error('OAuth exchange error:', exchangeError);
			// Redirect to login with error message - don't pass the code back
			const errorMessage = encodeURIComponent(exchangeError.message || 'Failed to complete sign in');
			throw redirect(303, `/login?error=${errorMessage}`);
		}

		// Success! Redirect to dashboard
		throw redirect(303, next);
	} catch (e) {
		// Re-throw redirects
		if (e && typeof e === 'object' && 'status' in e && e.status >= 300 && e.status < 400) {
			throw e;
		}
		// Log unexpected errors and redirect with message
		console.error('OAuth callback error:', e);
		const errorMessage = encodeURIComponent('An unexpected error occurred during sign in');
		throw redirect(303, `/login?error=${errorMessage}`);
	}
};
