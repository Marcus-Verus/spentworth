<script lang="ts">
	import { onMount } from 'svelte';
	
	let showBanner = $state(false);
	let showPreferences = $state(false);
	let isDark = $state(false);
	let analyticsEnabled = $state(false);
	
	onMount(() => {
		// Check if user has already made a choice
		const consent = localStorage.getItem('cookie_consent');
		if (!consent) {
			showBanner = true;
		}
		
		// Check theme
		isDark = document.documentElement.classList.contains('dark');
	});
	
	function updateGtagConsent(granted: boolean) {
		const w = window as typeof window & { gtag?: (...args: unknown[]) => void };
		if (w.gtag) {
			w.gtag('consent', 'update', {
				'ad_storage': granted ? 'granted' : 'denied',
				'ad_user_data': granted ? 'granted' : 'denied',
				'ad_personalization': granted ? 'granted' : 'denied',
				'analytics_storage': granted ? 'granted' : 'denied'
			});
		}
	}
	
	function acceptAll() {
		localStorage.setItem('cookie_consent', 'granted');
		updateGtagConsent(true);
		showBanner = false;
		showPreferences = false;
	}
	
	function acceptNecessaryOnly() {
		localStorage.setItem('cookie_consent', 'denied');
		updateGtagConsent(false);
		showBanner = false;
		showPreferences = false;
	}
	
	function savePreferences() {
		localStorage.setItem('cookie_consent', analyticsEnabled ? 'granted' : 'denied');
		updateGtagConsent(analyticsEnabled);
		showBanner = false;
		showPreferences = false;
	}
	
	function openPreferences() {
		showPreferences = true;
	}
	
	function closePreferences() {
		showPreferences = false;
	}
</script>

