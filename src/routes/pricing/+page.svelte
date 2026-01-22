<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { initTheme, getTheme, toggleTheme } from '$lib/stores/theme';
	import Logo from '$lib/components/Logo.svelte';

	let isDark = $state(false);
	let billingCycle = $state<'monthly' | 'yearly'>('yearly');
	let isLoading = $state(false);
	let checkoutError = $state<string | null>(null);
	let isLoggedIn = $state(false);

	onMount(() => {
		initTheme();
		isDark = getTheme() === 'dark';
		
		// Check if user is logged in
		isLoggedIn = !!$page.data.session;
		
		// Check for canceled checkout
		const params = new URLSearchParams(window.location.search);
		if (params.get('checkout') === 'canceled') {
			checkoutError = 'Checkout was canceled. You can try again anytime.';
			// Clean up URL
			window.history.replaceState({}, '', '/pricing');
		}
	});

	function handleThemeToggle() {
		toggleTheme();
		isDark = getTheme() === 'dark';
	}

	const plans = {
		free: {
			name: 'Free',
			description: 'Get started with the basics',
			monthlyPrice: 0,
			yearlyPrice: 0,
			features: [
				'3 CSV imports per month',
				'Basic spending dashboard',
				'Opportunity cost calculator',
				'5 budget categories',
				'90-day transaction history'
			],
			cta: 'Get Started',
			ctaHref: '/signup',
			highlighted: false
		},
		pro: {
			name: 'Pro',
			description: 'For serious wealth builders',
			monthlyPrice: 8,
			yearlyPrice: 6,
			features: [
				'Unlimited CSV imports',
				'Full spending dashboard',
				'Advanced insights & recommendations',
				'Unlimited budget categories',
				'Unlimited transaction history',
				'Monthly trend analysis',
				'CSV & PDF export',
				'Email digest (coming soon)',
				'Priority support'
			],
			cta: 'Upgrade to Pro',
			ctaHref: '/signup?plan=pro',
			highlighted: true
		}
	};

	function getPrice(plan: typeof plans.free | typeof plans.pro) {
		if (plan.monthlyPrice === 0) return 'Free';
		const price = billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
		return `$${price}`;
	}

	function getSavings() {
		const monthly = plans.pro.monthlyPrice * 12;
		const yearly = plans.pro.yearlyPrice * 12;
		return Math.round(((monthly - yearly) / monthly) * 100);
	}

	async function handleProCheckout() {
		if (!isLoggedIn) {
			// Redirect to signup with plan info
			goto(`/signup?plan=pro&interval=${billingCycle}`);
			return;
		}

		isLoading = true;
		checkoutError = null;

		try {
			const response = await fetch('/api/stripe/checkout', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ interval: billingCycle })
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.message || 'Failed to start checkout');
			}

			const { url } = await response.json();
			
			if (url) {
				window.location.href = url;
			} else {
				throw new Error('No checkout URL returned');
			}
		} catch (err) {
			checkoutError = err instanceof Error ? err.message : 'Something went wrong';
			isLoading = false;
		}
	}
</script>

<svelte:head>
	<title>Pricing | SpentWorth</title>
</svelte:head>

