<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { initTheme, getTheme, setTheme } from '$lib/stores/theme';
	import Logo from '$lib/components/Logo.svelte';

	let { data } = $props();
	
	let mobileMenuOpen = $state(false);
	let isDark = $state(false);
	
	onMount(() => {
		// Force light mode for guests (dark mode is a Pro feature)
		setTheme('light');
		isDark = false;
	});
	
	// Example insights data - expanded for carousel variety
	// Row 1 insights
	const insightsRow1 = [
		{ icon: 'fa-mug-hot', category: 'Daily Coffee', amount: '$6/day', opportunity: '$15,847', period: '5 years' },
		{ icon: 'fa-tv', category: 'Streaming Services', amount: '$52/mo', opportunity: '$3,640', period: '5 years' },
		{ icon: 'fa-utensils', category: 'Food Delivery', amount: '$180/mo', opportunity: '$12,600', period: '5 years' },
		{ icon: 'fa-dumbbell', category: 'Unused Gym', amount: '$45/mo', opportunity: '$3,150', period: '5 years' },
		{ icon: 'fa-gamepad', category: 'Gaming Subs', amount: '$35/mo', opportunity: '$2,450', period: '5 years' },
		{ icon: 'fa-cloud', category: 'Cloud Storage', amount: '$20/mo', opportunity: '$1,400', period: '5 years' },
		{ icon: 'fa-wine-glass', category: 'Happy Hour', amount: '$80/mo', opportunity: '$5,600', period: '5 years' },
		{ icon: 'fa-car', category: 'Rideshare', amount: '$120/mo', opportunity: '$8,400', period: '5 years' }
	];
	
	// Row 2 insights (different data)
	const insightsRow2 = [
		{ icon: 'fa-pizza-slice', category: 'Takeout Lunch', amount: '$15/day', opportunity: '$26,280', period: '5 years' },
		{ icon: 'fa-shirt', category: 'Fast Fashion', amount: '$100/mo', opportunity: '$7,000', period: '5 years' },
		{ icon: 'fa-mobile-screen', category: 'App Subscriptions', amount: '$28/mo', opportunity: '$1,960', period: '5 years' },
		{ icon: 'fa-newspaper', category: 'News Paywalls', amount: '$40/mo', opportunity: '$2,800', period: '5 years' },
		{ icon: 'fa-music', category: 'Music Services', amount: '$16/mo', opportunity: '$1,120', period: '5 years' },
		{ icon: 'fa-graduation-cap', category: 'Unused Courses', amount: '$50/mo', opportunity: '$3,500', period: '5 years' },
		{ icon: 'fa-bolt', category: 'Energy Drinks', amount: '$4/day', opportunity: '$10,512', period: '5 years' },
		{ icon: 'fa-box', category: 'Storage Unit', amount: '$85/mo', opportunity: '$5,950', period: '5 years' }
	];
</script>

