<script lang="ts">
	import { onMount } from 'svelte';
	import Header from '$lib/components/Header.svelte';
	import { initTheme, getTheme, setTheme, toggleTheme } from '$lib/stores/theme';
	import type { SubscriptionInfo } from '../api/stripe/subscription/+server';

	let { data } = $props();

	let defaultTicker = $state('SPY');
	let investDelayTradingDays = $state(1);
	let allowFallbackForAllTickers = $state(false);
	let monthlyIncome = $state<number | null>(null);
	let loading = $state(true);
	let saving = $state(false);
	let saved = $state(false);
	let isDark = $state(false);
	
	// Subscription state
	let subscription = $state<SubscriptionInfo | null>(null);
	let loadingPortal = $state(false);
	
	// Account deletion state
	let showDeleteModal = $state(false);
	let deleteConfirmText = $state('');
	let deleting = $state(false);
	let deleteError = $state<string | null>(null);
	
	// Pro tier check based on subscription
	let isPro = $derived(
		subscription?.plan === 'pro' && 
		['active', 'trialing'].includes(subscription?.status || '')
	);

	onMount(async () => {
		initTheme();
		isDark = getTheme() === 'dark';
		
		// Fetch subscription status
		try {
			const subRes = await fetch('/api/stripe/subscription');
			if (subRes.ok) {
				subscription = await subRes.json();
			}
		} catch (err) {
			console.error('Failed to fetch subscription:', err);
		}
		
		// If not Pro and dark mode is on, reset to light
		if (!isPro && isDark) {
			setTheme('light');
			isDark = false;
		}

		const res = await fetch('/api/settings');
		const json = await res.json();

		if (json.ok) {
			defaultTicker = json.data.defaultTicker;
			investDelayTradingDays = json.data.investDelayTradingDays;
			allowFallbackForAllTickers = json.data.allowFallbackForAllTickers;
			monthlyIncome = json.data.monthlyIncome;
		}
		loading = false;
	});
	
	function handleThemeToggle() {
		if (!isPro) return;
		toggleTheme();
		isDark = getTheme() === 'dark';
	}

	async function saveSettings() {
		saving = true;
		saved = false;

		await fetch('/api/settings', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				defaultTicker,
				investDelayTradingDays,
				allowFallbackForAllTickers,
				monthlyIncome
			})
		});

		saving = false;
		saved = true;
		setTimeout(() => saved = false, 2000);
	}

	async function openBillingPortal() {
		loadingPortal = true;
		try {
			const res = await fetch('/api/stripe/portal', { method: 'POST' });
			if (res.ok) {
				const { url } = await res.json();
				window.location.href = url;
			} else {
				console.error('Failed to open billing portal');
			}
		} catch (err) {
			console.error('Portal error:', err);
		}
		loadingPortal = false;
	}

	// Calculate potential savings growth (7% annual return over 10 years)
	function calculateFutureValue(monthlySavings: number): number {
		let total = 0;
		for (let month = 0; month < 120; month++) {
			total = (total + monthlySavings) * Math.pow(1.07, 1/12);
		}
		return Math.round(total);
	}

	function formatDate(dateStr: string | null): string {
		if (!dateStr) return '';
		return new Date(dateStr).toLocaleDateString('en-US', {
			month: 'long',
			day: 'numeric',
			year: 'numeric'
		});
	}

	function getStatusBadge(status: string) {
		switch (status) {
			case 'active':
				return { text: 'Active', class: 'bg-green-500/20 text-green-600 border-green-500/30' };
			case 'trialing':
				return { text: 'Trial', class: 'bg-blue-500/20 text-blue-600 border-blue-500/30' };
			case 'past_due':
				return { text: 'Past Due', class: 'bg-red-500/20 text-red-600 border-red-500/30' };
			case 'canceled':
				return { text: 'Canceled', class: 'bg-gray-500/20 text-gray-600 border-gray-500/30' };
			default:
				return { text: 'Free', class: 'bg-gray-500/20 text-gray-600 border-gray-500/30' };
		}
	}

	async function deleteAccount() {
		if (deleteConfirmText !== 'DELETE') return;
		
		deleting = true;
		deleteError = null;

		try {
			const res = await fetch('/api/account/delete', { method: 'DELETE' });
			
			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.message || 'Failed to delete account');
			}

			// Clear local storage and redirect to home
			localStorage.clear();
			window.location.href = '/?deleted=true';
		} catch (err) {
			deleteError = err instanceof Error ? err.message : 'Something went wrong';
			deleting = false;
		}
	}
