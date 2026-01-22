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
	<title>SpentWorth — See What Your Spending Could Be Worth</title>
	<meta name="description" content="Track your spending and discover the opportunity cost of your purchases. What if you had invested instead?" />
</svelte:head>

{@render children()}

<CookieConsent />