<!-- Main Cookie Banner -->
{#if showBanner && !showPreferences}
	<div 
		class="fixed bottom-0 left-0 right-0 z-[9999] p-4 sm:p-6 safe-area-bottom"
		style="background: {isDark ? '#0a0a0a' : '#ffffff'}; border-top: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}; box-shadow: 0 -4px 20px rgba(0,0,0,0.1);"
	>
		<div class="max-w-4xl mx-auto">
			<div class="flex items-start gap-4 mb-4">
				<div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style="background: {isDark ? '#1a1a1a' : '#f5f0e8'}">
					<i class="fa-solid fa-cookie-bite text-sw-accent"></i>
				</div>
				<div class="flex-1">
					<h3 class="font-semibold text-base mb-1" style="color: {isDark ? '#ffffff' : '#171717'}">We value your privacy</h3>
					<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#525252'}">
						We use cookies to enhance your browsing experience, analyze site traffic, and understand where our visitors come from. 
						By clicking "Accept All", you consent to our use of cookies. 
						<a href="/privacy#cookies" class="text-sw-accent hover:underline">Cookie Policy</a>
					</p>
				</div>
			</div>
			
			<div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
				<button
					onclick={openPreferences}
					class="px-4 py-2.5 text-sm font-medium rounded-xl transition-colors order-3 sm:order-1"
					style="color: {isDark ? '#a3a3a3' : '#525252'}; background: transparent;"
				>
					Manage Preferences
				</button>
				<button
					onclick={acceptNecessaryOnly}
					class="px-5 py-2.5 text-sm font-medium rounded-xl transition-colors order-2"
					style="background: {isDark ? '#1a1a1a' : '#f5f0e8'}; color: {isDark ? '#ffffff' : '#171717'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}"
				>
					Necessary Only
				</button>
				<button
					onclick={acceptAll}
					class="px-5 py-2.5 text-sm font-semibold rounded-xl transition-colors bg-sw-accent text-white hover:bg-sw-accent/90 order-1 sm:order-3"
				>
					Accept All
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Preferences Modal -->
{#if showPreferences}
	<div class="fixed inset-0 z-[9999] flex items-center justify-center p-4" style="background: rgba(0,0,0,0.5);">
		<div 
			class="w-full max-w-lg rounded-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
			style="background: {isDark ? '#0a0a0a' : '#ffffff'};"
		>
			<!-- Header -->
			<div class="p-5 border-b" style="border-color: {isDark ? '#2a2a2a' : '#e5e5e5'}">
				<div class="flex items-center justify-between">
					<h2 class="font-semibold text-lg" style="color: {isDark ? '#ffffff' : '#171717'}">Cookie Preferences</h2>
					<button onclick={closePreferences} class="p-2 rounded-lg transition-colors" style="color: {isDark ? '#a3a3a3' : '#737373'}" aria-label="Close preferences">
						<i class="fa-solid fa-xmark"></i>
					</button>
				</div>
				<p class="text-sm mt-2" style="color: {isDark ? '#a3a3a3' : '#525252'}">
					Manage your cookie preferences. You can enable or disable different types of cookies below.
				</p>
			</div>
			
			<!-- Cookie Categories -->
			<div class="p-5 space-y-4">
				<!-- Strictly Necessary -->
				<div class="rounded-xl p-4" style="background: {isDark ? '#1a1a1a' : '#f9fafb'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
					<div class="flex items-center justify-between mb-2">
						<div class="flex items-center gap-3">
							<div class="w-8 h-8 rounded-lg flex items-center justify-center" style="background: {isDark ? '#2a2a2a' : '#e5e5e5'}">
								<i class="fa-solid fa-lock text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}"></i>
							</div>
							<span class="font-medium" style="color: {isDark ? '#ffffff' : '#171717'}">Strictly Necessary</span>
						</div>
						<span class="text-xs font-medium px-2 py-1 rounded-full" style="background: {isDark ? '#2a2a2a' : '#e5e5e5'}; color: {isDark ? '#a3a3a3' : '#737373'}">
							Always Active
						</span>
					</div>
					<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#525252'}">
						These cookies are essential for the website to function properly. They enable basic features like secure login, session management, and remembering your preferences. These cookies do not store any personally identifiable information.
					</p>
				</div>
				
				<!-- Analytics -->
				<div class="rounded-xl p-4" style="background: {isDark ? '#1a1a1a' : '#f9fafb'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
					<div class="flex items-center justify-between mb-2">
						<div class="flex items-center gap-3">
							<div class="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center">
								<i class="fa-solid fa-chart-simple text-sm text-white"></i>
							</div>
							<span class="font-medium" style="color: {isDark ? '#ffffff' : '#171717'}">Analytics</span>
						</div>
						<button
							onclick={() => analyticsEnabled = !analyticsEnabled}
							class="relative w-12 h-7 rounded-full transition-all duration-300"
							style="background: {analyticsEnabled ? 'linear-gradient(135deg, #388E3C, #4CAF50)' : (isDark ? '#2a2a2a' : '#d4d4d4')}"
							aria-label="Toggle analytics cookies"
						>
							<span 
								class="absolute top-1 w-5 h-5 rounded-full transition-all duration-300 bg-white shadow-md"
								style="left: {analyticsEnabled ? '1.5rem' : '0.25rem'}"
							></span>
						</button>
					</div>
					<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#525252'}">
						These cookies help us understand how visitors interact with our website by collecting anonymous information about page views, traffic sources, and user behavior. This data helps us improve our services and your experience.
					</p>
					<p class="text-xs mt-2" style="color: {isDark ? '#737373' : '#9ca3af'}">
						Provider: Google Analytics
					</p>
				</div>
			</div>
			
			<!-- Footer -->
			<div class="p-5 border-t flex flex-col sm:flex-row gap-3" style="border-color: {isDark ? '#2a2a2a' : '#e5e5e5'}">
				<button
					onclick={acceptNecessaryOnly}
					class="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl transition-colors"
					style="background: {isDark ? '#1a1a1a' : '#f5f0e8'}; color: {isDark ? '#ffffff' : '#171717'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}"
				>
					Reject All
				</button>
				<button
					onclick={savePreferences}
					class="flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl transition-colors bg-sw-accent text-white hover:bg-sw-accent/90"
				>
					Save Preferences
				</button>
			</div>
			
			<!-- Privacy Link -->
			<div class="px-5 pb-5 text-center">
				<a href="/privacy" class="text-xs text-sw-accent hover:underline">
					Read our full Privacy Policy
				</a>
			</div>
		</div>
	</div>
{/if}
