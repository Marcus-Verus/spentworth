import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sendWelcomeEmail } from '$lib/server/email';

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
		const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
		
		if (exchangeError) {
			console.error('OAuth exchange error:', exchangeError);
			// Redirect to login with error message - don't pass the code back
			const errorMessage = encodeURIComponent(exchangeError.message || 'Failed to complete sign in');
			throw redirect(303, `/login?error=${errorMessage}`);
		}

		// Check if this is a new user (created within the last 60 seconds)
		if (data?.user) {
			const createdAt = new Date(data.user.created_at);
			const now = new Date();
			const secondsSinceCreation = (now.getTime() - createdAt.getTime()) / 1000;
			
			// If user was created in the last 60 seconds, send welcome email
			if (secondsSinceCreation < 60) {
				const email = data.user.email;
				const name = data.user.user_metadata?.full_name || 
				             data.user.user_metadata?.name || 
				             email?.split('@')[0] || 'there';
				
				if (email) {
					// Send welcome email asynchronously (don't block redirect)
					sendWelcomeEmail({ to: email, name }).catch(err => {
						console.error('Failed to send welcome email for OAuth user:', err);
					});
				}
			}
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
