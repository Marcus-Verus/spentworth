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
	
	// Testimonials data
	const testimonials1 = [
		{ initials: 'MK', name: 'Michelle K.', text: 'Found 4 streaming services I forgot about. That\'s <span class="font-semibold text-sw-accent">$52/month</span> I\'m now investing.', result: 'Found $624/year', gradient: 'linear-gradient(135deg, #0d9488, #14b8a6)' },
		{ initials: 'JT', name: 'James T.', text: 'My coffee habit could be worth <span class="font-semibold text-sw-accent">$23,000</span> in 10 years. Still get coffee, just smarter.', result: 'Now investing $200/mo', gradient: 'linear-gradient(135deg, #f59e0b, #fbbf24)' },
		{ initials: 'SR', name: 'Sarah R.', text: 'Finally a finance app that doesn\'t want my bank login. CSV imports = real privacy.', result: 'Privacy-first user', gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)' },
		{ initials: 'DM', name: 'David M.', text: 'Discovered <span class="font-semibold text-sw-accent">$89/month</span> in subscriptions I thought I\'d cancelled years ago.', result: 'Recovered $1,068/year', gradient: 'linear-gradient(135deg, #ec4899, #f472b6)' },
		{ initials: 'AL', name: 'Amanda L.', text: 'The opportunity cost view changed how I think about every purchase. Eye-opening.', result: 'Saving 20% more monthly', gradient: 'linear-gradient(135deg, #10b981, #34d399)' },
		{ initials: 'RK', name: 'Ryan K.', text: 'Two minutes to upload, instant insights. Showed my partner and we found <span class="font-semibold text-sw-accent">$200/month</span> to cut.', result: 'Couple budgeting', gradient: 'linear-gradient(135deg, #3b82f6, #60a5fa)' }
	];
	
	const testimonials2 = [
		{ initials: 'LW', name: 'Lisa W.', text: 'My "small" DoorDash habit? <span class="font-semibold text-sw-accent">$180/month</span>. Seeing it visualized hit different.', result: 'Cut delivery by 60%', gradient: 'linear-gradient(135deg, #f97316, #fb923c)' },
		{ initials: 'CT', name: 'Chris T.', text: 'No Plaid, no bank linking, no sketchy permissions. Just my data, my insights. Love it.', result: 'Security-conscious', gradient: 'linear-gradient(135deg, #14b8a6, #2dd4bf)' },
		{ initials: 'NP', name: 'Nina P.', text: 'Gym membership I never use + 3 apps = <span class="font-semibold text-sw-accent">$75/month</span> found in 2 minutes.', result: 'Quick wins', gradient: 'linear-gradient(135deg, #a855f7, #c084fc)' },
		{ initials: 'BH', name: 'Ben H.', text: 'The "if invested" numbers are humbling. Changed my whole perspective on spending.', result: 'Long-term thinker now', gradient: 'linear-gradient(135deg, #0ea5e9, #38bdf8)' },
		{ initials: 'EM', name: 'Elena M.', text: 'Simple enough that I actually use it. Other apps were too complicated.', result: 'Weekly check-ins', gradient: 'linear-gradient(135deg, #84cc16, #a3e635)' },
		{ initials: 'TJ', name: 'Tom J.', text: 'Showed me I spend <span class="font-semibold text-sw-accent">$250/month</span> on "miscellaneous." Not anymore.', result: 'Category clarity', gradient: 'linear-gradient(135deg, #ef4444, #f87171)' }
	];
</script>

