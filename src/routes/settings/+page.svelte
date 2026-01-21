<script lang="ts">
	import { onMount } from 'svelte';
	import Header from '$lib/components/Header.svelte';
	import { initTheme, getTheme } from '$lib/stores/theme';

	let { data } = $props();

	let defaultTicker = $state('SPY');
	let investDelayTradingDays = $state(1);
	let allowFallbackForAllTickers = $state(false);
	let loading = $state(true);
	let saving = $state(false);
	let saved = $state(false);
	let isDark = $state(false);

	onMount(async () => {
		initTheme();
		isDark = getTheme() === 'dark';

		const res = await fetch('/api/settings');
		const json = await res.json();

		if (json.ok) {
			defaultTicker = json.data.defaultTicker;
			investDelayTradingDays = json.data.investDelayTradingDays;
			allowFallbackForAllTickers = json.data.allowFallbackForAllTickers;
		}
		loading = false;
	});

	async function saveSettings() {
		saving = true;
		saved = false;

		await fetch('/api/settings', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				defaultTicker,
				investDelayTradingDays,
				allowFallbackForAllTickers
			})
		});

		saving = false;
		saved = true;
		setTimeout(() => saved = false, 2000);
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
									class="w-5 h-5 rounded border-sw-border text-sw-accent focus:ring-sw-accent"
								/>
								<span style="color: {isDark ? '#ffffff' : '#171717'}">Use fallback calculation when price data unavailable</span>
							</label>
							<p class="text-sm mt-1 ml-8" style="color: {isDark ? '#a3a3a3' : '#737373'}">If enabled, uses 7% annual return when historical prices aren't available</p>
						</div>
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
			</div>
		{/if}
	</main>
</div>
