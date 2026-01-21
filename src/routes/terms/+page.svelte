<script lang="ts">
	import { onMount } from 'svelte';
	import { initTheme, getTheme, toggleTheme } from '$lib/stores/theme';
	import Logo from '$lib/components/Logo.svelte';

	let isDark = $state(false);

	onMount(() => {
		initTheme();
		isDark = getTheme() === 'dark';
	});

	function handleThemeToggle() {
		toggleTheme();
		isDark = getTheme() === 'dark';
	}
</script>

<svelte:head>
	<title>Terms of Service | SpentWorth</title>
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
			<button
				onclick={handleThemeToggle}
				class="p-2 rounded-lg transition-colors"
				style="color: {isDark ? '#a3a3a3' : '#737373'}"
			>
				{#if isDark}
					<i class="fa-solid fa-sun"></i>
				{:else}
					<i class="fa-solid fa-moon"></i>
				{/if}
			</button>
		</div>
	</header>

	<main class="max-w-3xl mx-auto px-4 py-12">
		<h1 class="font-display text-3xl font-bold mb-2" style="color: {isDark ? '#ffffff' : '#171717'}">Terms of Service</h1>
		<p class="text-sm mb-8" style="color: {isDark ? '#a3a3a3' : '#737373'}">Last updated: January 21, 2026</p>

		<div class="prose prose-sm max-w-none" style="color: {isDark ? '#a3a3a3' : '#525252'}">
			<div class="space-y-8">
				<section>
					<h2 class="font-display text-xl font-semibold mb-3" style="color: {isDark ? '#ffffff' : '#171717'}">1. Acceptance of Terms</h2>
					<p>By accessing or using SpentWorth, you agree to be bound by these Terms of Service. If you don't agree to these terms, please don't use our service.</p>
				</section>

				<section>
					<h2 class="font-display text-xl font-semibold mb-3" style="color: {isDark ? '#ffffff' : '#171717'}">2. Description of Service</h2>
					<p class="mb-3">SpentWorth is a personal finance tool that helps you:</p>
					<ul class="space-y-2">
						<li>• Upload and categorize bank transaction data from CSV files</li>
						<li>• Track spending patterns and identify opportunities</li>
						<li>• Calculate the opportunity cost of spending decisions</li>
						<li>• Set and track financial goals</li>
					</ul>
				</section>

				<section>
					<h2 class="font-display text-xl font-semibold mb-3" style="color: {isDark ? '#ffffff' : '#171717'}">3. User Accounts</h2>
					<p class="mb-3">You are responsible for:</p>
					<ul class="space-y-2">
						<li>• Maintaining the confidentiality of your account</li>
						<li>• All activities that occur under your account</li>
						<li>• Notifying us immediately of any unauthorized use</li>
					</ul>
				</section>

				<section>
					<h2 class="font-display text-xl font-semibold mb-3" style="color: {isDark ? '#ffffff' : '#171717'}">4. User Data</h2>
					<p>You retain ownership of all data you upload to SpentWorth. We don't claim any rights to your personal financial data. You can export or delete your data at any time.</p>
				</section>

				<section>
					<h2 class="font-display text-xl font-semibold mb-3" style="color: {isDark ? '#ffffff' : '#171717'}">5. Prohibited Uses</h2>
					<p class="mb-3">You agree not to:</p>
					<ul class="space-y-2">
						<li>• Use the service for any illegal purpose</li>
						<li>• Upload malicious files or code</li>
						<li>• Attempt to gain unauthorized access to our systems</li>
						<li>• Resell or redistribute the service</li>
					</ul>
				</section>

				<section>
					<h2 class="font-display text-xl font-semibold mb-3" style="color: {isDark ? '#ffffff' : '#171717'}">6. Disclaimer</h2>
					<p>SpentWorth is provided "as is" without warranties of any kind. The calculations and insights provided are for informational purposes only and should not be considered financial advice. Past performance does not guarantee future results.</p>
				</section>

				<section>
					<h2 class="font-display text-xl font-semibold mb-3" style="color: {isDark ? '#ffffff' : '#171717'}">7. Limitation of Liability</h2>
					<p>SpentWorth shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the service.</p>
				</section>

				<section>
					<h2 class="font-display text-xl font-semibold mb-3" style="color: {isDark ? '#ffffff' : '#171717'}">8. Changes to Terms</h2>
					<p>We may update these terms from time to time. We'll notify you of significant changes via email or through the service.</p>
				</section>

				<section>
					<h2 class="font-display text-xl font-semibold mb-3" style="color: {isDark ? '#ffffff' : '#171717'}">9. Contact</h2>
					<p>Questions about these terms? Contact us at <a href="mailto:legal@spentworth.com" class="text-sw-accent hover:underline">legal@spentworth.com</a>.</p>
				</section>
			</div>
		</div>
	</main>
</div>

