import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { stripe } from '$lib/server/stripe';
import { PUBLIC_BASE_URL } from '$env/static/public';

export const POST: RequestHandler = async ({ locals }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		throw error(401, 'Unauthorized');
	}

	try {
		const supabase = locals.supabase;
		const { data: subscription } = await supabase
			.from('subscriptions')
			.select('stripe_customer_id')
			.eq('user_id', user.id)
			.single();

		if (!subscription?.stripe_customer_id) {
			throw error(400, 'No billing account found');
		}

		// Create portal session
		const portalSession = await stripe.billingPortal.sessions.create({
			customer: subscription.stripe_customer_id,
			return_url: `${PUBLIC_BASE_URL}/settings`
		});

		return json({ url: portalSession.url });
	} catch (err) {
		console.error('Portal session error:', err);
		throw error(500, 'Failed to create portal session');
	}
};

