import { Resend } from 'resend';
import { RESEND_API_KEY } from '$env/static/private';

// Initialize Resend client
export const resend = new Resend(RESEND_API_KEY);

// Default sender - using verified updates subdomain
export const EMAIL_FROM = 'SpentWorth <hello@updates.spentworth.com>';

// Email types for tracking
export type EmailType = 
	| 'welcome'
	| 'password_reset'
	| 'password_changed'
	| 'pro_upgrade'
	| 'email_verification';

