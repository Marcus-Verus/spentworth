<script lang="ts">
	import { onMount } from 'svelte';
	import Header from '$lib/components/Header.svelte';
	import { initTheme, getTheme } from '$lib/stores/theme';

	let isDark = $state(false);

	interface Insight {
		id: string;
		type: 'opportunity' | 'trend' | 'subscription' | 'achievement' | 'tip';
		priority: 'high' | 'medium' | 'low';
		title: string;
		description: string;
		category?: string;
		merchant?: string;
		amount?: number;
		opportunityCost?: number;
		actionText?: string;
		actionHref?: string;
		icon: string;
		color: string;
	}

	interface InsightSummary {
		totalInsights: number;
		highPriority: number;
		potentialSavings: number;
	}

	let insights = $state<Insight[]>([]);
	let summary = $state<InsightSummary | null>(null);
	let loading = $state(true);
	let filter = $state<'all' | 'high' | 'opportunity' | 'trend' | 'achievement'>('all');

	let filteredInsights = $derived.by(() => {
		if (filter === 'all') return insights;
		if (filter === 'high') return insights.filter(i => i.priority === 'high');
		return insights.filter(i => i.type === filter);
	});

	function formatCurrency(amount: number): string {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		}).format(amount);
	}

	// Donut chart path generator
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

	async function loadInsights() {
		loading = true;
		try {
			const res = await fetch('/api/insights');
			const json = await res.json();
			if (json.ok) {
				insights = json.data.insights;
				summary = json.data.summary;
			}
		} catch (e) {
			console.error('Failed to load insights:', e);
		}
		loading = false;
	}

	onMount(() => {
		initTheme();
		isDark = getTheme() === 'dark';
		loadInsights();
	});
</script>

<svelte:head>
	<title>Insights | SpentWorth</title>
</svelte:head>

