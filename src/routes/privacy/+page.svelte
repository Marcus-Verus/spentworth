<script lang="ts">
	import Logo from '$lib/components/Logo.svelte';

	// Public pages always use light mode (dark mode is Pro-only)
	const isDark = false;
</script>

<svelte:head>
	<title>Privacy Policy | SpentWorth</title>
	<meta name="description" content="SpentWorth Privacy Policy - How we collect, use, and protect your data." />
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
		<h1 class="font-display text-3xl font-bold mb-2" style="color: {isDark ? '#ffffff' : '#171717'}">Privacy Policy</h1>
		<p class="text-sm mb-8" style="color: {isDark ? '#a3a3a3' : '#737373'}">Last updated: January 22, 2026</p>

		<div class="prose prose-sm max-w-none" style="color: {isDark ? '#a3a3a3' : '#525252'}">
			<div class="space-y-8">
				<section>
					<h2 class="font-display text-xl font-semibold mb-3" style="color: {isDark ? '#ffffff' : '#171717'}">Our Commitment to Privacy</h2>
					<p class="mb-4">SpentWorth is built to help you understand your spending without compromising your privacy. You're trusting us with sensitive financial data, and we take that responsibility seriously.</p>
					<div class="rounded-xl p-4 mb-4" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
						<p class="font-medium" style="color: {isDark ? '#ffffff' : '#171717'}"><i class="fa-solid fa-shield-halved text-sw-accent mr-2"></i>Key Privacy Facts:</p>
						<ul class="mt-2 space-y-1 text-sm">
							<li>• We never require or store your bank login credentials</li>
							<li>• We do not sell your personal data to third parties</li>
							<li>• You can export or delete your data at any time</li>
							<li>• We do not use advertising or build ad profiles</li>
						</ul>
					</div>
				</section>

				<section>
					<h2 class="font-display text-xl font-semibold mb-3" style="color: {isDark ? '#ffffff' : '#171717'}">Information We Collect</h2>
					
					<h3 class="font-semibold mt-4 mb-2" style="color: {isDark ? '#ffffff' : '#171717'}">Account Information</h3>
					<p class="mb-3">When you create an account, we collect your email address. Your password is securely hashed using industry-standard algorithms and is never stored in plain text.</p>
					
					<h3 class="font-semibold mt-4 mb-2" style="color: {isDark ? '#ffffff' : '#171717'}">Transaction Data</h3>
					<p class="mb-3">When you upload CSV files, we store the parsed transaction data you choose to import. This includes:</p>
					<ul class="space-y-1 mb-3">
						<li>• Transaction dates and amounts</li>
						<li>• Merchant names and descriptions</li>
						<li>• Categories you assign or we auto-classify</li>
						<li>• Any notes or tags you add</li>
					</ul>
					<p class="mb-3">We do <strong>not</strong> store your bank account numbers, routing numbers, or login credentials. The original CSV file content is not retained after processing.</p>
					
					<h3 class="font-semibold mt-4 mb-2" style="color: {isDark ? '#ffffff' : '#171717'}">Payment Information</h3>
					<p class="mb-3">If you subscribe to SpentWorth Pro, payment processing is handled entirely by Stripe. We do not store your credit card numbers or payment details on our servers. We receive only limited information from Stripe (such as subscription status and the last four digits of your card) to manage your subscription.</p>
					
					<h3 class="font-semibold mt-4 mb-2" style="color: {isDark ? '#ffffff' : '#171717'}">Analytics Data</h3>
					<p class="mb-3">We use Google Analytics to understand how visitors use our website. This helps us improve the product. Google Analytics collects:</p>
					<ul class="space-y-1 mb-3">
						<li>• Pages visited and time spent</li>
						<li>• General location (country/region level)</li>
						<li>• Device type and browser</li>
						<li>• Referral source</li>
					</ul>
					<p>This data is aggregated and does not include your financial transaction data. You can opt out of analytics tracking by declining cookies when prompted, or by using browser privacy features.</p>
				</section>

				<section>
					<h2 class="font-display text-xl font-semibold mb-3" style="color: {isDark ? '#ffffff' : '#171717'}">How We Use Your Information</h2>
					<ul class="space-y-2">
						<li>• <strong>Provide the service:</strong> Calculate spending insights, opportunity costs, and track your financial goals</li>
						<li>• <strong>Account communications:</strong> Send password resets, security alerts, and important service updates</li>
						<li>• <strong>Product improvement:</strong> Understand how features are used to improve the product (aggregate, non-personal data only)</li>
					</ul>
				</section>

				<section>
					<h2 class="font-display text-xl font-semibold mb-3" style="color: {isDark ? '#ffffff' : '#171717'}">Data Access</h2>
					<p class="mb-3">As a small, independently-operated service:</p>
					<ul class="space-y-2">
						<li>• <strong>Support-only access:</strong> We do not routinely access individual user transaction data. We only access account data when necessary to resolve a support request you initiate.</li>
						<li>• <strong>No data mining:</strong> We do not analyze your transaction data for purposes other than providing you with the features you use.</li>
					</ul>
				</section>

				<section>
					<h2 class="font-display text-xl font-semibold mb-3" style="color: {isDark ? '#ffffff' : '#171717'}">Data Sharing</h2>
					<p class="mb-3">We do not sell, rent, or share your personal data with third parties for their marketing purposes. We share data only with:</p>
					<ul class="space-y-2">
						<li>• <strong>Service providers:</strong> Third-party services that help us operate (see "Service Providers" section below)</li>
						<li>• <strong>Legal requirements:</strong> When required by law, court order, or to protect our legal rights</li>
					</ul>
				</section>

				<section>
					<h2 class="font-display text-xl font-semibold mb-3" style="color: {isDark ? '#ffffff' : '#171717'}">Service Providers (Subprocessors)</h2>
					<p class="mb-3">SpentWorth uses the following third-party services to operate:</p>
					<div class="rounded-xl overflow-hidden" style="border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
						<table class="w-full text-sm">
							<thead>
								<tr style="background: {isDark ? '#1a1a1a' : '#f9fafb'}">
									<th class="text-left px-4 py-2 font-semibold" style="color: {isDark ? '#ffffff' : '#171717'}">Provider</th>
									<th class="text-left px-4 py-2 font-semibold" style="color: {isDark ? '#ffffff' : '#171717'}">Purpose</th>
								</tr>
							</thead>
							<tbody>
								<tr style="border-top: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
									<td class="px-4 py-2">Supabase</td>
									<td class="px-4 py-2">Database hosting and authentication</td>
								</tr>
								<tr style="border-top: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
									<td class="px-4 py-2">Netlify</td>
									<td class="px-4 py-2">Website hosting</td>
								</tr>
								<tr style="border-top: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
									<td class="px-4 py-2">Stripe</td>
									<td class="px-4 py-2">Payment processing</td>
								</tr>
								<tr style="border-top: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
									<td class="px-4 py-2">Resend</td>
									<td class="px-4 py-2">Transactional emails</td>
								</tr>
								<tr style="border-top: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
									<td class="px-4 py-2">Alpha Vantage</td>
									<td class="px-4 py-2">Stock price data for opportunity cost calculations</td>
								</tr>
								<tr style="border-top: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
									<td class="px-4 py-2">Google Analytics</td>
									<td class="px-4 py-2">Website analytics (with consent)</td>
								</tr>
							</tbody>
						</table>
					</div>
					<p class="mt-3 text-sm">These providers maintain their own privacy and security practices. We encourage you to review their policies.</p>
				</section>

				<section>
					<h2 class="font-display text-xl font-semibold mb-3" style="color: {isDark ? '#ffffff' : '#171717'}">Data Retention & Deletion</h2>
					<p class="mb-3">We retain your data as long as your account is active. When you delete your account:</p>
					<ul class="space-y-2">
						<li>• Your data is removed from our active database promptly</li>
						<li>• Encrypted database backups maintained by our hosting provider (Supabase) may retain your data for a limited period before automatic expiration (typically 7-30 days depending on the backup schedule)</li>
						<li>• We cannot selectively remove data from encrypted backups, but backups are automatically purged on a rolling basis</li>
					</ul>
				</section>

				<section>
					<h2 class="font-display text-xl font-semibold mb-3" style="color: {isDark ? '#ffffff' : '#171717'}">Your Rights & Controls</h2>
					<p class="mb-3">You have the right to:</p>
					<ul class="space-y-2">
						<li>• <strong>Access:</strong> View all your stored data within the app</li>
						<li>• <strong>Export:</strong> Download your transactions, budgets, and settings at any time (available in Settings)</li>
						<li>• <strong>Delete:</strong> Delete individual imports or your entire account and all associated data</li>
						<li>• <strong>Correct:</strong> Edit your transaction data, categories, and account information</li>
					</ul>
				</section>

				<section>
					<h2 class="font-display text-xl font-semibold mb-3" style="color: {isDark ? '#ffffff' : '#171717'}">Cookies</h2>
					<p class="mb-3">SpentWorth uses the following types of cookies:</p>
					<ul class="space-y-2 mb-3">
						<li>• <strong>Essential cookies:</strong> Required for authentication and session management. These are always active.</li>
						<li>• <strong>Analytics cookies:</strong> Used by Google Analytics to understand site usage. These are only placed if you accept cookies when prompted.</li>
					</ul>
					<p class="mb-3">When you first visit SpentWorth, we ask for your consent before placing analytics cookies. You can change your preference at any time by clearing your browser's cookies and revisiting the site.</p>
					<p>We do not use advertising cookies or sell data to advertisers.</p>
				</section>

				<section>
					<h2 class="font-display text-xl font-semibold mb-3" style="color: {isDark ? '#ffffff' : '#171717'}">Children's Privacy</h2>
					<p>SpentWorth is not intended for users under the age of 18. We do not knowingly collect personal information from children.</p>
				</section>

				<section>
					<h2 class="font-display text-xl font-semibold mb-3" style="color: {isDark ? '#ffffff' : '#171717'}">Changes to This Policy</h2>
					<p>We may update this Privacy Policy from time to time. If we make material changes, we will notify you by email or through a notice on the service before the changes take effect.</p>
				</section>

				<section>
					<h2 class="font-display text-xl font-semibold mb-3" style="color: {isDark ? '#ffffff' : '#171717'}">Contact Us</h2>
					<p>If you have questions about this Privacy Policy or how we handle your data, please contact us at <a href="mailto:support@spentworth.com" class="text-sw-accent hover:underline">support@spentworth.com</a>.</p>
				</section>
			</div>
		</div>
	</main>
</div>

