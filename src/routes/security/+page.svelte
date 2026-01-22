<script lang="ts">
	import Logo from '$lib/components/Logo.svelte';

	// Public pages always use light mode (dark mode is Pro-only)
	const isDark = false;
</script>

<svelte:head>
	<title>Security | SpentWorth</title>
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
						<p class="text-sm">Your financial data deserves the highest protection.</p>
					</div>
				</div>
				<p>Unlike many financial apps, SpentWorth doesn't require you to link your bank accounts. We use a simple CSV import process that keeps you in complete control of what data you share.</p>
			</div>

			<div class="grid sm:grid-cols-2 gap-4 mb-8">
				<div class="rounded-xl p-5" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
					<i class="fa-solid fa-lock text-sw-accent text-xl mb-3"></i>
					<h3 class="font-display font-semibold mb-2" style="color: {isDark ? '#ffffff' : '#171717'}">Encryption</h3>
					<p class="text-sm">All data is encrypted in transit using TLS 1.3 and at rest using AES-256 encryption.</p>
				</div>
				<div class="rounded-xl p-5" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
					<i class="fa-solid fa-key text-sw-accent text-xl mb-3"></i>
					<h3 class="font-display font-semibold mb-2" style="color: {isDark ? '#ffffff' : '#171717'}">No Credentials</h3>
					<p class="text-sm">We never ask for or store your bank login credentials. CSV imports don't require bank access.</p>
				</div>
				<div class="rounded-xl p-5" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
					<i class="fa-solid fa-server text-sw-accent text-xl mb-3"></i>
					<h3 class="font-display font-semibold mb-2" style="color: {isDark ? '#ffffff' : '#171717'}">Secure Hosting</h3>
					<p class="text-sm">Our infrastructure is hosted on enterprise-grade cloud platforms with SOC 2 compliance.</p>
				</div>
				<div class="rounded-xl p-5" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
					<i class="fa-solid fa-trash-can text-sw-accent text-xl mb-3"></i>
					<h3 class="font-display font-semibold mb-2" style="color: {isDark ? '#ffffff' : '#171717'}">Data Deletion</h3>
					<p class="text-sm">Delete your account and all associated data at any time. We don't keep backups of deleted data.</p>
				</div>
			</div>

			<div class="space-y-6">
				<section>
					<h2 class="font-display text-xl font-semibold mb-3" style="color: {isDark ? '#ffffff' : '#171717'}">How CSV Import Works</h2>
					<ol class="space-y-3 list-decimal list-inside">
						<li>You download a CSV file from your bank (most banks offer this)</li>
						<li>You upload the CSV to SpentWorth</li>
						<li>The file is processed and transactions are categorized</li>
						<li>Only the transaction data (date, amount, merchant) is stored</li>
					</ol>
					<p class="mt-3">We never see your account numbers, balances, or login credentials.</p>
				</section>

				<section>
					<h2 class="font-display text-xl font-semibold mb-3" style="color: {isDark ? '#ffffff' : '#171717'}">Security Best Practices</h2>
					<p class="mb-3">To keep your account secure, we recommend:</p>
					<ul class="space-y-2">
						<li>• Using a strong, unique password</li>
						<li>• Not sharing your account credentials</li>
						<li>• Logging out when using shared devices</li>
						<li>• Keeping your email address up to date</li>
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

