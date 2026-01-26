import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

// Create client from request locals (for API routes)
// This returns the authenticated Supabase client set up in hooks.server.ts
export function createClient(locals: App.Locals) {
	return locals.supabase;
}

// Server-side Supabase client
export function createServerClient() {
	return createSupabaseClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
		auth: {
			autoRefreshToken: false,
			persistSession: false
		}
	});
}

// Create authenticated client with user's access token
export function createAuthenticatedClient(accessToken: string) {
	return createSupabaseClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
		global: {
			headers: {
				Authorization: `Bearer ${accessToken}`
			}
		},
		auth: {
			autoRefreshToken: false,
			persistSession: false
		}
	});
}
