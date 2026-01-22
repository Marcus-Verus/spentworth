<script lang="ts">
	import Logo from '$lib/components/Logo.svelte';

	// Public pages always use light mode (dark mode is Pro-only)
	const isDark = false;
</script>

<svelte:head>
	<title>Security | SpentWorth</title>
	<meta name="description" content="How SpentWorth protects your financial data with encryption, access controls, and privacy-first design." />
</svelte:head>

<div class="min-h-screen" style="background: {isDark ? 'var(--sw-bg)' : '#f5f0e8'}">
	<!-- Header -->
	<header class="border-b backdrop-blur-md sticky top-0 z-50" style="border-color: {isDark ? 'rgba(42,42,42,0.3)' : 'rgba(0,0,0,0.1)'}; background: {isDark ? 'rgba(10,10,10,0.9)' : 'rgba(245,240,232,0.9)'}">
		<div class="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
			<a href="/" class="flex items-center gap-2">
				<div class="rounded-xl bg-sw-accent flex items-center justify-center text-white p-1.5">
					<Logo size="sm" class="text-white" />
				</div>
				<span class="font-display text-lg font-semibold" style="color: {isDark ? '#ffffff' : '#171717'}">SpentWorth</span>
			</a>
			<a href="/login" class="text-sm font-medium" style="color: #737373">Log in</a>
		</div>
	</header>

	<main class="max-w-3xl mx-auto px-4 py-12">
		<h1 class="font-display text-3xl font-bold mb-2" style="color: {isDark ? '#ffffff' : '#171717'}">Security</h1>
		<p class="text-sm mb-8" style="color: {isDark ? '#a3a3a3' : '#737373'}">How we protect your data</p>

		<div class="prose prose-sm max-w-none" style="color: {isDark ? '#a3a3a3' : '#525252'}">
			<!-- Hero Security Card -->
			<div class="rounded-xl p-6 mb-8" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
				<div class="flex items-center gap-4 mb-4">
					<div class="w-14 h-14 rounded-xl flex items-center justify-center" style="background: {isDark ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.1)'}">
						<i class="fa-solid fa-shield-halved text-2xl text-green-500"></i>
					</div>
					<div>
						<h2 class="font-display text-xl font-semibold" style="color: {isDark ? '#ffffff' : '#171717'}">Privacy-First Design</h2>
						<p class="text-sm">Your financial data is sensitive. We built SpentWorth accordingly.</p>
					</div>
				</div>
				<p>Unlike many financial apps, SpentWorth doesn't require you to link your bank accounts or share login credentials. We use a simple CSV import process that keeps you in complete control of what data you share with us.</p>
			</div>

			<div class="grid sm:grid-cols-2 gap-4 mb-8">
				<div class="rounded-xl p-5" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
					<i class="fa-solid fa-lock text-sw-accent text-xl mb-3"></i>
					<h3 class="font-display font-semibold mb-2" style="color: {isDark ? '#ffffff' : '#171717'}">Encryption</h3>
					<p class="text-sm">Your connection to SpentWorth is protected by HTTPS/TLS. Your data is stored in an encrypted database (AES-256 at rest).</p>
				</div>
				<div class="rounded-xl p-5" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
					<i class="fa-solid fa-key text-sw-accent text-xl mb-3"></i>
					<h3 class="font-display font-semibold mb-2" style="color: {isDark ? '#ffffff' : '#171717'}">No Bank Credentials</h3>
					<p class="text-sm">SpentWorth does not connect directly to your bank. CSV imports don't require your bank login credentials.</p>
				</div>
				<div class="rounded-xl p-5" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
					<i class="fa-solid fa-user-lock text-sw-accent text-xl mb-3"></i>
					<h3 class="font-display font-semibold mb-2" style="color: {isDark ? '#ffffff' : '#171717'}">Account Isolation</h3>
					<p class="text-sm">Each user's data is isolated using row-level security policies. Your data cannot be accessed by other accounts.</p>
				</div>
				<div class="rounded-xl p-5" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
					<i class="fa-solid fa-download text-sw-accent text-xl mb-3"></i>
					<h3 class="font-display font-semibold mb-2" style="color: {isDark ? '#ffffff' : '#171717'}">Export & Delete</h3>
					<p class="text-sm">Export your data or delete your account at any time from Settings. You control your data.</p>
				</div>
			</div>

			<div class="space-y-6">
				<section>
					<h2 class="font-display text-xl font-semibold mb-3" style="color: {isDark ? '#ffffff' : '#171717'}">How CSV Import Works</h2>
					<ol class="space-y-3 list-decimal list-inside">
						<li>You download a transaction CSV file from your bank (most banks offer this in online banking)</li>
						<li>You upload the CSV to SpentWorth</li>
						<li>The file is parsed and transactions are auto-categorized</li>
						<li>Only the transaction data (date, amount, merchant, description) is stored</li>
					</ol>
					<p class="mt-3">We never see your account numbers, balances, or login credentials. The original CSV file is not retained after processing.</p>
				</section>

				<section>
					<h2 class="font-display text-xl font-semibold mb-3" style="color: {isDark ? '#ffffff' : '#171717'}">Infrastructure Security</h2>
					<p class="mb-3">SpentWorth is built on infrastructure providers that maintain strong security practices:</p>
					<ul class="space-y-2">
						<li>• <strong>Database (Supabase):</strong> Data encrypted at rest (AES-256) and in transit (TLS). Supabase maintains SOC 2 Type II compliance.</li>
						<li>• <strong>Hosting (Netlify):</strong> Enterprise-grade hosting with DDoS protection. Netlify maintains SOC 2 compliance.</li>
						<li>• <strong>Payments (Stripe):</strong> PCI DSS Level 1 certified. We never handle or store your card details.</li>
					</ul>
					<p class="mt-3 text-sm" style="color: {isDark ? '#737373' : '#737373'}">Note: These certifications apply to our infrastructure providers. SpentWorth itself is an independently-operated service.</p>
				</section>

				<section>
					<h2 class="font-display text-xl font-semibold mb-3" style="color: {isDark ? '#ffffff' : '#171717'}">Data Access & Secrets</h2>
					<ul class="space-y-2">
						<li>• <strong>Support-only access:</strong> We do not routinely access individual user data. We only access account data when necessary to resolve a support request you initiate.</li>
						<li>• <strong>Secrets management:</strong> API keys and credentials are stored as server-side environment variables, not in client code or source control.</li>
						<li>• <strong>Multi-factor authentication:</strong> MFA is enabled on our infrastructure and code hosting accounts.</li>
					</ul>
				</section>

				<section>
					<h2 class="font-display text-xl font-semibold mb-3" style="color: {isDark ? '#ffffff' : '#171717'}">Data Retention & Backups</h2>
					<p class="mb-3">When you delete data (import batches or your entire account):</p>
					<ul class="space-y-2">
						<li>• Your data is removed from our active database promptly</li>
						<li>• Encrypted backups maintained by our database provider may persist for a limited period (typically 7-30 days) before automatic expiration</li>
						<li>• Backups are encrypted and access-controlled; they are purged automatically on a rolling basis</li>
					</ul>
				</section>

				<section>
					<h2 class="font-display text-xl font-semibold mb-3" style="color: {isDark ? '#ffffff' : '#171717'}">Security Best Practices</h2>
					<p class="mb-3">To keep your account secure, we recommend:</p>
					<ul class="space-y-2">
						<li>• Using a strong, unique password for your SpentWorth account</li>
						<li>• Not sharing your account credentials</li>
						<li>• Logging out when using shared or public devices</li>
						<li>• Keeping your email address up to date for account recovery</li>
					</ul>
				</section>

				<section>
					<h2 class="font-display text-xl font-semibold mb-3" style="color: {isDark ? '#ffffff' : '#171717'}">Report a Vulnerability</h2>
					<p>If you discover a security vulnerability, please report it to <a href="mailto:support@spentworth.com" class="text-sw-accent hover:underline">support@spentworth.com</a>. We take all reports seriously and will respond promptly.</p>
				</section>
			</div>
		</div>
	</main>
</div>

