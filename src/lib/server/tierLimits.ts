// Tier limits configuration and enforcement
import type { SupabaseClient } from '@supabase/supabase-js';

// Free tier limits (Pro tier has unlimited everything)
export const FREE_TIER_LIMITS = {
	importsPerMonth: 3,
	budgetCategories: 10,
	transactionHistoryDays: 90
} as const;

export type UserPlan = 'free' | 'pro';

export interface TierInfo {
	plan: UserPlan;
	isProActive: boolean;
}

/**
 * Get user's current subscription plan
 */
export async function getUserTier(supabase: SupabaseClient, userId: string): Promise<TierInfo> {
	const { data: subscription } = await supabase
		.from('subscriptions')
		.select('plan, status')
		.eq('user_id', userId)
		.single();

	const plan = (subscription?.plan as UserPlan) || 'free';
	// Pro is active if status is 'active' or 'trialing'
	const isProActive =
		plan === 'pro' && (subscription?.status === 'active' || subscription?.status === 'trialing');

	return { plan, isProActive };
}

/**
 * Check if user can create a new import (free tier: 3/month)
 */
export async function canCreateImport(
	supabase: SupabaseClient,
	userId: string
): Promise<{ allowed: boolean; current: number; limit: number; message?: string }> {
	const { isProActive } = await getUserTier(supabase, userId);

	if (isProActive) {
		return { allowed: true, current: 0, limit: Infinity };
	}

	// Count imports this month
	const now = new Date();
	const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

	const { count } = await supabase
		.from('import_batches')
		.select('*', { count: 'exact', head: true })
		.eq('user_id', userId)
		.gte('created_at', monthStart);

	const currentCount = count || 0;
	const limit = FREE_TIER_LIMITS.importsPerMonth;

	if (currentCount >= limit) {
		return {
			allowed: false,
			current: currentCount,
			limit,
			message: `Free tier allows ${limit} imports per month. You've used ${currentCount}. Upgrade to Pro for unlimited imports.`
		};
	}

	return { allowed: true, current: currentCount, limit };
}

/**
 * Check if user can create a new budget category (free tier: 5 categories)
 */
export async function canCreateBudget(
	supabase: SupabaseClient,
	userId: string
): Promise<{ allowed: boolean; current: number; limit: number; message?: string }> {
	const { isProActive } = await getUserTier(supabase, userId);

	if (isProActive) {
		return { allowed: true, current: 0, limit: Infinity };
	}

	// Count existing budgets
	const { count } = await supabase
		.from('budgets')
		.select('*', { count: 'exact', head: true })
		.eq('user_id', userId);

	const currentCount = count || 0;
	const limit = FREE_TIER_LIMITS.budgetCategories;

	if (currentCount >= limit) {
		return {
			allowed: false,
			current: currentCount,
			limit,
			message: `Free tier allows ${limit} budget categories. You have ${currentCount}. Upgrade to Pro for unlimited budgets.`
		};
	}

	return { allowed: true, current: currentCount, limit };
}

/**
 * Get the transaction history date limit for user's tier
 * Returns null for Pro (no limit) or the earliest allowed date for free tier
 */
export async function getTransactionDateLimit(
	supabase: SupabaseClient,
	userId: string
): Promise<string | null> {
	const { isProActive } = await getUserTier(supabase, userId);

	if (isProActive) {
		return null; // No limit for Pro
	}

	// Free tier: 90 days
	const limitDate = new Date();
	limitDate.setDate(limitDate.getDate() - FREE_TIER_LIMITS.transactionHistoryDays);
	return limitDate.toISOString().slice(0, 10); // YYYY-MM-DD format
}

/**
 * Get tier usage info for display to user
 */
export async function getTierUsage(
	supabase: SupabaseClient,
	userId: string
): Promise<{
	plan: UserPlan;
	isProActive: boolean;
	imports: { used: number; limit: number | null };
	budgets: { used: number; limit: number | null };
	historyDays: number | null;
}> {
	const { plan, isProActive } = await getUserTier(supabase, userId);

	// Count imports this month
	const now = new Date();
	const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

	const { count: importCount } = await supabase
		.from('import_batches')
		.select('*', { count: 'exact', head: true })
		.eq('user_id', userId)
		.gte('created_at', monthStart);

	// Count budgets
	const { count: budgetCount } = await supabase
		.from('budgets')
		.select('*', { count: 'exact', head: true })
		.eq('user_id', userId);

	if (isProActive) {
		return {
			plan,
			isProActive,
			imports: { used: importCount || 0, limit: null },
			budgets: { used: budgetCount || 0, limit: null },
			historyDays: null
		};
	}

	return {
		plan,
		isProActive,
		imports: { used: importCount || 0, limit: FREE_TIER_LIMITS.importsPerMonth },
		budgets: { used: budgetCount || 0, limit: FREE_TIER_LIMITS.budgetCategories },
		historyDays: FREE_TIER_LIMITS.transactionHistoryDays
	};
}

