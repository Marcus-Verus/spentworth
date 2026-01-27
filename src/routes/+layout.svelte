<script lang="ts">
	import '../app.css';
	import { invalidate } from '$app/navigation';
	import { onMount } from 'svelte';
	import CookieConsent from '$lib/components/CookieConsent.svelte';

	let { data, children } = $props();

	onMount(() => {
		const { data: { subscription } } = data.supabase.auth.onAuthStateChange((event, session) => {
			if (session?.expires_at !== data.session?.expires_at) {
				invalidate('supabase:auth');
			}
		});

		return () => subscription.unsubscribe();
	});
</script>

<svelte:head>
	<!-- Default fallback meta tags - individual pages override these -->
	<title>SpentWorth — Spending Opportunity Cost Calculator</title>
	<meta name="description" content="Track spending & see what it could become if invested. Calculate opportunity cost of daily habits. Free, no bank login required." />
	
	<!-- Core meta tags for all pages -->
	<meta name="author" content="SpentWorth" />
	<meta name="theme-color" content="#388E3C" />
	<link rel="apple-touch-icon" href="/logo-512.png" />
	
	<!-- Prevent AI/LLM scraping -->
	<meta name="robots" content="max-image-preview:large" />
</svelte:head>

{@render children()}

<CookieConsent />
