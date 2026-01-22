import { resend, EMAIL_FROM, type EmailType } from './resend';
import mjml2html from 'mjml';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get directory path for templates
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Template cache for production
const templateCache = new Map<string, string>();

// Load and compile MJML template
function loadTemplate(templateName: string): string {
	// Check cache first
	if (templateCache.has(templateName)) {
		return templateCache.get(templateName)!;
	}

	const templatePath = join(__dirname, 'templates', `${templateName}.mjml`);
	const mjmlContent = readFileSync(templatePath, 'utf-8');
	const { html, errors } = mjml2html(mjmlContent, {
		validationLevel: 'soft',
		minify: true
	});

	if (errors.length > 0) {
		console.warn(`MJML warnings for ${templateName}:`, errors);
	}

	// Cache the compiled template
	templateCache.set(templateName, html);

	return html;
}

// Replace template variables
function interpolate(template: string, variables: Record<string, string>): string {
	let result = template;
	for (const [key, value] of Object.entries(variables)) {
		result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
	}
	// Add year by default
	result = result.replace(/{{year}}/g, new Date().getFullYear().toString());
	return result;
}

// Email sending functions

export interface SendEmailOptions {
	to: string;
	subject: string;
	html: string;
	replyTo?: string;
	tags?: { name: string; value: string }[];
}

export async function sendEmail(options: SendEmailOptions) {
	try {
		const { data, error } = await resend.emails.send({
			from: EMAIL_FROM,
			to: options.to,
			subject: options.subject,
			html: options.html,
			reply_to: options.replyTo || 'support@updates.spentworth.com',
			tags: options.tags
		});

		if (error) {
			console.error('Resend error:', error);
			throw error;
		}

		return { success: true, id: data?.id };
	} catch (error) {
		console.error('Failed to send email:', error);
		throw error;
	}
}

// Welcome Email
export interface WelcomeEmailData {
	to: string;
	name: string;
}

export async function sendWelcomeEmail({ to, name }: WelcomeEmailData) {
	const template = loadTemplate('welcome');
	const html = interpolate(template, {
		name: name || 'there',
		dashboard_url: 'https://spentworth.com/dashboard'
	});

	return sendEmail({
		to,
		subject: 'Welcome to SpentWorth! 🎯 Your journey to financial clarity starts now',
		html,
		tags: [{ name: 'email_type', value: 'welcome' }]
	});
}

// Email Verification
export interface VerificationEmailData {
	to: string;
	name: string;
	verificationCode: string;
	verificationUrl: string;
}

export async function sendVerificationEmail({
	to,
	name,
	verificationCode,
	verificationUrl
}: VerificationEmailData) {
	const template = loadTemplate('email-verification');
	const html = interpolate(template, {
		name: name || 'there',
		verification_code: verificationCode,
		verification_url: verificationUrl
	});

	return sendEmail({
		to,
		subject: 'Verify your SpentWorth email',
		html,
		tags: [{ name: 'email_type', value: 'verification' }]
	});
}

// Password Reset Email
export interface PasswordResetEmailData {
	to: string;
	name: string;
	resetUrl: string;
}

export async function sendPasswordResetEmail({ to, name, resetUrl }: PasswordResetEmailData) {
	const template = loadTemplate('password-reset');
	const html = interpolate(template, {
		name: name || 'there',
		reset_url: resetUrl
	});

	return sendEmail({
		to,
		subject: 'Reset your SpentWorth password',
		html,
		tags: [{ name: 'email_type', value: 'password_reset' }]
	});
}

// Password Changed Email
export interface PasswordChangedEmailData {
	to: string;
	name: string;
	date: string;
	time: string;
	location?: string;
	device?: string;
	ipAddress?: string;
}

export async function sendPasswordChangedEmail({
	to,
	name,
	date,
	time,
	location = 'Unknown',
	device = 'Unknown device',
	ipAddress = 'Unknown'
}: PasswordChangedEmailData) {
	const template = loadTemplate('password-changed');
	const html = interpolate(template, {
		name: name || 'there',
		date,
		time,
		location,
		device,
		ip_address: ipAddress,
		reset_url: 'https://spentworth.com/forgot-password'
	});

	return sendEmail({
		to,
		subject: '✓ Your SpentWorth password was changed',
		html,
		tags: [{ name: 'email_type', value: 'password_changed' }]
	});
}

// Pro Upgrade Email
export interface ProUpgradeEmailData {
	to: string;
	name: string;
	billingCycle: 'Monthly' | 'Yearly';
	nextBillingDate: string;
}

export async function sendProUpgradeEmail({
	to,
	name,
	billingCycle,
	nextBillingDate
}: ProUpgradeEmailData) {
	const template = loadTemplate('pro-upgrade');
	const html = interpolate(template, {
		name: name || 'there',
		billing_cycle: billingCycle,
		next_billing_date: nextBillingDate,
		dashboard_url: 'https://spentworth.com/dashboard',
		manage_subscription_url: 'https://spentworth.com/api/stripe/portal'
	});

	return sendEmail({
		to,
		subject: '🎉 Welcome to SpentWorth Pro! Your upgrade is complete',
		html,
		tags: [{ name: 'email_type', value: 'pro_upgrade' }]
	});
}

