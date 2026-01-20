<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import type { DashboardSummary } from '$lib/types';

	let { data } = $props();

	let summary = $state<DashboardSummary | null>(null);
	let loading = $state(true);
	let recalculating = $state(false);
	let recalcMessage = $state<string | null>(null);
	let merchantView = $state<'frequency' | 'spend'>('frequency');

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

	async function recalculateWithRealPrices() {
		recalculating = true;
		recalcMessage = null;
		
		try {
			const res = await fetch('/api/dashboard/recalculate', { method: 'POST' });
			const json = await res.json();
			
			if (json.ok) {
				recalcMessage = json.data.message;
				await loadSummary();
			} else {
				recalcMessage = json.error || 'Recalculation failed';
			}
		} catch (e) {
			recalcMessage = 'Recalculation failed - please try again';
		}
		
		recalculating = false;
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

	function formatDate(dateStr: string) {
		return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
			month: 'short',
			year: 'numeric'
		});
	}

	function formatShortDate(dateStr: string) {
		return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric'
		});
	}

	function formatMonth(monthStr: string) {
		const [year, month] = monthStr.split('-');
		return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', {
			month: 'short',
			year: '2-digit'
		});
	}

	function getDateRangeText() {
		if (!summary?.dateMin || !summary?.dateMax) return '';
		const minDate = new Date(summary.dateMin + 'T00:00:00');
		const maxDate = new Date(summary.dateMax + 'T00:00:00');
		const months = Math.round((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
		
		if (months <= 1) return '~1 month';
		if (months < 12) return `${months} months`;
		const years = Math.round(months / 12 * 10) / 10;
		return `${years} year${years !== 1 ? 's' : ''}`;
	}

	async function handleLogout() {
		await data.supabase.auth.signOut();
		goto('/');
	}

	// Donut chart calculations
	const COLORS = [
		'#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#ef4444',
		'#ec4899', '#6366f1', '#14b8a6', '#f97316', '#84cc16'
	];

	function getDonutPath(startAngle: number, endAngle: number, radius: number = 80, innerRadius: number = 50) {
		const startRad = (startAngle - 90) * Math.PI / 180;
		const endRad = (endAngle - 90) * Math.PI / 180;
		
		const x1 = 100 + radius * Math.cos(startRad);
		const y1 = 100 + radius * Math.sin(startRad);
		const x2 = 100 + radius * Math.cos(endRad);
		const y2 = 100 + radius * Math.sin(endRad);
		const x3 = 100 + innerRadius * Math.cos(endRad);
		const y3 = 100 + innerRadius * Math.sin(endRad);
		const x4 = 100 + innerRadius * Math.cos(startRad);
		const y4 = 100 + innerRadius * Math.sin(startRad);
		
		const largeArc = endAngle - startAngle > 180 ? 1 : 0;
		
		return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4} Z`;
	}

	// Combine small categories into "Other"
	function getDisplayCategories() {
		if (!summary) return [];
		const threshold = summary.totalSpent * 0.03; // 3% threshold
		const main: typeof summary.categories = [];
		let otherSpent = 0;
		let otherFuture = 0;
		
		for (const cat of summary.categories) {
			if (cat.spent >= threshold && main.length < 7) {
				main.push(cat);
			} else {
				otherSpent += cat.spent;
				otherFuture += cat.future;
			}
		}
		
		if (otherSpent > 0) {
			main.push({
				category: 'Other',
				spent: Math.round(otherSpent * 100) / 100,
				future: Math.round(otherFuture * 100) / 100,
				delta: Math.round((otherFuture - otherSpent) * 100) / 100
			});
		}
		
		return main;
	}

	$effect(() => {
		if (summary) {
			maxMonthlySpend = Math.max(...summary.monthly.map(m => m.spent), 1);
			displayCategories = getDisplayCategories();
		}
	});

	let maxMonthlySpend = $state(1);
	let displayCategories = $state<typeof summary.categories>([]);
</script>

<div class="min-h-screen">
	<!-- Header -->
	<header class="border-b border-sw-border/50 bg-sw-bg/80 backdrop-blur-sm sticky top-0 z-40">
		<div class="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
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

	<main class="max-w-7xl mx-auto px-6 py-8">
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
			<!-- Date Range Header -->
			{#if summary.dateMin && summary.dateMax}
				<div class="mb-6 text-sm text-sw-text-dim">
					Tracking spending from <span class="text-sw-text font-medium">{formatDate(summary.dateMin)}</span> to <span class="text-sw-text font-medium">{formatDate(summary.dateMax)}</span>
					<span class="text-sw-accent">({getDateRangeText()})</span>
				</div>
			{/if}

			<!-- Hero Stats -->
			<div class="grid md:grid-cols-3 gap-6 mb-8">
				<div class="bg-sw-surface/60 rounded-2xl p-6 border border-sw-border/50">
					<p class="text-sm text-sw-text-dim mb-2">Total Spent</p>
					<p class="font-display text-4xl font-bold tracking-tight">{formatCurrency(summary.totalSpent)}</p>
					<p class="text-xs text-sw-text-dim mt-2">{summary.transactionCount} transactions • avg {formatCurrency(summary.avgTransaction)}</p>
				</div>
				
				<div class="bg-sw-surface/60 rounded-2xl p-6 border border-sw-border/50">
					<p class="text-sm text-sw-text-dim mb-2">Would Be Worth</p>
					<p class="font-display text-4xl font-bold tracking-tight text-sw-accent">{formatCurrency(summary.totalFutureValue)}</p>
					<p class="text-xs text-sw-text-dim mt-2">If invested in {summary.ticker}</p>
				</div>
				
				<div class="bg-gradient-to-br from-sw-accent/20 to-sw-accent/5 rounded-2xl p-6 border border-sw-accent/30">
					<p class="text-sm text-sw-text-dim mb-2">Opportunity Cost</p>
					<p class="font-display text-4xl font-bold tracking-tight text-sw-accent">
						{summary.totalDelta >= 0 ? '+' : ''}{formatCurrency(summary.totalDelta)}
					</p>
					<p class="text-sm text-sw-text-dim mt-1">
						{formatPercent(summary.totalSpent > 0 ? summary.totalDelta / summary.totalSpent : 0)} growth over {getDateRangeText()}
					</p>
				</div>
			</div>

			<!-- Quick Stats Row -->
			{#if summary.biggestPurchase}
				<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
					<div class="bg-sw-surface/40 rounded-xl p-4 border border-sw-border/30">
						<p class="text-xs text-sw-text-dim mb-1">Biggest Purchase</p>
						<p class="font-mono text-lg">{formatCurrency(summary.biggestPurchase.amount)}</p>
						<p class="text-xs text-sw-text-dim truncate">{summary.biggestPurchase.merchant}</p>
					</div>
					<div class="bg-sw-surface/40 rounded-xl p-4 border border-sw-border/30">
						<p class="text-xs text-sw-text-dim mb-1">Avg Transaction</p>
						<p class="font-mono text-lg">{formatCurrency(summary.avgTransaction)}</p>
						<p class="text-xs text-sw-text-dim">{summary.transactionCount} total</p>
					</div>
					<div class="bg-sw-surface/40 rounded-xl p-4 border border-sw-border/30">
						<p class="text-xs text-sw-text-dim mb-1">Monthly Avg</p>
						<p class="font-mono text-lg">{formatCurrency(summary.totalSpent / Math.max(summary.monthly.length, 1))}</p>
						<p class="text-xs text-sw-text-dim">{summary.monthly.length} months</p>
					</div>
					<div class="bg-sw-surface/40 rounded-xl p-4 border border-sw-border/30">
						<p class="text-xs text-sw-text-dim mb-1">Unique Merchants</p>
						<p class="font-mono text-lg">{summary.topMerchants.length}+</p>
						<p class="text-xs text-sw-text-dim">places you shop</p>
					</div>
				</div>
			{/if}

			<!-- Calculation Method Banner -->
			{#if summary.usingFallback > 0}
				<div class="mb-8 rounded-xl border bg-amber-500/5 border-amber-500/30 p-4 flex items-center justify-between">
					<div class="flex items-center gap-3">
						<div class="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
							<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
						</div>
						<div>
							<p class="text-sm font-medium">
								{summary.usingRealPrices > 0 ? 'Mixed calculation' : 'Using estimates'}
							</p>
							<p class="text-xs text-sw-text-dim">
								{summary.usingRealPrices} with real {summary.ticker} prices, {summary.usingFallback} with 7% estimate
							</p>
						</div>
					</div>
					
					<button
						onclick={recalculateWithRealPrices}
						disabled={recalculating}
						class="btn btn-secondary text-sm flex items-center gap-2"
					>
						{#if recalculating}
							<div class="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin"></div>
							Fetching...
						{:else}
							Refresh Prices
						{/if}
					</button>
				</div>
			{/if}
			
			{#if recalcMessage}
				<div class="mb-6 rounded-lg bg-sw-surface/60 border border-sw-border/50 p-4 text-sm">
					{recalcMessage}
				</div>
			{/if}

			<!-- Charts Row -->
			<div class="grid lg:grid-cols-2 gap-6 mb-8">
				<!-- Donut Chart -->
				<div class="bg-sw-surface/60 rounded-2xl border border-sw-border/50 p-6">
					<h3 class="font-display font-semibold mb-4">Spending by Category</h3>
					<div class="flex items-center gap-6">
						<div class="relative flex-shrink-0">
							<svg viewBox="0 0 200 200" class="w-44 h-44">
								{#each displayCategories as cat, i}
									{@const total = summary.totalSpent}
									{@const startAngle = displayCategories.slice(0, i).reduce((acc, c) => acc + (c.spent / total) * 360, 0)}
									{@const angle = (cat.spent / total) * 360}
									{#if angle > 0.5}
										<path
											d={getDonutPath(startAngle, startAngle + angle - 0.5)}
											fill={COLORS[i % COLORS.length]}
											class="hover:opacity-80 transition-opacity cursor-pointer"
										>
											<title>{cat.category}: {formatCurrency(cat.spent)}</title>
										</path>
									{/if}
								{/each}
								<!-- Center text -->
								<text x="100" y="95" text-anchor="middle" class="fill-sw-text-dim text-xs">Total</text>
								<text x="100" y="115" text-anchor="middle" class="fill-sw-text font-display font-bold text-base">{formatCurrency(summary.totalSpent)}</text>
							</svg>
						</div>
						<div class="flex-1 space-y-2">
							{#each displayCategories as cat, i}
								<div class="flex items-center gap-2 text-sm">
									<div class="w-3 h-3 rounded-sm flex-shrink-0" style="background: {COLORS[i % COLORS.length]}"></div>
									<span class="flex-1 truncate">{cat.category}</span>
									<span class="font-mono text-sw-text-dim text-xs">{formatCurrency(cat.spent)}</span>
								</div>
							{/each}
						</div>
					</div>
				</div>

				<!-- Monthly Spending Chart -->
				<div class="bg-sw-surface/60 rounded-2xl border border-sw-border/50 p-6">
					<h3 class="font-display font-semibold mb-4">Monthly Spending</h3>
					{#if summary.monthly.length > 0}
						<div class="h-44 flex items-end gap-1">
							{#each summary.monthly as month}
								{@const height = (month.spent / maxMonthlySpend) * 100}
								<div class="flex-1 flex flex-col items-center gap-1 min-w-0">
									<div class="w-full flex flex-col items-center justify-end" style="height: 130px;">
										<div 
											class="w-full bg-gradient-to-t from-sw-accent to-sw-accent/60 rounded-t transition-all hover:from-sw-accent/80 cursor-pointer relative group"
											style="height: {Math.max(height, 4)}%;"
										>
											<div class="absolute -top-16 left-1/2 -translate-x-1/2 bg-sw-bg border border-sw-border rounded px-2 py-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
												<p class="font-medium">{formatCurrency(month.spent)}</p>
												<p class="text-sw-accent text-[10px]">→ {formatCurrency(month.future)} (+{formatCurrency(month.delta)})</p>
											</div>
										</div>
									</div>
									<span class="text-[10px] text-sw-text-dim truncate w-full text-center">{formatMonth(month.month)}</span>
								</div>
							{/each}
						</div>
					{:else}
						<p class="text-sw-text-dim text-sm">Not enough data</p>
					{/if}
				</div>
			</div>

			<!-- Merchant Frequency -->
			<div class="bg-sw-surface/60 rounded-2xl border border-sw-border/50 overflow-hidden mb-8">
				<div class="px-6 py-4 border-b border-sw-border/50 flex items-center justify-between">
					<div>
						<h3 class="font-display font-semibold">Where You Shop</h3>
						<p class="text-sm text-sw-text-dim">Your most visited merchants</p>
					</div>
					<div class="flex rounded-lg bg-sw-bg p-1">
						<button 
							onclick={() => merchantView = 'frequency'}
							class="px-3 py-1 text-xs rounded-md transition-colors {merchantView === 'frequency' ? 'bg-sw-surface text-sw-text' : 'text-sw-text-dim hover:text-sw-text'}"
						>
							Most Visits
						</button>
						<button 
							onclick={() => merchantView = 'spend'}
							class="px-3 py-1 text-xs rounded-md transition-colors {merchantView === 'spend' ? 'bg-sw-surface text-sw-text' : 'text-sw-text-dim hover:text-sw-text'}"
						>
							Most Spent
						</button>
					</div>
				</div>
				<div class="divide-y divide-sw-border/30">
					{#each (merchantView === 'frequency' ? summary.topMerchants : summary.topMerchantsBySpend).slice(0, 10) as merchant, i}
						{@const maxCount = summary.topMerchants[0]?.count || 1}
						{@const maxSpend = summary.topMerchantsBySpend[0]?.totalSpent || 1}
						{@const barWidth = merchantView === 'frequency' 
							? (merchant.count / maxCount) * 100 
							: (merchant.totalSpent / maxSpend) * 100}
						
						<div class="px-6 py-3 hover:bg-sw-bg/30 transition-colors">
							<div class="flex items-center gap-4">
								<div class="w-8 h-8 rounded-lg bg-sw-accent/10 flex items-center justify-center text-sw-accent font-mono text-sm flex-shrink-0">
									{i + 1}
								</div>
								<div class="flex-1 min-w-0">
									<div class="flex items-center justify-between mb-1">
										<p class="font-medium truncate">{merchant.merchant}</p>
										<div class="flex items-center gap-4 text-sm flex-shrink-0">
											<span class="text-sw-text-dim">{merchant.count}×</span>
											<span class="font-mono">{formatCurrency(merchant.totalSpent)}</span>
											<span class="text-sw-accent text-xs">→ {formatCurrency(merchant.totalFuture)}</span>
										</div>
									</div>
									<div class="h-1.5 bg-sw-bg rounded-full overflow-hidden">
										<div 
											class="h-full bg-sw-accent/60 rounded-full transition-all"
											style="width: {barWidth}%;"
										></div>
									</div>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<!-- Top Transactions -->
			{#if summary.topTransactions.length > 0}
				<div class="bg-sw-surface/60 rounded-2xl border border-sw-border/50 overflow-hidden mb-8">
					<div class="px-6 py-4 border-b border-sw-border/50">
						<h3 class="font-display font-semibold">Biggest Opportunity Costs</h3>
						<p class="text-sm text-sw-text-dim">Individual purchases with the highest potential growth</p>
					</div>
					<div class="divide-y divide-sw-border/30">
						{#each summary.topTransactions.slice(0, 8) as tx, i}
							<div class="px-6 py-3 flex items-center gap-4 hover:bg-sw-bg/30 transition-colors">
								<div class="w-8 h-8 rounded-lg bg-sw-accent/10 flex items-center justify-center text-sw-accent font-mono text-sm">
									{i + 1}
								</div>
								<div class="flex-1 min-w-0">
									<p class="font-medium truncate">{tx.merchant}</p>
									<p class="text-xs text-sw-text-dim">{formatShortDate(tx.date)}</p>
								</div>
								<div class="text-right">
									<p class="font-mono">{formatCurrency(tx.amount)}</p>
								</div>
								<div class="text-sw-text-dim">→</div>
								<div class="text-right">
									<p class="font-mono text-sw-accent">{formatCurrency(tx.futureValue)}</p>
									<p class="text-xs text-sw-accent">+{formatCurrency(tx.growth)}</p>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Category Details (collapsible) -->
			<details class="bg-sw-surface/60 rounded-2xl border border-sw-border/50 overflow-hidden">
				<summary class="px-6 py-4 cursor-pointer hover:bg-sw-bg/30 transition-colors">
					<span class="font-display font-semibold">Full Category Breakdown</span>
					<span class="text-sm text-sw-text-dim ml-2">({summary.categories.length} categories)</span>
				</summary>
				<div class="border-t border-sw-border/50 divide-y divide-sw-border/30">
					{#each summary.categories as cat, i}
						{@const barWidth = summary.totalSpent > 0 ? (cat.spent / summary.totalSpent) * 100 : 0}
						
						<div class="px-6 py-3 hover:bg-sw-bg/30 transition-colors">
							<div class="flex items-center justify-between mb-1">
								<div class="flex items-center gap-2">
									<div class="w-3 h-3 rounded-sm" style="background: {COLORS[i % COLORS.length]}"></div>
									<span class="font-medium">{cat.category}</span>
								</div>
								<div class="flex items-center gap-3 text-sm">
									<span class="text-sw-text-dim">{formatCurrency(cat.spent)}</span>
									<span class="text-sw-accent">→</span>
									<span>{formatCurrency(cat.future)}</span>
									<span class="text-sw-accent font-mono text-xs">+{formatCurrency(cat.delta)}</span>
								</div>
							</div>
							<div class="h-1.5 bg-sw-bg rounded-full overflow-hidden">
								<div 
									class="h-full rounded-full transition-all"
									style="width: {barWidth}%; background: {COLORS[i % COLORS.length]};"
								></div>
							</div>
						</div>
					{/each}
				</div>
			</details>

			<!-- Info footer -->
			<div class="mt-8 text-center text-sm text-sw-text-dim">
				<p>Tracking {summary.ticker} performance • <a href="/settings" class="text-sw-accent hover:underline">Change ticker</a></p>
			</div>
		{/if}
	</main>
</div>
