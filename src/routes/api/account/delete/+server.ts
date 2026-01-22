import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { stripe } from '$lib/server/stripe';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';

// Use service role for account deletion (bypasses RLS)
const supabaseAdmin = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
	auth: {
		autoRefreshToken: false,
		persistSession: false
	}
});

export const DELETE: RequestHandler = async ({ locals }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		throw error(401, 'Unauthorized');
	}

	try {
		// 1. Get subscription info to cancel Stripe subscription
		const { data: subscription } = await supabaseAdmin
			.from('subscriptions')
			.select('stripe_subscription_id, stripe_customer_id')
			.eq('user_id', user.id)
			.single();

		// 2. Cancel Stripe subscription if exists
		if (subscription?.stripe_subscription_id) {
			try {
				await stripe.subscriptions.cancel(subscription.stripe_subscription_id);
				console.log(`Canceled Stripe subscription: ${subscription.stripe_subscription_id}`);
			} catch (stripeError) {
				// Log but don't fail - subscription might already be canceled
				console.error('Error canceling Stripe subscription:', stripeError);
			}
		}

		// 3. Optionally delete Stripe customer (keeps payment history in Stripe)
		// Uncomment if you want to fully remove customer from Stripe:
		// if (subscription?.stripe_customer_id) {
		// 	await stripe.customers.del(subscription.stripe_customer_id);
		// }

		// 4. Delete all user data from database
		// Due to cascade deletes, most data will be auto-deleted when user is deleted
		// But let's be explicit for safety

		// Delete in order to respect foreign keys
		await supabaseAdmin.from('transaction_tags').delete().eq('user_id', user.id);
		await supabaseAdmin.from('custom_tags').delete().eq('user_id', user.id);
		await supabaseAdmin.from('spending_goals').delete().eq('user_id', user.id);
		await supabaseAdmin.from('transaction_overrides').delete().eq('user_id', user.id);
		await supabaseAdmin.from('transactions').delete().eq('user_id', user.id);
		await supabaseAdmin.from('raw_transactions').delete().eq('user_id', user.id);
		await supabaseAdmin.from('import_batches').delete().eq('user_id', user.id);
		await supabaseAdmin.from('merchant_rules').delete().eq('user_id', user.id);
		await supabaseAdmin.from('budgets').delete().eq('user_id', user.id);
		await supabaseAdmin.from('subscriptions').delete().eq('user_id', user.id);
		await supabaseAdmin.from('user_prefs').delete().eq('user_id', user.id);

		// 5. Delete the auth user (this is permanent!)
		const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

		if (deleteError) {
			console.error('Error deleting auth user:', deleteError);
			throw error(500, 'Failed to delete account');
		}

		console.log(`Successfully deleted account for user: ${user.id}`);

		return json({ success: true });
	} catch (err) {
		console.error('Account deletion error:', err);
		throw error(500, 'Failed to delete account');
	}
};

