import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { stripe } from '$lib/server/stripe';
import { STRIPE_WEBHOOK_SECRET } from '$env/static/private';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import type Stripe from 'stripe';
import { sendProUpgradeEmail } from '$lib/server/email';

// Use service role for webhook operations (bypasses RLS)
const supabaseAdmin = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
	auth: {
		autoRefreshToken: false,
		persistSession: false
	}
});

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.text();
	const signature = request.headers.get('stripe-signature');

	if (!signature) {
		throw error(400, 'Missing stripe-signature header');
	}

	let event: Stripe.Event;

	try {
		event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);
	} catch (err) {
		console.error('Webhook signature verification failed:', err);
		throw error(400, 'Webhook signature verification failed');
	}

	try {
		switch (event.type) {
			case 'checkout.session.completed': {
				const session = event.data.object as Stripe.Checkout.Session;
				await handleCheckoutComplete(session);
				break;
			}

			case 'customer.subscription.created':
			case 'customer.subscription.updated': {
				const subscription = event.data.object as Stripe.Subscription;
				await handleSubscriptionUpdate(subscription);
				break;
			}

			case 'customer.subscription.deleted': {
				const subscription = event.data.object as Stripe.Subscription;
				await handleSubscriptionDeleted(subscription);
				break;
			}

			case 'invoice.payment_failed': {
				const invoice = event.data.object as Stripe.Invoice;
				await handlePaymentFailed(invoice);
				break;
			}

			default:
				console.log(`Unhandled event type: ${event.type}`);
		}

		return json({ received: true });
	} catch (err) {
		console.error('Webhook handler error:', err);
		throw error(500, 'Webhook handler failed');
	}
};

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
	const userId = session.metadata?.user_id;
	const customerId = session.customer as string;
	const subscriptionId = session.subscription as string;

	if (!userId) {
		console.error('No user_id in checkout session metadata');
		return;
	}

	// Fetch subscription details
	const subscription = await stripe.subscriptions.retrieve(subscriptionId);
	const billingInterval = subscription.items.data[0]?.price.recurring?.interval;

	await supabaseAdmin.from('subscriptions').upsert({
		user_id: userId,
		stripe_customer_id: customerId,
		stripe_subscription_id: subscriptionId,
		stripe_price_id: subscription.items.data[0]?.price.id,
		status: subscription.status === 'trialing' ? 'trialing' : 'active',
		plan: 'pro',
		interval: billingInterval === 'year' ? 'yearly' : 'monthly',
		current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
		current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
		trial_start: subscription.trial_start
			? new Date(subscription.trial_start * 1000).toISOString()
			: null,
		trial_end: subscription.trial_end
			? new Date(subscription.trial_end * 1000).toISOString()
			: null,
		updated_at: new Date().toISOString()
	});

	// Send Pro upgrade email
	try {
		// Get user email from Supabase auth
		const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
		
		if (userData?.user?.email) {
			const nextBillingDate = new Date(subscription.current_period_end * 1000);
			const formattedDate = nextBillingDate.toLocaleDateString('en-US', {
				year: 'numeric',
				month: 'long',
				day: 'numeric'
			});

			await sendProUpgradeEmail({
				to: userData.user.email,
				name: userData.user.user_metadata?.full_name || userData.user.email.split('@')[0],
				billingCycle: billingInterval === 'year' ? 'Yearly' : 'Monthly',
				nextBillingDate: formattedDate
			});
		}
	} catch (emailError) {
		// Log but don't fail the webhook
		console.error('Failed to send Pro upgrade email:', emailError);
	}
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
	const customerId = subscription.customer as string;

	// Find user by customer ID
	const { data: existingSub } = await supabaseAdmin
		.from('subscriptions')
		.select('user_id')
		.eq('stripe_customer_id', customerId)
		.single();

	if (!existingSub) {
		console.error('No subscription found for customer:', customerId);
		return;
	}

	const status = mapStripeStatus(subscription.status);

	await supabaseAdmin
		.from('subscriptions')
		.update({
			stripe_subscription_id: subscription.id,
			stripe_price_id: subscription.items.data[0]?.price.id,
			status,
			plan: status === 'free' ? 'free' : 'pro',
			interval: subscription.items.data[0]?.price.recurring?.interval === 'year' ? 'yearly' : 'monthly',
			current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
			current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
			cancel_at_period_end: subscription.cancel_at_period_end,
			canceled_at: subscription.canceled_at
				? new Date(subscription.canceled_at * 1000).toISOString()
				: null,
			trial_start: subscription.trial_start
				? new Date(subscription.trial_start * 1000).toISOString()
				: null,
			trial_end: subscription.trial_end
				? new Date(subscription.trial_end * 1000).toISOString()
				: null,
			updated_at: new Date().toISOString()
		})
		.eq('user_id', existingSub.user_id);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
	const customerId = subscription.customer as string;

	// Find user by customer ID
	const { data: existingSub } = await supabaseAdmin
		.from('subscriptions')
		.select('user_id')
		.eq('stripe_customer_id', customerId)
		.single();

	if (!existingSub) {
		console.error('No subscription found for customer:', customerId);
		return;
	}

	// Revert to free plan
	await supabaseAdmin
		.from('subscriptions')
		.update({
			status: 'free',
			plan: 'free',
			stripe_subscription_id: null,
			stripe_price_id: null,
			interval: null,
			current_period_start: null,
			current_period_end: null,
			cancel_at_period_end: false,
			canceled_at: new Date().toISOString(),
			updated_at: new Date().toISOString()
		})
		.eq('user_id', existingSub.user_id);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
	const customerId = invoice.customer as string;

	// Find user by customer ID
	const { data: existingSub } = await supabaseAdmin
		.from('subscriptions')
		.select('user_id')
		.eq('stripe_customer_id', customerId)
		.single();

	if (!existingSub) {
		console.error('No subscription found for customer:', customerId);
		return;
	}

	await supabaseAdmin
		.from('subscriptions')
		.update({
			status: 'past_due',
			updated_at: new Date().toISOString()
		})
		.eq('user_id', existingSub.user_id);
}

function mapStripeStatus(status: Stripe.Subscription.Status): string {
	switch (status) {
		case 'active':
			return 'active';
		case 'trialing':
			return 'trialing';
		case 'past_due':
			return 'past_due';
		case 'canceled':
		case 'unpaid':
		case 'incomplete_expired':
			return 'canceled';
		default:
			return 'free';
	}
}

