<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { initTheme, getTheme } from '$lib/stores/theme';
	import Logo from '$lib/components/Logo.svelte';

	interface Props {
		showLogo?: boolean;
		onLogout?: (() => void) | undefined;
		userPlan?: 'free' | 'pro';
	}

	let { showLogo = true, onLogout = undefined, userPlan = 'free' }: Props = $props();

	let mobileMenuOpen = $state(false);
	let isDark = $state(false);
	let plan = $state<'free' | 'pro'>('free');
	
	onMount(async () => {
		initTheme();
		isDark = getTheme() === 'dark';
		
		// Fetch subscription status if not provided
		if (userPlan === 'free') {
			try {
				const res = await fetch('/api/stripe/subscription');
				if (res.ok) {
					const data = await res.json();
					plan = data.plan;
				}
			} catch {
				// Ignore errors, default to free
			}
		} else {
			plan = userPlan;
		}
	});

	interface NavItem {
		href: string;
		label: string;
		highlight?: boolean;
	}

	const navItems: NavItem[] = [
		{ href: '/dashboard', label: 'Dashboard' },
		{ href: '/budgets', label: 'Budgets' },
		{ href: '/insights', label: 'Insights' },
		{ href: '/imports', label: 'Imports' },
		{ href: '/settings', label: 'Settings' }
	];

	function isActive(href: string) {
		return $page.url.pathname === href || $page.url.pathname.startsWith(href + '/');
	}

	function toggleMenu() {
		mobileMenuOpen = !mobileMenuOpen;
	}

	function closeMenu() {
		mobileMenuOpen = false;
	}
</script>

<header class="border-b border-sw-border/30 backdrop-blur-md bg-sw-surface/90 sticky top-0 z-50">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
		{#if showLogo}
			<a href="/dashboard" class="flex items-center gap-2 sm:gap-3">
				<div class="rounded-xl bg-sw-accent flex items-center justify-center text-white p-1.5 sm:p-2 shadow-lg shadow-sw-accent/10">
					<Logo size="md" class="text-white" />
				</div>
				<span class="font-display text-lg sm:text-xl font-semibold">SpentWorth</span>
			</a>
		{:else}
			<div></div>
		{/if}

		<!-- Desktop nav -->
		<nav class="hidden md:flex items-center gap-5">
			{#each navItems as item}
				<a 
					href={item.href} 
					class="{isActive(item.href) ? 'text-sw-accent font-medium' : 'text-sw-text-dim hover:text-sw-text'} transition-colors text-sm"
				>
					{item.label}
				</a>
			{/each}
			{#if plan === 'free'}
				<a 
					href="/pricing" 
					class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-gradient-to-r from-sw-accent to-emerald-500 text-white hover:opacity-90 transition-opacity shadow-sm"
				>
					<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
					</svg>
					Upgrade
				</a>
			{:else}
				<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-sw-accent/10 text-sw-accent">
					<svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					Pro
				</span>
			{/if}
			{#if onLogout}
				<button onclick={onLogout} class="text-sw-text-dim hover:text-sw-text transition-colors text-sm">
					Logout
				</button>
			{/if}
		</nav>

		<!-- Mobile menu button -->
		<button 
			onclick={toggleMenu}
			class="md:hidden p-2 -mr-2 text-sw-text-dim hover:text-sw-text transition-colors"
			aria-label="Toggle menu"
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

	<!-- Mobile menu dropdown -->
	{#if mobileMenuOpen}
		<div class="md:hidden border-t border-sw-border/30 bg-sw-surface/95 backdrop-blur-md">
			<nav class="px-4 py-3 space-y-1">
				{#each navItems as item}
					<a 
						href={item.href} 
						onclick={closeMenu}
						class="block px-3 py-2.5 rounded-lg {isActive(item.href) ? 'bg-sw-accent/10 text-sw-accent font-medium' : 'text-sw-text-dim hover:text-sw-text hover:bg-sw-surface/50'} transition-colors"
					>
						{item.label}
					</a>
				{/each}
				{#if plan === 'free'}
					<a 
						href="/pricing" 
						onclick={closeMenu}
						class="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-gradient-to-r from-sw-accent to-emerald-500 text-white font-medium"
					>
						<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
						</svg>
						Upgrade to Pro
					</a>
				{:else}
					<div class="flex items-center gap-2 px-3 py-2.5 text-sw-accent">
						<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<span class="font-medium">Pro Plan Active</span>
					</div>
				{/if}
				{#if onLogout}
					<button 
						onclick={() => { closeMenu(); onLogout?.(); }}
						class="w-full text-left px-3 py-2.5 rounded-lg text-sw-text-dim hover:text-sw-text hover:bg-sw-surface/50 transition-colors"
					>
						Logout
					</button>
				{/if}
			</nav>
		</div>
	{/if}
</header>

