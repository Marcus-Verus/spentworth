import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const code = url.searchParams.get('code');
	const error = url.searchParams.get('error');
	const errorDescription = url.searchParams.get('error_description');
	
	// Pass code and error to client for handling
	// Don't redirect - let client-side handle the PKCE exchange
	return { 
		code: code || null,
		error: error ? decodeURIComponent(errorDescription || error) : null
	};
};