<div class="min-h-screen" style="background: {isDark ? 'var(--sw-bg)' : '#f5f0e8'}">
	<Header />
	
	<main class="max-w-3xl mx-auto px-4 py-6 sm:py-8">
		<!-- Page Header -->
		<div class="mb-6 sm:mb-8">
			<h1 class="font-display text-2xl sm:text-3xl font-bold mb-2" style="color: {isDark ? '#ffffff' : '#171717'}">
				Insights
			</h1>
			<p class="text-sm sm:text-base" style="color: {isDark ? '#a3a3a3' : '#525252'}">
				What your spending means for your future
			</p>
		</div>

		{#if loading}
			<div class="flex items-center justify-center py-20">
				<i class="fa-solid fa-spinner fa-spin text-2xl text-sw-accent"></i>
			</div>
		{:else}
			<!-- Summary -->
			{#if summary && summary.potentialSavings > 0}
				<div class="rounded-2xl p-5 sm:p-6 mb-6" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
					<p class="text-sm mb-1" style="color: {isDark ? '#a3a3a3' : '#737373'}">
						Potential opportunity cost
					</p>
					<p class="font-display text-3xl sm:text-4xl font-bold mb-1" style="color: {isDark ? '#ffffff' : '#171717'}">
						{formatCurrency(summary.potentialSavings)}
					</p>
					<p class="text-sm" style="color: {isDark ? '#737373' : '#9ca3af'}">
						over 10 years at 7% return
					</p>
				</div>
			{/if}

			<!-- Charts Section -->
			{#if insights.length > 0}
				<div class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
					<!-- Opportunity Costs by Category -->
					{#if insights.filter(i => i.opportunityCost && i.category).length > 0}
						<div class="rounded-2xl p-4 sm:p-6" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}; box-shadow: {isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.06)'}">
							<h3 class="font-display font-semibold mb-4 text-base sm:text-lg" style="color: {isDark ? '#ffffff' : '#171717'}">Opportunity Cost by Category</h3>
							{#if insights.length > 0}
								{@const categoryInsights = insights.filter(i => i.opportunityCost && i.category).reduce((acc, i) => {
									const cat = i.category!;
									if (!acc[cat]) acc[cat] = 0;
									acc[cat] += i.opportunityCost || 0;
									return acc;
								}, {} as Record<string, number>)}
								{@const sortedCategories = Object.entries(categoryInsights).sort((a, b) => b[1] - a[1]).slice(0, 8)}
								{@const maxCost = Math.max(...sortedCategories.map(([_, cost]) => cost), 1)}
								<div class="h-48 sm:h-56 flex items-end gap-1.5 sm:gap-2">
									{#each sortedCategories as [category, cost], i}
									<div class="flex-1 flex flex-col items-center gap-1 group relative">
										<div class="w-full flex flex-col items-center justify-end" style="height: 180px;">
											<div 
												class="w-full rounded-t transition-all relative group-hover:opacity-90"
												style="height: {Math.max((cost / maxCost) * 100, 4)}%; background: linear-gradient(to top, #ef4444, #f87171);"
											>
												<div class="absolute -top-12 left-1/2 -translate-x-1/2 rounded px-2 py-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none" style="background: {isDark ? '#0a0a0a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
													<p class="font-medium" style="color: {isDark ? '#ffffff' : '#171717'}">{category}</p>
													<p style="color: {isDark ? '#a3a3a3' : '#737373'}">{formatCurrency(cost)}</p>
												</div>
											</div>
										</div>
										<span class="text-[9px] sm:text-[10px] truncate w-full text-center" style="color: {isDark ? '#a3a3a3' : '#737373'}" title={category}>
											{category.split(' ')[0]}
										</span>
									</div>
									{/each}
								</div>
							{/if}
						</div>
					{/if}

					<!-- Insight Types Distribution -->
					<div class="rounded-2xl p-4 sm:p-6" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}; box-shadow: {isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.06)'}">
						<h3 class="font-display font-semibold mb-4 text-base sm:text-lg" style="color: {isDark ? '#ffffff' : '#171717'}">Insight Types</h3>
						{#if insights.length > 0}
							{@const typeCounts = insights.reduce((acc, i) => {
								acc[i.type] = (acc[i.type] || 0) + 1;
								return acc;
							}, {} as Record<string, number>)}
							{@const total = insights.length}
							{@const colors = ['#0d9488', '#ef4444', '#f59e0b', '#6366f1', '#ec4899']}
							{@const types = Object.entries(typeCounts)}
							{@const typeLabels: Record<string, string> = {
								'opportunity': 'Opportunities',
								'trend': 'Trends',
								'subscription': 'Subscriptions',
								'achievement': 'Wins',
								'tip': 'Tips'
							}}
							<div class="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
								<div class="relative flex-shrink-0">
									<svg viewBox="0 0 200 200" class="w-32 h-32 sm:w-44 sm:h-44">
									{#each types as [type, count], i}
										{@const startAngle = types.slice(0, i).reduce((acc, [_, c]) => acc + (c / total) * 360, 0)}
										{@const angle = (count / total) * 360}
										{#if angle > 0.5}
											<path d={getDonutPath(startAngle, startAngle + angle - 0.5)} fill={colors[i % colors.length]} class="hover:opacity-80 transition-opacity">
												<title>{type}: {count}</title>
											</path>
										{/if}
									{/each}
									<text x="100" y="95" text-anchor="middle" class="text-[10px] sm:text-xs" style="fill: {isDark ? '#a3a3a3' : '#737373'}">Total</text>
										<text x="100" y="115" text-anchor="middle" class="font-display font-bold text-sm sm:text-base" style="fill: {isDark ? '#ffffff' : '#171717'}">{total}</text>
									</svg>
								</div>
								<div class="flex-1 w-full space-y-2">
									{#each types as [type, count], i}
									<div class="flex items-center gap-2">
										<div class="w-3 h-3 rounded-sm" style="background: {colors[i % colors.length]}"></div>
										<span class="text-sm flex-1 capitalize" style="color: {isDark ? '#ffffff' : '#171717'}">{typeLabels[type] || type}</span>
										<span class="font-mono text-xs" style="color: {isDark ? '#a3a3a3' : '#737373'}">{count}</span>
									</div>
									{/each}
								</div>
							</div>
						{/if}
					</div>
				</div>
			{/if}

			<!-- Filter Tabs -->
			<div class="flex gap-1 mb-6 p-1 rounded-lg" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
				{#each [
					{ value: 'all', label: 'All' },
					{ value: 'opportunity', label: 'Opportunities' },
					{ value: 'trend', label: 'Trends' },
					{ value: 'achievement', label: 'Wins' }
				] as tab}
					<button
						onclick={() => filter = tab.value as typeof filter}
						class="flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all"
						style="background: {filter === tab.value ? (isDark ? '#2a2a2a' : '#f5f0e8') : 'transparent'}; 
							   color: {filter === tab.value ? (isDark ? '#ffffff' : '#171717') : (isDark ? '#737373' : '#9ca3af')}"
					>
						{tab.label}
					</button>
				{/each}
			</div>

			<!-- Insights List -->
			<div class="space-y-3">
				{#each filteredInsights as insight, index}
					<div 
						class="rounded-xl p-4 sm:p-5"
						style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}"
					>
						<div class="flex items-start gap-4">
							<!-- Number or Icon -->
							<div 
								class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-semibold"
								style="background: {isDark ? '#2a2a2a' : '#f5f0e8'}; color: {isDark ? '#a3a3a3' : '#737373'}"
							>
								{index + 1}
							</div>
							
							<div class="flex-1 min-w-0">
								<h3 class="font-display font-semibold text-base mb-1" style="color: {isDark ? '#ffffff' : '#171717'}">
									{insight.title}
								</h3>
								
								<p class="text-sm leading-relaxed mb-3" style="color: {isDark ? '#a3a3a3' : '#525252'}">
									{insight.description}
								</p>

								<!-- Opportunity Cost -->
								{#if insight.opportunityCost && insight.type !== 'achievement'}
									<div class="flex items-center gap-2 text-sm">
										<i class="fa-solid fa-arrow-trend-up text-sw-accent"></i>
										<span style="color: {isDark ? '#a3a3a3' : '#737373'}">
											{formatCurrency(insight.opportunityCost)} potential in 10 years
										</span>
									</div>
								{/if}

								<!-- Action Link -->
								{#if insight.actionText && insight.actionHref}
									<a 
										href={insight.actionHref}
										class="inline-flex items-center gap-1.5 mt-3 text-sm font-medium text-sw-accent hover:underline"
									>
										{insight.actionText}
										<i class="fa-solid fa-arrow-right text-xs"></i>
									</a>
								{/if}
							</div>
						</div>
					</div>
				{/each}
			</div>

			<!-- Empty State -->
			{#if filteredInsights.length === 0 && insights.length > 0}
				<div class="text-center py-12 rounded-xl" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
					<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">No insights match this filter</p>
				</div>
			{/if}

			<!-- Empty State - No Data -->
			{#if insights.length === 0 && !loading}
				<div class="text-center py-16 rounded-xl" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
					<i class="fa-solid fa-chart-line text-3xl mb-4" style="color: {isDark ? '#404040' : '#d4d4d4'}"></i>
					<h3 class="font-display font-semibold text-lg mb-2" style="color: {isDark ? '#ffffff' : '#171717'}">
						No insights yet
					</h3>
					<p class="text-sm mb-4" style="color: {isDark ? '#a3a3a3' : '#737373'}">
						Import some transactions to get personalized insights
					</p>
					<a href="/imports" class="btn-primary inline-flex items-center gap-2">
						<i class="fa-solid fa-file-arrow-up"></i>
						Import Transactions
					</a>
				</div>
			{/if}
		{/if}
	</main>
</div>
