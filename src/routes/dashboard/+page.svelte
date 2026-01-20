<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import type { DashboardSummary } from '$lib/types';

	let { data } = $props();

	let summary = $state<DashboardSummary | null>(null);
	let loading = $state(true);

	onMount(async () => {
		await loadSummary();
	});

	async function loadSummary() {
		loading = true;
		const res = await fetch('/api/dashboard/summary');
		const json = await res.json();

		if (json.ok) {
			summary = json.data;
		}
		loading = false;
	}

	function formatCurrency(amount: number) {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		}).format(amount);
	}

	function formatPercent(value: number) {
		return new Intl.NumberFormat('en-US', {
			style: 'percent',
			minimumFractionDigits: 1,
			maximumFractionDigits: 1
		}).format(value);
	}

	async function handleLogout() {
		await data.supabase.auth.signOut();
		goto('/');
	}

	// Get max spent for scaling bars
	$effect(() => {
		if (summary) {
			maxSpent = Math.max(...summary.categories.map(c => c.spent));
		}
	});

	let maxSpent = $state(0);
</script>

<div class="min-h-screen">
	<!-- Header -->
	<header class="border-b border-sw-border/50 bg-sw-bg/80 backdrop-blur-sm sticky top-0 z-40">
		<div class="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
			<div class="flex items-center gap-4">
				<a href="/dashboard" class="flex items-center gap-3">
					<div class="w-10 h-10 rounded-xl bg-gradient-to-br from-sw-accent to-emerald-600 flex items-center justify-center text-sw-bg font-bold text-xl">
						$
					</div>
					<span class="font-display text-xl font-semibold">SpentWorth</span>
				</a>
			</div>
			<nav class="flex items-center gap-6">
				<a href="/dashboard" class="text-sw-accent font-medium">Dashboard</a>
				<a href="/imports" class="text-sw-text-dim hover:text-sw-text transition-colors">Imports</a>
				<a href="/settings" class="text-sw-text-dim hover:text-sw-text transition-colors">Settings</a>
				<button onclick={handleLogout} class="text-sw-text-dim hover:text-sw-text transition-colors">
					Logout
				</button>
			</nav>
		</div>
	</header>

	<main class="max-w-6xl mx-auto px-6 py-8">
		{#if loading}
			<div class="flex items-center justify-center py-24">
				<div class="w-8 h-8 rounded-full border-2 border-sw-accent border-t-transparent animate-spin"></div>
			</div>
		{:else if !summary || summary.totalSpent === 0}
			<!-- Empty state -->
			<div class="text-center py-24">
				<div class="w-20 h-20 mx-auto rounded-2xl bg-sw-surface flex items-center justify-center mb-6">
					<svg xmlns="http://www.w3.org/2000/svg" class="w-10 h-10 text-sw-text-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
					</svg>
				</div>
				<h2 class="font-display text-2xl font-bold mb-2">No data yet</h2>
				<p class="text-sw-text-dim mb-6">Import your first bank statement to see your opportunity cost</p>
				<a href="/imports" class="btn btn-primary">Import CSV</a>
			</div>
		{:else}
			<!-- Hero Stats -->
			<div class="grid md:grid-cols-3 gap-6 mb-10">
				<div class="bg-sw-surface/60 rounded-2xl p-6 border border-sw-border/50">
					<p class="text-sm text-sw-text-dim mb-2">Total Spent</p>
					<p class="font-display text-4xl font-bold tracking-tight">{formatCurrency(summary.totalSpent)}</p>
				</div>
				
				<div class="bg-sw-surface/60 rounded-2xl p-6 border border-sw-border/50">
					<p class="text-sm text-sw-text-dim mb-2">Would Be Worth</p>
					<p class="font-display text-4xl font-bold tracking-tight text-sw-accent">{formatCurrency(summary.totalFutureValue)}</p>
				</div>
				
				<div class="bg-gradient-to-br from-sw-accent/20 to-sw-accent/5 rounded-2xl p-6 border border-sw-accent/30">
					<p class="text-sm text-sw-text-dim mb-2">Opportunity Cost</p>
					<p class="font-display text-4xl font-bold tracking-tight text-sw-accent">
						{summary.totalDelta >= 0 ? '+' : ''}{formatCurrency(summary.totalDelta)}
					</p>
					<p class="text-sm text-sw-text-dim mt-1">
						{formatPercent(summary.totalSpent > 0 ? summary.totalDelta / summary.totalSpent : 0)} growth
					</p>
				</div>
			</div>

			<!-- Category Breakdown -->
			<div class="bg-sw-surface/60 rounded-2xl border border-sw-border/50 overflow-hidden">
				<div class="px-6 py-4 border-b border-sw-border/50">
					<h2 class="font-display text-lg font-semibold">Spending by Category</h2>
					<p class="text-sm text-sw-text-dim">What you spent vs. what it would be worth if invested</p>
				</div>
				
				<div class="divide-y divide-sw-border/30">
					{#each summary.categories as cat, i}
						{@const barWidth = maxSpent > 0 ? (cat.spent / maxSpent) * 100 : 0}
						{@const returnPct = cat.spent > 0 ? (cat.delta / cat.spent) : 0}
						
						<div class="px-6 py-4 hover:bg-sw-bg/30 transition-colors">
							<div class="flex items-center justify-between mb-2">
								<span class="font-medium">{cat.category}</span>
								<div class="flex items-center gap-4 text-sm">
									<span class="text-sw-text-dim">{formatCurrency(cat.spent)}</span>
									<span class="text-sw-accent">→</span>
									<span class="font-medium">{formatCurrency(cat.future)}</span>
									<span class="text-sw-accent font-mono text-xs px-2 py-0.5 rounded-full bg-sw-accent/10">
										+{formatCurrency(cat.delta)}
									</span>
								</div>
							</div>
							
							<!-- Progress bar -->
							<div class="h-2 bg-sw-bg rounded-full overflow-hidden">
								<div 
									class="h-full rounded-full transition-all duration-500"
									style="width: {barWidth}%; background: linear-gradient(90deg, #10b981 0%, #059669 100%);"
								></div>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<!-- Info footer -->
			<div class="mt-8 text-center text-sm text-sw-text-dim">
				<p>Calculated using 7% annual return estimate • <a href="/settings" class="text-sw-accent hover:underline">Change settings</a></p>
			</div>
		{/if}
	</main>
</div>