<div class="min-h-screen flex flex-col">
	<!-- Navigation - Warm, cohesive header -->
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
						<a href="#features" class="px-4 py-2 text-sm font-medium text-stone-700 hover:text-green-600 transition-colors rounded-lg hover:bg-stone-100/70">Features</a>
						<a href="#how-it-works" class="px-4 py-2 text-sm font-medium text-stone-700 hover:text-green-600 transition-colors rounded-lg hover:bg-stone-100/70">How it Works</a>
						<a href="/pricing" class="px-4 py-2 text-sm font-medium text-stone-700 hover:text-green-600 transition-colors rounded-lg hover:bg-stone-100/70">Pricing</a>
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
				<a href="#features" class="block px-3 py-2.5 text-stone-700 hover:text-green-600 hover:bg-stone-100/70 rounded-lg transition-colors font-medium">Features</a>
				<a href="#how-it-works" class="block px-3 py-2.5 text-stone-700 hover:text-green-600 hover:bg-stone-100/70 rounded-lg transition-colors font-medium">How it Works</a>
				<a href="/pricing" class="block px-3 py-2.5 text-stone-700 hover:text-green-600 hover:bg-stone-100/70 rounded-lg transition-colors font-medium">Pricing</a>
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

	<!-- Hero -->
	<main class="flex-1">
		<section class="relative overflow-hidden">
			<!-- Subtle background -->
			<div class="absolute inset-0 bg-gradient-to-b from-sw-accent/[0.03] to-transparent pointer-events-none"></div>
			
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
							<span class="text-[10px] px-2 py-0.5 rounded-full" style="background: {isDark ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.1)'}; color: #10b981">12% less</span>
						</div>
						<p class="text-3xl font-bold mb-4" style="color: {isDark ? '#ffffff' : '#171717'}">$2,847</p>
						<div class="space-y-3">
							<div class="flex items-center gap-2">
								<div class="w-6 h-6 rounded-md bg-orange-500 flex items-center justify-center">
									<i class="fa-solid fa-utensils text-white text-[10px]"></i>
								</div>
								<div class="flex-1">
									<div class="flex justify-between text-xs mb-1">
										<span style="color: {isDark ? '#a3a3a3' : '#525252'}">Dining out</span>
										<span class="font-medium" style="color: {isDark ? '#ffffff' : '#171717'}">$389</span>
									</div>
									<div class="h-1 rounded-full" style="background: {isDark ? '#2a2a2a' : '#e5e5e5'}">
										<div class="h-full rounded-full bg-orange-500" style="width: 57%"></div>
									</div>
								</div>
							</div>
							<div class="flex items-center gap-2">
								<div class="w-6 h-6 rounded-md bg-purple-500 flex items-center justify-center">
									<i class="fa-solid fa-car text-white text-[10px]"></i>
								</div>
								<div class="flex-1">
									<div class="flex justify-between text-xs mb-1">
										<span style="color: {isDark ? '#a3a3a3' : '#525252'}">Transport</span>
										<span class="font-medium" style="color: {isDark ? '#ffffff' : '#171717'}">$156</span>
									</div>
									<div class="h-1 rounded-full" style="background: {isDark ? '#2a2a2a' : '#e5e5e5'}">
										<div class="h-full rounded-full bg-purple-500" style="width: 23%"></div>
									</div>
								</div>
							</div>
							<div class="flex items-center gap-2">
								<div class="w-6 h-6 rounded-md bg-blue-500 flex items-center justify-center">
									<i class="fa-solid fa-basket-shopping text-white text-[10px]"></i>
								</div>
								<div class="flex-1">
									<div class="flex justify-between text-xs mb-1">
										<span style="color: {isDark ? '#a3a3a3' : '#525252'}">Entertainment</span>
										<span class="font-medium" style="color: {isDark ? '#ffffff' : '#171717'}">$142</span>
									</div>
									<div class="h-1 rounded-full" style="background: {isDark ? '#2a2a2a' : '#e5e5e5'}">
										<div class="h-full rounded-full bg-blue-500" style="width: 21%"></div>
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
							<div class="w-7 h-7 rounded-lg bg-green-600 flex items-center justify-center">
								<i class="fa-solid fa-chart-line text-white text-xs"></i>
							</div>
							<p class="text-xs font-medium" style="color: {isDark ? '#a3a3a3' : '#737373'}">If invested instead</p>
						</div>
						<p class="text-3xl font-bold text-sw-accent mb-1">+$10,526</p>
						<p class="text-xs mb-4" style="color: {isDark ? '#737373' : '#737373'}">over 5 years at 7% return</p>
						
						<!-- Growth visualization -->
						<div class="relative h-16 flex items-end gap-1">
							<div class="flex-1 rounded-t-sm transition-all duration-500" style="height: 20%; background: linear-gradient(to top, {isDark ? 'rgba(56,142,60,0.3)' : 'rgba(56,142,60,0.2)'}, {isDark ? 'rgba(56,142,60,0.1)' : 'rgba(56,142,60,0.05)'})"></div>
							<div class="flex-1 rounded-t-sm transition-all duration-500" style="height: 35%; background: linear-gradient(to top, {isDark ? 'rgba(56,142,60,0.4)' : 'rgba(56,142,60,0.3)'}, {isDark ? 'rgba(56,142,60,0.15)' : 'rgba(56,142,60,0.1)'})"></div>
							<div class="flex-1 rounded-t-sm transition-all duration-500" style="height: 45%; background: linear-gradient(to top, {isDark ? 'rgba(56,142,60,0.5)' : 'rgba(56,142,60,0.4)'}, {isDark ? 'rgba(56,142,60,0.2)' : 'rgba(56,142,60,0.15)'})"></div>
							<div class="flex-1 rounded-t-sm transition-all duration-500" style="height: 60%; background: linear-gradient(to top, {isDark ? 'rgba(56,142,60,0.6)' : 'rgba(56,142,60,0.5)'}, {isDark ? 'rgba(56,142,60,0.25)' : 'rgba(56,142,60,0.2)'})"></div>
							<div class="flex-1 rounded-t-sm transition-all duration-500" style="height: 80%; background: linear-gradient(to top, {isDark ? 'rgba(56,142,60,0.8)' : 'rgba(56,142,60,0.7)'}, {isDark ? 'rgba(56,142,60,0.35)' : 'rgba(56,142,60,0.3)'})"></div>
							<div class="flex-1 rounded-t-sm transition-all duration-500" style="height: 100%; background: linear-gradient(to top, #388E3C, {isDark ? 'rgba(56,142,60,0.5)' : 'rgba(56,142,60,0.4)'})"></div>
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
							<div class="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center flex-shrink-0">
								<i class="fa-solid fa-bell text-white text-sm"></i>
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
					<h1 class="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold leading-[1.25] mb-5 animate-fade-in tracking-tight" style="color: {isDark ? '#ffffff' : '#171717'}">
						See what your spending
						<span class="text-gradient block mt-1 pb-2">is really costing you.</span>
					</h1>
					
					<!-- Subheadline -->
					<p class="text-base sm:text-lg md:text-xl leading-relaxed mb-8 animate-slide-up max-w-2xl mx-auto" style="color: {isDark ? '#a3a3a3' : '#525252'}; animation-delay: 100ms">
						Import your bank statements, discover hidden subscriptions, and see what your money could become if invested. No bank login required — <span class="font-medium" style="color: {isDark ? '#ffffff' : '#171717'}">your data stays private</span>.
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
						<i class="fa-solid fa-bolt text-[10px]"></i>
						Quick setup
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
		<section id="features" class="border-t border-sw-border/30 relative overflow-hidden scroll-mt-20">
			<!-- Background with app demo -->
			<div class="absolute inset-0 opacity-5 sm:opacity-10">
				<div class="absolute inset-0" style="background: linear-gradient(135deg, {isDark ? 'rgba(56,142,60,0.1)' : 'rgba(56,142,60,0.05)'} 0%, transparent 50%);"></div>
			</div>
			
			<div class="relative max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
				<div class="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
					<!-- Left: Text content -->
					<div>
						<h2 class="font-display text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight mb-4" style="color: {isDark ? '#ffffff' : '#171717'}">
							Understand precisely where your money goes
						</h2>
						<p class="text-base sm:text-lg mb-6 leading-relaxed" style="color: {isDark ? '#a3a3a3' : '#525252'}">
							Get an effortless breakdown of your finances. See where your money is going and how to improve. We'll show you what your spending could become if invested.
						</p>
						<div class="space-y-4">
							<div class="flex items-start gap-3">
								<div class="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center flex-shrink-0">
									<i class="fa-solid fa-chart-pie text-white text-sm"></i>
								</div>
								<div>
									<h3 class="font-display font-medium mb-1" style="color: {isDark ? '#ffffff' : '#171717'}">Automatic categorization</h3>
									<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#525252'}">Transactions are categorized automatically. No manual tagging required.</p>
								</div>
							</div>
							<div class="flex items-start gap-3">
								<div class="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center flex-shrink-0">
									<i class="fa-solid fa-seedling text-white text-sm"></i>
								</div>
								<div>
									<h3 class="font-display font-medium mb-1" style="color: {isDark ? '#ffffff' : '#171717'}">Growth potential</h3>
									<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#525252'}">See what your spending could become if invested. Small changes, big results.</p>
								</div>
							</div>
							<div class="flex items-start gap-3">
								<div class="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
									<i class="fa-solid fa-bell text-white text-sm"></i>
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
								<span class="text-xs px-2 py-1 rounded-full" style="background: {isDark ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.1)'}; color: #10b981">12% less than last month</span>
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
										<span class="font-medium" style="color: {isDark ? '#ffffff' : '#171717'}">$420</span>
									</div>
									<div class="h-2 rounded-full" style="background: {isDark ? '#2a2a2a' : '#e5e5e5'}">
										<div class="h-full rounded-full bg-orange-500" style="width: 31%"></div>
									</div>
								</div>
								<div>
									<div class="flex justify-between text-xs mb-1.5">
										<span style="color: {isDark ? '#a3a3a3' : '#525252'}">Entertainment</span>
										<span class="font-medium" style="color: {isDark ? '#ffffff' : '#171717'}">$187</span>
									</div>
									<div class="h-2 rounded-full" style="background: {isDark ? '#2a2a2a' : '#e5e5e5'}">
										<div class="h-full rounded-full bg-blue-500" style="width: 24%"></div>
									</div>
								</div>
								<div>
									<div class="flex justify-between text-xs mb-1.5">
										<span style="color: {isDark ? '#a3a3a3' : '#525252'}">Subscriptions</span>
										<span class="font-medium" style="color: {isDark ? '#ffffff' : '#171717'}">$165</span>
									</div>
									<div class="h-2 rounded-full" style="background: {isDark ? '#2a2a2a' : '#e5e5e5'}">
										<div class="h-full rounded-full bg-purple-500" style="width: 17%"></div>
									</div>
								</div>
								<div>
									<div class="flex justify-between text-xs mb-1.5">
										<span style="color: {isDark ? '#a3a3a3' : '#525252'}">Shopping</span>
										<span class="font-medium" style="color: {isDark ? '#ffffff' : '#171717'}">$285</span>
									</div>
									<div class="h-2 rounded-full" style="background: {isDark ? '#2a2a2a' : '#e5e5e5'}">
										<div class="h-full rounded-full bg-green-600" style="width: 19%"></div>
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
				<div class="absolute inset-0" style="background: radial-gradient(circle at 30% 50%, {isDark ? 'rgba(56,142,60,0.1)' : 'rgba(56,142,60,0.05)'} 0%, transparent 50%);"></div>
			</div>
			
			<div class="relative max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
				<div class="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
					<!-- Left: App demo card -->
					<div class="order-2 lg:order-1">
						<div class="rounded-2xl p-6 shadow-2xl" style="background: {isDark ? 'rgba(26,26,26,0.98)' : 'rgba(255,255,255,0.98)'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}; backdrop-filter: blur(12px)">
							<!-- Header -->
							<div class="flex items-center gap-3 mb-6">
								<div class="w-10 h-10 rounded-lg bg-green-600 flex items-center justify-center">
									<i class="fa-solid fa-chart-line text-white"></i>
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
										<span class="text-xs" style="color: {isDark ? '#a3a3a3' : '#737373'}">$180/mo</span>
									</div>
									<div class="flex items-baseline gap-2">
										<span class="text-2xl font-bold text-sw-accent">$12,600</span>
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
								<div class="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center flex-shrink-0">
									<i class="fa-solid fa-calculator text-white text-sm"></i>
								</div>
								<div>
									<h3 class="font-display font-medium mb-1" style="color: {isDark ? '#ffffff' : '#171717'}">Real opportunity costs</h3>
									<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#525252'}">Calculate what your spending could be worth if invested at 7% annual return.</p>
								</div>
							</div>
							<div class="flex items-start gap-3">
								<div class="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center flex-shrink-0">
									<i class="fa-solid fa-chart-line text-white text-sm"></i>
								</div>
								<div>
									<h3 class="font-display font-medium mb-1" style="color: {isDark ? '#ffffff' : '#171717'}">Category insights</h3>
									<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#525252'}">See which spending categories have the biggest impact on your future wealth.</p>
								</div>
							</div>
							<div class="flex items-start gap-3">
								<div class="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
									<i class="fa-solid fa-bullseye text-white text-sm"></i>
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
				<div class="absolute inset-0" style="background: linear-gradient(180deg, transparent 0%, {isDark ? 'rgba(56,142,60,0.05)' : 'rgba(56,142,60,0.02)'} 50%, transparent 100%);"></div>
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
								<div class="w-8 h-8 rounded-lg bg-red-500 flex items-center justify-center flex-shrink-0">
									<i class="fa-solid fa-bell text-white text-sm"></i>
								</div>
								<div>
									<h3 class="font-display font-medium mb-1" style="color: {isDark ? '#ffffff' : '#171717'}">Subscription detection</h3>
									<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#525252'}">We find recurring charges automatically. See what you're really spending each month.</p>
								</div>
							</div>
							<div class="flex items-start gap-3">
								<div class="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center flex-shrink-0">
									<i class="fa-solid fa-bullseye text-white text-sm"></i>
								</div>
								<div>
									<h3 class="font-display font-medium mb-1" style="color: {isDark ? '#ffffff' : '#171717'}">Budget tracking</h3>
									<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#525252'}">Set spending limits by category. Get alerts when you're approaching your budget.</p>
								</div>
							</div>
							<div class="flex items-start gap-3">
								<div class="w-8 h-8 rounded-lg bg-purple-500 flex items-center justify-center flex-shrink-0">
									<i class="fa-solid fa-chart-line text-white text-sm"></i>
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

		<!-- Example Discoveries Section -->
		<section class="border-t border-sw-border/30" style="background: {isDark ? '#0a0a0a' : '#f0ebe3'}">
			<div class="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
				<div class="text-center mb-10 sm:mb-14">
					<h2 class="font-display text-2xl sm:text-3xl font-semibold tracking-tight mb-3" style="color: {isDark ? '#ffffff' : '#171717'}">What SpentWorth reveals</h2>
					<p style="color: {isDark ? '#a3a3a3' : '#525252'}">Example insights based on common spending patterns</p>
				</div>
				
				<div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
					<!-- Example 1: Coffee -->
					<div class="rounded-2xl p-5" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#d1ccc2'}">
						<div class="flex items-center gap-3 mb-4">
							<div class="w-10 h-10 rounded-lg bg-stone-800 flex items-center justify-center">
								<i class="fa-solid fa-mug-hot text-white"></i>
							</div>
							<div>
								<p class="text-sm font-medium" style="color: {isDark ? '#ffffff' : '#171717'}">Daily Coffee</p>
								<p class="text-xs" style="color: {isDark ? '#737373' : '#9ca3af'}">$6/day habit</p>
							</div>
						</div>
						<p class="text-sm mb-3 leading-relaxed" style="color: {isDark ? '#d4d4d4' : '#404040'}">
							A $6 daily coffee adds up to $2,190/year. If invested at 7% annually, that's worth...
						</p>
						<p class="text-2xl font-bold text-sw-accent">$15,847</p>
						<p class="text-xs" style="color: {isDark ? '#737373' : '#9ca3af'}">over 5 years</p>
					</div>
					
					<!-- Example 2: Streaming -->
					<div class="rounded-2xl p-5" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#d1ccc2'}">
						<div class="flex items-center gap-3 mb-4">
							<div class="w-10 h-10 rounded-lg bg-stone-800 flex items-center justify-center">
								<i class="fa-solid fa-tv text-white"></i>
							</div>
							<div>
								<p class="text-sm font-medium" style="color: {isDark ? '#ffffff' : '#171717'}">Streaming Services</p>
								<p class="text-xs" style="color: {isDark ? '#737373' : '#9ca3af'}">$52/month combined</p>
							</div>
						</div>
						<p class="text-sm mb-3 leading-relaxed" style="color: {isDark ? '#d4d4d4' : '#404040'}">
							Multiple streaming subscriptions can quietly add up. That $52/month could become...
						</p>
						<p class="text-2xl font-bold text-sw-accent">$3,640</p>
						<p class="text-xs" style="color: {isDark ? '#737373' : '#9ca3af'}">over 5 years</p>
					</div>
					
					<!-- Example 3: Food Delivery -->
					<div class="rounded-2xl p-5" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#d1ccc2'}">
						<div class="flex items-center gap-3 mb-4">
							<div class="w-10 h-10 rounded-lg bg-stone-800 flex items-center justify-center">
								<i class="fa-solid fa-utensils text-white"></i>
							</div>
							<div>
								<p class="text-sm font-medium" style="color: {isDark ? '#ffffff' : '#171717'}">Food Delivery</p>
								<p class="text-xs" style="color: {isDark ? '#737373' : '#9ca3af'}">$180/month average</p>
							</div>
						</div>
						<p class="text-sm mb-3 leading-relaxed" style="color: {isDark ? '#d4d4d4' : '#404040'}">
							Convenience has a cost. $180/month on delivery apps could grow into...
						</p>
						<p class="text-2xl font-bold text-sw-accent">$12,600</p>
						<p class="text-xs" style="color: {isDark ? '#737373' : '#9ca3af'}">over 5 years</p>
					</div>
					
					<!-- Example 4: Unused Gym -->
					<div class="rounded-2xl p-5" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#d1ccc2'}">
						<div class="flex items-center gap-3 mb-4">
							<div class="w-10 h-10 rounded-lg bg-stone-800 flex items-center justify-center">
								<i class="fa-solid fa-dumbbell text-white"></i>
							</div>
							<div>
								<p class="text-sm font-medium" style="color: {isDark ? '#ffffff' : '#171717'}">Forgotten Subscriptions</p>
								<p class="text-xs" style="color: {isDark ? '#737373' : '#9ca3af'}">Gym you never use</p>
							</div>
						</div>
						<p class="text-sm mb-3 leading-relaxed" style="color: {isDark ? '#d4d4d4' : '#404040'}">
							That $45/month gym membership you forgot to cancel? Over time it becomes...
						</p>
						<p class="text-2xl font-bold text-sw-accent">$3,150</p>
						<p class="text-xs" style="color: {isDark ? '#737373' : '#9ca3af'}">over 5 years</p>
					</div>
					
					<!-- Example 5: Impulse Shopping -->
					<div class="rounded-2xl p-5" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#d1ccc2'}">
						<div class="flex items-center gap-3 mb-4">
							<div class="w-10 h-10 rounded-lg bg-stone-800 flex items-center justify-center">
								<i class="fa-solid fa-cart-shopping text-white"></i>
							</div>
							<div>
								<p class="text-sm font-medium" style="color: {isDark ? '#ffffff' : '#171717'}">Impulse Shopping</p>
								<p class="text-xs" style="color: {isDark ? '#737373' : '#9ca3af'}">$150/month average</p>
							</div>
						</div>
						<p class="text-sm mb-3 leading-relaxed" style="color: {isDark ? '#d4d4d4' : '#404040'}">
							Those "small" Amazon purchases add up fast. $150/month could become...
						</p>
						<p class="text-2xl font-bold text-sw-accent">$10,500</p>
						<p class="text-xs" style="color: {isDark ? '#737373' : '#9ca3af'}">over 5 years</p>
					</div>
					
					<!-- Example 6: Combined - keep green as the CTA/summary card -->
					<div class="rounded-2xl p-5" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#d1ccc2'}">
						<div class="flex items-center gap-3 mb-4">
							<div class="w-10 h-10 rounded-lg bg-green-600 flex items-center justify-center">
								<i class="fa-solid fa-chart-line text-white"></i>
							</div>
							<div>
								<p class="text-sm font-medium" style="color: {isDark ? '#ffffff' : '#171717'}">The Full Picture</p>
								<p class="text-xs" style="color: {isDark ? '#737373' : '#9ca3af'}">All spending combined</p>
							</div>
						</div>
						<p class="text-sm mb-3 leading-relaxed" style="color: {isDark ? '#d4d4d4' : '#404040'}">
							Small daily habits compound. See what your actual spending patterns could become.
						</p>
						<p class="text-2xl font-bold text-sw-accent">$45,000+</p>
						<p class="text-xs" style="color: {isDark ? '#737373' : '#9ca3af'}">typical 5-year opportunity</p>
					</div>
				</div>
				
			<p class="text-center text-xs mt-8" style="color: {isDark ? '#737373' : '#9ca3af'}">
				<i class="fa-solid fa-info-circle mr-1"></i>
				Examples assume 7% annual return. Your actual results will vary based on your spending and market returns.
			</p>
			</div>
		</section>

		<!-- Product Facts Section -->
		<section class="border-t border-sw-border/30">
			<div class="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
				<div class="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 text-center">
					<div>
						<p class="font-display text-3xl sm:text-4xl font-bold text-sw-accent mb-1">7%</p>
						<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#525252'}">default return rate used</p>
					</div>
					<div>
						<p class="font-display text-3xl sm:text-4xl font-bold mb-1" style="color: {isDark ? '#ffffff' : '#171717'}">2 min</p>
						<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#525252'}">to your first insight</p>
					</div>
					<div>
						<p class="font-display text-3xl sm:text-4xl font-bold mb-1" style="color: {isDark ? '#ffffff' : '#171717'}">CSV</p>
						<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#525252'}">simple file upload</p>
					</div>
					<div>
						<p class="font-display text-3xl sm:text-4xl font-bold mb-1" style="color: {isDark ? '#ffffff' : '#171717'}">0</p>
						<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#525252'}">bank accounts linked</p>
					</div>
				</div>
			</div>
		</section>

		<!-- Feature Highlights - Visual Bridge Section -->
		<section class="border-t border-sw-border/30 relative overflow-hidden" style="background: {isDark ? '#0f0f0f' : '#faf7f2'}">
			<!-- Decorative background elements -->
			<div class="absolute inset-0 overflow-hidden pointer-events-none">
				<div class="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl" style="background: {isDark ? 'rgba(56,142,60,0.3)' : 'rgba(56,142,60,0.15)'}; transform: translate(-50%, -50%);"></div>
				<div class="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl" style="background: {isDark ? 'rgba(245,158,11,0.2)' : 'rgba(245,158,11,0.1)'}; transform: translate(50%, 50%);"></div>
			</div>
			
			<div class="relative max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
				<div class="grid md:grid-cols-3 gap-6 lg:gap-8">
					<!-- Feature 1 -->
					<div class="group relative">
						<div class="rounded-2xl p-6 h-full transition-all duration-300 text-center" style="background: {isDark ? 'rgba(26,26,26,0.6)' : 'rgba(255,255,255,0.7)'}; border: 1px solid {isDark ? 'rgba(42,42,42,0.5)' : 'rgba(229,229,229,0.5)'}; backdrop-filter: blur(8px); box-shadow: {isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.05)'}">
							<div class="w-14 h-14 rounded-xl bg-green-600 flex items-center justify-center mb-4 mx-auto transition-transform group-hover:scale-110">
								<i class="fa-solid fa-shield-halved text-2xl text-white"></i>
							</div>
							<h3 class="font-display font-semibold text-lg mb-2" style="color: {isDark ? '#ffffff' : '#171717'}">Private & Secure</h3>
							<p class="text-sm leading-relaxed" style="color: {isDark ? '#a3a3a3' : '#525252'}">Your data stays under your control. No account linking, no third-party access. Just you and your insights.</p>
						</div>
					</div>
					
					<!-- Feature 2 -->
					<div class="group relative">
						<div class="rounded-2xl p-6 h-full transition-all duration-300 text-center" style="background: {isDark ? 'rgba(26,26,26,0.6)' : 'rgba(255,255,255,0.7)'}; border: 1px solid {isDark ? 'rgba(42,42,42,0.5)' : 'rgba(229,229,229,0.5)'}; backdrop-filter: blur(8px); box-shadow: {isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.05)'}">
							<div class="w-14 h-14 rounded-xl bg-amber-500 flex items-center justify-center mb-4 mx-auto transition-transform group-hover:scale-110">
								<i class="fa-solid fa-bolt text-2xl text-white"></i>
							</div>
							<h3 class="font-display font-semibold text-lg mb-2" style="color: {isDark ? '#ffffff' : '#171717'}">Instant Insights</h3>
							<p class="text-sm leading-relaxed" style="color: {isDark ? '#a3a3a3' : '#525252'}">Get actionable insights in minutes. See opportunity costs, spending patterns, and hidden subscriptions immediately.</p>
						</div>
					</div>
					
					<!-- Feature 3 -->
					<div class="group relative">
						<div class="rounded-2xl p-6 h-full transition-all duration-300 text-center" style="background: {isDark ? 'rgba(26,26,26,0.6)' : 'rgba(255,255,255,0.7)'}; border: 1px solid {isDark ? 'rgba(42,42,42,0.5)' : 'rgba(229,229,229,0.5)'}; backdrop-filter: blur(8px); box-shadow: {isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.05)'}">
							<div class="w-14 h-14 rounded-xl bg-indigo-500 flex items-center justify-center mb-4 mx-auto transition-transform group-hover:scale-110">
								<i class="fa-solid fa-chart-pie text-2xl text-white"></i>
							</div>
							<h3 class="font-display font-semibold text-lg mb-2" style="color: {isDark ? '#ffffff' : '#171717'}">Smart Analysis</h3>
							<p class="text-sm leading-relaxed" style="color: {isDark ? '#a3a3a3' : '#525252'}">Automatic categorization and real market data show you exactly what your spending could become if invested.</p>
						</div>
					</div>
				</div>
			</div>
		</section>

		<!-- How it works -->
		<section id="how-it-works" class="border-t border-sw-border/30 relative overflow-hidden scroll-mt-24 sm:scroll-mt-20">
			<!-- Background with subtle pattern -->
			<div class="absolute inset-0 opacity-5">
				<div class="absolute inset-0" style="background: linear-gradient(45deg, transparent 48%, {isDark ? 'rgba(56,142,60,0.05)' : 'rgba(56,142,60,0.02)'} 50%, transparent 52%); background-size: 40px 40px;"></div>
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
						<h3 class="font-display font-semibold text-lg mb-2" style="color: {isDark ? '#ffffff' : '#171717'}">Your dashboard, instantly</h3>
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
							<span class="font-medium" style="color: {isDark ? '#ffffff' : '#171717'}">$420</span>
						</div>
						<div class="h-2 rounded-full" style="background: {isDark ? '#2a2a2a' : '#e5e5e5'}">
							<div class="h-full rounded-full bg-orange-500" style="width: 31%"></div>
						</div>
						<div class="flex items-center justify-between text-xs">
							<span style="color: {isDark ? '#a3a3a3' : '#525252'}">Entertainment</span>
							<span class="font-medium" style="color: {isDark ? '#ffffff' : '#171717'}">$187</span>
						</div>
						<div class="h-2 rounded-full" style="background: {isDark ? '#2a2a2a' : '#e5e5e5'}">
							<div class="h-full rounded-full bg-blue-500" style="width: 24%"></div>
						</div>
					</div>
				</div>
			</div>
		</section>

		<!-- Common Discoveries Section -->
		<section class="border-t border-sw-border/30 py-16 sm:py-20 overflow-hidden" style="background: {isDark ? '#0a0a0a' : '#faf7f2'}">
			<div class="max-w-6xl mx-auto px-4 sm:px-6">
				<div class="text-center mb-10 sm:mb-12">
					<h2 class="font-display text-2xl sm:text-3xl font-semibold tracking-tight mb-3" style="color: {isDark ? '#ffffff' : '#171717'}">Common spending blind spots</h2>
					<p style="color: {isDark ? '#a3a3a3' : '#525252'}">These patterns often go unnoticed until you see the numbers</p>
				</div>
			</div>
			
			<!-- Scrolling insights row 1 -->
			<div class="relative mb-4">
				<div class="flex gap-4 pl-4 sm:pl-0 animate-scroll-left">
					{#each [...insightsRow1, ...insightsRow1] as insight}
						<div class="flex-shrink-0 w-72 rounded-2xl p-5" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}; box-shadow: {isDark ? 'none' : '0 4px 12px rgba(0,0,0,0.04)'}">
							<div class="flex items-center gap-3 mb-3">
								<div class="w-10 h-10 rounded-lg bg-stone-800 flex items-center justify-center">
									<i class="fa-solid {insight.icon} text-white"></i>
								</div>
								<div>
									<p class="text-sm font-medium" style="color: {isDark ? '#ffffff' : '#171717'}">{insight.category}</p>
									<p class="text-xs" style="color: {isDark ? '#737373' : '#9ca3af'}">{insight.amount}</p>
								</div>
							</div>
							<div class="pt-3" style="border-top: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
								<p class="text-xs mb-1" style="color: {isDark ? '#737373' : '#9ca3af'}">If invested for {insight.period}:</p>
								<p class="text-xl font-bold text-sw-accent">{insight.opportunity}</p>
							</div>
						</div>
					{/each}
				</div>
			</div>
			
			<!-- Scrolling insights row 2 (opposite direction, different data) -->
			<div class="relative">
				<div class="flex gap-4 pl-4 sm:pl-0 animate-scroll-right">
					{#each [...insightsRow2, ...insightsRow2] as insight}
						<div class="flex-shrink-0 w-72 rounded-2xl p-5" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}; box-shadow: {isDark ? 'none' : '0 4px 12px rgba(0,0,0,0.04)'}">
							<div class="flex items-center gap-3 mb-3">
								<div class="w-10 h-10 rounded-lg bg-stone-800 flex items-center justify-center">
									<i class="fa-solid {insight.icon} text-white"></i>
								</div>
								<div>
									<p class="text-sm font-medium" style="color: {isDark ? '#ffffff' : '#171717'}">{insight.category}</p>
									<p class="text-xs" style="color: {isDark ? '#737373' : '#9ca3af'}">{insight.amount}</p>
								</div>
							</div>
							<div class="pt-3" style="border-top: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
								<p class="text-xs mb-1" style="color: {isDark ? '#737373' : '#9ca3af'}">If invested for {insight.period}:</p>
								<p class="text-xl font-bold text-sw-accent">{insight.opportunity}</p>
							</div>
						</div>
					{/each}
				</div>
			</div>
			
			<p class="text-center text-xs mt-8 px-4" style="color: {isDark ? '#737373' : '#9ca3af'}">
				Based on common spending patterns. Calculations assume 7% annual return.
			</p>
		</section>

		<!-- Final CTA -->
		<section class="border-t border-sw-border/30" style="background: {isDark ? '#0f0f0f' : '#f5f0e8'}">
			<div class="max-w-2xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
				<div class="flex items-center justify-center gap-2 mb-6">
					<div class="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style="background: {isDark ? 'rgba(56,142,60,0.15)' : 'rgba(56,142,60,0.1)'}">
						<i class="fa-solid fa-shield-check text-sw-accent text-sm"></i>
						<span class="text-sm font-medium text-sw-accent">Private & Secure</span>
					</div>
				</div>
				
				<h2 class="font-display text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight mb-4" style="color: {isDark ? '#ffffff' : '#171717'}">
					Ready to understand your spending?
				</h2>
				<p class="text-base sm:text-lg mb-8 max-w-lg mx-auto" style="color: {isDark ? '#a3a3a3' : '#525252'}">
					Start seeing where your money really goes. Quick setup, powerful insights.
				</p>
				{#if !data.session}
					<button onclick={() => goto('/signup')} class="btn btn-primary text-base px-8 py-3.5 glow font-display font-semibold">
						Get Started — It's Free
					</button>
					<p class="text-xs mt-4" style="color: {isDark ? '#a3a3a3' : '#737373'}">No credit card required</p>
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
