import Stripe from 'stripe';
import { STRIPE_SECRET_KEY } from '$env/static/private';

// Initialize Stripe with your secret key
export const stripe = new Stripe(STRIPE_SECRET_KEY, {
	apiVersion: '2024-12-18.acacia'
});

// Price IDs from your Stripe Dashboard
// Replace these with your actual price IDs after creating products
export const STRIPE_PRICES = {
	PRO_MONTHLY: process.env.STRIPE_PRICE_PRO_MONTHLY || '',
	PRO_YEARLY: process.env.STRIPE_PRICE_PRO_YEARLY || ''
} as const;

export type PriceInterval = 'monthly' | 'yearly';

export function getPriceId(interval: PriceInterval): string {
	return interval === 'monthly' ? STRIPE_PRICES.PRO_MONTHLY : STRIPE_PRICES.PRO_YEARLY;
}

