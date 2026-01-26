import { json, type RequestHandler } from '@sveltejs/kit';
import { createClient } from '$lib/server/supabase';
import type { TrackedSubscription, UpcomingCharge, SubscriptionSummary } from '$lib/types';

// Calculate future value with compound interest
function futureValue(amount: number, years: number, rate = 0.07): number {
	return Math.round(amount * 12 * Math.pow(1 + rate, years) * 100) / 100;
}

// Convert billing cycle to monthly amount
function toMonthlyAmount(amount: number, cycle: string): number {
	switch (cycle) {
		case 'weekly': return amount * 4.33;
		case 'monthly': return amount;
		case 'quarterly': return amount / 3;
		case 'yearly': return amount / 12;
		default: return amount;
	}
}

// GET /api/subscriptions - List subscriptions with upcoming charges
export const GET: RequestHandler = async ({ locals, url }) => {
	const supabase = createClient(locals);
	const { data: { user } } = await supabase.auth.getUser();

	if (!user) {
		return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
	}

	try {
		// Get lookahead days from query param (default 14)
		const lookaheadDays = parseInt(url.searchParams.get('lookahead') || '14');
		
		// Fetch all active subscriptions
		const { data: subscriptions, error } = await supabase
			.from('tracked_subscriptions')
			.select('*')
			.eq('user_id', user.id)
			.eq('enabled', true)
			.neq('status', 'canceled')
			.order('next_charge_date', { ascending: true });

		if (error) throw error;

		const today = new Date();
		const lookaheadDate = new Date(today);
		lookaheadDate.setDate(lookaheadDate.getDate() + lookaheadDays);

		// Transform and calculate upcoming charges
		const mapped: TrackedSubscription[] = (subscriptions || []).map(s => ({
			id: s.id,
			userId: s.user_id,
			merchantName: s.merchant_name,
			merchantNorm: s.merchant_norm,
			amount: parseFloat(s.amount),
			currency: s.currency,
			billingCycle: s.billing_cycle,
			nextChargeDate: s.next_charge_date,
			lastChargeDate: s.last_charge_date,
			status: s.status,
			isEssential: s.is_essential,
			trialEndsAt: s.trial_ends_at,
			cancelRequestedAt: s.cancel_requested_at,
			detectedAt: s.detected_at,
			detectionConfidence: parseFloat(s.detection_confidence),
			occurrenceCount: s.occurrence_count,
			category: s.category,
			notes: s.notes,
			enabled: s.enabled,
			createdAt: s.created_at,
			updatedAt: s.updated_at
		}));

		// Find upcoming charges within lookahead window
		const upcomingCharges: UpcomingCharge[] = mapped
			.filter(s => s.nextChargeDate)
			.map(s => {
				const nextDate = new Date(s.nextChargeDate!);
				const daysUntil = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
				const monthlyAmount = toMonthlyAmount(s.amount, s.billingCycle);
				
				return {
					subscription: s,
					daysUntil,
					futureValue10yr: futureValue(monthlyAmount, 10),
					futureValue20yr: futureValue(monthlyAmount, 20)
				};
			})
			.filter(c => c.daysUntil >= 0 && c.daysUntil <= lookaheadDays)
			.sort((a, b) => a.daysUntil - b.daysUntil);

		// Calculate totals
		let totalMonthly = 0;
		let essentialMonthly = 0;
		let nonEssentialMonthly = 0;
		let trialCount = 0;
		let cancelingCount = 0;

		for (const sub of mapped) {
			if (sub.status === 'canceled') continue;
			
			const monthly = toMonthlyAmount(sub.amount, sub.billingCycle);
			totalMonthly += monthly;
			
			if (sub.isEssential) {
				essentialMonthly += monthly;
			} else {
				nonEssentialMonthly += monthly;
			}
			
			if (sub.status === 'trial') trialCount++;
			if (sub.status === 'canceling') cancelingCount++;
		}

		const summary: SubscriptionSummary = {
			totalMonthly: Math.round(totalMonthly * 100) / 100,
			totalYearly: Math.round(totalMonthly * 12 * 100) / 100,
			essentialMonthly: Math.round(essentialMonthly * 100) / 100,
			nonEssentialMonthly: Math.round(nonEssentialMonthly * 100) / 100,
			trialCount,
			cancelingCount,
			upcomingCharges,
			potentialSavings10yr: futureValue(nonEssentialMonthly, 10),
			potentialSavings20yr: futureValue(nonEssentialMonthly, 20)
		};

		return json({
			ok: true,
			data: {
				subscriptions: mapped,
				summary
			}
		});
	} catch (error) {
		console.error('Error fetching subscriptions:', error);
		return json({ ok: false, error: 'Failed to fetch subscriptions' }, { status: 500 });
	}
};

