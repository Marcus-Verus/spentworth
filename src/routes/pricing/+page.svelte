<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import Logo from '$lib/components/Logo.svelte';

	let { data } = $props();
	
	let mobileMenuOpen = $state(false);
	let billingCycle = $state<'monthly' | 'yearly'>('yearly');
	let isLoading = $state(false);
	let checkoutError = $state<string | null>(null);

	onMount(() => {
		// Check for canceled checkout
		const params = new URLSearchParams(window.location.search);
		if (params.get('checkout') === 'canceled') {
			checkoutError = 'Checkout was canceled. You can try again anytime.';
			// Clean up URL
			window.history.replaceState({}, '', '/pricing');
		}
	});

	const plans = {
		free: {
			name: 'Free',
			description: 'For trying it out (and proving the numbers to yourself)',
			monthlyPrice: 0,
			yearlyPrice: 0,
		features: [
			'3 CSV imports per month',
			'Basic spending dashboard',
			'Opportunity cost calculator (SPY)',
			'Up to 10 spending categories',
			'90-day transaction history',
			'Manual exclude/include items'
		],
			cta: 'Get Started',
			ctaHref: '/signup',
			highlighted: false
		},
		pro: {
			name: 'Pro',
			description: 'For power users who want unlimited history and deeper analysis',
			monthlyPrice: 4.99,
			yearlyPrice: 4.17,
			features: [
				'Unlimited CSV imports',
				'Full dashboard + deep category breakdowns',
				'Any ticker (SPY, QQQ, custom)',
				'Unlimited categories + category rules (auto-categorise & auto-exclude)',
				'Unlimited transaction history',
				'Monthly trend analysis + time range filters',
			'CSV export (all data)',
			'Priority support',
			'Daily & weekly email digests'
			],
			cta: 'Upgrade to Pro',
			ctaHref: '/signup?plan=pro',
			highlighted: true
		}
	};

	function getPrice(plan: typeof plans.free | typeof plans.pro) {
		if (plan.monthlyPrice === 0) return 'Free';
		// Always show the monthly price for clarity
		return `$${plan.monthlyPrice.toFixed(2).replace('.00', '')}`;
	}

	function getSavings() {
		const yearlyTotal = 49.99; // $49.99/year
		const monthlyTotal = plans.pro.monthlyPrice * 12; // $59.88/year if paid monthly
		const monthsSaved = Math.round((monthlyTotal - yearlyTotal) / plans.pro.monthlyPrice);
		return monthsSaved;
	}

	async function handleProCheckout() {
		if (!data.session) {
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
				const responseData = await response.json();
				throw new Error(responseData.message || 'Failed to start checkout');
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

<div class="min-h-screen" style="background: #f5f0e8">
	<!-- Navigation - Consistent with home page -->
	<nav class="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-stone-200/60">
		<div class="max-w-6xl mx-auto px-4 sm:px-6">
			<div class="flex items-center justify-between h-16">
				<!-- Logo -->
				<a href="/" class="flex items-center gap-3 group">
					<div class="rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white p-2 shadow-md shadow-green-500/15 group-hover:shadow-lg group-hover:shadow-green-500/20 transition-all group-hover:scale-[1.02]">
						<Logo size="md" class="text-white" />
					</div>
					<span class="font-display text-xl font-bold text-stone-800 tracking-tight">SpentWorth</span>
				</a>
				
				<!-- Desktop nav -->
				<div class="hidden md:flex items-center">
					<!-- Nav Links -->
					<div class="flex items-center gap-1 mr-4">
						<a href="/#features" class="px-4 py-2 text-sm font-medium text-stone-700 hover:text-green-600 transition-colors rounded-lg hover:bg-stone-100/70">Features</a>
						<a href="/#how-it-works" class="px-4 py-2 text-sm font-medium text-stone-700 hover:text-green-600 transition-colors rounded-lg hover:bg-stone-100/70">How it Works</a>
						<a href="/pricing" class="px-4 py-2 text-sm font-medium text-green-600 transition-colors rounded-lg bg-stone-100/70">Pricing</a>
					</div>
					
					<!-- Auth -->
					<div class="flex items-center gap-2 pl-4 border-l border-stone-200">
						{#if data.session}
							<a href="/dashboard" class="px-5 py-2.5 text-sm font-semibold text-white bg-green-600 rounded-xl hover:bg-green-500 transition-all shadow-md shadow-green-600/20 hover:shadow-lg hover:shadow-green-500/25">Dashboard</a>
						{:else}
							<a href="/login" class="px-4 py-2 text-sm font-medium text-stone-700 hover:text-green-600 transition-colors">Log in</a>
							<a href="/signup" class="px-5 py-2.5 text-sm font-semibold text-white bg-green-600 rounded-xl hover:bg-green-500 transition-all shadow-md shadow-green-600/20 hover:shadow-lg hover:shadow-green-500/25">Get Started</a>
						{/if}
					</div>
				</div>
				
				<!-- Mobile menu button -->
				<button 
					onclick={() => mobileMenuOpen = !mobileMenuOpen}
					class="md:hidden p-2 -mr-2 text-stone-500 hover:text-stone-800 transition-colors"
				>
					{#if mobileMenuOpen}
						<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					{:else}
						<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
						</svg>
					{/if}
				</button>
			</div>
		</div>
		
		<!-- Mobile dropdown -->
		{#if mobileMenuOpen}
			<div class="md:hidden bg-white/95 backdrop-blur-xl border-t border-stone-200/60 px-4 py-4 space-y-1">
				<a href="/#features" class="block px-3 py-2.5 text-stone-700 hover:text-green-600 hover:bg-stone-100/70 rounded-lg transition-colors font-medium">Features</a>
				<a href="/#how-it-works" class="block px-3 py-2.5 text-stone-700 hover:text-green-600 hover:bg-stone-100/70 rounded-lg transition-colors font-medium">How it Works</a>
				<a href="/pricing" class="block px-3 py-2.5 text-green-600 bg-stone-100/70 rounded-lg font-medium">Pricing</a>
				<div class="pt-3 mt-3 border-t border-stone-200/60 space-y-2">
					{#if data.session}
						<a href="/dashboard" class="block px-4 py-2.5 text-center font-semibold text-white bg-green-600 rounded-xl shadow-md">Dashboard</a>
					{:else}
						<a href="/login" class="block px-3 py-2.5 text-stone-700 hover:text-green-600 hover:bg-stone-100/70 rounded-lg transition-colors font-medium">Log in</a>
						<a href="/signup" class="block px-4 py-2.5 text-center font-semibold text-white bg-green-600 rounded-xl shadow-md">Get Started</a>
					{/if}
				</div>
			</div>
		{/if}
	</nav>

	<main class="max-w-4xl mx-auto px-4 py-12 sm:py-16">
		<!-- Header -->
		<div class="text-center mb-10">
			<h1 class="font-display text-3xl sm:text-4xl font-bold mb-3 text-stone-800">
				Simple, transparent pricing
			</h1>
			<p class="text-base sm:text-lg text-stone-600">
				Start free. Upgrade when you want deeper insights, unlimited history, and exports.
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
				class:text-stone-800={billingCycle === 'monthly'}
				class:text-stone-400={billingCycle === 'yearly'}
			>
				Monthly
			</span>
		<button
			onclick={() => billingCycle = billingCycle === 'monthly' ? 'yearly' : 'monthly'}
			class="relative w-14 h-8 rounded-full transition-colors"
			class:bg-green-600={billingCycle === 'yearly'}
			class:bg-stone-300={billingCycle === 'monthly'}
			aria-label="Toggle billing cycle between monthly and yearly"
		>
				<span 
					class="absolute top-1 w-6 h-6 rounded-full bg-white transition-transform shadow-sm"
					style="left: {billingCycle === 'yearly' ? '30px' : '4px'}"
				></span>
			</button>
			<span 
				class="text-sm font-medium"
				class:text-stone-800={billingCycle === 'yearly'}
				class:text-stone-400={billingCycle === 'monthly'}
			>
				Yearly
			</span>
			{#if billingCycle === 'yearly'}
				<span class="text-xs px-2.5 py-1 rounded-full bg-green-600 text-white font-semibold">
					🎉 2 months free
				</span>
			{/if}
		</div>

		<!-- Pricing Cards -->
		<div class="grid md:grid-cols-2 gap-6">
			<!-- Free Plan -->
			<div 
				class="rounded-2xl p-6 sm:p-8 relative bg-white border border-stone-200"
			>
				<div class="mb-6">
					<h2 class="font-display text-xl font-semibold mb-1 text-stone-800">
						{plans.free.name}
					</h2>
					<p class="text-sm text-stone-600">
						{plans.free.description}
					</p>
				</div>

				<div class="mb-6">
					<span class="font-display text-4xl font-bold text-stone-800">
						Free
					</span>
					<span class="text-sm text-stone-500">
						forever
					</span>
				</div>

				<a 
					href={plans.free.ctaHref}
					class="block w-full text-center py-3 rounded-xl font-display font-semibold transition-colors mb-6 bg-stone-100 text-stone-800 hover:bg-stone-200"
				>
					{plans.free.cta}
				</a>

				<ul class="space-y-3">
					{#each plans.free.features as feature}
						<li class="flex items-start gap-3 text-sm">
							<i class="fa-solid fa-check text-green-600 mt-0.5"></i>
							<span class="text-stone-700">{feature}</span>
						</li>
					{/each}
				</ul>
			</div>

			<!-- Pro Plan -->
			<div 
				class="rounded-2xl p-6 sm:p-8 relative bg-white border-2 border-green-600"
			>
				<div class="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-green-600 text-white text-xs font-medium">
					Most Popular
				</div>

				<div class="mb-6">
					<h2 class="font-display text-xl font-semibold mb-1 text-stone-800">
						{plans.pro.name}
					</h2>
					<p class="text-sm text-stone-600">
						{plans.pro.description}
					</p>
				</div>

				<div class="mb-6">
					<span class="font-display text-4xl font-bold text-stone-800">
						{getPrice(plans.pro)}
					</span>
					<span class="text-sm text-stone-500">
						/month
					</span>
					{#if billingCycle === 'yearly'}
						<div class="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-green-50 border border-green-200">
							<svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
							</svg>
							<span class="text-xs font-semibold text-green-700">2 months free • $49.99/year</span>
						</div>
					{:else}
						<p class="text-xs mt-2 text-stone-500">
							Billed monthly
						</p>
					{/if}
				</div>

				<button 
					onclick={handleProCheckout}
					disabled={isLoading}
					class="block w-full text-center py-3 rounded-xl font-display font-semibold transition-colors mb-6 disabled:opacity-50 disabled:cursor-not-allowed bg-green-600 text-white hover:bg-green-500"
				>
					{#if isLoading}
						<i class="fa-solid fa-spinner fa-spin mr-2"></i>
						Processing...
					{:else}
						Upgrade to Pro
					{/if}
				</button>

				<p class="text-xs text-center mb-4 text-stone-500">
					<i class="fa-solid fa-lock mr-1"></i>
					Secure checkout powered by Stripe
				</p>

				<ul class="space-y-3">
					{#each plans.pro.features as feature}
						<li class="flex items-start gap-3 text-sm">
							<i class="fa-solid fa-check text-green-600 mt-0.5"></i>
							<span class="text-stone-700">{feature}</span>
						</li>
					{/each}
				</ul>
			</div>
		</div>

		<!-- FAQ Section -->
		<div class="mt-16">
			<h2 class="font-display text-2xl font-semibold text-center mb-8 text-stone-800">
				Frequently Asked Questions
			</h2>
			<div class="space-y-4 max-w-2xl mx-auto">
				{#each [
					{
						q: 'Can I cancel anytime?',
						a: 'Yes. Cancel anytime from your billing settings. You\'ll keep Pro access until the end of your current billing period.'
					},
					{
						q: 'Is my financial data secure?',
						a: 'Imports are transmitted over HTTPS (TLS). We never ask for or store your bank login credentials. Your account data is protected with encrypted storage and strict access controls (including row-level security), and you can delete imports or your account data at any time.'
					},
					{
						q: 'What happens when I hit the Free tier limits?',
						a: 'You\'ll still be able to view your existing dashboard and reports, but you won\'t be able to import new transactions until the next month (or until you upgrade).'
					}
				] as faq}
					<div class="rounded-xl p-5 bg-white border border-stone-200">
						<h3 class="font-display font-semibold mb-2 text-stone-800">
							{faq.q}
						</h3>
						<p class="text-sm text-stone-600">
							{faq.a}
						</p>
					</div>
				{/each}
			</div>
		</div>

	</main>

	<!-- Footer -->
	<footer class="border-t border-stone-200" style="background: #faf7f2">
		<div class="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
			<!-- Main Footer Content -->
			<div class="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
				<!-- Brand Column -->
				<div class="col-span-2 md:col-span-1">
					<div class="flex items-center gap-2 mb-4">
						<div class="rounded-xl bg-sw-accent flex items-center justify-center text-white p-1.5">
							<Logo size="sm" class="text-white" />
						</div>
						<span class="font-display text-lg font-semibold text-stone-800">SpentWorth</span>
					</div>
				<p class="text-sm mb-4 text-stone-600">
					Know where your money goes. Build the life you want.
				</p>
				<div class="flex items-center gap-3">
					<a href="https://x.com/spentworthapp" target="_blank" rel="noopener" aria-label="Follow us on X (Twitter)" class="w-9 h-9 rounded-lg flex items-center justify-center transition-colors bg-white text-stone-600 hover:text-sw-accent">
						<i class="fa-brands fa-x-twitter"></i>
					</a>
					<a href="https://instagram.com/spentworth" target="_blank" rel="noopener" aria-label="Follow us on Instagram" class="w-9 h-9 rounded-lg flex items-center justify-center transition-colors bg-white text-stone-600 hover:text-sw-accent">
						<i class="fa-brands fa-instagram"></i>
					</a>
					<a href="https://reddit.com/r/SpentWorth" target="_blank" rel="noopener" aria-label="Join us on Reddit" class="w-9 h-9 rounded-lg flex items-center justify-center transition-colors bg-white text-stone-600 hover:text-sw-accent">
						<i class="fa-brands fa-reddit"></i>
					</a>
				</div>
				</div>

				<!-- Product -->
				<div>
					<h4 class="font-display font-semibold mb-4 text-stone-800">Product</h4>
					<ul class="space-y-2.5">
						<li><a href="/pricing" class="text-sm transition-colors hover:text-sw-accent text-stone-600">Pricing</a></li>
						<li><a href="/#features" class="text-sm transition-colors hover:text-sw-accent text-stone-600">Features</a></li>
						<li><a href="/#how-it-works" class="text-sm transition-colors hover:text-sw-accent text-stone-600">How It Works</a></li>
					</ul>
				</div>

				<!-- Company -->
				<div>
					<h4 class="font-display font-semibold mb-4 text-stone-800">Company</h4>
					<ul class="space-y-2.5">
						<li><a href="/about" class="text-sm transition-colors hover:text-sw-accent text-stone-600">About</a></li>
						<li><a href="/contact" class="text-sm transition-colors hover:text-sw-accent text-stone-600">Contact</a></li>
					</ul>
				</div>

				<!-- Legal -->
				<div>
					<h4 class="font-display font-semibold mb-4 text-stone-800">Legal</h4>
					<ul class="space-y-2.5">
						<li><a href="/privacy" class="text-sm transition-colors hover:text-sw-accent text-stone-600">Privacy Policy</a></li>
						<li><a href="/terms" class="text-sm transition-colors hover:text-sw-accent text-stone-600">Terms of Service</a></li>
						<li><a href="/security" class="text-sm transition-colors hover:text-sw-accent text-stone-600">Security</a></li>
					</ul>
				</div>
			</div>

			<!-- Bottom Bar -->
			<div class="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-stone-200">
				<p class="text-xs text-stone-500">
					© {new Date().getFullYear()} SpentWorth. All rights reserved.
				</p>
				<p class="text-xs text-stone-500">
					Made with <i class="fa-solid fa-heart text-red-500"></i> for people who care about their financial future
				</p>
			</div>
		</div>
	</footer>
</div>
