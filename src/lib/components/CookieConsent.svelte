<script lang="ts">
	import { onMount } from 'svelte';
	
	let showBanner = $state(false);
	let isDark = $state(false);
	
	onMount(() => {
		// Check if user has already made a choice
		const consent = localStorage.getItem('cookie_consent');
		if (!consent) {
			showBanner = true;
		}
		
		// Check theme
		isDark = document.documentElement.classList.contains('dark');
	});
	
	function acceptCookies() {
		localStorage.setItem('cookie_consent', 'granted');
		
		// Update Google consent - gtag is defined globally in app.html
		const w = window as typeof window & { gtag?: (...args: unknown[]) => void };
		if (w.gtag) {
			w.gtag('consent', 'update', {
				'ad_storage': 'granted',
				'ad_user_data': 'granted',
				'ad_personalization': 'granted',
				'analytics_storage': 'granted'
			});
		}
		
		showBanner = false;
	}
	
	function declineCookies() {
		localStorage.setItem('cookie_consent', 'denied');
		// Consent stays denied (already the default)
		showBanner = false;
	}
</script>

{#if showBanner}
	<div 
		class="fixed bottom-0 left-0 right-0 z-[9999] p-4 safe-area-bottom"
		style="background: {isDark ? 'rgba(10,10,10,0.98)' : 'rgba(255,255,255,0.98)'}; border-top: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}; backdrop-filter: blur(8px);"
	>
		<div class="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
			<div class="flex-1">
				<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#525252'}">
					We use cookies to analyze site traffic and improve your experience. 
					<a href="/privacy" class="text-sw-accent hover:underline">Learn more</a>
				</p>
			</div>
			<div class="flex items-center gap-3 flex-shrink-0">
				<button
					onclick={declineCookies}
					class="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
					style="color: {isDark ? '#a3a3a3' : '#737373'}"
				>
					Decline
				</button>
				<button
					onclick={acceptCookies}
					class="px-4 py-2 text-sm font-semibold rounded-lg transition-colors bg-sw-accent text-white hover:bg-sw-accent/90"
				>
					Accept
				</button>
			</div>
		</div>
	</div>
{/if}
