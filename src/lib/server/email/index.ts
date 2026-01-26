// Email service exports
export { resend, EMAIL_FROM, type EmailType } from './resend';
export {
	sendEmail,
	sendWelcomeEmail,
	sendVerificationEmail,
	sendPasswordResetEmail,
	sendPasswordChangedEmail,
	sendProUpgradeEmail,
	sendDailyBriefEmail,
	type SendEmailOptions,
	type WelcomeEmailData,
	type VerificationEmailData,
	type PasswordResetEmailData,
	type PasswordChangedEmailData,
	type ProUpgradeEmailData,
	type DailyBriefEmailData
} from './emailService';

