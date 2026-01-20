import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

// Server-side Supabase client
export function createServerClient() {
	return createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
		auth: {
			autoRefreshToken: false,
			persistSession: false
		}
	});
}

// Create authenticated client with user's access token
export function createAuthenticatedClient(accessToken: string) {
	return createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
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
