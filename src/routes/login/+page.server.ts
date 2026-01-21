import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	// If OAuth code is present, redirect to callback handler
	const code = url.searchParams.get('code');
	if (code) {
		throw redirect(303, `/auth/callback?code=${code}`);
	}
};