<div class="min-h-screen" style="background: {isDark ? 'var(--sw-bg)' : '#f5f0e8'}">
	<!-- Header -->
	<header class="border-b backdrop-blur-md sticky top-0 z-50" style="border-color: {isDark ? 'rgba(42,42,42,0.3)' : 'rgba(0,0,0,0.1)'}; background: {isDark ? 'rgba(10,10,10,0.9)' : 'rgba(245,240,232,0.9)'}">
		<div class="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
			<a href="/" class="flex items-center gap-2">
				<div class="rounded-xl bg-sw-accent flex items-center justify-center text-white p-1.5">
					<Logo size="sm" class="text-white" />
				</div>
				<span class="font-display text-lg font-semibold hidden sm:inline" style="color: {isDark ? '#ffffff' : '#171717'}">SpentWorth</span>
			</a>
			<div class="flex items-center gap-2 sm:gap-4">
				<button
					onclick={handleThemeToggle}
					class="p-2 rounded-lg transition-colors"
					style="color: {isDark ? '#a3a3a3' : '#737373'}"
					aria-label="Toggle theme"
				>
					{#if isDark}
						<i class="fa-solid fa-sun"></i>
					{:else}
						<i class="fa-solid fa-moon"></i>
					{/if}
				</button>
				{#if isLoggedIn}
					<a href="/dashboard" class="btn-primary text-xs sm:text-sm px-3 sm:px-4 py-2">Dashboard</a>
				{:else}
					<a href="/login" class="text-sm font-medium hidden sm:block" style="color: {isDark ? '#a3a3a3' : '#737373'}">Log in</a>
					<a href="/signup" class="btn-primary text-xs sm:text-sm px-3 sm:px-4 py-2">Sign up</a>
				{/if}
			</div>
		</div>
	</header>

	<main class="max-w-4xl mx-auto px-4 py-12 sm:py-16">
		<!-- Header -->
		<div class="text-center mb-10">
			<h1 class="font-display text-3xl sm:text-4xl font-bold mb-3" style="color: {isDark ? '#ffffff' : '#171717'}">
				Simple, transparent pricing
			</h1>
			<p class="text-base sm:text-lg" style="color: {isDark ? '#a3a3a3' : '#525252'}">
				Start free. Upgrade when you're ready.
			</p>
		</div>

		<!-- Error message -->
		{#if checkoutError}
			<div class="mb-6 p-4 rounded-xl text-center" style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3)">
				<p class="text-red-500 text-sm">{checkoutError}</p>
			</div>
		{/if}

		<!-- Billing Toggle -->
		<div class="flex items-center justify-center gap-3 mb-10">
			<span 
				class="text-sm font-medium"
				style="color: {billingCycle === 'monthly' ? (isDark ? '#ffffff' : '#171717') : (isDark ? '#737373' : '#9ca3af')}"
			>
				Monthly
			</span>
		<button
			onclick={() => billingCycle = billingCycle === 'monthly' ? 'yearly' : 'monthly'}
			class="relative w-14 h-8 rounded-full transition-colors"
			style="background: {billingCycle === 'yearly' ? '#0d9488' : (isDark ? '#2a2a2a' : '#d4d4d4')}"
			aria-label="Toggle billing cycle between monthly and yearly"
		>
				<span 
					class="absolute top-1 w-6 h-6 rounded-full bg-white transition-transform shadow-sm"
					style="left: {billingCycle === 'yearly' ? '30px' : '4px'}"
				></span>
			</button>
			<span 
				class="text-sm font-medium"
				style="color: {billingCycle === 'yearly' ? (isDark ? '#ffffff' : '#171717') : (isDark ? '#737373' : '#9ca3af')}"
			>
				Yearly
			</span>
			{#if billingCycle === 'yearly'}
				<span class="text-xs px-2 py-1 rounded-full bg-sw-accent text-white font-medium">
					Save {getSavings()}%
				</span>
			{/if}
		</div>

		<!-- Pricing Cards -->
		<div class="grid md:grid-cols-2 gap-6">
			<!-- Free Plan -->
			<div 
				class="rounded-2xl p-6 sm:p-8 relative"
				style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}"
			>
				<div class="mb-6">
					<h2 class="font-display text-xl font-semibold mb-1" style="color: {isDark ? '#ffffff' : '#171717'}">
						{plans.free.name}
					</h2>
					<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">
						{plans.free.description}
					</p>
				</div>

				<div class="mb-6">
					<span class="font-display text-4xl font-bold" style="color: {isDark ? '#ffffff' : '#171717'}">
						Free
					</span>
					<span class="text-sm" style="color: {isDark ? '#737373' : '#9ca3af'}">
						forever
					</span>
				</div>

				<a 
					href={plans.free.ctaHref}
					class="block w-full text-center py-3 rounded-xl font-display font-semibold transition-colors mb-6"
					style="background: {isDark ? '#2a2a2a' : '#f5f0e8'}; color: {isDark ? '#ffffff' : '#171717'}"
				>
					{plans.free.cta}
				</a>

				<ul class="space-y-3">
					{#each plans.free.features as feature}
						<li class="flex items-start gap-3 text-sm">
							<i class="fa-solid fa-check text-sw-accent mt-0.5"></i>
							<span style="color: {isDark ? '#a3a3a3' : '#525252'}">{feature}</span>
						</li>
					{/each}
				</ul>
			</div>

			<!-- Pro Plan -->
			<div 
				class="rounded-2xl p-6 sm:p-8 relative"
				style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 2px solid #0d9488"
			>
				<div class="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-sw-accent text-white text-xs font-medium">
					Most Popular
				</div>

				<div class="mb-6">
					<h2 class="font-display text-xl font-semibold mb-1" style="color: {isDark ? '#ffffff' : '#171717'}">
						{plans.pro.name}
					</h2>
					<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">
						{plans.pro.description}
					</p>
				</div>

				<div class="mb-6">
					<span class="font-display text-4xl font-bold" style="color: {isDark ? '#ffffff' : '#171717'}">
						{getPrice(plans.pro)}
					</span>
					<span class="text-sm" style="color: {isDark ? '#737373' : '#9ca3af'}">
						/month
					</span>
					{#if billingCycle === 'yearly'}
						<p class="text-xs mt-1" style="color: {isDark ? '#737373' : '#9ca3af'}">
							Billed annually (${plans.pro.yearlyPrice * 12}/year)
						</p>
					{/if}
				</div>

				<button 
					onclick={handleProCheckout}
					disabled={isLoading}
					class="block w-full text-center py-3 rounded-xl font-display font-semibold transition-colors mb-6 disabled:opacity-50 disabled:cursor-not-allowed"
					style="background: #0d9488; color: #ffffff"
				>
					{#if isLoading}
						<i class="fa-solid fa-spinner fa-spin mr-2"></i>
						Processing...
					{:else}
						Upgrade to Pro
					{/if}
				</button>

				<p class="text-xs text-center mb-4" style="color: {isDark ? '#737373' : '#9ca3af'}">
					<i class="fa-solid fa-lock mr-1"></i>
					Secure checkout powered by Stripe
				</p>

				<ul class="space-y-3">
					{#each plans.pro.features as feature}
						<li class="flex items-start gap-3 text-sm">
							<i class="fa-solid fa-check text-sw-accent mt-0.5"></i>
							<span style="color: {isDark ? '#a3a3a3' : '#525252'}">{feature}</span>
						</li>
					{/each}
				</ul>
			</div>
		</div>

		<!-- FAQ Section -->
		<div class="mt-16">
			<h2 class="font-display text-2xl font-semibold text-center mb-8" style="color: {isDark ? '#ffffff' : '#171717'}">
				Questions?
			</h2>
			<div class="space-y-4 max-w-2xl mx-auto">
				{#each [
					{
						q: 'Can I cancel anytime?',
						a: 'Yes, you can cancel your Pro subscription at any time. You\'ll continue to have access until the end of your billing period.'
					},
					{
						q: 'Is my financial data secure?',
						a: 'Your data never leaves your browser during CSV import. We don\'t have access to your bank credentials or account numbers.'
					},
					{
						q: 'What happens when I hit the free tier limits?',
						a: 'You can still view your existing data, but you won\'t be able to import new transactions until you upgrade or the next month.'
					}
				] as faq}
					<div class="rounded-xl p-5" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
						<h3 class="font-display font-semibold mb-2" style="color: {isDark ? '#ffffff' : '#171717'}">
							{faq.q}
						</h3>
						<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">
							{faq.a}
						</p>
					</div>
				{/each}
			</div>
		</div>

	</main>
</div>
