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
				<!-- Left card - Spending breakdown -->
				<div class="absolute left-[5%] top-[20%] animate-float-slow">
					<div class="rounded-2xl p-4 w-48 shadow-xl" style="background: {isDark ? 'rgba(26,26,26,0.9)' : 'rgba(255,255,255,0.95)'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}; backdrop-filter: blur(8px)">
						<p class="text-xs mb-2" style="color: {isDark ? '#a3a3a3' : '#737373'}">This month</p>
						<p class="text-2xl font-semibold mb-3" style="color: {isDark ? '#ffffff' : '#171717'}">$2,847</p>
						<div class="space-y-2">
							<div class="flex justify-between text-xs">
								<span style="color: {isDark ? '#a3a3a3' : '#525252'}">Groceries</span>
								<span style="color: {isDark ? '#ffffff' : '#171717'}">$642</span>
							</div>
							<div class="flex justify-between text-xs">
								<span style="color: {isDark ? '#a3a3a3' : '#525252'}">Dining</span>
								<span style="color: {isDark ? '#ffffff' : '#171717'}">$389</span>
							</div>
							<div class="flex justify-between text-xs">
								<span style="color: {isDark ? '#a3a3a3' : '#525252'}">Transport</span>
								<span style="color: {isDark ? '#ffffff' : '#171717'}">$156</span>
							</div>
						</div>
					</div>
				</div>
				
				<!-- Right card - Growth potential -->
				<div class="absolute right-[5%] top-[30%] animate-float-medium">
					<div class="rounded-2xl p-4 w-52 shadow-xl" style="background: {isDark ? 'rgba(26,26,26,0.9)' : 'rgba(255,255,255,0.95)'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}; backdrop-filter: blur(8px)">
						<p class="text-xs mb-1" style="color: {isDark ? '#a3a3a3' : '#737373'}">If invested instead</p>
						<p class="text-2xl font-semibold text-sw-accent mb-1">+$10,526</p>
						<p class="text-xs" style="color: {isDark ? '#a3a3a3' : '#737373'}">over 5 years · 7% return</p>
						<div class="mt-3 flex items-end gap-1 h-8">
							<div class="w-3 rounded-sm bg-sw-accent/30" style="height: 40%"></div>
							<div class="w-3 rounded-sm bg-sw-accent/40" style="height: 55%"></div>
							<div class="w-3 rounded-sm bg-sw-accent/50" style="height: 45%"></div>
							<div class="w-3 rounded-sm bg-sw-accent/60" style="height: 70%"></div>
							<div class="w-3 rounded-sm bg-sw-accent/70" style="height: 65%"></div>
							<div class="w-3 rounded-sm bg-sw-accent" style="height: 100%"></div>
						</div>
					</div>
				</div>
				
				<!-- Bottom left - Goal progress -->
				<div class="absolute left-[10%] bottom-[15%] animate-float-fast">
					<div class="rounded-xl p-3 w-44 shadow-lg" style="background: {isDark ? 'rgba(26,26,26,0.9)' : 'rgba(255,255,255,0.95)'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}; backdrop-filter: blur(8px)">
						<div class="flex items-center gap-2 mb-2">
							<div class="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center">
								<i class="fa-solid fa-bullseye text-purple-500 text-xs"></i>
							</div>
							<span class="text-xs font-medium" style="color: {isDark ? '#ffffff' : '#171717'}">Coffee budget</span>
						</div>
						<div class="w-full h-1.5 rounded-full" style="background: {isDark ? '#2a2a2a' : '#e5e5e5'}">
							<div class="h-full rounded-full bg-purple-500" style="width: 68%"></div>
						</div>
						<p class="text-xs mt-1" style="color: {isDark ? '#a3a3a3' : '#737373'}">$68 of $100</p>
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

		<!-- What you'll discover -->
		<section class="border-t border-sw-border/30">
			<div class="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
				<div class="text-center mb-10 sm:mb-14">
					<h2 class="font-display text-2xl sm:text-3xl font-semibold tracking-tight mb-3" style="color: {isDark ? '#ffffff' : '#171717'}">Finally see the full picture</h2>
					<p class="max-w-xl mx-auto" style="color: {isDark ? '#a3a3a3' : '#525252'}">Most people have no idea where their money actually goes. SpentWorth changes that.</p>
				</div>
				
				<div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
					<div class="rounded-2xl p-6 transition-transform hover:-translate-y-1" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#d1ccc2'}; box-shadow: {isDark ? 'none' : '0 4px 16px rgba(0,0,0,0.08)'}">
						<div class="w-11 h-11 rounded-xl bg-sw-accent/10 flex items-center justify-center mb-4">
							<i class="fa-solid fa-chart-pie text-sw-accent"></i>
						</div>
						<h3 class="font-display text-lg font-medium mb-2" style="color: {isDark ? '#ffffff' : '#171717'}">Spending breakdown</h3>
						<p class="text-sm leading-relaxed" style="color: {isDark ? '#a3a3a3' : '#525252'}">
							See exactly how much goes to groceries, subscriptions, dining out, and everything else — categorized automatically.
						</p>
					</div>

					<div class="rounded-2xl p-6 transition-transform hover:-translate-y-1" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#d1ccc2'}; box-shadow: {isDark ? 'none' : '0 4px 16px rgba(0,0,0,0.08)'}">
						<div class="w-11 h-11 rounded-xl bg-amber-500/10 flex items-center justify-center mb-4">
							<i class="fa-solid fa-seedling text-amber-600"></i>
						</div>
						<h3 class="font-display text-lg font-medium mb-2" style="color: {isDark ? '#ffffff' : '#171717'}">Growth potential</h3>
						<p class="text-sm leading-relaxed" style="color: {isDark ? '#a3a3a3' : '#525252'}">
							Discover what your everyday purchases could become if invested. Small changes, big results over time.
						</p>
					</div>

					<div class="rounded-2xl p-6 sm:col-span-2 lg:col-span-1 transition-transform hover:-translate-y-1" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#d1ccc2'}; box-shadow: {isDark ? 'none' : '0 4px 16px rgba(0,0,0,0.08)'}">
						<div class="w-11 h-11 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4">
							<i class="fa-solid fa-bullseye text-purple-600"></i>
						</div>
						<h3 class="font-display text-lg font-medium mb-2" style="color: {isDark ? '#ffffff' : '#171717'}">Personal goals</h3>
						<p class="text-sm leading-relaxed" style="color: {isDark ? '#a3a3a3' : '#525252'}">
							Set targets for what matters to you. Track progress without judgment, adjust as life changes.
						</p>
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
							"I had no idea I was spending $400/month on food delivery until SpentWorth showed me. Now I cook more and invest the difference."
						</p>
						<div class="flex items-center gap-3">
							<div class="w-9 h-9 rounded-full bg-sw-accent/20 flex items-center justify-center text-sw-accent font-medium text-sm">M</div>
							<div>
								<p class="text-sm font-medium" style="color: {isDark ? '#ffffff' : '#171717'}">Michael T.</p>
								<p class="text-xs" style="color: {isDark ? '#737373' : '#9ca3af'}">Saves $350/month</p>
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
							"The opportunity cost calculator was eye-opening. Seeing my daily coffee habit as a $15,000 loss made me reconsider my priorities."
						</p>
						<div class="flex items-center gap-3">
							<div class="w-9 h-9 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-500 font-medium text-sm">S</div>
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
							"Love that I don't have to link my bank account. Just export CSV, upload, done. Finally feel in control of my finances."
						</p>
						<div class="flex items-center gap-3">
							<div class="w-9 h-9 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-600 font-medium text-sm">J</div>
							<div>
								<p class="text-sm font-medium" style="color: {isDark ? '#ffffff' : '#171717'}">James L.</p>
								<p class="text-xs" style="color: {isDark ? '#737373' : '#9ca3af'}">Software Engineer</p>
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
							"My partner and I use this together. It's helped us have honest conversations about money without the arguments."
						</p>
						<div class="flex items-center gap-3">
							<div class="w-9 h-9 rounded-full bg-teal-500/20 flex items-center justify-center text-teal-500 font-medium text-sm">A</div>
							<div>
								<p class="text-sm font-medium" style="color: {isDark ? '#ffffff' : '#171717'}">Amanda R.</p>
								<p class="text-xs" style="color: {isDark ? '#737373' : '#9ca3af'}">Marketing Manager</p>
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
							"Subscriptions were killing me. SpentWorth helped me find 8 I'd forgotten about. That's $127/month back in my pocket."
						</p>
						<div class="flex items-center gap-3">
							<div class="w-9 h-9 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-500 font-medium text-sm">D</div>
							<div>
								<p class="text-sm font-medium" style="color: {isDark ? '#ffffff' : '#171717'}">David P.</p>
								<p class="text-xs" style="color: {isDark ? '#737373' : '#9ca3af'}">Cut 8 subscriptions</p>
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
							"So much simpler than other budgeting apps. No complicated categories to set up. It just works and shows you the truth."
						</p>
						<div class="flex items-center gap-3">
							<div class="w-9 h-9 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-500 font-medium text-sm">E</div>
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
						<p class="font-display text-3xl sm:text-4xl font-bold text-sw-accent mb-1">$247</p>
						<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#525252'}">avg. monthly savings</p>
					</div>
					<div>
						<p class="font-display text-3xl sm:text-4xl font-bold mb-1" style="color: {isDark ? '#ffffff' : '#171717'}">2 min</p>
						<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#525252'}">setup time</p>
					</div>
					<div>
						<p class="font-display text-3xl sm:text-4xl font-bold mb-1" style="color: {isDark ? '#ffffff' : '#171717'}">50K+</p>
						<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#525252'}">transactions analyzed</p>
					</div>
					<div>
						<p class="font-display text-3xl sm:text-4xl font-bold mb-1" style="color: {isDark ? '#ffffff' : '#171717'}">100%</p>
						<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#525252'}">private & secure</p>
					</div>
				</div>
			</div>
		</section>

		<!-- How it works -->
		<section class="border-t border-sw-border/30">
			<div class="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
				<div class="text-center mb-10 sm:mb-14">
					<h2 class="font-display text-2xl sm:text-3xl font-semibold tracking-tight mb-3" style="color: {isDark ? '#ffffff' : '#171717'}">Simple by design</h2>
					<p style="color: {isDark ? '#a3a3a3' : '#525252'}">No complicated setup. No account linking required.</p>
				</div>
				
				<div class="flex flex-col sm:flex-row items-stretch justify-center gap-4 sm:gap-0">
					<div class="flex-1 text-center px-4 sm:px-6 py-4">
						<div class="w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-4" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#d1ccc2'}">
							<span class="font-display text-lg font-medium" style="color: {isDark ? '#a3a3a3' : '#525252'}">1</span>
						</div>
						<h3 class="font-display font-medium mb-1.5" style="color: {isDark ? '#ffffff' : '#171717'}">Export from your bank</h3>
						<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#525252'}">Download your statements as CSV. Most banks make this easy.</p>
					</div>
					
					<div class="hidden sm:flex items-center justify-center px-2">
						<i class="fa-solid fa-chevron-right text-sm" style="color: {isDark ? '#525252' : '#a3a3a3'}"></i>
					</div>
					
					<div class="flex-1 text-center px-4 sm:px-6 py-4">
						<div class="w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-4" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#d1ccc2'}">
							<span class="font-display text-lg font-medium" style="color: {isDark ? '#a3a3a3' : '#525252'}">2</span>
						</div>
						<h3 class="font-display font-medium mb-1.5" style="color: {isDark ? '#ffffff' : '#171717'}">Upload to SpentWorth</h3>
						<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#525252'}">We automatically categorize your transactions. No manual tagging.</p>
					</div>
					
					<div class="hidden sm:flex items-center justify-center px-2">
						<i class="fa-solid fa-chevron-right text-sm" style="color: {isDark ? '#525252' : '#a3a3a3'}"></i>
					</div>
					
					<div class="flex-1 text-center px-4 sm:px-6 py-4">
						<div class="w-12 h-12 mx-auto rounded-full bg-sw-accent/20 border border-sw-accent/40 flex items-center justify-center mb-4">
							<span class="font-display text-lg font-medium text-sw-accent">3</span>
						</div>
						<h3 class="font-display font-medium mb-1.5" style="color: {isDark ? '#ffffff' : '#171717'}">See your insights</h3>
						<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#525252'}">Understand your spending patterns and what they mean for your future.</p>
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
						<div class="w-8 h-8 rounded-full bg-sw-accent/20 border-2 flex items-center justify-center text-sw-accent text-xs font-medium" style="border-color: {isDark ? '#0f0f0f' : '#f5f0e8'}">M</div>
						<div class="w-8 h-8 rounded-full bg-purple-500/20 border-2 flex items-center justify-center text-purple-500 text-xs font-medium" style="border-color: {isDark ? '#0f0f0f' : '#f5f0e8'}">S</div>
						<div class="w-8 h-8 rounded-full bg-amber-500/20 border-2 flex items-center justify-center text-amber-600 text-xs font-medium" style="border-color: {isDark ? '#0f0f0f' : '#f5f0e8'}">J</div>
						<div class="w-8 h-8 rounded-full bg-teal-500/20 border-2 flex items-center justify-center text-teal-500 text-xs font-medium" style="border-color: {isDark ? '#0f0f0f' : '#f5f0e8'}">A</div>
						<div class="w-8 h-8 rounded-full bg-rose-500/20 border-2 flex items-center justify-center text-rose-500 text-xs font-medium" style="border-color: {isDark ? '#0f0f0f' : '#f5f0e8'}">+</div>
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
	<footer class="border-t border-sw-border/30 py-8">
		<div class="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm" style="color: {isDark ? '#a3a3a3' : '#525252'}">
			<div class="flex items-center gap-2">
				<div class="w-6 h-6 rounded-lg bg-sw-accent flex items-center justify-center text-white font-bold text-xs">
					$
				</div>
				<span>SpentWorth</span>
			</div>
			<p class="text-xs">Personal finance clarity, made simple</p>
		</div>
	</footer>
</div>
