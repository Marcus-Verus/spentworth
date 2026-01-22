import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { stripe } from '$lib/server/stripe';
import { STRIPE_PRICE_PRO_MONTHLY, STRIPE_PRICE_PRO_YEARLY } from '$env/static/private';
import { PUBLIC_BASE_URL } from '$env/static/public';

export const POST: RequestHandler = async ({ request, locals }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		throw error(401, 'Unauthorized');
	}

	const body = await request.json();
	const { interval } = body as { interval: 'monthly' | 'yearly' };

	if (!interval || !['monthly', 'yearly'].includes(interval)) {
		throw error(400, 'Invalid interval');
	}

	const priceId = interval === 'monthly' ? STRIPE_PRICE_PRO_MONTHLY : STRIPE_PRICE_PRO_YEARLY;

	if (!priceId) {
		throw error(500, 'Stripe price not configured');
	}

	try {
		// Check if user already has a Stripe customer ID
		const supabase = locals.supabase;
		const { data: subscription } = await supabase
			.from('subscriptions')
			.select('stripe_customer_id')
			.eq('user_id', user.id)
			.single();

		let customerId = subscription?.stripe_customer_id;

		// Create Stripe customer if doesn't exist
		if (!customerId) {
			const customer = await stripe.customers.create({
				email: user.email,
				metadata: {
					user_id: user.id
				}
			});
			customerId = customer.id;

			// Save customer ID
			await supabase
				.from('subscriptions')
				.upsert({
					user_id: user.id,
					stripe_customer_id: customerId,
					status: 'free',
					plan: 'free'
				});
		}

		// Create checkout session
		const checkoutSession = await stripe.checkout.sessions.create({
			customer: customerId,
			mode: 'subscription',
			payment_method_types: ['card'],
			line_items: [
				{
					price: priceId,
					quantity: 1
				}
			],
			success_url: `${PUBLIC_BASE_URL}/dashboard?checkout=success`,
			cancel_url: `${PUBLIC_BASE_URL}/pricing?checkout=canceled`,
			subscription_data: {
				trial_period_days: 14,
				metadata: {
					user_id: user.id
				}
			},
			metadata: {
				user_id: user.id
			}
		});

		return json({ url: checkoutSession.url });
	} catch (err) {
		console.error('Stripe checkout error:', err);
		throw error(500, 'Failed to create checkout session');
	}
};