// POST /api/subscriptions - Create or detect subscriptions
export const POST: RequestHandler = async ({ request, locals }) => {
	const supabase = createClient(locals);
	const { data: { user } } = await supabase.auth.getUser();

	if (!user) {
		return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const body = await request.json();
		const { action } = body;

		if (action === 'detect') {
			// Auto-detect subscriptions from transaction history
			const detected = await detectSubscriptions(supabase, user.id);
			return json({ ok: true, data: { detected } });
		}

		// Manual subscription creation
		const {
			merchantName,
			amount,
			billingCycle = 'monthly',
			nextChargeDate,
			isEssential = false,
			category,
			status = 'active'
		} = body;

		if (!merchantName || !amount) {
			return json({ ok: false, error: 'Missing required fields' }, { status: 400 });
		}

		const merchantNorm = merchantName.toLowerCase().replace(/[^a-z0-9]/g, '');

		const { data, error } = await supabase
			.from('tracked_subscriptions')
			.insert({
				user_id: user.id,
				merchant_name: merchantName,
				merchant_norm: merchantNorm,
				amount,
				billing_cycle: billingCycle,
				next_charge_date: nextChargeDate,
				is_essential: isEssential,
				category,
				status,
				detection_confidence: 1.0 // Manual = 100% confidence
			})
			.select()
			.single();

		if (error) throw error;

		return json({ ok: true, data });
	} catch (error) {
		console.error('Error creating subscription:', error);
		return json({ ok: false, error: 'Failed to create subscription' }, { status: 500 });
	}
};

// PATCH /api/subscriptions - Update subscription
export const PATCH: RequestHandler = async ({ request, locals }) => {
	const supabase = createClient(locals);
	const { data: { user } } = await supabase.auth.getUser();

	if (!user) {
		return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const body = await request.json();
		const { id, ...updates } = body;

		if (!id) {
			return json({ ok: false, error: 'Missing subscription id' }, { status: 400 });
		}

		// Map camelCase to snake_case
		const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
		
		if ('isEssential' in updates) dbUpdates.is_essential = updates.isEssential;
		if ('status' in updates) dbUpdates.status = updates.status;
		if ('nextChargeDate' in updates) dbUpdates.next_charge_date = updates.nextChargeDate;
		if ('amount' in updates) dbUpdates.amount = updates.amount;
		if ('billingCycle' in updates) dbUpdates.billing_cycle = updates.billingCycle;
		if ('category' in updates) dbUpdates.category = updates.category;
		if ('notes' in updates) dbUpdates.notes = updates.notes;
		
		// Track cancellation request
		if (updates.status === 'canceling') {
			dbUpdates.cancel_requested_at = new Date().toISOString();
		}

		const { data, error } = await supabase
			.from('tracked_subscriptions')
			.update(dbUpdates)
			.eq('id', id)
			.eq('user_id', user.id)
			.select()
			.single();

		if (error) throw error;

		return json({ ok: true, data });
	} catch (error) {
		console.error('Error updating subscription:', error);
		return json({ ok: false, error: 'Failed to update subscription' }, { status: 500 });
	}
};

// DELETE /api/subscriptions - Remove subscription
export const DELETE: RequestHandler = async ({ request, locals }) => {
	const supabase = createClient(locals);
	const { data: { user } } = await supabase.auth.getUser();

	if (!user) {
		return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const body = await request.json();
		const { id } = body;

		if (!id) {
			return json({ ok: false, error: 'Missing subscription id' }, { status: 400 });
		}

		const { error } = await supabase
			.from('tracked_subscriptions')
			.delete()
			.eq('id', id)
			.eq('user_id', user.id);

		if (error) throw error;

		return json({ ok: true });
	} catch (error) {
		console.error('Error deleting subscription:', error);
		return json({ ok: false, error: 'Failed to delete subscription' }, { status: 500 });
	}
};

