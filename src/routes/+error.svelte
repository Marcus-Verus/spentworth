<script lang="ts">
	import { onMount } from 'svelte';
	import { initTheme, getTheme } from '$lib/stores/theme';
	import Header from '$lib/components/Header.svelte';

	let { error } = $props();
	
	let isDark = $state(false);
	
	onMount(() => {
		initTheme();
		isDark = getTheme() === 'dark';
	});

	const status = $derived(error?.status || 404);
	const message = $derived(error?.message || 'Page not found');
	
	const is404 = $derived(status === 404);
</script>

<svelte:head>
	<title>{is404 ? '404 - Page Not Found' : 'Error'} | SpentWorth</title>
</svelte:head>

<div class="min-h-screen flex flex-col" style="background: {isDark ? 'var(--sw-bg)' : '#f5f0e8'}">
	<Header />
	
	<main class="flex-1 flex items-center justify-center px-4 py-16 sm:py-24">
		<div class="text-center max-w-md">
			<!-- Large 404 or Error Icon -->
			<div class="mb-6">
				<div class="w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-4" style="background: {isDark ? 'rgba(13,148,136,0.15)' : 'rgba(13,148,136,0.12)'}; border: 2px solid {isDark ? 'rgba(13,148,136,0.3)' : 'rgba(13,148,136,0.2)'}">
					<i class="fa-solid {is404 ? 'fa-compass' : 'fa-triangle-exclamation'} text-4xl text-sw-accent"></i>
				</div>
			</div>
			
			<!-- Status Code -->
			<h1 class="font-display text-6xl sm:text-7xl font-bold mb-4" style="color: {isDark ? '#ffffff' : '#171717'}">
				{status}
			</h1>
			
			<!-- Message -->
			<h2 class="font-display text-2xl sm:text-3xl font-semibold mb-3" style="color: {isDark ? '#ffffff' : '#171717'}">
				{is404 ? 'Page not found' : 'Something went wrong'}
			</h2>
			
			<p class="text-base sm:text-lg mb-8 leading-relaxed" style="color: {isDark ? '#a3a3a3' : '#525252'}">
				{is404 
					? "The page you're looking for doesn't exist or has been moved."
					: message}
			</p>
			
			<!-- Action Buttons -->
			<div class="flex flex-col sm:flex-row gap-3 justify-center">
				<a 
					href="/" 
					class="btn btn-primary inline-flex items-center justify-center gap-2"
				>
					<i class="fa-solid fa-house"></i>
					Go Home
				</a>
				{#if !is404}
					<button 
						onclick={() => window.location.reload()} 
						class="px-6 py-3 rounded-xl font-display font-medium transition-colors inline-flex items-center justify-center gap-2"
						style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}; color: {isDark ? '#ffffff' : '#171717'}"
					>
						<i class="fa-solid fa-arrow-rotate-right"></i>
						Try Again
					</button>
				{/if}
			</div>
			
			<!-- Helpful Links -->
			<div class="mt-12 pt-8 border-t" style="border-color: {isDark ? '#2a2a2a' : '#e5e5e5'}">
				<p class="text-sm mb-4" style="color: {isDark ? '#737373' : '#9ca3af'}">Popular pages:</p>
				<div class="flex flex-wrap gap-3 justify-center">
					<a href="/dashboard" class="text-sm text-sw-accent hover:underline">Dashboard</a>
					<a href="/budgets" class="text-sm text-sw-accent hover:underline">Budgets</a>
					<a href="/insights" class="text-sm text-sw-accent hover:underline">Insights</a>
					<a href="/imports" class="text-sm text-sw-accent hover:underline">Imports</a>
				</div>
			</div>
		</div>
	</main>
</div>
