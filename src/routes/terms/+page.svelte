<script lang="ts">
	import Logo from '$lib/components/Logo.svelte';
	import SEO from '$lib/components/SEO.svelte';

	// Public pages always use light mode (dark mode is Pro-only)
	const isDark = false;
</script>

<SEO 
	title="Terms of Service — SpentWorth User Agreement"
	description="SpentWorth terms of service. Read our user agreement covering account usage, subscriptions, data handling, and your rights as a user."
	keywords="SpentWorth terms of service, budget app terms, spending tracker agreement, user agreement"
	canonical="/terms"
	structuredData="WebPage"
/>

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
		<h1 class="font-display text-3xl font-bold mb-2" style="color: {isDark ? '#ffffff' : '#171717'}">Terms of Service</h1>
		<p class="text-sm mb-8" style="color: {isDark ? '#a3a3a3' : '#737373'}">Last updated: January 22, 2026</p>

		<div class="prose prose-sm max-w-none" style="color: {isDark ? '#a3a3a3' : '#525252'}">
			<div class="space-y-8">
				<section>
					<h2 class="font-display text-xl font-semibold mb-3" style="color: {isDark ? '#ffffff' : '#171717'}">1. Acceptance of Terms</h2>
					<p>By creating an account or using SpentWorth ("the Service"), you agree to be bound by these Terms of Service ("Terms"). If you don't agree to these Terms, please don't use our Service.</p>
				</section>

				<section>
					<h2 class="font-display text-xl font-semibold mb-3" style="color: {isDark ? '#ffffff' : '#171717'}">2. Description of Service</h2>
					<p class="mb-3">SpentWorth is a personal finance tool that helps you:</p>
					<ul class="space-y-2">
						<li>• Upload and categorize bank transaction data from CSV files</li>
						<li>• Track spending patterns and set budgets</li>
						<li>• Calculate the opportunity cost of spending decisions</li>
						<li>• Set and track financial goals</li>
					</ul>
					<p class="mt-3">SpentWorth is designed as an informational tool. We do not provide financial, investment, tax, or legal advice.</p>
				</section>

				<section>
					<h2 class="font-display text-xl font-semibold mb-3" style="color: {isDark ? '#ffffff' : '#171717'}">3. User Accounts</h2>
					<p class="mb-3">To use SpentWorth, you must create an account with a valid email address. You are responsible for:</p>
					<ul class="space-y-2">
						<li>• Providing accurate account information</li>
						<li>• Maintaining the confidentiality of your password</li>
						<li>• All activities that occur under your account</li>
						<li>• Notifying us immediately of any unauthorized use</li>
					</ul>
					<p class="mt-3">You must be at least 18 years old to use the Service.</p>
				</section>

				<section>
					<h2 class="font-display text-xl font-semibold mb-3" style="color: {isDark ? '#ffffff' : '#171717'}">4. User Data & Privacy</h2>
					<p class="mb-3">You retain ownership of all data you upload to SpentWorth. We do not claim any intellectual property rights to your personal financial data.</p>
					<ul class="space-y-2">
						<li>• You can export your data at any time</li>
						<li>• You can delete your account and all associated data</li>
						<li>• Our use of your data is governed by our <a href="/privacy" class="text-sw-accent hover:underline">Privacy Policy</a></li>
					</ul>
				</section>

				<section>
					<h2 class="font-display text-xl font-semibold mb-3" style="color: {isDark ? '#ffffff' : '#171717'}">5. Subscription & Payments</h2>
					<p class="mb-3">SpentWorth offers both free and paid subscription plans ("SpentWorth Pro").</p>
					<ul class="space-y-2">
						<li>• Paid subscriptions are billed in advance on a monthly or annual basis</li>
						<li>• You may cancel your subscription at any time through your account settings</li>
						<li>• Cancellation takes effect at the end of the current billing period</li>
						<li>• We do not provide refunds for partial billing periods, except as required by law</li>
						<li>• Prices may change with reasonable notice; existing subscribers will be notified before renewal</li>
					</ul>
				</section>

				<section>
					<h2 class="font-display text-xl font-semibold mb-3" style="color: {isDark ? '#ffffff' : '#171717'}">6. Acceptable Use</h2>
					<p class="mb-3">You agree not to:</p>
					<ul class="space-y-2">
						<li>• Use the Service for any illegal purpose</li>
						<li>• Upload malicious files, viruses, or harmful code</li>
						<li>• Attempt to gain unauthorized access to our systems or other users' accounts</li>
						<li>• Interfere with or disrupt the Service</li>
						<li>• Resell, redistribute, or sublicense the Service</li>
						<li>• Scrape, data mine, or extract data from the Service except for your own data export</li>
						<li>• Use the Service on behalf of a third party without authorization</li>
					</ul>
				</section>

				<section>
					<h2 class="font-display text-xl font-semibold mb-3" style="color: {isDark ? '#ffffff' : '#171717'}">7. Termination</h2>
					<p class="mb-3">We may suspend or terminate your account if you violate these Terms. You may delete your account at any time through Settings.</p>
					<p>Upon termination, your right to use the Service ceases immediately. Data deletion follows our <a href="/privacy" class="text-sw-accent hover:underline">Privacy Policy</a>.</p>
				</section>

				<section>
					<h2 class="font-display text-xl font-semibold mb-3" style="color: {isDark ? '#ffffff' : '#171717'}">8. Disclaimer of Warranties</h2>
					<div class="rounded-xl p-4" style="background: {isDark ? '#1a1a1a' : '#fff7ed'}; border: 1px solid {isDark ? '#2a2a2a' : '#fed7aa'}">
						<p class="font-medium mb-2" style="color: {isDark ? '#ffffff' : '#171717'}">Important Notice</p>
						<p class="text-sm">SpentWorth is provided "as is" and "as available" without warranties of any kind, either express or implied.</p>
					</div>
					<ul class="space-y-2 mt-3">
						<li>• <strong>Not financial advice:</strong> The calculations, projections, and insights provided are for informational purposes only and should not be considered financial, investment, tax, or legal advice.</li>
						<li>• <strong>No guarantees:</strong> Past performance data and opportunity cost calculations do not guarantee future results. Investment returns are hypothetical.</li>
						<li>• <strong>Data accuracy:</strong> We rely on the data you provide and third-party price data. We do not guarantee accuracy.</li>
						<li>• <strong>Service availability:</strong> We do not guarantee uninterrupted access to the Service.</li>
					</ul>
				</section>

				<section>
					<h2 class="font-display text-xl font-semibold mb-3" style="color: {isDark ? '#ffffff' : '#171717'}">9. Limitation of Liability</h2>
					<p>To the maximum extent permitted by law, SpentWorth and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits, data, or goodwill, resulting from:</p>
					<ul class="space-y-2 mt-3">
						<li>• Your use or inability to use the Service</li>
						<li>• Any decisions you make based on information from the Service</li>
						<li>• Unauthorized access to your account</li>
						<li>• Any third-party conduct on the Service</li>
					</ul>
				</section>

				<section>
					<h2 class="font-display text-xl font-semibold mb-3" style="color: {isDark ? '#ffffff' : '#171717'}">10. Indemnification</h2>
					<p>You agree to indemnify and hold harmless SpentWorth from any claims, damages, or expenses arising from your use of the Service or violation of these Terms.</p>
				</section>

				<section>
					<h2 class="font-display text-xl font-semibold mb-3" style="color: {isDark ? '#ffffff' : '#171717'}">11. Changes to Terms</h2>
					<p>We may update these Terms from time to time. If we make material changes, we will notify you by email or through a prominent notice on the Service before the changes take effect. Your continued use of the Service after changes take effect constitutes acceptance of the new Terms.</p>
				</section>

				<section>
					<h2 class="font-display text-xl font-semibold mb-3" style="color: {isDark ? '#ffffff' : '#171717'}">12. Governing Law</h2>
					<p>These Terms shall be governed by and construed in accordance with applicable law, without regard to conflict of law principles.</p>
				</section>

				<section>
					<h2 class="font-display text-xl font-semibold mb-3" style="color: {isDark ? '#ffffff' : '#171717'}">13. Contact</h2>
					<p>Questions about these Terms? Contact us at <a href="mailto:support@spentworth.com" class="text-sw-accent hover:underline">support@spentworth.com</a>.</p>
				</section>
			</div>
		</div>
	</main>

	<!-- Footer -->
	<footer class="border-t" style="border-color: {isDark ? '#2a2a2a' : '#e5e5e5'}; background: {isDark ? '#0a0a0a' : '#faf7f2'}">
		<div class="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
			<!-- Main Footer Content -->
			<div class="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
				<!-- Brand Column -->
				<div class="col-span-2 md:col-span-1">
					<div class="flex items-center gap-2 mb-4">
						<div class="rounded-xl bg-sw-accent flex items-center justify-center text-white p-1.5">
							<Logo size="sm" class="text-white" />
						</div>
						<span class="font-display text-lg font-semibold" style="color: {isDark ? '#ffffff' : '#171717'}">SpentWorth</span>
					</div>
				<p class="text-sm mb-4" style="color: {isDark ? '#a3a3a3' : '#737373'}">
					Know where your money goes. Build the life you want.
				</p>
				<div class="flex items-center gap-3">
					<a href="https://x.com/spentworthapp" target="_blank" rel="noopener" aria-label="Follow us on X (Twitter)" class="w-9 h-9 rounded-lg flex items-center justify-center transition-colors hover:text-sw-accent" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; color: {isDark ? '#a3a3a3' : '#737373'}">
						<i class="fa-brands fa-x-twitter"></i>
					</a>
					<a href="https://instagram.com/spentworth" target="_blank" rel="noopener" aria-label="Follow us on Instagram" class="w-9 h-9 rounded-lg flex items-center justify-center transition-colors hover:text-sw-accent" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; color: {isDark ? '#a3a3a3' : '#737373'}">
						<i class="fa-brands fa-instagram"></i>
					</a>
					<a href="https://reddit.com/r/SpentWorth" target="_blank" rel="noopener" aria-label="Join us on Reddit" class="w-9 h-9 rounded-lg flex items-center justify-center transition-colors hover:text-sw-accent" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; color: {isDark ? '#a3a3a3' : '#737373'}">
						<i class="fa-brands fa-reddit"></i>
					</a>
					<a href="https://www.linkedin.com" target="_blank" rel="noopener" aria-label="Follow us on LinkedIn" class="w-9 h-9 rounded-lg flex items-center justify-center transition-colors hover:text-sw-accent" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; color: {isDark ? '#a3a3a3' : '#737373'}">
						<i class="fa-brands fa-linkedin"></i>
					</a>
				</div>
				</div>

				<!-- Product -->
				<div>
					<h4 class="font-display font-semibold mb-4" style="color: {isDark ? '#ffffff' : '#171717'}">Product</h4>
					<ul class="space-y-2.5">
						<li><a href="/pricing" class="text-sm transition-colors hover:text-sw-accent" style="color: {isDark ? '#a3a3a3' : '#737373'}">Pricing</a></li>
						<li><a href="/#features" class="text-sm transition-colors hover:text-sw-accent" style="color: {isDark ? '#a3a3a3' : '#737373'}">Features</a></li>
						<li><a href="/#how-it-works" class="text-sm transition-colors hover:text-sw-accent" style="color: {isDark ? '#a3a3a3' : '#737373'}">How It Works</a></li>
					</ul>
				</div>

				<!-- Company -->
				<div>
					<h4 class="font-display font-semibold mb-4" style="color: {isDark ? '#ffffff' : '#171717'}">Company</h4>
					<ul class="space-y-2.5">
						<li><a href="/about" class="text-sm transition-colors hover:text-sw-accent" style="color: {isDark ? '#a3a3a3' : '#737373'}">About</a></li>
						<li><a href="/contact" class="text-sm transition-colors hover:text-sw-accent" style="color: {isDark ? '#a3a3a3' : '#737373'}">Contact</a></li>
					</ul>
				</div>

				<!-- Legal -->
				<div>
					<h4 class="font-display font-semibold mb-4" style="color: {isDark ? '#ffffff' : '#171717'}">Legal</h4>
					<ul class="space-y-2.5">
						<li><a href="/privacy" class="text-sm transition-colors hover:text-sw-accent" style="color: {isDark ? '#a3a3a3' : '#737373'}">Privacy Policy</a></li>
						<li><a href="/terms" class="text-sm transition-colors hover:text-sw-accent" style="color: {isDark ? '#a3a3a3' : '#737373'}">Terms of Service</a></li>
						<li><a href="/security" class="text-sm transition-colors hover:text-sw-accent" style="color: {isDark ? '#a3a3a3' : '#737373'}">Security</a></li>
					</ul>
				</div>
			</div>

			<!-- Bottom Bar -->
			<div class="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8" style="border-top: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
				<p class="text-xs" style="color: {isDark ? '#737373' : '#9ca3af'}">
					© {new Date().getFullYear()} SpentWorth. All rights reserved.
				</p>
				<p class="text-xs" style="color: {isDark ? '#737373' : '#9ca3af'}">
					Made with <i class="fa-solid fa-heart text-red-500"></i> for people who care about their financial future
				</p>
			</div>
		</div>
	</footer>
</div>