<div class="min-h-screen flex flex-col">
	<!-- Navigation - Warm, cohesive header -->
	<nav class="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-stone-200/60">
		<div class="max-w-6xl mx-auto px-4 sm:px-6">
			<div class="flex items-center justify-between h-16">
				<!-- Logo -->
				<a href="/" class="flex items-center gap-3 group">
					<div class="rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white p-2 shadow-md shadow-teal-500/15 group-hover:shadow-lg group-hover:shadow-teal-500/20 transition-all group-hover:scale-[1.02]">
						<Logo size="md" class="text-white" />
					</div>
					<span class="font-display text-xl font-bold text-stone-800 tracking-tight">SpentWorth</span>
				</a>
				
				<!-- Desktop nav -->
				<div class="hidden md:flex items-center">
					<!-- Nav Links -->
					<div class="flex items-center gap-1 mr-4">
						<a href="#features" class="px-4 py-2 text-sm font-medium text-stone-700 hover:text-teal-600 transition-colors rounded-lg hover:bg-stone-100/70">Features</a>
						<a href="#how-it-works" class="px-4 py-2 text-sm font-medium text-stone-700 hover:text-teal-600 transition-colors rounded-lg hover:bg-stone-100/70">How it Works</a>
						<a href="/pricing" class="px-4 py-2 text-sm font-medium text-stone-700 hover:text-teal-600 transition-colors rounded-lg hover:bg-stone-100/70">Pricing</a>
					</div>
					
					<!-- Auth -->
					<div class="flex items-center gap-2 pl-4 border-l border-stone-200">
						{#if data.session}
							<a href="/dashboard" class="px-5 py-2.5 text-sm font-semibold text-white bg-teal-600 rounded-xl hover:bg-teal-500 transition-all shadow-md shadow-teal-600/20 hover:shadow-lg hover:shadow-teal-500/25">Dashboard</a>
						{:else}
							<a href="/login" class="px-4 py-2 text-sm font-medium text-stone-700 hover:text-teal-600 transition-colors">Log in</a>
							<a href="/signup" class="px-5 py-2.5 text-sm font-semibold text-white bg-teal-600 rounded-xl hover:bg-teal-500 transition-all shadow-md shadow-teal-600/20 hover:shadow-lg hover:shadow-teal-500/25">Get Started</a>
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
				<a href="#features" class="block px-3 py-2.5 text-stone-700 hover:text-teal-600 hover:bg-stone-100/70 rounded-lg transition-colors font-medium">Features</a>
				<a href="#how-it-works" class="block px-3 py-2.5 text-stone-700 hover:text-teal-600 hover:bg-stone-100/70 rounded-lg transition-colors font-medium">How it Works</a>
				<a href="/pricing" class="block px-3 py-2.5 text-stone-700 hover:text-teal-600 hover:bg-stone-100/70 rounded-lg transition-colors font-medium">Pricing</a>
				<div class="pt-3 mt-3 border-t border-stone-200/60 space-y-2">
					{#if data.session}
						<a href="/dashboard" class="block px-4 py-2.5 text-center font-semibold text-white bg-teal-600 rounded-xl shadow-md">Dashboard</a>
					{:else}
						<a href="/login" class="block px-3 py-2.5 text-stone-700 hover:text-teal-600 hover:bg-stone-100/70 rounded-lg transition-colors font-medium">Log in</a>
						<a href="/signup" class="block px-4 py-2.5 text-center font-semibold text-white bg-teal-600 rounded-xl shadow-md">Get Started</a>
					{/if}
				</div>
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
										<span class="font-medium" style="color: {isDark ? '#ffffff' : '#171717'}">$142</span>
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
					<h1 class="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold leading-[1.25] mb-5 animate-fade-in tracking-tight" style="color: {isDark ? '#ffffff' : '#171717'}">
						See what your spending
						<span class="text-gradient block mt-1 pb-2">is really costing you.</span>
					</h1>
					
					<!-- Subheadline -->
					<p class="text-base sm:text-lg md:text-xl leading-relaxed mb-8 animate-slide-up max-w-2xl mx-auto" style="color: {isDark ? '#a3a3a3' : '#525252'}; animation-delay: 100ms">
						Import your bank statements, discover hidden subscriptions, and see what your money could become if invested. Users find an average of <span class="font-medium" style="color: {isDark ? '#ffffff' : '#171717'}">$127/month</span> in forgotten charges.
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
		<section id="features" class="border-t border-sw-border/30 relative overflow-hidden scroll-mt-20">
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
							"SpentWorth showed me my $180/month food delivery habit would be worth <span class="font-semibold text-sw-accent">$12,600</span> in 5 years if invested. That hit different. Now I cook more and actually invest the savings."
						</p>
						<div class="flex items-center gap-3">
							<img src="https://i.pravatar.cc/36?img=68" alt="" class="w-9 h-9 rounded-full object-cover" />
							<div>
								<p class="text-sm font-medium" style="color: {isDark ? '#ffffff' : '#171717'}">Michael T.</p>
								<p class="text-xs" style="color: {isDark ? '#737373' : '#9ca3af'}">Now investing $150/mo</p>
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
							<img src="https://i.pravatar.cc/36?img=57" alt="" class="w-9 h-9 rounded-full object-cover" />
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

		<!-- Feature Highlights - Visual Bridge Section -->
		<section class="border-t border-sw-border/30 relative overflow-hidden" style="background: {isDark ? '#0f0f0f' : '#faf7f2'}">
			<!-- Decorative background elements -->
			<div class="absolute inset-0 overflow-hidden pointer-events-none">
				<div class="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl" style="background: {isDark ? 'rgba(13,148,136,0.3)' : 'rgba(13,148,136,0.15)'}; transform: translate(-50%, -50%);"></div>
				<div class="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl" style="background: {isDark ? 'rgba(245,158,11,0.2)' : 'rgba(245,158,11,0.1)'}; transform: translate(50%, 50%);"></div>
			</div>
			
			<div class="relative max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
				<div class="grid md:grid-cols-3 gap-6 lg:gap-8">
					<!-- Feature 1 -->
					<div class="group relative">
						<div class="rounded-2xl p-6 h-full transition-all duration-300 text-center" style="background: {isDark ? 'rgba(26,26,26,0.6)' : 'rgba(255,255,255,0.7)'}; border: 1px solid {isDark ? 'rgba(42,42,42,0.5)' : 'rgba(229,229,229,0.5)'}; backdrop-filter: blur(8px); box-shadow: {isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.05)'}">
							<div class="w-14 h-14 rounded-xl flex items-center justify-center mb-4 mx-auto transition-transform group-hover:scale-110" style="background: linear-gradient(135deg, {isDark ? 'rgba(13,148,136,0.2)' : 'rgba(13,148,136,0.15)'}, {isDark ? 'rgba(13,148,136,0.1)' : 'rgba(13,148,136,0.08)'}); border: 1px solid {isDark ? 'rgba(13,148,136,0.3)' : 'rgba(13,148,136,0.2)'}">
								<i class="fa-solid fa-shield-halved text-2xl text-sw-accent"></i>
							</div>
							<h3 class="font-display font-semibold text-lg mb-2" style="color: {isDark ? '#ffffff' : '#171717'}">100% Private</h3>
							<p class="text-sm leading-relaxed" style="color: {isDark ? '#a3a3a3' : '#525252'}">Your data never leaves your control. No account linking, no third-party access. Just you and your insights.</p>
						</div>
					</div>
					
					<!-- Feature 2 -->
					<div class="group relative">
						<div class="rounded-2xl p-6 h-full transition-all duration-300 text-center" style="background: {isDark ? 'rgba(26,26,26,0.6)' : 'rgba(255,255,255,0.7)'}; border: 1px solid {isDark ? 'rgba(42,42,42,0.5)' : 'rgba(229,229,229,0.5)'}; backdrop-filter: blur(8px); box-shadow: {isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.05)'}">
							<div class="w-14 h-14 rounded-xl flex items-center justify-center mb-4 mx-auto transition-transform group-hover:scale-110" style="background: linear-gradient(135deg, {isDark ? 'rgba(245,158,11,0.2)' : 'rgba(245,158,11,0.15)'}, {isDark ? 'rgba(245,158,11,0.1)' : 'rgba(245,158,11,0.08)'}); border: 1px solid {isDark ? 'rgba(245,158,11,0.3)' : 'rgba(245,158,11,0.2)'}">
								<i class="fa-solid fa-bolt text-2xl" style="color: #f59e0b"></i>
							</div>
							<h3 class="font-display font-semibold text-lg mb-2" style="color: {isDark ? '#ffffff' : '#171717'}">Instant Insights</h3>
							<p class="text-sm leading-relaxed" style="color: {isDark ? '#a3a3a3' : '#525252'}">Get actionable insights in minutes. See opportunity costs, spending patterns, and hidden subscriptions immediately.</p>
						</div>
					</div>
					
					<!-- Feature 3 -->
					<div class="group relative">
						<div class="rounded-2xl p-6 h-full transition-all duration-300 text-center" style="background: {isDark ? 'rgba(26,26,26,0.6)' : 'rgba(255,255,255,0.7)'}; border: 1px solid {isDark ? 'rgba(42,42,42,0.5)' : 'rgba(229,229,229,0.5)'}; backdrop-filter: blur(8px); box-shadow: {isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.05)'}">
							<div class="w-14 h-14 rounded-xl flex items-center justify-center mb-4 mx-auto transition-transform group-hover:scale-110" style="background: linear-gradient(135deg, {isDark ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.15)'}, {isDark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.08)'}); border: 1px solid {isDark ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.2)'}">
								<i class="fa-solid fa-chart-pie text-2xl" style="color: #6366f1"></i>
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

		<!-- Testimonials Section -->
		<section class="border-t border-sw-border/30 py-16 sm:py-20 overflow-hidden" style="background: {isDark ? '#0a0a0a' : '#faf7f2'}">
			<div class="max-w-6xl mx-auto px-4 sm:px-6">
				<div class="text-center mb-10 sm:mb-12">
					<h2 class="font-display text-2xl sm:text-3xl font-semibold tracking-tight mb-3" style="color: {isDark ? '#ffffff' : '#171717'}">Real people, real discoveries</h2>
					<p style="color: {isDark ? '#a3a3a3' : '#525252'}">Join thousands who've uncovered their spending blind spots</p>
				</div>
			</div>
			
			<!-- Scrolling testimonials row 1 -->
			<div class="relative mb-4">
				<div class="flex gap-4 animate-scroll-left">
					{#each [...testimonials1, ...testimonials1] as t}
						<div class="flex-shrink-0 w-80 rounded-2xl p-5" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}; box-shadow: {isDark ? 'none' : '0 4px 12px rgba(0,0,0,0.04)'}">
							<div class="flex items-center gap-1 mb-3">
								{#each Array(5) as _}
									<i class="fa-solid fa-star text-amber-400 text-xs"></i>
								{/each}
							</div>
							<p class="text-sm leading-relaxed mb-4" style="color: {isDark ? '#a3a3a3' : '#525252'}">
								"{@html t.text}"
							</p>
							<div class="flex items-center gap-3">
								<div class="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold text-white" style="background: {t.gradient}">
									{t.initials}
								</div>
								<div>
									<p class="text-sm font-medium" style="color: {isDark ? '#ffffff' : '#171717'}">{t.name}</p>
									<p class="text-xs" style="color: {isDark ? '#737373' : '#9ca3af'}">{t.result}</p>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
			
			<!-- Scrolling testimonials row 2 (opposite direction) -->
			<div class="relative">
				<div class="flex gap-4 animate-scroll-right">
					{#each [...testimonials2, ...testimonials2] as t}
						<div class="flex-shrink-0 w-80 rounded-2xl p-5" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}; box-shadow: {isDark ? 'none' : '0 4px 12px rgba(0,0,0,0.04)'}">
							<div class="flex items-center gap-1 mb-3">
								{#each Array(5) as _}
									<i class="fa-solid fa-star text-amber-400 text-xs"></i>
								{/each}
							</div>
							<p class="text-sm leading-relaxed mb-4" style="color: {isDark ? '#a3a3a3' : '#525252'}">
								"{@html t.text}"
							</p>
							<div class="flex items-center gap-3">
								<div class="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold text-white" style="background: {t.gradient}">
									{t.initials}
								</div>
								<div>
									<p class="text-sm font-medium" style="color: {isDark ? '#ffffff' : '#171717'}">{t.name}</p>
									<p class="text-xs" style="color: {isDark ? '#737373' : '#9ca3af'}">{t.result}</p>
								</div>
							</div>
						</div>
					{/each}
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
						<div class="rounded-xl bg-sw-accent flex items-center justify-center text-white p-1.5">
							<Logo size="sm" class="text-white" />
						</div>
						<span class="font-display text-lg font-semibold" style="color: {isDark ? '#ffffff' : '#171717'}">SpentWorth</span>
					</div>
					<p class="text-sm mb-4" style="color: {isDark ? '#a3a3a3' : '#737373'}">
						Know where your money goes. Build the life you want.
					</p>
					<div class="flex items-center gap-3">
						<a href="https://twitter.com" target="_blank" rel="noopener" aria-label="Follow us on X (Twitter)" class="w-9 h-9 rounded-lg flex items-center justify-center transition-colors" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; color: {isDark ? '#a3a3a3' : '#737373'}">
							<i class="fa-brands fa-x-twitter"></i>
						</a>
						<a href="https://github.com" target="_blank" rel="noopener" aria-label="View our GitHub repository" class="w-9 h-9 rounded-lg flex items-center justify-center transition-colors" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; color: {isDark ? '#a3a3a3' : '#737373'}">
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