// Helper: Auto-detect subscriptions from transactions
async function detectSubscriptions(supabase: ReturnType<typeof createClient>, userId: string) {
	// Get recurring charges from the last 6 months
	const sixMonthsAgo = new Date();
	sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

	const { data: transactions } = await supabase
		.from('transactions')
		.select('merchant_norm, merchant, amount, date, category')
		.eq('user_id', userId)
		.eq('included_in_spend', true)
		.gte('date', sixMonthsAgo.toISOString().slice(0, 10))
		.order('date', { ascending: true });

	if (!transactions || transactions.length === 0) return [];

	// Group by merchant_norm and analyze patterns
	const merchantGroups: Record<string, Array<{ amount: number; date: string; merchant: string; category: string | null }>> = {};
	
	for (const tx of transactions) {
		const key = tx.merchant_norm || 'unknown';
		if (!merchantGroups[key]) merchantGroups[key] = [];
		merchantGroups[key].push({
			amount: Math.abs(parseFloat(tx.amount)),
			date: tx.date,
			merchant: tx.merchant || key,
			category: tx.category
		});
	}

	const detected: Array<{
		merchantName: string;
		merchantNorm: string;
		amount: number;
		billingCycle: string;
		occurrenceCount: number;
		confidence: number;
		category: string | null;
		nextChargeDate: string | null;
	}> = [];

	for (const [merchantNorm, txs] of Object.entries(merchantGroups)) {
		if (txs.length < 2) continue;

		// Check for consistent amounts (within 10% variance)
		const amounts = txs.map(t => t.amount);
		const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
		const variance = Math.max(...amounts.map(a => Math.abs(a - avgAmount) / avgAmount));
		
		if (variance > 0.15) continue; // Too much variance

		// Calculate average interval between charges
		const dates = txs.map(t => new Date(t.date).getTime()).sort((a, b) => a - b);
		const intervals: number[] = [];
		for (let i = 1; i < dates.length; i++) {
			intervals.push((dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24));
		}
		
		if (intervals.length === 0) continue;
		
		const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
		
		// Determine billing cycle
		let billingCycle = 'monthly';
		let confidence = 0.7;
		
		if (avgInterval <= 10) {
			billingCycle = 'weekly';
			confidence = avgInterval >= 5 && avgInterval <= 9 ? 0.9 : 0.7;
		} else if (avgInterval >= 25 && avgInterval <= 35) {
			billingCycle = 'monthly';
			confidence = avgInterval >= 28 && avgInterval <= 32 ? 0.95 : 0.8;
		} else if (avgInterval >= 85 && avgInterval <= 100) {
			billingCycle = 'quarterly';
			confidence = 0.85;
		} else if (avgInterval >= 350 && avgInterval <= 380) {
			billingCycle = 'yearly';
			confidence = 0.9;
		} else {
			continue; // Irregular interval
		}

		// Estimate next charge date
		const lastDate = new Date(Math.max(...dates));
		const nextDate = new Date(lastDate);
		
		switch (billingCycle) {
			case 'weekly': nextDate.setDate(nextDate.getDate() + 7); break;
			case 'monthly': nextDate.setMonth(nextDate.getMonth() + 1); break;
			case 'quarterly': nextDate.setMonth(nextDate.getMonth() + 3); break;
			case 'yearly': nextDate.setFullYear(nextDate.getFullYear() + 1); break;
		}

		detected.push({
			merchantName: txs[0].merchant,
			merchantNorm,
			amount: Math.round(avgAmount * 100) / 100,
			billingCycle,
			occurrenceCount: txs.length,
			confidence,
			category: txs[0].category,
			nextChargeDate: nextDate.toISOString().slice(0, 10)
		});
	}

	// Insert detected subscriptions (skip existing)
	for (const sub of detected) {
		await supabase
			.from('tracked_subscriptions')
			.upsert({
				user_id: userId,
				merchant_name: sub.merchantName,
				merchant_norm: sub.merchantNorm,
				amount: sub.amount,
				billing_cycle: sub.billingCycle,
				next_charge_date: sub.nextChargeDate,
				occurrence_count: sub.occurrenceCount,
				detection_confidence: sub.confidence,
				category: sub.category,
				last_charge_date: new Date().toISOString().slice(0, 10)
			}, {
				onConflict: 'user_id,merchant_norm',
				ignoreDuplicates: true
			});
	}

	return detected;
}
