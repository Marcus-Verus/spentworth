import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const code = url.searchParams.get('code');
	const error = url.searchParams.get('error');
	
	// If there's an error, don't redirect - let the page show it
	if (error) {
		return { error: decodeURIComponent(error) };
	}
	
	// If OAuth code is present, redirect to callback handler with all params
	if (code) {
		// Forward all query parameters to preserve state
		const params = new URLSearchParams();
		url.searchParams.forEach((value, key) => {
			params.set(key, value);
		});
		throw redirect(303, `/auth/callback?${params.toString()}`);
	}
	
	return {};
};
