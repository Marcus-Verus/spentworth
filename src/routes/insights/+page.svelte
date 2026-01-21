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

	let filteredInsights = $derived(() => {
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
		const unsubscribe = getTheme().subscribe(value => {
			isDark = value;
		});
		loadInsights();
		return unsubscribe;
	});

	function getTypeLabel(type: string): string {
		switch (type) {
			case 'opportunity': return 'Opportunity';
			case 'trend': return 'Trend Alert';
			case 'subscription': return 'Subscription';
			case 'achievement': return 'Win!';
			case 'tip': return 'Tip';
			default: return type;
		}
	}

	function getPriorityBadge(priority: string): { bg: string; text: string } {
		switch (priority) {
			case 'high': return { bg: 'rgba(239,68,68,0.15)', text: '#ef4444' };
			case 'medium': return { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b' };
			default: return { bg: 'rgba(107,114,128,0.15)', text: '#6b7280' };
		}
	}
</script>

<svelte:head>
	<title>Insights | SpentWorth</title>
</svelte:head>

<div class="min-h-screen" style="background: {isDark ? 'var(--sw-bg)' : '#f5f0e8'}">
	<Header />
	
	<main class="max-w-4xl mx-auto px-4 py-6 sm:py-8">
		<!-- Page Header -->
		<div class="mb-6 sm:mb-8">
			<h1 class="font-display text-2xl sm:text-3xl font-bold mb-2" style="color: {isDark ? '#ffffff' : '#171717'}">
				Your Insights
			</h1>
			<p class="text-sm sm:text-base" style="color: {isDark ? '#a3a3a3' : '#525252'}">
				Personalized recommendations to grow your wealth
			</p>
		</div>

		{#if loading}
			<div class="flex items-center justify-center py-20">
				<i class="fa-solid fa-spinner fa-spin text-2xl text-sw-accent"></i>
			</div>
		{:else}
			<!-- Summary Banner -->
			{#if summary && summary.potentialSavings > 0}
				<div class="rounded-2xl p-5 sm:p-6 mb-6 sm:mb-8" style="background: linear-gradient(135deg, rgba(13,148,136,0.15) 0%, rgba(16,185,129,0.1) 100%); border: 1px solid rgba(13,148,136,0.3)">
					<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
						<div>
							<p class="text-sm mb-1" style="color: {isDark ? '#a3a3a3' : '#525252'}">
								Your spending habits could be costing you
							</p>
							<p class="font-display text-3xl sm:text-4xl font-bold text-sw-accent">
								{formatCurrency(summary.potentialSavings)}
							</p>
							<p class="text-sm mt-1" style="color: {isDark ? '#737373' : '#9ca3af'}">
								in lost opportunity over 10 years
							</p>
						</div>
						<div class="flex items-center gap-3">
							<div class="text-center px-4 py-2 rounded-xl" style="background: {isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.7)'}">
								<p class="font-display text-2xl font-bold" style="color: {isDark ? '#ffffff' : '#171717'}">{summary.totalInsights}</p>
								<p class="text-xs" style="color: {isDark ? '#a3a3a3' : '#737373'}">Insights</p>
							</div>
							{#if summary.highPriority > 0}
								<div class="text-center px-4 py-2 rounded-xl" style="background: rgba(239,68,68,0.15)">
									<p class="font-display text-2xl font-bold text-red-500">{summary.highPriority}</p>
									<p class="text-xs text-red-400">High Priority</p>
								</div>
							{/if}
						</div>
					</div>
				</div>
			{/if}

			<!-- Filter Tabs -->
			<div class="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
				{#each [
					{ value: 'all', label: 'All' },
					{ value: 'high', label: 'High Priority' },
					{ value: 'opportunity', label: 'Opportunities' },
					{ value: 'trend', label: 'Trends' },
					{ value: 'achievement', label: 'Wins' }
				] as tab}
					<button
						onclick={() => filter = tab.value as typeof filter}
						class="px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all"
						style="background: {filter === tab.value ? '#0d9488' : (isDark ? '#1a1a1a' : '#ffffff')}; 
							   color: {filter === tab.value ? '#ffffff' : (isDark ? '#a3a3a3' : '#525252')};
							   border: 1px solid {filter === tab.value ? '#0d9488' : (isDark ? '#2a2a2a' : '#e5e5e5')}"
					>
						{tab.label}
					</button>
				{/each}
			</div>

			<!-- Insights List -->
			<div class="space-y-4">
				{#each filteredInsights() as insight}
					<div 
						class="rounded-2xl overflow-hidden transition-all hover:scale-[1.01]"
						style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}; box-shadow: {isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.04)'}"
					>
						<div class="p-4 sm:p-5">
							<!-- Header -->
							<div class="flex items-start gap-4">
								<div 
									class="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
									style="background: {insight.color}20"
								>
									<i class="fa-solid {insight.icon} text-lg" style="color: {insight.color}"></i>
								</div>
								
								<div class="flex-1 min-w-0">
									<div class="flex items-center gap-2 flex-wrap mb-1">
										<h3 class="font-display font-semibold text-base sm:text-lg" style="color: {isDark ? '#ffffff' : '#171717'}">
											{insight.title}
										</h3>
										{#if insight.priority === 'high'}
											{@const badge = getPriorityBadge(insight.priority)}
											<span 
												class="px-2 py-0.5 rounded-full text-xs font-medium"
												style="background: {badge.bg}; color: {badge.text}"
											>
												High Priority
											</span>
										{/if}
									</div>
									
									<p class="text-sm leading-relaxed" style="color: {isDark ? '#a3a3a3' : '#525252'}">
										{insight.description}
									</p>

									<!-- Opportunity Cost Highlight -->
									{#if insight.opportunityCost && insight.type !== 'achievement'}
										<div class="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg" style="background: {isDark ? 'rgba(10,10,10,0.5)' : '#f9f6f1'}">
											<i class="fa-solid fa-arrow-trend-up text-xs text-sw-accent"></i>
											<span class="text-sm font-medium" style="color: {isDark ? '#ffffff' : '#171717'}">
												{formatCurrency(insight.opportunityCost)}
											</span>
											<span class="text-xs" style="color: {isDark ? '#737373' : '#9ca3af'}">
												potential in 10 years
											</span>
										</div>
									{/if}

									<!-- Action Button -->
									{#if insight.actionText && insight.actionHref}
										<div class="mt-4">
											<a 
												href={insight.actionHref}
												class="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
												style="background: {insight.color}20; color: {insight.color}"
											>
												{insight.actionText}
												<i class="fa-solid fa-arrow-right text-xs"></i>
											</a>
										</div>
									{/if}
								</div>
							</div>
						</div>

						<!-- Type Footer -->
						<div 
							class="px-4 sm:px-5 py-2 flex items-center gap-2"
							style="background: {isDark ? 'rgba(10,10,10,0.3)' : '#f9f6f1'}; border-top: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}"
						>
							<span 
								class="w-2 h-2 rounded-full"
								style="background: {insight.color}"
							></span>
							<span class="text-xs" style="color: {isDark ? '#737373' : '#9ca3af'}">
								{getTypeLabel(insight.type)}
								{#if insight.category}
									• {insight.category}
								{/if}
								{#if insight.merchant}
									• {insight.merchant}
								{/if}
							</span>
						</div>
					</div>
				{/each}
			</div>

			<!-- Empty State for Filter -->
			{#if filteredInsights().length === 0 && insights.length > 0}
				<div class="text-center py-12">
					<i class="fa-solid fa-filter text-3xl mb-3" style="color: {isDark ? '#525252' : '#9ca3af'}"></i>
					<p class="font-display font-semibold" style="color: {isDark ? '#ffffff' : '#171717'}">No insights match this filter</p>
					<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">Try selecting a different filter above</p>
				</div>
			{/if}

			<!-- CTA Section -->
			{#if insights.length > 0}
				<div class="mt-8 rounded-2xl p-6 text-center" style="background: {isDark ? 'rgba(13,148,136,0.1)' : 'rgba(13,148,136,0.08)'}; border: 1px solid {isDark ? 'rgba(13,148,136,0.3)' : 'rgba(13,148,136,0.2)'}">
					<i class="fa-solid fa-seedling text-3xl text-sw-accent mb-3"></i>
					<h3 class="font-display font-semibold text-lg mb-2" style="color: {isDark ? '#ffffff' : '#171717'}">
						Every insight is a step toward financial freedom
					</h3>
					<p class="text-sm mb-4" style="color: {isDark ? '#a3a3a3' : '#525252'}">
						Small changes compound into big results. Start with one insight today.
					</p>
					<a href="/budgets" class="btn-primary inline-flex items-center gap-2">
						<i class="fa-solid fa-bullseye"></i>
						Set Up Budgets
					</a>
				</div>
			{/if}
		{/if}
	</main>
</div>