</script>

<div class="min-h-screen">
	<Header />

	<main class="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
		<h1 class="font-display text-2xl sm:text-3xl font-bold mb-6 sm:mb-8" style="color: {isDark ? '#ffffff' : '#171717'}">Settings</h1>

		{#if loading}
			<div class="flex items-center justify-center py-16">
				<div class="w-8 h-8 rounded-full border-2 border-sw-accent border-t-transparent animate-spin"></div>
			</div>
		{:else}
			<div class="space-y-8">
				<!-- Subscription Status -->
				<div class="rounded-2xl p-6" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}; box-shadow: {isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.06)'}">
					<div class="flex items-center justify-between mb-4">
						<h2 class="font-display text-lg font-semibold" style="color: {isDark ? '#ffffff' : '#171717'}">
							<i class="fa-solid fa-credit-card text-sw-accent mr-2"></i>Subscription
						</h2>
						{#if subscription}
							{@const badge = getStatusBadge(subscription.status)}
							<span class="px-2.5 py-1 text-xs font-semibold rounded-full border {badge.class}">
								{badge.text}
							</span>
						{/if}
					</div>
					
					{#if subscription && isPro}
						<div class="space-y-4">
							<div class="flex items-center justify-between">
								<div>
									<p class="font-semibold" style="color: {isDark ? '#ffffff' : '#171717'}">
										SpentWorth Pro
										{#if subscription.interval}
											<span class="text-sm font-normal" style="color: {isDark ? '#a3a3a3' : '#737373'}">
												({subscription.interval === 'yearly' ? 'Annual' : 'Monthly'})
											</span>
										{/if}
									</p>
									{#if subscription.status === 'trialing' && subscription.trialEnd}
										<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">
											Trial ends {formatDate(subscription.trialEnd)}
										</p>
									{:else if subscription.currentPeriodEnd}
										<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">
											{subscription.cancelAtPeriodEnd ? 'Cancels' : 'Renews'} {formatDate(subscription.currentPeriodEnd)}
										</p>
									{/if}
								</div>
								<button
									onclick={openBillingPortal}
									disabled={loadingPortal}
									class="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
									style="background: {isDark ? '#2a2a2a' : '#f5f0e8'}; color: {isDark ? '#ffffff' : '#171717'}"
								>
									{#if loadingPortal}
										<i class="fa-solid fa-spinner fa-spin mr-1"></i>
									{/if}
									Manage Billing
								</button>
							</div>
							
							{#if subscription.cancelAtPeriodEnd}
								<div class="rounded-xl p-4" style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2)">
									<p class="text-sm" style="color: {isDark ? '#fca5a5' : '#dc2626'}">
										<i class="fa-solid fa-exclamation-triangle mr-2"></i>
										Your subscription will end on {formatDate(subscription.currentPeriodEnd)}. 
										<button onclick={openBillingPortal} class="underline font-medium">Reactivate</button>
									</p>
								</div>
							{/if}
						</div>
					{:else}
						<div class="space-y-4">
							<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">
								You're on the free plan. Upgrade to Pro for unlimited imports, advanced insights, and more.
							</p>
							<div class="flex items-center gap-3">
								<a 
									href="/pricing" 
									class="px-4 py-2 rounded-lg text-sm font-semibold transition-colors bg-sw-accent text-white hover:bg-sw-accent/90"
								>
									<i class="fa-solid fa-crown mr-1.5"></i>
									Upgrade to Pro
								</a>
								{#if subscription?.hasStripeCustomer}
									<button
										onclick={openBillingPortal}
										disabled={loadingPortal}
										class="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
										style="background: {isDark ? '#2a2a2a' : '#f5f0e8'}; color: {isDark ? '#ffffff' : '#171717'}"
									>
										View Billing History
									</button>
								{/if}
							</div>
						</div>
					{/if}
				</div>

				<!-- Income Settings -->
				<div class="rounded-2xl p-6" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}; box-shadow: {isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.06)'}">
					<h2 class="font-display text-lg font-semibold mb-4" style="color: {isDark ? '#ffffff' : '#171717'}">
						<i class="fa-solid fa-wallet text-sw-accent mr-2"></i>Monthly Income
					</h2>
					
					<div class="space-y-4">
						<div>
							<label for="income" class="block text-sm font-medium mb-2" style="color: {isDark ? '#ffffff' : '#171717'}">Your monthly take-home pay</label>
							<div class="flex items-center gap-2 max-w-xs">
								<span class="text-lg" style="color: {isDark ? '#a3a3a3' : '#737373'}">$</span>
								<input
									id="income"
									type="number"
									bind:value={monthlyIncome}
									placeholder="5000"
									class="flex-1 px-3 py-2 rounded-lg text-sm"
									style="background: {isDark ? '#0a0a0a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#d4cfc5'}; color: {isDark ? '#ffffff' : '#171717'}"
								/>
							</div>
							<p class="text-sm mt-2" style="color: {isDark ? '#a3a3a3' : '#737373'}">
								Optional. Used to calculate your savings rate and show what your savings could grow into.
							</p>
						</div>

						{#if monthlyIncome && monthlyIncome > 0}
							<div class="rounded-xl p-4" style="background: rgba(13,148,136,0.1); border: 1px solid rgba(13,148,136,0.2)">
								<p class="text-sm" style="color: {isDark ? '#ffffff' : '#171717'}">
									<i class="fa-solid fa-chart-line text-sw-accent mr-2"></i>
									If you save <span class="font-semibold">20%</span> of your income (${Math.round(monthlyIncome * 0.2).toLocaleString()}/month), 
									that could grow to <span class="font-semibold text-sw-accent">${calculateFutureValue(monthlyIncome * 0.2).toLocaleString()}</span> in 10 years.
								</p>
							</div>
						{/if}
					</div>
				</div>

				<!-- Investment Settings -->
				<div class="rounded-2xl p-6" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}; box-shadow: {isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.06)'}">
					<h2 class="font-display text-lg font-semibold mb-4" style="color: {isDark ? '#ffffff' : '#171717'}">Investment Settings</h2>
					
					<div class="space-y-6">
						<div>
							<label for="ticker" class="block text-sm font-medium mb-2" style="color: {isDark ? '#ffffff' : '#171717'}">Default Ticker</label>
							<select
								id="ticker"
								bind:value={defaultTicker}
								class="max-w-xs px-3 py-2 rounded-lg text-sm w-full"
								style="background: {isDark ? '#0a0a0a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#d4cfc5'}; color: {isDark ? '#ffffff' : '#171717'}"
							>
								<option value="SPY">SPY (S&P 500)</option>
								<option value="VTI">VTI (Total Market)</option>
								<option value="VOO">VOO (S&P 500)</option>
								<option value="QQQ">QQQ (Nasdaq 100)</option>
							</select>
							<p class="text-sm mt-1" style="color: {isDark ? '#a3a3a3' : '#737373'}">The index fund used to calculate opportunity cost</p>
						</div>

						<div>
							<label for="delay" class="block text-sm font-medium mb-2" style="color: {isDark ? '#ffffff' : '#171717'}">Investment Delay (Trading Days)</label>
							<select
								id="delay"
								bind:value={investDelayTradingDays}
								class="max-w-xs px-3 py-2 rounded-lg text-sm w-full"
								style="background: {isDark ? '#0a0a0a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#d4cfc5'}; color: {isDark ? '#ffffff' : '#171717'}"
							>
								<option value={0}>Same day (0 days)</option>
								<option value={1}>Next trading day (1 day)</option>
								<option value={3}>3 trading days</option>
								<option value={7}>7 trading days</option>
							</select>
							<p class="text-sm mt-1" style="color: {isDark ? '#a3a3a3' : '#737373'}">Simulates when you'd realistically invest after a purchase</p>
						</div>

						<div>
							<label class="flex items-center gap-3 cursor-pointer">
								<input
									type="checkbox"
									bind:checked={allowFallbackForAllTickers}
									class="w-5 h-5 rounded focus:ring-sw-accent focus:ring-2 accent-sw-accent"
									style="background: {isDark ? '#0a0a0a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#d4cfc5'}"
								/>
								<span style="color: {isDark ? '#ffffff' : '#171717'}">Use fallback calculation when price data unavailable</span>
							</label>
							<p class="text-sm mt-1 ml-8" style="color: {isDark ? '#a3a3a3' : '#737373'}">If enabled, uses 7% annual return when historical prices aren't available</p>
						</div>
					</div>
				</div>

				<!-- Appearance Settings (Pro Feature) -->
				<div class="rounded-2xl p-6 relative overflow-hidden" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}; box-shadow: {isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.06)'}">
					<div class="flex items-center justify-between mb-4">
						<h2 class="font-display text-lg font-semibold" style="color: {isDark ? '#ffffff' : '#171717'}">
							<i class="fa-solid fa-palette text-sw-accent mr-2"></i>Appearance
						</h2>
						{#if !isPro}
							<span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-600 border border-amber-500/30">
								<i class="fa-solid fa-crown mr-1"></i>Pro
							</span>
						{/if}
					</div>
					
					<div class="space-y-4">
						<div class="flex items-center justify-between">
							<div>
								<p class="font-medium mb-1" style="color: {isDark ? '#ffffff' : '#171717'}">Dark Mode</p>
								<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">
									{isPro ? 'Switch between light and dark themes' : 'Upgrade to Pro to unlock dark mode'}
								</p>
							</div>
							<button
								onclick={handleThemeToggle}
								disabled={!isPro}
								class="relative w-14 h-8 rounded-full transition-all duration-300 {isPro ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}"
								style="background: {isDark ? 'linear-gradient(135deg, #0d9488, #14b8a6)' : (isDark ? '#2a2a2a' : '#e5e5e5')}"
							>
								<span 
									class="absolute top-1 w-6 h-6 rounded-full transition-all duration-300 flex items-center justify-center shadow-md"
									style="left: {isDark ? '1.75rem' : '0.25rem'}; background: {isDark ? '#0a0a0a' : '#ffffff'}"
								>
									{#if isDark}
										<i class="fa-solid fa-moon text-xs text-teal-400"></i>
									{:else}
										<i class="fa-solid fa-sun text-xs" style="color: {isDark ? '#a3a3a3' : '#f59e0b'}"></i>
									{/if}
								</span>
							</button>
						</div>
						
						{#if !isPro}
							<a 
								href="/pricing" 
								class="block mt-4 p-4 rounded-xl text-center transition-all hover:scale-[1.01]"
								style="background: linear-gradient(135deg, rgba(245,158,11,0.1), rgba(249,115,22,0.1)); border: 1px solid rgba(245,158,11,0.2)"
							>
								<p class="text-sm font-medium" style="color: {isDark ? '#fbbf24' : '#d97706'}">
									<i class="fa-solid fa-arrow-up-right-from-square mr-1.5"></i>
									Upgrade to Pro for dark mode and more
								</p>
							</a>
						{/if}
					</div>
				</div>

				<!-- Method explanation -->
				<div class="rounded-2xl p-6" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}; box-shadow: {isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.06)'}">
					<h2 class="font-display text-lg font-semibold mb-4" style="color: {isDark ? '#ffffff' : '#171717'}">How We Calculate</h2>
					<div class="space-y-4 text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">
						<p>
							<strong style="color: {isDark ? '#ffffff' : '#171717'}">Adjusted Close Prices:</strong> We use adjusted close prices which account for dividends and stock splits, giving you an accurate total return calculation.
						</p>
						<p>
							<strong style="color: {isDark ? '#ffffff' : '#171717'}">Investment Delay:</strong> To simulate realistic investing, we assume you'd invest on the next trading day after a purchase (configurable above).
						</p>
						<p>
							<strong style="color: {isDark ? '#ffffff' : '#171717'}">Excluded by Default:</strong> Transfers, credit card payments, ATM withdrawals, and refunds are excluded to avoid double-counting your spending.
						</p>
					</div>
				</div>

				<div class="flex items-center gap-4">
					<button
						onclick={saveSettings}
						disabled={saving}
						class="btn btn-primary"
					>
						{saving ? 'Saving...' : 'Save Settings'}
					</button>
					{#if saved}
						<span class="text-sw-accent text-sm animate-fade-in">Settings saved!</span>
					{/if}
				</div>

				<!-- Danger Zone -->
				<div class="rounded-2xl p-6 mt-8" style="background: {isDark ? 'rgba(239,68,68,0.05)' : 'rgba(239,68,68,0.03)'}; border: 1px solid rgba(239,68,68,0.2)">
					<h2 class="font-display text-lg font-semibold mb-4 text-red-600">
						<i class="fa-solid fa-triangle-exclamation mr-2"></i>Danger Zone
					</h2>
					
					<div class="space-y-4">
						<div>
							<p class="font-medium mb-1" style="color: {isDark ? '#ffffff' : '#171717'}">Delete Account</p>
							<p class="text-sm mb-4" style="color: {isDark ? '#a3a3a3' : '#737373'}">
								Permanently delete your account and all associated data. This action cannot be undone.
								{#if isPro}
									Your Pro subscription will also be canceled.
								{/if}
							</p>
							<button
								onclick={() => showDeleteModal = true}
								class="px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-red-600 hover:bg-red-700 text-white"
							>
								<i class="fa-solid fa-trash mr-1.5"></i>
								Delete My Account
							</button>
						</div>
					</div>
				</div>
			</div>
		{/if}
	</main>

	<!-- Delete Account Modal -->
	{#if showDeleteModal}
		<div class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(0,0,0,0.5)">
			<div 
				class="w-full max-w-md rounded-2xl p-6"
				style="background: {isDark ? '#1a1a1a' : '#ffffff'}"
			>
				<div class="flex items-center gap-3 mb-4">
					<div class="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
						<i class="fa-solid fa-triangle-exclamation text-red-600"></i>
					</div>
					<h3 class="font-display text-xl font-semibold" style="color: {isDark ? '#ffffff' : '#171717'}">
						Delete Account
					</h3>
				</div>

				<div class="space-y-4">
					<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">
						This will permanently delete:
					</p>
					<ul class="text-sm space-y-1" style="color: {isDark ? '#a3a3a3' : '#737373'}">
						<li><i class="fa-solid fa-xmark text-red-500 mr-2"></i>All your transactions and imports</li>
						<li><i class="fa-solid fa-xmark text-red-500 mr-2"></i>Your budgets, goals, and rules</li>
						<li><i class="fa-solid fa-xmark text-red-500 mr-2"></i>Your account and all settings</li>
						{#if isPro}
							<li><i class="fa-solid fa-xmark text-red-500 mr-2"></i>Your Pro subscription (will be canceled)</li>
						{/if}
					</ul>

					<div class="rounded-xl p-4" style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2)">
						<p class="text-sm font-medium text-red-600 mb-2">
							This action cannot be undone.
						</p>
						<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">
							Type <span class="font-mono font-bold text-red-600">DELETE</span> to confirm:
						</p>
						<input
							type="text"
							bind:value={deleteConfirmText}
							placeholder="DELETE"
							class="mt-2 w-full px-3 py-2 rounded-lg text-sm font-mono"
							style="background: {isDark ? '#0a0a0a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#d4cfc5'}; color: {isDark ? '#ffffff' : '#171717'}"
						/>
					</div>

					{#if deleteError}
						<p class="text-sm text-red-500">{deleteError}</p>
					{/if}

					<div class="flex gap-3 pt-2">
						<button
							onclick={() => { showDeleteModal = false; deleteConfirmText = ''; deleteError = null; }}
							disabled={deleting}
							class="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
							style="background: {isDark ? '#2a2a2a' : '#f5f0e8'}; color: {isDark ? '#ffffff' : '#171717'}"
						>
							Cancel
						</button>
						<button
							onclick={deleteAccount}
							disabled={deleteConfirmText !== 'DELETE' || deleting}
							class="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-red-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-700"
						>
							{#if deleting}
								<i class="fa-solid fa-spinner fa-spin mr-1"></i>
								Deleting...
							{:else}
								Delete Forever
							{/if}
						</button>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
