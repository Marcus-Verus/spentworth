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
	let expandedInsight = $state<string | null>(null);
	let animatedSavings = $state(0);

	let filteredInsights = $derived.by(() => {
		if (filter === 'all') return insights;
		if (filter === 'high') return insights.filter(i => i.priority === 'high');
		return insights.filter(i => i.type === filter);
	});

	// Achievement badges based on insights
	let achievements = $derived.by(() => {
		const badges: Array<{ icon: string; title: string; description: string; color: string; earned: boolean }> = [];
		
		const achievementInsights = insights.filter(i => i.type === 'achievement');
		const opportunityInsights = insights.filter(i => i.type === 'opportunity');
		const trendInsights = insights.filter(i => i.type === 'trend');
		
		// Badge for having achievements
		if (achievementInsights.length >= 1) {
			badges.push({ 
				icon: 'fa-trophy', 
				title: 'First Win', 
				description: 'Achieved your first spending milestone',
				color: '#f59e0b',
				earned: true
			});
		}
		
		// Badge for multiple opportunities identified
		if (opportunityInsights.length >= 3) {
			badges.push({ 
				icon: 'fa-binoculars', 
				title: 'Opportunity Hunter', 
				description: 'Identified 3+ savings opportunities',
				color: '#0d9488',
				earned: true
			});
		}
		
		// Badge for improving trends
		const improvingTrends = trendInsights.filter(i => i.title.toLowerCase().includes('improv') || i.title.toLowerCase().includes('decreas'));
		if (improvingTrends.length >= 2) {
			badges.push({ 
				icon: 'fa-chart-line', 
				title: 'Trend Setter', 
				description: 'Multiple categories showing improvement',
				color: '#10b981',
				earned: true
			});
		}
		
		// Budget master badge
		if (summary && summary.potentialSavings > 1000) {
			badges.push({ 
				icon: 'fa-piggy-bank', 
				title: 'Savings Champion', 
				description: '$1,000+ potential savings identified',
				color: '#8b5cf6',
				earned: true
			});
		}
		
		// Add locked badges
		if (badges.length < 4) {
			const lockedBadges = [
				{ icon: 'fa-star', title: 'Perfect Month', description: 'All budgets under limit', color: '#6b7280', earned: false },
				{ icon: 'fa-fire', title: 'Streak Master', description: '3 months of improvement', color: '#6b7280', earned: false },
				{ icon: 'fa-crown', title: 'Budget King', description: 'Save $5,000 in a year', color: '#6b7280', earned: false },
			];
			badges.push(...lockedBadges.slice(0, 4 - badges.length));
		}
		
		return badges.slice(0, 4);
	});

	// Spending patterns mock data (would come from API)
	let spendingPatterns = $derived.by(() => {
		return {
			peakDay: { day: 'Saturday', percent: 22 },
			peakTime: { time: 'Evening', percent: 45 },
			topCategory: { name: 'Dining', change: -12 },
			avgTransaction: { amount: 47, trend: 'down' as const }
		};
	});

	// Weekly spending rhythm (mock data for heatmap)
	let weeklyHeatmap = $derived.by(() => {
		// Generate realistic spending patterns
		const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
		const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
		
		// Higher spending on weekends and payday (15th, 30th)
		const data: Array<{ day: string; week: string; value: number }> = [];
		
		for (let w = 0; w < 4; w++) {
			for (let d = 0; d < 7; d++) {
				const isWeekend = d >= 5;
				const isPayWeek = w === 1 || w === 3;
				const base = Math.random() * 50;
				const weekendBonus = isWeekend ? 30 : 0;
				const payBonus = isPayWeek ? 20 : 0;
				data.push({
					day: days[d],
					week: weeks[w],
					value: Math.round(base + weekendBonus + payBonus)
				});
			}
		}
		return data;
	});

	function formatCurrency(amount: number): string {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		}).format(amount);
	}

	function getHeatmapColor(value: number): string {
		// Scale from light to dark teal based on value (0-100)
		if (value < 20) return isDark ? 'rgba(13,148,136,0.1)' : 'rgba(13,148,136,0.08)';
		if (value < 40) return isDark ? 'rgba(13,148,136,0.25)' : 'rgba(13,148,136,0.2)';
		if (value < 60) return isDark ? 'rgba(13,148,136,0.45)' : 'rgba(13,148,136,0.4)';
		if (value < 80) return isDark ? 'rgba(13,148,136,0.65)' : 'rgba(13,148,136,0.6)';
		return isDark ? 'rgba(13,148,136,0.85)' : 'rgba(13,148,136,0.8)';
	}

	function getTypeIcon(type: string): string {
		switch (type) {
			case 'opportunity': return 'fa-lightbulb';
			case 'trend': return 'fa-chart-line';
			case 'subscription': return 'fa-repeat';
			case 'achievement': return 'fa-trophy';
			case 'tip': return 'fa-wand-magic-sparkles';
			default: return 'fa-circle-info';
		}
	}

	function getTypeColor(type: string): string {
		switch (type) {
			case 'opportunity': return '#0d9488';
			case 'trend': return '#6366f1';
			case 'subscription': return '#f59e0b';
			case 'achievement': return '#10b981';
			case 'tip': return '#ec4899';
			default: return '#6b7280';
		}
	}

	function getPriorityBadge(priority: string): { text: string; bg: string; color: string } {
		switch (priority) {
			case 'high': return { text: 'High Impact', bg: 'rgba(239,68,68,0.15)', color: '#ef4444' };
			case 'medium': return { text: 'Medium', bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' };
			default: return { text: 'Info', bg: 'rgba(107,114,128,0.15)', color: '#6b7280' };
		}
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
				
				// Animate savings number
				if (summary?.potentialSavings) {
					const target = summary.potentialSavings;
					const duration = 1500;
					const steps = 40;
					const increment = target / steps;
					let current = 0;
					const interval = setInterval(() => {
						current += increment;
						if (current >= target) {
							animatedSavings = target;
							clearInterval(interval);
						} else {
							animatedSavings = Math.round(current);
						}
					}, duration / steps);
				}
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
	
	<main class="max-w-6xl mx-auto px-4 py-6 sm:py-8">
		<!-- Page Header -->
		<div class="mb-6 sm:mb-8">
			<h1 class="font-display text-2xl sm:text-3xl font-bold mb-2" style="color: {isDark ? '#ffffff' : '#171717'}">
				Spending Insights
			</h1>
			<p class="text-sm sm:text-base" style="color: {isDark ? '#a3a3a3' : '#525252'}">
				Patterns and opportunities based on your transaction history
			</p>
		</div>

		{#if loading}
			<div class="flex items-center justify-center py-20">
				<div class="text-center">
					<div class="relative w-16 h-16 mx-auto mb-4">
						<svg class="w-16 h-16 -rotate-90" viewBox="0 0 100 100">
							<circle cx="50" cy="50" r="45" fill="none" stroke={isDark ? '#2a2a2a' : '#e5e5e5'} stroke-width="6"/>
							<circle 
								cx="50" cy="50" r="45" fill="none" 
								stroke="#0d9488" stroke-width="6" stroke-linecap="round"
								class="animate-spin origin-center"
								style="stroke-dasharray: 180; stroke-dashoffset: 90;"
							/>
						</svg>
					</div>
					<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">Loading insights...</p>
				</div>
			</div>
		{:else}
			<!-- Hero Summary Card -->
			{#if summary && summary.potentialSavings > 0}
				<div class="rounded-2xl p-6 sm:p-8 mb-6 sm:mb-8" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
					<div class="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
						<div>
							<p class="text-xs uppercase tracking-wider mb-2" style="color: {isDark ? '#737373' : '#9ca3af'}">Potential 10-Year Value</p>
							<p class="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-sw-accent mb-2">
								{formatCurrency(animatedSavings)}
							</p>
							<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">
								from {summary.totalInsights} insights{#if summary.highPriority > 0} • <span style="color: #ef4444">{summary.highPriority} high priority</span>{/if}
							</p>
						</div>
						
						<div class="flex flex-wrap gap-3">
							<a href="/budgets" class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-[1.02]" style="background: {isDark ? '#2a2a2a' : '#f5f0e8'}; color: {isDark ? '#ffffff' : '#171717'}">
								View Budgets
							</a>
							<a href="/dashboard" class="btn-primary inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium">
								Dashboard
							</a>
						</div>
					</div>
				</div>
			{/if}

			<!-- Achievement Badges -->
			{#if achievements.length > 0}
				<div class="mb-6 sm:mb-8">
					<h2 class="font-display font-semibold text-lg mb-4" style="color: {isDark ? '#ffffff' : '#171717'}">
						Achievements
					</h2>
					<div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
						{#each achievements as badge}
							<div 
								class="rounded-xl p-4 text-center transition-all {badge.earned ? '' : 'opacity-40'}"
								style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}"
							>
								<div 
									class="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center"
									style="background: {isDark ? '#0a0a0a' : '#f5f0e8'}"
								>
									<i class="fa-solid {badge.icon} text-lg" style="color: {badge.earned ? badge.color : (isDark ? '#404040' : '#c4c4c4')}"></i>
								</div>
								<p class="font-medium text-sm mb-0.5" style="color: {isDark ? '#ffffff' : '#171717'}">{badge.title}</p>
								<p class="text-[10px] leading-relaxed" style="color: {isDark ? '#737373' : '#9ca3af'}">{badge.description}</p>
								{#if !badge.earned}
									<div class="mt-2 text-[10px]" style="color: {isDark ? '#404040' : '#c4c4c4'}">
										<i class="fa-solid fa-lock mr-1"></i> Locked
									</div>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Spending Patterns Grid -->
			<div class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
				<!-- Spending Heatmap -->
				<div class="rounded-2xl p-4 sm:p-6" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
					<div class="flex items-center gap-2 mb-4">
						<i class="fa-solid fa-calendar-days text-sw-accent"></i>
						<div>
							<h3 class="font-display font-semibold text-base" style="color: {isDark ? '#ffffff' : '#171717'}">Spending Rhythm</h3>
							<p class="text-xs" style="color: {isDark ? '#a3a3a3' : '#737373'}">When you spend the most</p>
						</div>
					</div>
					
					<!-- Heatmap Grid -->
					<div class="overflow-x-auto">
						<div class="min-w-[280px]">
							<!-- Day labels -->
							<div class="grid grid-cols-8 gap-1 mb-1">
								<div></div>
								{#each ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as day}
									<div class="text-[10px] text-center" style="color: {isDark ? '#737373' : '#9ca3af'}">{day}</div>
								{/each}
							</div>
							
							<!-- Heatmap rows -->
							{#each ['Week 1', 'Week 2', 'Week 3', 'Week 4'] as week, weekIndex}
								<div class="grid grid-cols-8 gap-1 mb-1">
									<div class="text-[10px] flex items-center" style="color: {isDark ? '#737373' : '#9ca3af'}">{week}</div>
									{#each weeklyHeatmap.filter(d => d.week === week) as cell}
										<div 
											class="aspect-square rounded-sm cursor-pointer transition-all hover:scale-110"
											style="background: {getHeatmapColor(cell.value)}"
											title="{cell.day}, {cell.week}: ${cell.value}"
										></div>
									{/each}
								</div>
							{/each}
							
							<!-- Legend -->
							<div class="flex items-center justify-end gap-1 mt-3">
								<span class="text-[10px]" style="color: {isDark ? '#737373' : '#9ca3af'}">Less</span>
								{#each [10, 30, 50, 70, 90] as value}
									<div class="w-3 h-3 rounded-sm" style="background: {getHeatmapColor(value)}"></div>
								{/each}
								<span class="text-[10px]" style="color: {isDark ? '#737373' : '#9ca3af'}">More</span>
							</div>
						</div>
					</div>
				</div>

				<!-- Quick Stats -->
				<div class="rounded-2xl p-4 sm:p-6" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
					<div class="flex items-center gap-2 mb-4">
						<i class="fa-solid fa-chart-simple" style="color: #6366f1"></i>
						<div>
							<h3 class="font-display font-semibold text-base" style="color: {isDark ? '#ffffff' : '#171717'}">Pattern Analysis</h3>
							<p class="text-xs" style="color: {isDark ? '#a3a3a3' : '#737373'}">Your spending behaviors</p>
						</div>
					</div>
					
					<div class="space-y-3">
						<div class="flex items-center justify-between p-3 rounded-xl" style="background: {isDark ? '#0a0a0a' : '#f9f6f1'}">
							<div class="flex items-center gap-3">
								<i class="fa-solid fa-calendar-day text-sw-accent"></i>
								<div>
									<p class="text-sm font-medium" style="color: {isDark ? '#ffffff' : '#171717'}">Peak Day</p>
									<p class="text-xs" style="color: {isDark ? '#a3a3a3' : '#737373'}">{spendingPatterns.peakDay.percent}% of weekly spend</p>
								</div>
							</div>
							<span class="font-mono font-semibold" style="color: {isDark ? '#ffffff' : '#171717'}">{spendingPatterns.peakDay.day}</span>
						</div>
						
						<div class="flex items-center justify-between p-3 rounded-xl" style="background: {isDark ? '#0a0a0a' : '#f9f6f1'}">
							<div class="flex items-center gap-3">
								<i class="fa-solid fa-clock" style="color: #6366f1"></i>
								<div>
									<p class="text-sm font-medium" style="color: {isDark ? '#ffffff' : '#171717'}">Peak Time</p>
									<p class="text-xs" style="color: {isDark ? '#a3a3a3' : '#737373'}">{spendingPatterns.peakTime.percent}% of purchases</p>
								</div>
							</div>
							<span class="font-mono font-semibold" style="color: {isDark ? '#ffffff' : '#171717'}">{spendingPatterns.peakTime.time}</span>
						</div>
						
						<div class="flex items-center justify-between p-3 rounded-xl" style="background: {isDark ? '#0a0a0a' : '#f9f6f1'}">
							<div class="flex items-center gap-3">
								<i class="fa-solid fa-arrow-trend-down text-green-500"></i>
								<div>
									<p class="text-sm font-medium" style="color: {isDark ? '#ffffff' : '#171717'}">Most Improved</p>
									<p class="text-xs" style="color: {isDark ? '#a3a3a3' : '#737373'}">{Math.abs(spendingPatterns.topCategory.change)}% decrease</p>
								</div>
							</div>
							<span class="font-mono font-semibold text-green-500">{spendingPatterns.topCategory.name}</span>
						</div>
					</div>
				</div>
			</div>

			<!-- Insight Type Distribution -->
			{#if insights.length > 0}
				<div class="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
					<!-- Opportunity Costs by Category -->
					{#if insights.filter(i => i.opportunityCost && i.category).length > 0}
						{@const categoryInsights = insights.filter(i => i.opportunityCost && i.category).reduce((acc, i) => {
							const cat = i.category!;
							if (!acc[cat]) acc[cat] = 0;
							acc[cat] += i.opportunityCost || 0;
							return acc;
						}, {} as Record<string, number>)}
						{@const sortedCategories = Object.entries(categoryInsights).sort((a, b) => b[1] - a[1]).slice(0, 6)}
						{@const maxCost = Math.max(...sortedCategories.map(([_, cost]) => cost), 1)}
						
						<div class="lg:col-span-2 rounded-2xl p-4 sm:p-6" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
							<div class="flex items-center gap-2 mb-4">
								<i class="fa-solid fa-money-bill-trend-up" style="color: #ef4444"></i>
								<div>
									<h3 class="font-display font-semibold text-base" style="color: {isDark ? '#ffffff' : '#171717'}">Opportunity Cost by Category</h3>
									<p class="text-xs" style="color: {isDark ? '#a3a3a3' : '#737373'}">Where your money could grow most</p>
								</div>
							</div>
							
							<div class="space-y-3">
								{#each sortedCategories as [category, cost], i}
									{@const width = (cost / maxCost) * 100}
									<div class="group">
										<div class="flex items-center justify-between mb-1">
											<span class="text-sm font-medium" style="color: {isDark ? '#ffffff' : '#171717'}">{category}</span>
											<span class="font-mono text-sm text-sw-accent">{formatCurrency(cost)}</span>
										</div>
										<div class="h-2 rounded-full overflow-hidden" style="background: {isDark ? '#0a0a0a' : '#f0ebe3'}">
											<div 
												class="h-full rounded-full transition-all duration-700"
												style="width: {width}%; background: linear-gradient(90deg, #ef4444, #f87171);"
											></div>
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Insight Types Donut -->
					<div class="rounded-2xl p-4 sm:p-6" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
						<h3 class="font-display font-semibold mb-4 text-base" style="color: {isDark ? '#ffffff' : '#171717'}">Insight Breakdown</h3>
						{#if insights.length > 0}
							{@const typeCounts = insights.reduce((acc, i) => {
								acc[i.type] = (acc[i.type] || 0) + 1;
								return acc;
							}, {} as Record<string, number>)}
							{@const total = insights.length}
							{@const colors = ['#0d9488', '#6366f1', '#f59e0b', '#10b981', '#ec4899']}
							{@const types = Object.entries(typeCounts)}
							{@const typeLabels: Record<string, string> = {
								'opportunity': 'Opportunities',
								'trend': 'Trends',
								'subscription': 'Subscriptions',
								'achievement': 'Wins',
								'tip': 'Tips'
							}}
							<div class="flex flex-col items-center gap-4">
								<div class="relative">
									<svg viewBox="0 0 200 200" class="w-32 h-32">
									{#each types as [type, count], i}
										{@const startAngle = types.slice(0, i).reduce((acc, [_, c]) => acc + (c / total) * 360, 0)}
										{@const angle = (count / total) * 360}
										{#if angle > 0.5}
											<path d={getDonutPath(startAngle, startAngle + angle - 0.5)} fill={colors[i % colors.length]} class="hover:opacity-80 transition-opacity cursor-pointer">
												<title>{type}: {count}</title>
											</path>
										{/if}
									{/each}
									<text x="100" y="95" text-anchor="middle" class="text-[10px]" style="fill: {isDark ? '#a3a3a3' : '#737373'}">Total</text>
										<text x="100" y="115" text-anchor="middle" class="font-display font-bold text-base" style="fill: {isDark ? '#ffffff' : '#171717'}">{total}</text>
									</svg>
								</div>
								<div class="w-full space-y-1.5">
									{#each types as [type, count], i}
									<div class="flex items-center gap-2">
										<div class="w-3 h-3 rounded-sm" style="background: {colors[i % colors.length]}"></div>
										<span class="text-xs flex-1 capitalize" style="color: {isDark ? '#ffffff' : '#171717'}">{typeLabels[type] || type}</span>
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
			<div class="flex gap-1 mb-6 p-1.5 rounded-xl overflow-x-auto" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
				{#each [
					{ value: 'all', label: 'All', icon: 'fa-layer-group' },
					{ value: 'high', label: 'High Priority', icon: 'fa-fire' },
					{ value: 'opportunity', label: 'Opportunities', icon: 'fa-lightbulb' },
					{ value: 'trend', label: 'Trends', icon: 'fa-chart-line' },
					{ value: 'achievement', label: 'Wins', icon: 'fa-trophy' }
				] as tab}
					<button
						onclick={() => filter = tab.value as typeof filter}
						class="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap"
						style="background: {filter === tab.value ? (isDark ? '#2a2a2a' : '#f5f0e8') : 'transparent'}; 
							   color: {filter === tab.value ? (isDark ? '#ffffff' : '#171717') : (isDark ? '#737373' : '#9ca3af')}"
					>
						<i class="fa-solid {tab.icon} text-xs"></i>
						{tab.label}
						{#if tab.value === 'high' && summary?.highPriority}
							<span class="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold" style="background: #ef4444; color: #ffffff">{summary.highPriority}</span>
						{/if}
					</button>
				{/each}
			</div>

			<!-- Insights List -->
			<div class="space-y-3">
				{#each filteredInsights as insight, index}
					{@const typeColor = getTypeColor(insight.type)}
					{@const priorityBadge = getPriorityBadge(insight.priority)}
					{@const isExpanded = expandedInsight === insight.id}
					
					<div 
						class="rounded-xl overflow-hidden transition-all hover:scale-[1.005]"
						style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}; animation: slideUp 0.4s ease-out; animation-delay: {index * 50}ms; animation-fill-mode: both;"
					>
						<button 
							class="w-full p-4 sm:p-5 text-left"
							onclick={() => expandedInsight = isExpanded ? null : insight.id}
						>
							<div class="flex items-start gap-4">
								<!-- Type Icon - just the icon, no colored background -->
								<i class="fa-solid {getTypeIcon(insight.type)} text-lg mt-1 flex-shrink-0" style="color: {typeColor}"></i>
								
								<div class="flex-1 min-w-0">
									<div class="flex flex-wrap items-center gap-2 mb-1">
										<h3 class="font-display font-semibold text-base" style="color: {isDark ? '#ffffff' : '#171717'}">
											{insight.title}
										</h3>
										{#if insight.priority === 'high'}
											<span class="px-2 py-0.5 rounded-full text-[10px] font-medium" style="background: {isDark ? '#2a2a2a' : '#f0f0f0'}; color: #ef4444">
												High Impact
											</span>
										{/if}
									</div>
									
									<p class="text-sm leading-relaxed mb-2" style="color: {isDark ? '#a3a3a3' : '#525252'}">
										{insight.description}
									</p>

									<!-- Quick Stats -->
									<div class="flex flex-wrap items-center gap-3">
										{#if insight.opportunityCost && insight.type !== 'achievement'}
											<div class="flex items-center gap-1.5 text-sm">
												<span class="font-mono font-medium text-sw-accent">{formatCurrency(insight.opportunityCost)}</span>
												<span class="text-xs" style="color: {isDark ? '#737373' : '#9ca3af'}">potential</span>
											</div>
										{/if}
										
										{#if insight.category}
											<span class="text-xs px-2 py-0.5 rounded-full" style="background: {isDark ? '#2a2a2a' : '#f0f0f0'}; color: {isDark ? '#a3a3a3' : '#737373'}">
												{insight.category}
											</span>
										{/if}
										
										{#if insight.merchant}
											<span class="text-xs px-2 py-0.5 rounded-full" style="background: {isDark ? '#2a2a2a' : '#f0f0f0'}; color: {isDark ? '#a3a3a3' : '#737373'}">
												{insight.merchant}
											</span>
										{/if}
									</div>
								</div>

								<!-- Expand Icon -->
								<div class="flex-shrink-0">
									<i class="fa-solid fa-chevron-down text-xs transition-transform {isExpanded ? 'rotate-180' : ''}" style="color: {isDark ? '#525252' : '#9ca3af'}"></i>
								</div>
							</div>
						</button>

						<!-- Expanded Content -->
						{#if isExpanded}
							<div class="px-4 sm:px-5 pb-4 sm:pb-5 pt-0" style="border-top: 1px solid {isDark ? '#2a2a2a' : '#f0f0f0'}">
								<div class="pt-4 flex flex-wrap gap-3">
									{#if insight.actionText && insight.actionHref}
										<a 
											href={insight.actionHref}
											class="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium btn-primary"
										>
											{insight.actionText}
											<i class="fa-solid fa-arrow-right text-xs"></i>
										</a>
									{/if}
									
									<button 
										class="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
										style="background: {isDark ? '#2a2a2a' : '#f5f0e8'}; color: {isDark ? '#a3a3a3' : '#737373'}"
									>
										<i class="fa-solid fa-bookmark text-xs"></i>
										Save for Later
									</button>
									
									<button 
										class="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
										style="background: {isDark ? '#2a2a2a' : '#f5f0e8'}; color: {isDark ? '#a3a3a3' : '#737373'}"
									>
										<i class="fa-solid fa-check text-xs"></i>
										Mark as Done
									</button>
								</div>
							</div>
						{/if}
					</div>
				{/each}
			</div>

			<!-- Empty State -->
			{#if filteredInsights.length === 0 && insights.length > 0}
				<div class="text-center py-12 rounded-xl" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
					<div class="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style="background: {isDark ? '#2a2a2a' : '#f0f0f0'}">
						<i class="fa-solid fa-filter text-xl" style="color: {isDark ? '#525252' : '#9ca3af'}"></i>
					</div>
					<p class="text-sm font-medium mb-1" style="color: {isDark ? '#ffffff' : '#171717'}">No matching insights</p>
					<p class="text-xs" style="color: {isDark ? '#a3a3a3' : '#737373'}">Try selecting a different filter</p>
				</div>
			{/if}

			<!-- Empty State - No Data -->
			{#if insights.length === 0 && !loading}
				<div class="text-center py-16 rounded-2xl" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
					<div class="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center" style="background: {isDark ? '#0a0a0a' : '#f9f6f1'}">
						<i class="fa-solid fa-lightbulb text-3xl" style="color: {isDark ? '#404040' : '#d4d4d4'}"></i>
					</div>
					<h3 class="font-display font-bold text-xl mb-2" style="color: {isDark ? '#ffffff' : '#171717'}">
						No insights yet
					</h3>
					<p class="text-sm mb-6 max-w-md mx-auto" style="color: {isDark ? '#a3a3a3' : '#737373'}">
						Import your transactions and we'll analyze your spending patterns to find opportunities and trends.
					</p>
					<a href="/imports" class="btn-primary inline-flex items-center gap-2 px-6 py-3 rounded-xl">
						Import Transactions
					</a>
				</div>
			{/if}

			<!-- Tip Section -->
			{#if insights.length > 0 && summary && summary.potentialSavings > 500}
				<div class="mt-8 rounded-2xl p-5 sm:p-6" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
					<div class="flex items-start gap-4">
						<i class="fa-solid fa-lightbulb text-amber-500 mt-0.5"></i>
						<div>
							<h3 class="font-display font-semibold text-base mb-1" style="color: {isDark ? '#ffffff' : '#171717'}">
								The Power of Small Changes
							</h3>
							<p class="text-sm leading-relaxed" style="color: {isDark ? '#a3a3a3' : '#525252'}">
								Cutting back just $50/month and investing it instead could grow to $8,700 in 10 years at 7% return. Look for recurring expenses you could reduce — every small win compounds over time.
							</p>
						</div>
					</div>
				</div>
			{/if}
		{/if}
	</main>
</div>

<style>
	@keyframes slideUp {
		0% { opacity: 0; transform: translateY(10px); }
		100% { opacity: 1; transform: translateY(0); }
	}
</style>
