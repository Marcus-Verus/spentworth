<script lang="ts">
	import Logo from '$lib/components/Logo.svelte';

	// Public pages always use light mode (dark mode is Pro-only)
	const isDark = false;
</script>

<svelte:head>
	<title>Privacy Policy | SpentWorth</title>
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
		<p class="text-sm mb-8" style="color: {isDark ? '#a3a3a3' : '#737373'}">Last updated: January 21, 2026</p>

		<div class="prose prose-sm max-w-none" style="color: {isDark ? '#a3a3a3' : '#525252'}">
			<div class="space-y-8">
				<section>
					<h2 class="font-display text-xl font-semibold mb-3" style="color: {isDark ? '#ffffff' : '#171717'}">Our Commitment to Privacy</h2>
					<p class="mb-4">At SpentWorth, we believe your financial data is deeply personal. We've built our service with privacy as a core principle, not an afterthought.</p>
					<div class="rounded-xl p-4 mb-4" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
						<p class="font-medium" style="color: {isDark ? '#ffffff' : '#171717'}"><i class="fa-solid fa-shield-halved text-sw-accent mr-2"></i>Key Privacy Facts:</p>
						<ul class="mt-2 space-y-1 text-sm">
							<li>• We never access your bank credentials</li>
							<li>• CSV files are processed locally in your browser</li>
							<li>• We don't sell your data to third parties</li>
							<li>• You can delete your data at any time</li>
						</ul>
					</div>
				</section>

				<section>
					<h2 class="font-display text-xl font-semibold mb-3" style="color: {isDark ? '#ffffff' : '#171717'}">Information We Collect</h2>
					<h3 class="font-semibold mt-4 mb-2" style="color: {isDark ? '#ffffff' : '#171717'}">Account Information</h3>
					<p class="mb-3">When you create an account, we collect your email address and a password (which is securely hashed).</p>
					
					<h3 class="font-semibold mt-4 mb-2" style="color: {isDark ? '#ffffff' : '#171717'}">Transaction Data</h3>
					<p class="mb-3">When you upload CSV files, we store the transaction data you choose to import. This includes dates, amounts, merchant names, and categories. We do not store your bank account numbers or any credentials.</p>
					
					<h3 class="font-semibold mt-4 mb-2" style="color: {isDark ? '#ffffff' : '#171717'}">Usage Data</h3>
					<p>We collect basic analytics to improve our service, including pages visited and features used. This data is anonymized and not tied to your financial information.</p>
				</section>

				<section>
					<h2 class="font-display text-xl font-semibold mb-3" style="color: {isDark ? '#ffffff' : '#171717'}">How We Use Your Information</h2>
					<ul class="space-y-2">
						<li>• To provide and maintain our service</li>
						<li>• To calculate your spending insights and opportunity costs</li>
						<li>• To send you important account notifications</li>
						<li>• To improve our product and user experience</li>
					</ul>
				</section>

				<section>
					<h2 class="font-display text-xl font-semibold mb-3" style="color: {isDark ? '#ffffff' : '#171717'}">Data Security</h2>
					<p class="mb-3">We use industry-standard security measures to protect your data:</p>
					<ul class="space-y-2">
						<li>• All data is encrypted in transit (TLS/SSL)</li>
						<li>• Data at rest is encrypted using AES-256</li>
						<li>• We use Supabase for secure database hosting</li>
						<li>• Regular security audits and updates</li>
					</ul>
				</section>

				<section>
					<h2 class="font-display text-xl font-semibold mb-3" style="color: {isDark ? '#ffffff' : '#171717'}">Your Rights</h2>
					<p class="mb-3">You have the right to:</p>
					<ul class="space-y-2">
						<li>• Access your personal data</li>
						<li>• Export your data at any time</li>
						<li>• Delete your account and all associated data</li>
						<li>• Opt out of marketing communications</li>
					</ul>
				</section>

				<section>
					<h2 class="font-display text-xl font-semibold mb-3" style="color: {isDark ? '#ffffff' : '#171717'}">Contact Us</h2>
					<p>If you have questions about this Privacy Policy, please contact us at <a href="mailto:support@spentworth.com" class="text-sw-accent hover:underline">support@spentworth.com</a>.</p>
				</section>
			</div>
		</div>
	</main>
</div>

