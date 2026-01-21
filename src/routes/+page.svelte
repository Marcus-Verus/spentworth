<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { initTheme, toggleTheme, getTheme } from '$lib/stores/theme';

	let { data } = $props();
	
	let mobileMenuOpen = $state(false);
	let isDark = $state(false);
	
	onMount(() => {
		initTheme();
		isDark = getTheme() === 'dark';
	});
	
	function handleThemeToggle() {
		toggleTheme();
		isDark = getTheme() === 'dark';
	}
	
	// Calculator state (moved to optional section)
	let dailyAmount = $state(5);
	let years = $state(5);
	let showCalculator = $state(false);
	
	const futureValue = $derived(() => {
		const annualReturn = 0.07; // 7% average return
		const daysPerYear = 365;
		let total = 0;
		for (let y = years; y > 0; y--) {
			const yearlyContribution = dailyAmount * daysPerYear;
			total += yearlyContribution * Math.pow(1 + annualReturn, y);
		}
		return Math.round(total);
	});
	
	const totalSpent = $derived(dailyAmount * 365 * years);
</script>

<div class="min-h-screen flex flex-col">
	<!-- Navigation -->
	<nav class="border-b border-sw-border/30 backdrop-blur-md bg-sw-surface/90 sticky top-0 z-50">
		<div class="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
			<a href="/" class="flex items-center gap-2.5 group">
				<div class="w-9 h-9 rounded-xl bg-sw-accent flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-sw-accent/10 group-hover:shadow-sw-accent/20 transition-all">
					$
				</div>
				<span class="font-display text-xl font-semibold text-sw-text tracking-tight">SpentWorth</span>
			</a>
			
			<!-- Desktop nav -->
			<div class="hidden sm:flex items-center gap-4">
				<button
					onclick={handleThemeToggle}
					class="p-2 rounded-lg text-sw-text-dim hover:text-sw-text hover:bg-sw-surface transition-colors"
					title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
				>
					{#if isDark}
						<i class="fa-solid fa-sun text-sm"></i>
					{:else}
						<i class="fa-solid fa-moon text-sm"></i>
					{/if}
				</button>
				{#if data.session}
					<a href="/dashboard" class="btn btn-primary">Dashboard</a>
				{:else}
					<a href="/pricing" class="text-sw-text-dim hover:text-sw-text transition-colors text-sm font-display font-medium">Pricing</a>
					<a href="/login" class="text-sw-text-dim hover:text-sw-text transition-colors text-sm font-display font-medium">Log in</a>
					<a href="/signup" class="btn btn-primary font-display font-semibold">Get Started</a>
				{/if}
			</div>
			
			<!-- Mobile menu button -->
			<button 
				onclick={() => mobileMenuOpen = !mobileMenuOpen}
				class="sm:hidden p-2 -mr-2 text-sw-text-dim hover:text-sw-text"
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
		
		<!-- Mobile dropdown -->
		{#if mobileMenuOpen}
			<div class="sm:hidden border-t border-sw-border/30 bg-sw-bg/95 px-4 py-3">
				{#if data.session}
					<a href="/dashboard" class="block py-2 text-sw-accent font-medium">Dashboard</a>
				{:else}
					<a href="/pricing" class="block py-2 text-sw-text-dim hover:text-sw-text">Pricing</a>
					<a href="/login" class="block py-2 text-sw-text-dim hover:text-sw-text">Log in</a>
					<a href="/signup" class="block py-2 text-sw-accent font-medium">Get Started</a>
				{/if}
				<button
					onclick={handleThemeToggle}
					class="flex items-center gap-2 py-2 text-sw-text-dim hover:text-sw-text w-full"
				>
					{#if isDark}
						<i class="fa-solid fa-sun text-sm"></i>
						<span>Light mode</span>
					{:else}
						<i class="fa-solid fa-moon text-sm"></i>
						<span>Dark mode</span>
					{/if}
				</button>
		</div>
		{/if}
	</nav>

	<!-- Hero -->
	<main class="flex-1">
		<section class="relative overflow-hidden">
			<!-- Subtle background -->
			<div class="absolute inset-0 bg-gradient-to-b from-sw-accent/[0.03] to-transparent"></div>
			
			<!-- Floating cards - desktop only -->
			<div class="hidden lg:block">
				<!-- Decorative gradient orbs -->
				<div class="absolute left-[10%] top-[30%] w-64 h-64 bg-sw-accent/10 rounded-full blur-3xl"></div>
				<div class="absolute right-[15%] top-[20%] w-48 h-48 bg-blue-500/10 rounded-full blur-3xl"></div>
				
				<!-- Left card - Spending breakdown with mini chart -->
				<div class="absolute left-[4%] top-[18%] animate-float-slow">
					<div class="rounded-2xl p-5 w-56 shadow-2xl" style="background: {isDark ? 'rgba(26,26,26,0.95)' : 'rgba(255,255,255,0.98)'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}; backdrop-filter: blur(12px)">
						<div class="flex items-center justify-between mb-3">
							<p class="text-xs font-medium" style="color: {isDark ? '#a3a3a3' : '#737373'}">This month</p>
							<span class="text-[10px] px-2 py-0.5 rounded-full" style="background: {isDark ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.1)'}; color: #10b981">↓ 12%</span>
						</div>
						<p class="text-3xl font-bold mb-4" style="color: {isDark ? '#ffffff' : '#171717'}">$2,847</p>
						<div class="space-y-3">
							<div class="flex items-center gap-2">
								<div class="w-6 h-6 rounded-lg flex items-center justify-center" style="background: {isDark ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.1)'}">
									<i class="fa-solid fa-basket-shopping text-blue-500 text-[10px]"></i>
								</div>
								<div class="flex-1">
									<div class="flex justify-between text-xs mb-1">
										<span style="color: {isDark ? '#a3a3a3' : '#525252'}">Entertainment</span>
										<span class="font-medium" style="color: {isDark ? '#ffffff' : '#171717'}">$642</span>
									</div>
									<div class="h-1 rounded-full" style="background: {isDark ? '#2a2a2a' : '#e5e5e5'}">
										<div class="h-full rounded-full bg-blue-500" style="width: 45%"></div>
									</div>
								</div>
							</div>
							<div class="flex items-center gap-2">
								<div class="w-6 h-6 rounded-lg flex items-center justify-center" style="background: {isDark ? 'rgba(249,115,22,0.15)' : 'rgba(249,115,22,0.1)'}">
									<i class="fa-solid fa-utensils text-orange-500 text-[10px]"></i>
								</div>
								<div class="flex-1">
									<div class="flex justify-between text-xs mb-1">
										<span style="color: {isDark ? '#a3a3a3' : '#525252'}">Dining out</span>
										<span class="font-medium" style="color: {isDark ? '#ffffff' : '#171717'}">$389</span>
									</div>
									<div class="h-1 rounded-full" style="background: {isDark ? '#2a2a2a' : '#e5e5e5'}">
										<div class="h-full rounded-full bg-orange-500" style="width: 27%"></div>
									</div>
								</div>
							</div>
							<div class="flex items-center gap-2">
								<div class="w-6 h-6 rounded-lg flex items-center justify-center" style="background: {isDark ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.1)'}">
									<i class="fa-solid fa-car text-blue-500 text-[10px]"></i>
								</div>
								<div class="flex-1">
									<div class="flex justify-between text-xs mb-1">
										<span style="color: {isDark ? '#a3a3a3' : '#525252'}">Transport</span>
										<span class="font-medium" style="color: {isDark ? '#ffffff' : '#171717'}">$156</span>
									</div>
									<div class="h-1 rounded-full" style="background: {isDark ? '#2a2a2a' : '#e5e5e5'}">
										<div class="h-full rounded-full bg-blue-500" style="width: 11%"></div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
				
				<!-- Right card - Growth potential with animated chart -->
				<div class="absolute right-[4%] top-[22%] animate-float-medium">
					<div class="rounded-2xl p-5 w-60 shadow-2xl" style="background: {isDark ? 'rgba(26,26,26,0.95)' : 'rgba(255,255,255,0.98)'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}; backdrop-filter: blur(12px)">
						<div class="flex items-center gap-2 mb-2">
							<div class="w-7 h-7 rounded-lg bg-sw-accent/15 flex items-center justify-center">
								<i class="fa-solid fa-chart-line text-sw-accent text-xs"></i>
							</div>
							<p class="text-xs font-medium" style="color: {isDark ? '#a3a3a3' : '#737373'}">If invested instead</p>
						</div>
						<p class="text-3xl font-bold text-sw-accent mb-1">+$10,526</p>
						<p class="text-xs mb-4" style="color: {isDark ? '#737373' : '#737373'}">over 5 years at 7% return</p>
						
						<!-- Growth visualization -->
						<div class="relative h-16 flex items-end gap-1">
							<div class="flex-1 rounded-t-sm transition-all duration-500" style="height: 20%; background: linear-gradient(to top, {isDark ? 'rgba(13,148,136,0.3)' : 'rgba(13,148,136,0.2)'}, {isDark ? 'rgba(13,148,136,0.1)' : 'rgba(13,148,136,0.05)'})"></div>
							<div class="flex-1 rounded-t-sm transition-all duration-500" style="height: 35%; background: linear-gradient(to top, {isDark ? 'rgba(13,148,136,0.4)' : 'rgba(13,148,136,0.3)'}, {isDark ? 'rgba(13,148,136,0.15)' : 'rgba(13,148,136,0.1)'})"></div>
							<div class="flex-1 rounded-t-sm transition-all duration-500" style="height: 45%; background: linear-gradient(to top, {isDark ? 'rgba(13,148,136,0.5)' : 'rgba(13,148,136,0.4)'}, {isDark ? 'rgba(13,148,136,0.2)' : 'rgba(13,148,136,0.15)'})"></div>
							<div class="flex-1 rounded-t-sm transition-all duration-500" style="height: 60%; background: linear-gradient(to top, {isDark ? 'rgba(13,148,136,0.6)' : 'rgba(13,148,136,0.5)'}, {isDark ? 'rgba(13,148,136,0.25)' : 'rgba(13,148,136,0.2)'})"></div>
							<div class="flex-1 rounded-t-sm transition-all duration-500" style="height: 80%; background: linear-gradient(to top, {isDark ? 'rgba(13,148,136,0.8)' : 'rgba(13,148,136,0.7)'}, {isDark ? 'rgba(13,148,136,0.35)' : 'rgba(13,148,136,0.3)'})"></div>
							<div class="flex-1 rounded-t-sm transition-all duration-500" style="height: 100%; background: linear-gradient(to top, #0d9488, {isDark ? 'rgba(13,148,136,0.5)' : 'rgba(13,148,136,0.4)'})"></div>
						</div>
						<div class="flex justify-between mt-2 text-[10px]" style="color: {isDark ? '#525252' : '#a3a3a3'}">
							<span>Year 1</span>
							<span>Year 5</span>
						</div>
					</div>
				</div>
				
				<!-- Bottom left - Subscription alert -->
				<div class="absolute left-[8%] bottom-[18%] animate-float-fast">
					<div class="rounded-xl p-4 w-52 shadow-xl" style="background: {isDark ? 'rgba(26,26,26,0.95)' : 'rgba(255,255,255,0.98)'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}; backdrop-filter: blur(12px)">
						<div class="flex items-start gap-3">
							<div class="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center flex-shrink-0">
								<i class="fa-solid fa-bell text-amber-500 text-sm"></i>
							</div>
							<div class="flex-1 min-w-0">
								<p class="text-xs font-medium mb-1" style="color: {isDark ? '#ffffff' : '#171717'}">Netflix</p>
								<p class="text-[11px] mb-2" style="color: {isDark ? '#a3a3a3' : '#737373'}">$15.99/mo subscription</p>
								<div class="flex flex-col gap-0.5">
									<span class="text-[10px]" style="color: {isDark ? '#737373' : '#9ca3af'}">If invested for 5 years:</span>
									<span class="text-[11px] font-semibold text-sw-accent">Worth $1,340</span>
								</div>
							</div>
						</div>
					</div>
				</div>
				
				<!-- Bottom right - Goal progress ring -->
				<div class="absolute right-[10%] bottom-[12%] animate-float-slow" style="animation-delay: -2s">
					<div class="rounded-xl p-4 w-44 shadow-xl" style="background: {isDark ? 'rgba(26,26,26,0.95)' : 'rgba(255,255,255,0.98)'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}; backdrop-filter: blur(12px)">
						<div class="flex items-center gap-3">
							<div class="relative w-12 h-12">
								<svg class="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
									<circle cx="18" cy="18" r="15" fill="none" stroke="{isDark ? '#2a2a2a' : '#e5e5e5'}" stroke-width="3"/>
									<circle cx="18" cy="18" r="15" fill="none" stroke="#a855f7" stroke-width="3" stroke-dasharray="68, 100" stroke-linecap="round"/>
								</svg>
								<span class="absolute inset-0 flex items-center justify-center text-xs font-semibold" style="color: {isDark ? '#ffffff' : '#171717'}">68%</span>
							</div>
							<div>
								<p class="text-xs font-medium mb-0.5" style="color: {isDark ? '#ffffff' : '#171717'}">Coffee budget</p>
								<p class="text-[11px]" style="color: {isDark ? '#a3a3a3' : '#737373'}">$68 of $100</p>
								<p class="text-[10px] text-blue-500 font-medium">On track</p>
							</div>
						</div>
					</div>
				</div>
			</div>
			
			<div class="relative max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-20 lg:py-28">
				<div class="max-w-3xl mx-auto text-center">
					<!-- Headline -->
					<h1 class="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold leading-[1.15] mb-5 animate-fade-in tracking-tight" style="color: {isDark ? '#ffffff' : '#171717'}">
						Know where your money goes.
						<span class="text-gradient block mt-1">Build the life you want.</span>
					</h1>
					
					<!-- Subheadline -->
					<p class="text-base sm:text-lg md:text-xl leading-relaxed mb-8 animate-slide-up max-w-2xl mx-auto" style="color: {isDark ? '#a3a3a3' : '#525252'}; animation-delay: 100ms">
						Import your spending, see where it really goes, and make confident decisions about your financial future. Simple, private, free.
					</p>
					
					<!-- CTA -->
					<div class="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center animate-slide-up px-4" style="animation-delay: 200ms">
						{#if data.session}
							<button onclick={() => goto('/dashboard')} class="btn btn-primary text-base px-6 py-3">
								Go to Dashboard
							</button>
						{:else}
							<button onclick={() => goto('/signup')} class="btn btn-primary text-base px-8 py-3.5 glow font-semibold">
								Get Started — It's Free
							</button>
							<button onclick={() => goto('/login')} class="bg-neutral-900 dark:bg-sw-surface text-white border border-neutral-800 dark:border-sw-border hover:bg-neutral-800 dark:hover:bg-sw-border px-5 py-3 rounded-lg font-medium text-sm transition-colors font-display">
								I have an account
							</button>
						{/if}
					</div>
					
					<!-- Trust signals -->
					<div class="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-8 text-xs animate-slide-up" style="color: {isDark ? '#a3a3a3' : '#737373'}; animation-delay: 300ms">
						<span class="flex items-center gap-1.5">
							<i class="fa-solid fa-lock text-[10px]"></i>
							Your data stays private
						</span>
						<span class="flex items-center gap-1.5">
							<i class="fa-solid fa-clock text-[10px]"></i>
							2 minute setup
						</span>
						<span class="flex items-center gap-1.5">
							<i class="fa-solid fa-credit-card text-[10px]"></i>
							No credit card needed
						</span>
					</div>
				</div>
			</div>
		</section>

		<!-- Visual Demo Section - Spending Breakdown -->
		<section class="border-t border-sw-border/30 relative overflow-hidden">
			<!-- Background with app demo -->
			<div class="absolute inset-0 opacity-5 sm:opacity-10">
				<div class="absolute inset-0" style="background: linear-gradient(135deg, {isDark ? 'rgba(13,148,136,0.1)' : 'rgba(13,148,136,0.05)'} 0%, transparent 50%);"></div>
			</div>
			
			<div class="relative max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
				<div class="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
					<!-- Left: Text content -->
					<div>
						<h2 class="font-display text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight mb-4" style="color: {isDark ? '#ffffff' : '#171717'}">
							See exactly where your money goes
						</h2>
						<p class="text-base sm:text-lg mb-6 leading-relaxed" style="color: {isDark ? '#a3a3a3' : '#525252'}">
							Get an effortless breakdown of your finances. See where your money is going and how to improve. We'll show you what your spending could become if invested.
						</p>
						<div class="space-y-4">
							<div class="flex items-start gap-3">
								<div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style="background: {isDark ? 'rgba(13,148,136,0.15)' : 'rgba(13,148,136,0.12)'}">
									<i class="fa-solid fa-chart-pie text-sw-accent text-sm"></i>
								</div>
								<div>
									<h3 class="font-display font-medium mb-1" style="color: {isDark ? '#ffffff' : '#171717'}">Automatic categorization</h3>
									<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#525252'}">Transactions are categorized automatically. No manual tagging required.</p>
								</div>
							</div>
							<div class="flex items-start gap-3">
								<div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style="background: {isDark ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.12)'}">
									<i class="fa-solid fa-seedling text-sm" style="color: #d97706"></i>
								</div>
								<div>
									<h3 class="font-display font-medium mb-1" style="color: {isDark ? '#ffffff' : '#171717'}">Growth potential</h3>
									<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#525252'}">See what your spending could become if invested. Small changes, big results.</p>
								</div>
							</div>
							<div class="flex items-start gap-3">
								<div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style="background: {isDark ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.12)'}">
									<i class="fa-solid fa-bell text-sm" style="color: #3b82f6"></i>
								</div>
								<div>
									<h3 class="font-display font-medium mb-1" style="color: {isDark ? '#ffffff' : '#171717'}">Smart insights</h3>
									<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#525252'}">Get notified about important patterns and opportunities to save.</p>
								</div>
							</div>
						</div>
					</div>
					
					<!-- Right: App demo card -->
					<div class="relative">
						<div class="rounded-2xl p-6 shadow-2xl" style="background: {isDark ? 'rgba(26,26,26,0.98)' : 'rgba(255,255,255,0.98)'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}; backdrop-filter: blur(12px)">
							<!-- Header -->
							<div class="flex items-center justify-between mb-6">
								<div>
									<h3 class="font-display font-semibold text-lg mb-1" style="color: {isDark ? '#ffffff' : '#171717'}">This month</h3>
									<p class="text-xs" style="color: {isDark ? '#a3a3a3' : '#737373'}">Dec 2025 - Jan 2026</p>
								</div>
								<span class="text-xs px-2 py-1 rounded-full" style="background: {isDark ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.1)'}; color: #10b981">↓ 12%</span>
							</div>
							
							<!-- Total -->
							<div class="mb-6">
								<p class="text-3xl font-bold mb-1" style="color: {isDark ? '#ffffff' : '#171717'}">$2,847</p>
								<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">
									If invested: <span class="font-semibold text-sw-accent">$3,642</span> in 5 years
								</p>
							</div>
							
							<!-- Categories -->
							<div class="space-y-3">
								<div>
									<div class="flex justify-between text-xs mb-1.5">
										<span style="color: {isDark ? '#a3a3a3' : '#525252'}">Dining & Restaurants</span>
										<span class="font-medium" style="color: {isDark ? '#ffffff' : '#171717'}">$892</span>
									</div>
									<div class="h-2 rounded-full" style="background: {isDark ? '#2a2a2a' : '#e5e5e5'}">
										<div class="h-full rounded-full bg-orange-500" style="width: 31%"></div>
									</div>
								</div>
								<div>
									<div class="flex justify-between text-xs mb-1.5">
										<span style="color: {isDark ? '#a3a3a3' : '#525252'}">Entertainment</span>
										<span class="font-medium" style="color: {isDark ? '#ffffff' : '#171717'}">$687</span>
									</div>
									<div class="h-2 rounded-full" style="background: {isDark ? '#2a2a2a' : '#e5e5e5'}">
										<div class="h-full rounded-full bg-blue-500" style="width: 24%"></div>
									</div>
								</div>
								<div>
									<div class="flex justify-between text-xs mb-1.5">
										<span style="color: {isDark ? '#a3a3a3' : '#525252'}">Subscriptions</span>
										<span class="font-medium" style="color: {isDark ? '#ffffff' : '#171717'}">$487</span>
									</div>
									<div class="h-2 rounded-full" style="background: {isDark ? '#2a2a2a' : '#e5e5e5'}">
										<div class="h-full rounded-full bg-purple-500" style="width: 17%"></div>
									</div>
								</div>
								<div>
									<div class="flex justify-between text-xs mb-1.5">
										<span style="color: {isDark ? '#a3a3a3' : '#525252'}">Shopping</span>
										<span class="font-medium" style="color: {isDark ? '#ffffff' : '#171717'}">$534</span>
									</div>
									<div class="h-2 rounded-full" style="background: {isDark ? '#2a2a2a' : '#e5e5e5'}">
										<div class="h-full rounded-full bg-teal-500" style="width: 19%"></div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>

		<!-- Visual Demo Section - Opportunity Cost -->
		<section class="border-t border-sw-border/30 relative overflow-hidden" style="background: {isDark ? '#0a0a0a' : '#f0ebe3'}">
			<!-- Background pattern -->
			<div class="absolute inset-0 opacity-5">
				<div class="absolute inset-0" style="background: radial-gradient(circle at 30% 50%, {isDark ? 'rgba(13,148,136,0.1)' : 'rgba(13,148,136,0.05)'} 0%, transparent 50%);"></div>
			</div>
			
			<div class="relative max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
				<div class="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
					<!-- Left: App demo card -->
					<div class="order-2 lg:order-1">
						<div class="rounded-2xl p-6 shadow-2xl" style="background: {isDark ? 'rgba(26,26,26,0.98)' : 'rgba(255,255,255,0.98)'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}; backdrop-filter: blur(12px)">
							<!-- Header -->
							<div class="flex items-center gap-3 mb-6">
								<div class="w-10 h-10 rounded-lg flex items-center justify-center" style="background: {isDark ? 'rgba(13,148,136,0.15)' : 'rgba(13,148,136,0.12)'}">
									<i class="fa-solid fa-chart-line text-sw-accent"></i>
								</div>
								<div>
									<h3 class="font-display font-semibold" style="color: {isDark ? '#ffffff' : '#171717'}">If invested instead</h3>
									<p class="text-xs" style="color: {isDark ? '#a3a3a3' : '#737373'}">5 years at 7% return</p>
								</div>
							</div>
							
							<!-- Opportunity cost examples -->
							<div class="space-y-4">
								<div class="rounded-lg p-4" style="background: {isDark ? '#1a1a1a' : '#f5f0e8'}">
									<div class="flex items-center justify-between mb-2">
										<div class="flex items-center gap-2">
											<i class="fa-solid fa-mug-hot text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}"></i>
											<span class="text-sm font-medium" style="color: {isDark ? '#ffffff' : '#171717'}">Daily coffee</span>
										</div>
										<span class="text-xs" style="color: {isDark ? '#a3a3a3' : '#737373'}">$6/day</span>
									</div>
									<div class="flex items-baseline gap-2">
										<span class="text-2xl font-bold text-sw-accent">$15,847</span>
										<span class="text-xs" style="color: {isDark ? '#a3a3a3' : '#737373'}">opportunity cost</span>
									</div>
								</div>
								
								<div class="rounded-lg p-4" style="background: {isDark ? '#1a1a1a' : '#f5f0e8'}">
									<div class="flex items-center justify-between mb-2">
										<div class="flex items-center gap-2">
											<i class="fa-solid fa-utensils text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}"></i>
											<span class="text-sm font-medium" style="color: {isDark ? '#ffffff' : '#171717'}">Food delivery</span>
										</div>
										<span class="text-xs" style="color: {isDark ? '#a3a3a3' : '#737373'}">$400/mo</span>
									</div>
									<div class="flex items-baseline gap-2">
										<span class="text-2xl font-bold text-sw-accent">$28,000</span>
										<span class="text-xs" style="color: {isDark ? '#a3a3a3' : '#737373'}">opportunity cost</span>
									</div>
								</div>
								
								<div class="rounded-lg p-4" style="background: {isDark ? '#1a1a1a' : '#f5f0e8'}">
									<div class="flex items-center justify-between mb-2">
										<div class="flex items-center gap-2">
											<i class="fa-solid fa-bell text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}"></i>
											<span class="text-sm font-medium" style="color: {isDark ? '#ffffff' : '#171717'}">Subscriptions</span>
										</div>
										<span class="text-xs" style="color: {isDark ? '#a3a3a3' : '#737373'}">$127/mo</span>
									</div>
									<div class="flex items-baseline gap-2">
										<span class="text-2xl font-bold text-sw-accent">$9,100</span>
										<span class="text-xs" style="color: {isDark ? '#a3a3a3' : '#737373'}">opportunity cost</span>
									</div>
								</div>
							</div>
							
							<div class="mt-4 pt-4" style="border-top: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
								<p class="text-xs text-center" style="color: {isDark ? '#737373' : '#9ca3af'}">
									<i class="fa-solid fa-lightbulb text-amber-500 mr-1"></i>
									Small changes add up over time
								</p>
							</div>
						</div>
					</div>
					
					<!-- Right: Text content -->
					<div class="order-1 lg:order-2">
						<h2 class="font-display text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight mb-4" style="color: {isDark ? '#ffffff' : '#171717'}">
							Discover what your spending could become
						</h2>
						<p class="text-base sm:text-lg mb-6 leading-relaxed" style="color: {isDark ? '#a3a3a3' : '#525252'}">
							Every purchase has an opportunity cost. See what your everyday spending could become if invested instead. The numbers might surprise you.
						</p>
						<div class="space-y-4">
							<div class="flex items-start gap-3">
								<div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style="background: {isDark ? 'rgba(13,148,136,0.15)' : 'rgba(13,148,136,0.12)'}">
									<i class="fa-solid fa-calculator text-sw-accent text-sm"></i>
								</div>
								<div>
									<h3 class="font-display font-medium mb-1" style="color: {isDark ? '#ffffff' : '#171717'}">Real opportunity costs</h3>
									<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#525252'}">Calculate what your spending could be worth if invested at 7% annual return.</p>
								</div>
							</div>
							<div class="flex items-start gap-3">
								<div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style="background: {isDark ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.12)'}">
									<i class="fa-solid fa-chart-line text-sm" style="color: #d97706"></i>
								</div>
								<div>
									<h3 class="font-display font-medium mb-1" style="color: {isDark ? '#ffffff' : '#171717'}">Category insights</h3>
									<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#525252'}">See which spending categories have the biggest impact on your future wealth.</p>
								</div>
							</div>
							<div class="flex items-start gap-3">
								<div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style="background: {isDark ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.12)'}">
									<i class="fa-solid fa-bullseye text-sm" style="color: #3b82f6"></i>
								</div>
								<div>
									<h3 class="font-display font-medium mb-1" style="color: {isDark ? '#ffffff' : '#171717'}">Actionable insights</h3>
									<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#525252'}">Get specific recommendations on where to cut back and invest more.</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>

		<!-- Visual Demo - Subscriptions & Goals -->
		<section class="border-t border-sw-border/30 relative overflow-hidden">
			<!-- Background pattern -->
			<div class="absolute inset-0 opacity-5">
				<div class="absolute inset-0" style="background: linear-gradient(180deg, transparent 0%, {isDark ? 'rgba(13,148,136,0.05)' : 'rgba(13,148,136,0.02)'} 50%, transparent 100%);"></div>
			</div>
			
			<div class="relative max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
				<div class="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
					<!-- Left: Text content -->
					<div>
						<h2 class="font-display text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight mb-4" style="color: {isDark ? '#ffffff' : '#171717'}">
							Track subscriptions and set goals
						</h2>
						<p class="text-base sm:text-lg mb-6 leading-relaxed" style="color: {isDark ? '#a3a3a3' : '#525252'}">
							We automatically detect recurring subscriptions and help you see their true cost. Set budgets and track your progress toward financial goals.
						</p>
						<div class="space-y-4">
							<div class="flex items-start gap-3">
								<div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style="background: {isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.12)'}">
									<i class="fa-solid fa-bell text-sm" style="color: #ef4444"></i>
								</div>
								<div>
									<h3 class="font-display font-medium mb-1" style="color: {isDark ? '#ffffff' : '#171717'}">Subscription detection</h3>
									<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#525252'}">We find recurring charges automatically. See what you're really spending each month.</p>
								</div>
							</div>
							<div class="flex items-start gap-3">
								<div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style="background: {isDark ? 'rgba(13,148,136,0.15)' : 'rgba(13,148,136,0.12)'}">
									<i class="fa-solid fa-bullseye text-sw-accent text-sm"></i>
								</div>
								<div>
									<h3 class="font-display font-medium mb-1" style="color: {isDark ? '#ffffff' : '#171717'}">Budget tracking</h3>
									<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#525252'}">Set spending limits by category. Get alerts when you're approaching your budget.</p>
								</div>
							</div>
							<div class="flex items-start gap-3">
								<div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style="background: {isDark ? 'rgba(168,85,247,0.15)' : 'rgba(168,85,247,0.12)'}">
									<i class="fa-solid fa-chart-line text-sm" style="color: #a855f7"></i>
								</div>
								<div>
									<h3 class="font-display font-medium mb-1" style="color: {isDark ? '#ffffff' : '#171717'}">Goal progress</h3>
									<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#525252'}">Track your progress toward financial goals. See how staying on track impacts your future.</p>
								</div>
							</div>
						</div>
					</div>
					
					<!-- Right: App demo cards -->
					<div class="space-y-4">
						<!-- Subscriptions card -->
						<div class="rounded-2xl p-5 shadow-xl" style="background: {isDark ? 'rgba(26,26,26,0.98)' : 'rgba(255,255,255,0.98)'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}; backdrop-filter: blur(12px)">
							<div class="flex items-center justify-between mb-4">
								<h3 class="font-display font-semibold" style="color: {isDark ? '#ffffff' : '#171717'}">Subscriptions Detected</h3>
								<span class="text-xs px-2 py-1 rounded-full" style="background: {isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.1)'}; color: #ef4444">8 found</span>
							</div>
							<div class="space-y-2 mb-3">
								<div class="flex items-center justify-between text-sm">
									<span style="color: {isDark ? '#ffffff' : '#171717'}">Netflix</span>
									<span class="font-mono" style="color: {isDark ? '#a3a3a3' : '#737373'}">$15.99/mo</span>
								</div>
								<div class="flex items-center justify-between text-sm">
									<span style="color: {isDark ? '#ffffff' : '#171717'}">Spotify</span>
									<span class="font-mono" style="color: {isDark ? '#a3a3a3' : '#737373'}">$10.99/mo</span>
								</div>
								<div class="flex items-center justify-between text-sm">
									<span style="color: {isDark ? '#ffffff' : '#171717'}">Adobe Creative Cloud</span>
									<span class="font-mono" style="color: {isDark ? '#a3a3a3' : '#737373'}">$54.99/mo</span>
								</div>
							</div>
							<div class="pt-3 border-t" style="border-color: {isDark ? '#2a2a2a' : '#e5e5e5'}">
								<div class="flex items-center justify-between text-xs mb-1">
									<span style="color: {isDark ? '#a3a3a3' : '#737373'}">Total</span>
									<span class="font-semibold" style="color: {isDark ? '#ffffff' : '#171717'}">$182/mo</span>
								</div>
								<p class="text-xs" style="color: {isDark ? '#737373' : '#9ca3af'}">
									→ <span class="text-sw-accent font-semibold">$31,000</span> if invested over 10 years
								</p>
							</div>
						</div>
						
						<!-- Budget goal card -->
						<div class="rounded-2xl p-5 shadow-xl" style="background: {isDark ? 'rgba(26,26,26,0.98)' : 'rgba(255,255,255,0.98)'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}; backdrop-filter: blur(12px)">
							<div class="flex items-center gap-3 mb-4">
								<div class="relative w-12 h-12">
									<svg class="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
										<circle cx="18" cy="18" r="15" fill="none" stroke="{isDark ? '#2a2a2a' : '#e5e5e5'}" stroke-width="3"/>
										<circle cx="18" cy="18" r="15" fill="none" stroke="#a855f7" stroke-width="3" stroke-dasharray="68, 100" stroke-linecap="round"/>
									</svg>
									<span class="absolute inset-0 flex items-center justify-center text-xs font-semibold" style="color: {isDark ? '#ffffff' : '#171717'}">68%</span>
								</div>
								<div>
									<h3 class="font-display font-semibold" style="color: {isDark ? '#ffffff' : '#171717'}">Coffee Budget</h3>
									<p class="text-xs" style="color: {isDark ? '#a3a3a3' : '#737373'}">$68 of $100</p>
								</div>
							</div>
							<div class="pt-3 border-t" style="border-color: {isDark ? '#2a2a2a' : '#e5e5e5'}">
								<p class="text-xs" style="color: {isDark ? '#737373' : '#9ca3af'}">
									<i class="fa-solid fa-check-circle text-green-500 mr-1"></i>
									On track • <span class="text-sw-accent font-semibold">$32</span> remaining
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>

		<!-- Social Proof - Testimonials -->
		<section class="border-t border-sw-border/30" style="background: {isDark ? '#0a0a0a' : '#f0ebe3'}">
			<div class="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
				<div class="text-center mb-10 sm:mb-14">
					<h2 class="font-display text-2xl sm:text-3xl font-semibold tracking-tight mb-3" style="color: {isDark ? '#ffffff' : '#171717'}">What our users say</h2>
					<p style="color: {isDark ? '#a3a3a3' : '#525252'}">Real stories from people who've gained financial clarity.</p>
				</div>
				
				<div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
					<!-- Testimonial 1 -->
					<div class="rounded-2xl p-5" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#d1ccc2'}">
						<div class="flex gap-1 mb-3">
							{#each Array(5) as _}
								<i class="fa-solid fa-star text-xs text-amber-400"></i>
							{/each}
						</div>
						<p class="text-sm mb-4 leading-relaxed" style="color: {isDark ? '#d4d4d4' : '#404040'}">
							"SpentWorth showed me my $400/month food delivery habit would be worth <span class="font-semibold text-sw-accent">$28,000</span> in 5 years if invested. That hit different. Now I cook more and actually invest the savings."
						</p>
						<div class="flex items-center gap-3">
							<img src="https://i.pravatar.cc/36?img=68" alt="" class="w-9 h-9 rounded-full object-cover" />
							<div>
								<p class="text-sm font-medium" style="color: {isDark ? '#ffffff' : '#171717'}">Michael T.</p>
								<p class="text-xs" style="color: {isDark ? '#737373' : '#9ca3af'}">Now investing $350/mo</p>
							</div>
						</div>
					</div>
					
					<!-- Testimonial 2 -->
					<div class="rounded-2xl p-5" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#d1ccc2'}">
						<div class="flex gap-1 mb-3">
							{#each Array(5) as _}
								<i class="fa-solid fa-star text-xs text-amber-400"></i>
							{/each}
						</div>
						<p class="text-sm mb-4 leading-relaxed" style="color: {isDark ? '#d4d4d4' : '#404040'}">
							"Seeing my $6 daily coffee as a <span class="font-semibold text-sw-accent">$15,847 opportunity cost</span> over 5 years was the wake-up call I needed. I still get coffee, just not every day. My future self thanks me."
						</p>
						<div class="flex items-center gap-3">
							<img src="https://i.pravatar.cc/36?img=32" alt="" class="w-9 h-9 rounded-full object-cover" />
							<div>
								<p class="text-sm font-medium" style="color: {isDark ? '#ffffff' : '#171717'}">Sarah K.</p>
								<p class="text-xs" style="color: {isDark ? '#737373' : '#9ca3af'}">Freelance Designer</p>
							</div>
						</div>
					</div>
					
					<!-- Testimonial 3 -->
					<div class="rounded-2xl p-5" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#d1ccc2'}">
						<div class="flex gap-1 mb-3">
							{#each Array(5) as _}
								<i class="fa-solid fa-star text-xs text-amber-400"></i>
							{/each}
						</div>
						<p class="text-sm mb-4 leading-relaxed" style="color: {isDark ? '#d4d4d4' : '#404040'}">
							"I found 8 forgotten subscriptions totaling $127/mo. SpentWorth calculated that's <span class="font-semibold text-sw-accent">$9,100 lost</span> in potential growth over just 5 years. Cancelled them all that same day."
						</p>
						<div class="flex items-center gap-3">
							<img src="https://i.pravatar.cc/36?img=92" alt="" class="w-9 h-9 rounded-full object-cover" />
							<div>
								<p class="text-sm font-medium" style="color: {isDark ? '#ffffff' : '#171717'}">James L.</p>
								<p class="text-xs" style="color: {isDark ? '#737373' : '#9ca3af'}">Cut 8 subscriptions</p>
							</div>
						</div>
					</div>
					
					<!-- Testimonial 4 -->
					<div class="rounded-2xl p-5" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#d1ccc2'}">
						<div class="flex gap-1 mb-3">
							{#each Array(5) as _}
								<i class="fa-solid fa-star text-xs text-amber-400"></i>
							{/each}
						</div>
						<p class="text-sm mb-4 leading-relaxed" style="color: {isDark ? '#d4d4d4' : '#404040'}">
							"We uploaded 2 years of statements. Seeing that our impulse Amazon purchases could've been <span class="font-semibold text-sw-accent">$12,000 in investments</span> by now... it changed how we shop together."
						</p>
						<div class="flex items-center gap-3">
							<img src="https://i.pravatar.cc/36?img=44" alt="" class="w-9 h-9 rounded-full object-cover" />
							<div>
								<p class="text-sm font-medium" style="color: {isDark ? '#ffffff' : '#171717'}">Amanda & Chris R.</p>
								<p class="text-xs" style="color: {isDark ? '#737373' : '#9ca3af'}">Couple, Austin TX</p>
							</div>
						</div>
					</div>
					
					<!-- Testimonial 5 -->
					<div class="rounded-2xl p-5" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#d1ccc2'}">
						<div class="flex gap-1 mb-3">
							{#each Array(5) as _}
								<i class="fa-solid fa-star text-xs text-amber-400"></i>
							{/each}
						</div>
						<p class="text-sm mb-4 leading-relaxed" style="color: {isDark ? '#d4d4d4' : '#404040'}">
							"The 'what if you invested instead' view is brutal but necessary. My bar tabs from last year? Would've been <span class="font-semibold text-sw-accent">$4,200 richer</span> today. Still go out, just smarter now."
						</p>
						<div class="flex items-center gap-3">
							<img src="https://i.pravatar.cc/36?img=11" alt="" class="w-9 h-9 rounded-full object-cover" />
							<div>
								<p class="text-sm font-medium" style="color: {isDark ? '#ffffff' : '#171717'}">David P.</p>
								<p class="text-xs" style="color: {isDark ? '#737373' : '#9ca3af'}">Software Engineer</p>
							</div>
							</div>
						</div>
					
					<!-- Testimonial 6 -->
					<div class="rounded-2xl p-5" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#d1ccc2'}">
						<div class="flex gap-1 mb-3">
							{#each Array(5) as _}
								<i class="fa-solid fa-star text-xs text-amber-400"></i>
					{/each}
						</div>
						<p class="text-sm mb-4 leading-relaxed" style="color: {isDark ? '#d4d4d4' : '#404040'}">
							"As a new grad, seeing my small daily expenses add up to <span class="font-semibold text-sw-accent">$47,000</span> in missed growth over 10 years was mind-blowing. Started investing immediately. Wish I had this sooner."
						</p>
						<div class="flex items-center gap-3">
							<img src="https://i.pravatar.cc/36?img=9" alt="" class="w-9 h-9 rounded-full object-cover" />
							<div>
								<p class="text-sm font-medium" style="color: {isDark ? '#ffffff' : '#171717'}">Emily W.</p>
								<p class="text-xs" style="color: {isDark ? '#737373' : '#9ca3af'}">Recent Graduate</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>

		<!-- Stats Section -->
		<section class="border-t border-sw-border/30">
			<div class="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
				<div class="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 text-center">
					<div>
						<p class="font-display text-3xl sm:text-4xl font-bold text-sw-accent mb-1">$18,400</p>
						<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#525252'}">avg. opportunity cost discovered</p>
					</div>
					<div>
						<p class="font-display text-3xl sm:text-4xl font-bold mb-1" style="color: {isDark ? '#ffffff' : '#171717'}">2 min</p>
						<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#525252'}">to your first insight</p>
					</div>
					<div>
						<p class="font-display text-3xl sm:text-4xl font-bold mb-1" style="color: {isDark ? '#ffffff' : '#171717'}">6</p>
						<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#525252'}">avg. forgotten subscriptions found</p>
					</div>
					<div>
						<p class="font-display text-3xl sm:text-4xl font-bold mb-1" style="color: {isDark ? '#ffffff' : '#171717'}">0</p>
						<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#525252'}">bank accounts linked</p>
					</div>
				</div>
			</div>
		</section>

		<!-- How it works -->
		<section class="border-t border-sw-border/30 relative overflow-hidden">
			<!-- Background with subtle pattern -->
			<div class="absolute inset-0 opacity-5">
				<div class="absolute inset-0" style="background: linear-gradient(45deg, transparent 48%, {isDark ? 'rgba(13,148,136,0.05)' : 'rgba(13,148,136,0.02)'} 50%, transparent 52%); background-size: 40px 40px;"></div>
			</div>
			
			<div class="relative max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
				<div class="text-center mb-12 sm:mb-16">
					<h2 class="font-display text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight mb-3" style="color: {isDark ? '#ffffff' : '#171717'}">Simple by design</h2>
					<p class="text-base sm:text-lg max-w-2xl mx-auto" style="color: {isDark ? '#a3a3a3' : '#525252'}">No complicated setup. No account linking required. Just upload your statements and see your insights.</p>
				</div>
				
				<!-- Steps -->
				<div class="grid md:grid-cols-3 gap-6 lg:gap-8 mb-12">
					<div class="text-center">
						<div class="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 shadow-lg" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 2px solid {isDark ? '#2a2a2a' : '#d1ccc2'}">
							<span class="font-display text-2xl font-semibold" style="color: {isDark ? '#ffffff' : '#171717'}">1</span>
						</div>
						<h3 class="font-display font-semibold text-lg mb-2" style="color: {isDark ? '#ffffff' : '#171717'}">Export from your bank</h3>
						<p class="text-sm leading-relaxed" style="color: {isDark ? '#a3a3a3' : '#525252'}">Download your statements as CSV. Most banks make this easy — just a few clicks in your online banking.</p>
					</div>
					
					<div class="text-center">
						<div class="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 shadow-lg" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 2px solid {isDark ? '#2a2a2a' : '#d1ccc2'}">
							<span class="font-display text-2xl font-semibold" style="color: {isDark ? '#ffffff' : '#171717'}">2</span>
						</div>
						<h3 class="font-display font-semibold text-lg mb-2" style="color: {isDark ? '#ffffff' : '#171717'}">Upload to SpentWorth</h3>
						<p class="text-sm leading-relaxed" style="color: {isDark ? '#a3a3a3' : '#525252'}">We automatically categorize your transactions using smart rules. No manual tagging or setup required.</p>
					</div>
					
					<div class="text-center">
						<div class="w-16 h-16 mx-auto rounded-full bg-sw-accent/20 border-2 border-sw-accent/40 flex items-center justify-center mb-4 shadow-lg shadow-sw-accent/20">
							<span class="font-display text-2xl font-semibold text-sw-accent">3</span>
						</div>
						<h3 class="font-display font-semibold text-lg mb-2" style="color: {isDark ? '#ffffff' : '#171717'}">See your insights</h3>
						<p class="text-sm leading-relaxed" style="color: {isDark ? '#a3a3a3' : '#525252'}">Understand your spending patterns, see opportunity costs, and discover what your money could become.</p>
					</div>
				</div>
				
				<!-- Visual demo of dashboard -->
				<div class="rounded-2xl p-6 lg:p-8 shadow-2xl" style="background: {isDark ? 'rgba(26,26,26,0.95)' : 'rgba(255,255,255,0.95)'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}; backdrop-filter: blur(12px)">
					<div class="text-center mb-6">
						<h3 class="font-display font-semibold text-lg mb-2" style="color: {isDark ? '#ffffff' : '#171717'}">Your dashboard in 2 minutes</h3>
						<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">See spending breakdowns, opportunity costs, and insights at a glance</p>
					</div>
					
					<div class="grid sm:grid-cols-3 gap-4 mb-6">
						<div class="rounded-xl p-4" style="background: {isDark ? '#1a1a1a' : '#f5f0e8'}">
							<p class="text-xs mb-1" style="color: {isDark ? '#a3a3a3' : '#737373'}">Total Spent</p>
							<p class="font-mono text-xl font-semibold" style="color: {isDark ? '#ffffff' : '#171717'}">$4,847</p>
						</div>
						<div class="rounded-xl p-4" style="background: {isDark ? '#1a1a1a' : '#f5f0e8'}">
							<p class="text-xs mb-1" style="color: {isDark ? '#a3a3a3' : '#737373'}">If Invested</p>
							<p class="font-mono text-xl font-semibold text-sw-accent">$6,203</p>
						</div>
						<div class="rounded-xl p-4" style="background: {isDark ? '#1a1a1a' : '#f5f0e8'}">
							<p class="text-xs mb-1" style="color: {isDark ? '#a3a3a3' : '#737373'}">Opportunity Cost</p>
							<p class="font-mono text-xl font-semibold" style="color: {isDark ? '#ffffff' : '#171717'}">$1,356</p>
						</div>
					</div>
					
					<!-- Mini category chart -->
					<div class="space-y-2">
						<div class="flex items-center justify-between text-xs">
							<span style="color: {isDark ? '#a3a3a3' : '#525252'}">Dining & Restaurants</span>
							<span class="font-medium" style="color: {isDark ? '#ffffff' : '#171717'}">$892</span>
						</div>
						<div class="h-2 rounded-full" style="background: {isDark ? '#2a2a2a' : '#e5e5e5'}">
							<div class="h-full rounded-full bg-orange-500" style="width: 31%"></div>
						</div>
						<div class="flex items-center justify-between text-xs">
							<span style="color: {isDark ? '#a3a3a3' : '#525252'}">Entertainment</span>
							<span class="font-medium" style="color: {isDark ? '#ffffff' : '#171717'}">$687</span>
						</div>
						<div class="h-2 rounded-full" style="background: {isDark ? '#2a2a2a' : '#e5e5e5'}">
							<div class="h-full rounded-full bg-blue-500" style="width: 24%"></div>
						</div>
					</div>
				</div>
			</div>
		</section>

		<!-- Curious section (optional calculator) -->
		<section class="border-t border-sw-border/30">
			<div class="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
				<div class="text-center">
					<h2 class="font-display text-2xl sm:text-3xl font-semibold tracking-tight mb-3" style="color: {isDark ? '#ffffff' : '#171717'}">Curious what small changes could mean?</h2>
					<p class="mb-8" style="color: {isDark ? '#a3a3a3' : '#525252'}">See how everyday spending adds up over time.</p>
					
					{#if !showCalculator}
						<button 
							onclick={() => showCalculator = true}
							class="text-sm px-5 py-2.5 rounded-lg font-medium transition-colors"
							style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#d1ccc2'}; color: {isDark ? '#ffffff' : '#171717'}"
						>
							<i class="fa-solid fa-calculator mr-2" style="color: {isDark ? '#a3a3a3' : '#525252'}"></i>
							Try the calculator
						</button>
					{:else}
						<div class="rounded-2xl p-5 max-w-xs mx-auto animate-fade-in" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#d1ccc2'}; box-shadow: {isDark ? 'none' : '0 4px 16px rgba(0,0,0,0.08)'}">
							<!-- Inputs stacked -->
							<div class="space-y-3 mb-4">
								<div class="flex items-center justify-between">
									<label class="text-sm" style="color: {isDark ? '#a3a3a3' : '#525252'}">Daily amount</label>
									<div class="flex items-center rounded-lg px-3 py-1.5" style="background: {isDark ? '#0f0f0f' : '#f5f0e8'}; border: 1px solid {isDark ? '#2a2a2a' : '#d1ccc2'}">
										<span class="text-sm mr-1" style="color: {isDark ? '#737373' : '#737373'}">$</span>
										<input 
											type="number" 
											bind:value={dailyAmount}
											min="1"
											max="500"
											class="w-12 font-mono focus:outline-none bg-transparent text-center"
											style="color: {isDark ? '#ffffff' : '#171717'}"
										/>
									</div>
								</div>
								<div class="flex items-center justify-between">
									<label class="text-sm" style="color: {isDark ? '#a3a3a3' : '#525252'}">Time period</label>
									<select 
										bind:value={years}
										class="px-3 py-1.5 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-sw-accent/50"
										style="background: {isDark ? '#0f0f0f' : '#f5f0e8'}; border: 1px solid {isDark ? '#2a2a2a' : '#d1ccc2'}; color: {isDark ? '#ffffff' : '#171717'}"
									>
										<option value={1}>1 year</option>
										<option value={2}>2 years</option>
										<option value={3}>3 years</option>
										<option value={5}>5 years</option>
										<option value={10}>10 years</option>
									</select>
								</div>
							</div>
							
							<!-- Results -->
							<div class="rounded-xl p-4" style="background: {isDark ? '#0f0f0f' : '#f5f0e8'}">
								<div class="flex justify-between items-center mb-2">
									<span class="text-sm" style="color: {isDark ? '#737373' : '#737373'}">Total spent</span>
									<span class="font-mono font-medium" style="color: {isDark ? '#ffffff' : '#171717'}">${totalSpent.toLocaleString()}</span>
								</div>
								<div class="flex justify-between items-center">
									<span class="text-sm" style="color: {isDark ? '#737373' : '#737373'}">If invested</span>
									<span class="font-mono font-semibold text-lg text-sw-accent">${futureValue().toLocaleString()}</span>
								</div>
							</div>
							
							<p class="text-xs text-center mt-3" style="color: {isDark ? '#525252' : '#9ca3af'}">7% avg. annual return</p>
						</div>
					{/if}
				</div>
			</div>
		</section>

		<!-- Final CTA -->
		<section class="border-t border-sw-border/30" style="background: {isDark ? 'linear-gradient(180deg, #0f0f0f 0%, #0a1a17 100%)' : 'linear-gradient(180deg, #f5f0e8 0%, #e8f5f0 100%)'}">
			<div class="max-w-2xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
				<div class="flex items-center justify-center gap-2 mb-6">
					<div class="flex -space-x-2">
						<img src="https://i.pravatar.cc/32?img=68" alt="" class="w-8 h-8 rounded-full border-2 object-cover" style="border-color: {isDark ? '#0f0f0f' : '#f5f0e8'}" />
						<img src="https://i.pravatar.cc/32?img=32" alt="" class="w-8 h-8 rounded-full border-2 object-cover" style="border-color: {isDark ? '#0f0f0f' : '#f5f0e8'}" />
						<img src="https://i.pravatar.cc/32?img=52" alt="" class="w-8 h-8 rounded-full border-2 object-cover" style="border-color: {isDark ? '#0f0f0f' : '#f5f0e8'}" />
						<img src="https://i.pravatar.cc/32?img=44" alt="" class="w-8 h-8 rounded-full border-2 object-cover" style="border-color: {isDark ? '#0f0f0f' : '#f5f0e8'}" />
						<div class="w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-medium" style="border-color: {isDark ? '#0f0f0f' : '#f5f0e8'}; background: {isDark ? '#262626' : '#e5e5e5'}; color: {isDark ? '#a3a3a3' : '#737373'}">+</div>
					</div>
					<span class="text-sm" style="color: {isDark ? '#a3a3a3' : '#525252'}">Join 2,500+ users</span>
				</div>
				
				<h2 class="font-display text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight mb-4" style="color: {isDark ? '#ffffff' : '#171717'}">
					Ready to understand your spending?
				</h2>
				<p class="text-base sm:text-lg mb-8 max-w-lg mx-auto" style="color: {isDark ? '#a3a3a3' : '#525252'}">
					Start seeing where your money really goes. Private, simple, and takes just 2 minutes.
				</p>
				{#if !data.session}
					<button onclick={() => goto('/signup')} class="btn btn-primary text-base px-8 py-3.5 glow font-display font-semibold">
						Get Started — It's Free
					</button>
					<p class="text-xs mt-4" style="color: {isDark ? '#a3a3a3' : '#737373'}">No credit card required • Cancel anytime</p>
				{:else}
					<button onclick={() => goto('/dashboard')} class="btn btn-primary text-base px-8 py-3.5 font-display font-semibold">
						Go to Dashboard
					</button>
				{/if}
			</div>
		</section>
	</main>

	<!-- Footer -->
	<footer class="border-t" style="border-color: {isDark ? '#2a2a2a' : '#e5e5e5'}; background: {isDark ? '#0a0a0a' : '#faf7f2'}">
		<div class="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
			<!-- Main Footer Content -->
			<div class="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
				<!-- Brand Column -->
				<div class="col-span-2 md:col-span-1">
					<div class="flex items-center gap-2 mb-4">
						<div class="w-8 h-8 rounded-xl bg-sw-accent flex items-center justify-center text-white font-bold text-lg">
							$
						</div>
						<span class="font-display text-lg font-semibold" style="color: {isDark ? '#ffffff' : '#171717'}">SpentWorth</span>
					</div>
					<p class="text-sm mb-4" style="color: {isDark ? '#a3a3a3' : '#737373'}">
						Know where your money goes. Build the life you want.
					</p>
					<div class="flex items-center gap-3">
						<a href="https://twitter.com" target="_blank" rel="noopener" class="w-9 h-9 rounded-lg flex items-center justify-center transition-colors" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; color: {isDark ? '#a3a3a3' : '#737373'}">
							<i class="fa-brands fa-x-twitter"></i>
						</a>
						<a href="https://github.com" target="_blank" rel="noopener" class="w-9 h-9 rounded-lg flex items-center justify-center transition-colors" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; color: {isDark ? '#a3a3a3' : '#737373'}">
							<i class="fa-brands fa-github"></i>
						</a>
					</div>
				</div>

				<!-- Product -->
				<div>
					<h4 class="font-display font-semibold mb-4" style="color: {isDark ? '#ffffff' : '#171717'}">Product</h4>
					<ul class="space-y-2.5">
						<li><a href="/pricing" class="text-sm transition-colors hover:text-sw-accent" style="color: {isDark ? '#a3a3a3' : '#737373'}">Pricing</a></li>
						<li><a href="#features" class="text-sm transition-colors hover:text-sw-accent" style="color: {isDark ? '#a3a3a3' : '#737373'}">Features</a></li>
						<li><a href="#how-it-works" class="text-sm transition-colors hover:text-sw-accent" style="color: {isDark ? '#a3a3a3' : '#737373'}">How It Works</a></li>
					</ul>
				</div>

				<!-- Company -->
				<div>
					<h4 class="font-display font-semibold mb-4" style="color: {isDark ? '#ffffff' : '#171717'}">Company</h4>
					<ul class="space-y-2.5">
						<li><a href="/about" class="text-sm transition-colors hover:text-sw-accent" style="color: {isDark ? '#a3a3a3' : '#737373'}">About</a></li>
						<li><a href="/blog" class="text-sm transition-colors hover:text-sw-accent" style="color: {isDark ? '#a3a3a3' : '#737373'}">Blog</a></li>
						<li><a href="mailto:support@spentworth.com" class="text-sm transition-colors hover:text-sw-accent" style="color: {isDark ? '#a3a3a3' : '#737373'}">Contact</a></li>
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

			<!-- Security Badge -->
			<div class="rounded-xl p-4 mb-8 flex flex-col sm:flex-row items-center gap-4" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 rounded-lg flex items-center justify-center" style="background: {isDark ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.1)'}">
						<i class="fa-solid fa-shield-halved text-green-500"></i>
					</div>
					<div>
						<p class="font-display font-semibold text-sm" style="color: {isDark ? '#ffffff' : '#171717'}">Your data stays private</p>
						<p class="text-xs" style="color: {isDark ? '#a3a3a3' : '#737373'}">CSV imports are processed locally. We never access your bank credentials.</p>
					</div>
				</div>
				<div class="flex items-center gap-3 sm:ml-auto">
					<div class="text-center px-3">
						<i class="fa-solid fa-lock text-sw-accent mb-1"></i>
						<p class="text-[10px]" style="color: {isDark ? '#737373' : '#9ca3af'}">SSL Encrypted</p>
					</div>
					<div class="text-center px-3">
						<i class="fa-solid fa-user-shield text-sw-accent mb-1"></i>
						<p class="text-[10px]" style="color: {isDark ? '#737373' : '#9ca3af'}">No Bank Linking</p>
					</div>
					<div class="text-center px-3">
						<i class="fa-solid fa-database text-sw-accent mb-1"></i>
						<p class="text-[10px]" style="color: {isDark ? '#737373' : '#9ca3af'}">Your Data, Your Control</p>
					</div>
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
