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
			reply_to: options.replyTo || 'support@spentworth.com',
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

// Daily Brief Email
export interface DailyBriefEmailData {
	to: string;
	name: string;
	currentSpent: number;
	projectedSpend: number;
	budgetTotal: number;
	paceStatus: 'on_track' | 'ahead' | 'behind';
	daysRemaining: number;
	topCategory?: { name: string; amount: number };
	unusualSpending?: { merchant: string; amount: number; reason: string };
	subscriptionAlert?: { merchant: string; amount: number; date: string };
	opportunityCost?: { description: string; amount: number; futureValue: number };
	pendingItems: number;
	daysSinceUpload?: number;
}

export async function sendDailyBriefEmail({
	to,
	name,
	currentSpent,
	projectedSpend,
	budgetTotal,
	paceStatus,
	daysRemaining,
	topCategory,
	unusualSpending,
	subscriptionAlert,
	opportunityCost,
	pendingItems,
	daysSinceUpload
}: DailyBriefEmailData) {
	const template = loadTemplate('daily-brief');
	
	const now = new Date();
	const hour = now.getHours();
	const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
	
	const dateDisplay = now.toLocaleDateString('en-US', {
		weekday: 'long',
		month: 'long',
		day: 'numeric'
	});

	// Pace colors and messages
	const paceConfig = {
		on_track: {
			bgColor: '#f0fdf4',
			textColor: '#15803d',
			message: `You're on track! ${daysRemaining} days left this month.`
		},
		ahead: {
			bgColor: '#f0fdfa',
			textColor: '#0d9488',
			message: `Great job! You're under budget with ${daysRemaining} days to go.`
		},
		behind: {
			bgColor: '#fef3c7',
			textColor: '#92400e',
			message: `Heads up: You're trending over budget. ${daysRemaining} days left to adjust.`
		}
	};

	const pace = paceConfig[paceStatus];
	
	// Format currency helper
	const fmt = (n: number) => '$' + Math.round(n).toLocaleString();

	// Build preview text
	let previewText = `${fmt(currentSpent)} spent this month`;
	if (paceStatus === 'behind') {
		previewText += ' — trending over budget';
	} else if (paceStatus === 'ahead') {
		previewText += ' — under budget!';
	}

	const html = interpolate(template, {
		preview_text: previewText,
		date_display: dateDisplay,
		time_of_day: timeOfDay,
		name: name || 'there',
		current_spent: fmt(currentSpent),
		projected_spend: fmt(projectedSpend),
		budget_total: budgetTotal > 0 ? fmt(budgetTotal) : '—',
		pace_status: paceStatus.replace('_', '-'),
		pace_bg_color: pace.bgColor,
		pace_text_color: pace.textColor,
		pace_message: pace.message,
		has_insights: String(!!(topCategory || unusualSpending || subscriptionAlert || opportunityCost)),
		top_category: String(!!topCategory),
		top_category_name: topCategory?.name || '',
		top_category_amount: topCategory ? fmt(topCategory.amount) : '',
		unusual_spending: String(!!unusualSpending),
		unusual_merchant: unusualSpending?.merchant || '',
		unusual_amount: unusualSpending ? fmt(unusualSpending.amount) : '',
		unusual_reason: unusualSpending?.reason || '',
		subscription_alert: String(!!subscriptionAlert),
		subscription_merchant: subscriptionAlert?.merchant || '',
		subscription_amount: subscriptionAlert ? fmt(subscriptionAlert.amount) : '',
		subscription_date: subscriptionAlert?.date || '',
		opportunity_cost: String(!!opportunityCost),
		opportunity_description: opportunityCost?.description || '',
		opportunity_amount: opportunityCost ? fmt(opportunityCost.amount) : '',
		opportunity_future: opportunityCost ? fmt(opportunityCost.futureValue) : '',
		pending_items: pendingItems > 0 ? String(pendingItems) : '',
		review_url: 'https://spentworth.com/review',
		needs_upload: String(daysSinceUpload !== undefined && daysSinceUpload >= 7),
		days_since_upload: String(daysSinceUpload || 0),
		upload_url: 'https://spentworth.com/imports',
		dashboard_url: 'https://spentworth.com/dashboard',
		settings_url: 'https://spentworth.com/settings',
		unsubscribe_url: 'https://spentworth.com/settings#notifications'
	});

	return sendEmail({
		to,
		subject: `📊 Daily Brief: ${fmt(currentSpent)} spent this month`,
		html,
		tags: [{ name: 'email_type', value: 'daily_brief' }]
	});
}

// Weekly Pulse Email (conditional engagement email)
export interface WeeklyPulseEmailData {
	to: string;
	name: string;
	daysSinceUpload: number | null;
	pendingItems: number;
	uploadThreshold?: number; // Days before nudging (default 7)
	inboxThreshold?: number; // Items before nudging (default 3)
}

export async function sendWeeklyPulseEmail({
	to,
	name,
	daysSinceUpload,
	pendingItems,
	uploadThreshold = 7,
	inboxThreshold = 3
}: WeeklyPulseEmailData) {
	const template = loadTemplate('weekly-pulse');

	const needsUpload = daysSinceUpload !== null && daysSinceUpload >= uploadThreshold;
	const hasPendingItems = pendingItems >= inboxThreshold;

	// Determine main message based on what's actionable
	let mainMessage: string;
	let previewText: string;
	let ctaUrl: string;
	let ctaText: string;

	if (needsUpload && hasPendingItems) {
		mainMessage = `Your spending data is getting stale and you've got items piling up. A quick refresh will get you back on track.`;
		previewText = `${daysSinceUpload} days since import + ${pendingItems} inbox items`;
		ctaUrl = 'https://spentworth.com/imports';
		ctaText = 'Upload Fresh Data →';
	} else if (needsUpload) {
		mainMessage = `It's been a little while since you uploaded spending data. Your insights work best with fresh numbers.`;
		previewText = `${daysSinceUpload} days since your last import`;
		ctaUrl = 'https://spentworth.com/imports';
		ctaText = 'Upload Now →';
	} else {
		mainMessage = `You've got some items waiting for your attention. A few quick decisions and you're all caught up.`;
		previewText = `${pendingItems} items waiting in your inbox`;
		ctaUrl = 'https://spentworth.com/review';
		ctaText = 'Review Inbox →';
	}

	// Generate inbox description
	let inboxDescription = 'Quick categorizations and rule suggestions';
	if (pendingItems >= 10) {
		inboxDescription = 'Clearing these keeps your data accurate';
	} else if (pendingItems >= 5) {
		inboxDescription = 'Just a few minutes to clear the queue';
	}

	const html = interpolate(template, {
		preview_text: previewText,
		name: name || 'there',
		main_message: mainMessage,
		needs_upload: String(needsUpload),
		days_since_upload: String(daysSinceUpload || 0),
		has_pending_items: String(hasPendingItems),
		pending_items: String(pendingItems),
		inbox_description: inboxDescription,
		cta_url: ctaUrl,
		cta_text: ctaText
	});

	return sendEmail({
		to,
		subject: needsUpload
			? `📬 Quick pulse: ${daysSinceUpload} days since your last upload`
			: `📬 Quick pulse: ${pendingItems} items waiting`,
		html,
		tags: [{ name: 'email_type', value: 'weekly_pulse' }]
	});
}

