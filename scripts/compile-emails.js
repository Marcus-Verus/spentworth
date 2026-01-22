/**
 * MJML Email Template Compiler
 * 
 * This script compiles all MJML templates to HTML for preview and testing.
 * Run with: node scripts/compile-emails.js
 */

import mjml2html from 'mjml';
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TEMPLATES_DIR = join(__dirname, '../src/lib/server/email/templates');
const OUTPUT_DIR = join(__dirname, '../.email-previews');

// Sample data for template previews
const sampleData = {
	name: 'Alex',
	year: new Date().getFullYear().toString(),
	dashboard_url: 'https://spentworth.com/dashboard',
	verification_code: '12345678',
	verification_url: 'https://spentworth.com/auth/verify?token=abc123',
	reset_url: 'https://spentworth.com/reset-password?token=abc123',
	date: 'Wednesday, January 21, 2026',
	time: '2:30 PM EST',
	location: 'New York, NY',
	device: 'Chrome on Windows',
	ip_address: '192.168.1.1',
	billing_cycle: 'Monthly',
	next_billing_date: 'February 21, 2026',
	manage_subscription_url: 'https://spentworth.com/api/stripe/portal',
	unsubscribe_url: 'https://spentworth.com/unsubscribe'
};

function interpolate(template, variables) {
	let result = template;
	for (const [key, value] of Object.entries(variables)) {
		result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
	}
	return result;
}

function compileTemplate(templatePath) {
	const mjmlContent = readFileSync(templatePath, 'utf-8');
	const { html, errors } = mjml2html(mjmlContent, {
		validationLevel: 'soft',
		minify: false // Keep readable for preview
	});

	if (errors.length > 0) {
		console.warn(`⚠️  Warnings for ${basename(templatePath)}:`);
		errors.forEach(err => console.warn(`   - ${err.message}`));
	}

	return html;
}

function main() {
	console.log('📧 Compiling MJML email templates...\n');

	// Create output directory
	mkdirSync(OUTPUT_DIR, { recursive: true });

	// Get all MJML files
	const templates = readdirSync(TEMPLATES_DIR).filter(f => f.endsWith('.mjml'));

	templates.forEach(template => {
		const templatePath = join(TEMPLATES_DIR, template);
		const outputName = template.replace('.mjml', '.html');
		const outputPath = join(OUTPUT_DIR, outputName);

		try {
			let html = compileTemplate(templatePath);
			html = interpolate(html, sampleData);
			writeFileSync(outputPath, html);
			console.log(`✅ ${template} → ${outputName}`);
		} catch (error) {
			console.error(`❌ Failed to compile ${template}:`, error.message);
		}
	});

	console.log(`\n📁 Previews saved to: ${OUTPUT_DIR}`);
	console.log('   Open the HTML files in your browser to preview emails.\n');
}

main();

