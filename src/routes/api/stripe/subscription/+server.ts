import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export interface SubscriptionInfo {
	plan: 'free' | 'pro';
	status: 'free' | 'active' | 'trialing' | 'past_due' | 'canceled';
	interval: 'monthly' | 'yearly' | null;
	currentPeriodEnd: string | null;
	cancelAtPeriodEnd: boolean;
	trialEnd: string | null;
	hasStripeCustomer: boolean;
}

export const GET: RequestHandler = async ({ locals }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		throw error(401, 'Unauthorized');
	}

	try {
		const supabase = locals.supabase;
		const { data: subscription, error: subError } = await supabase
			.from('subscriptions')
			.select('*')
			.eq('user_id', user.id)
			.single();

		if (subError && subError.code !== 'PGRST116') {
			// PGRST116 = no rows found
			throw error(500, 'Failed to fetch subscription');
		}

		const info: SubscriptionInfo = {
			plan: subscription?.plan || 'free',
			status: subscription?.status || 'free',
			interval: subscription?.interval || null,
			currentPeriodEnd: subscription?.current_period_end || null,
			cancelAtPeriodEnd: subscription?.cancel_at_period_end || false,
			trialEnd: subscription?.trial_end || null,
			hasStripeCustomer: !!subscription?.stripe_customer_id
		};

		return json(info);
	} catch (err) {
		console.error('Subscription fetch error:', err);
		throw error(500, 'Failed to fetch subscription');
	}
};

