<script lang="ts">
	import { onMount } from 'svelte';
	import Header from '$lib/components/Header.svelte';
	import { initTheme, getTheme } from '$lib/stores/theme';
	import type { BudgetWithProgress } from '$lib/types';
	import { CATEGORIES } from '$lib/types';

	let isDark = $state(false);

	interface BudgetSummary {
		totalBudget: number;
		totalSpent: number;
		totalPreviousSpent: number;
		totalRemaining: number;
		totalOverUnder: number;
		totalOpportunityCostLost: number;
		totalOpportunityCostGained: number;
		overallTrend: 'improving' | 'worsening' | 'stable';
		overallTrendAmount: number;
	}

	let budgets = $state<BudgetWithProgress[]>([]);
	let summary = $state<BudgetSummary | null>(null);
	let loading = $state(true);
	let showAddModal = $state(false);
	let showQuickSetup = $state(false);
	let showQuickAdd = $state(false);
	let editingBudget = $state<BudgetWithProgress | null>(null);
	
	// Form state
	let newCategory = $state('');
	let newLimit = $state(500);
	let saving = $state(false);

	// Quick Setup state - bulk budget creation
	let quickSetupBudgets = $state<Record<string, number>>({});
	
	// Quick Add Transaction state
	let quickAddAmount = $state<number>(0);
	let quickAddCategory = $state('');
	let quickAddMerchant = $state('');
	let quickAddDate = $state(new Date().toISOString().slice(0, 10));

	// Get categories that don't have budgets yet
	let availableCategories = $derived(
		CATEGORIES.filter(cat => cat !== 'Uncategorized' && !budgets.some(b => b.category === cat))
	);
	
	// Get all categories for quick add (including ones with budgets)
	let allCategories = $derived(
		CATEGORIES.filter(cat => cat !== 'Uncategorized')
	);

	function formatCurrency(amount: number): string {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		}).format(amount);
	}

	// Calculate compound growth: monthly contributions at 7% annual return
	function calculateFutureValue(monthlyAmount: number, years: number = 10): number {
		let total = 0;
		for (let month = 0; month < years * 12; month++) {
			total = (total + monthlyAmount) * Math.pow(1.07, 1 / 12);
		}
		return Math.round(total);
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

	async function loadBudgets() {
		loading = true;
		try {
			const res = await fetch('/api/budgets');
			const json = await res.json();
			if (json.ok) {
				budgets = json.data.budgets;
				summary = json.data.summary;
			}
		} catch (e) {
			console.error('Failed to load budgets:', e);
		}
		loading = false;
	}

	async function saveBudget() {
		if (!newCategory || newLimit <= 0) return;
		
		saving = true;
		try {
			const res = await fetch('/api/budgets', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					category: newCategory,
					monthlyLimit: newLimit
				})
			});
			
			if (res.ok) {
				showAddModal = false;
				newCategory = '';
				newLimit = 500;
				await loadBudgets();
			}
		} catch (e) {
			console.error('Failed to save budget:', e);
		}
		saving = false;
	}

	async function updateBudget() {
		if (!editingBudget || editingBudget.monthlyLimit <= 0) return;
		
		saving = true;
		try {
			const res = await fetch(`/api/budgets/${editingBudget.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					monthlyLimit: editingBudget.monthlyLimit
				})
			});
			
			if (res.ok) {
				editingBudget = null;
				await loadBudgets();
			}
		} catch (e) {
			console.error('Failed to update budget:', e);
		}
		saving = false;
	}

	async function deleteBudget(id: string) {
		if (!confirm('Remove this budget?')) return;
		
		try {
			await fetch(`/api/budgets/${id}`, { method: 'DELETE' });
			await loadBudgets();
		} catch (e) {
			console.error('Failed to delete budget:', e);
		}
	}

	function initQuickSetup() {
		// Pre-populate with common categories and suggested limits
		const suggestions: Record<string, number> = {
			'Groceries': 600,
			'Dining & Restaurants': 300,
			'Coffee & Drinks': 100,
			'Auto & Transport': 400,
			'Shopping': 200,
			'Entertainment': 150,
			'Subscriptions': 100,
			'Personal Care': 100
		};
		
		quickSetupBudgets = {};
		for (const cat of availableCategories) {
			quickSetupBudgets[cat] = suggestions[cat] || 200;
		}
		showQuickSetup = true;
	}

	async function saveQuickSetup() {
		saving = true;
		const categoriesToSave = Object.entries(quickSetupBudgets).filter(([_, limit]) => limit > 0);
		
		for (const [category, monthlyLimit] of categoriesToSave) {
			try {
				await fetch('/api/budgets', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ category, monthlyLimit })
				});
			} catch (e) {
				console.error(`Failed to save budget for ${category}:`, e);
			}
		}
		
		showQuickSetup = false;
		quickSetupBudgets = {};
		await loadBudgets();
		saving = false;
	}

	async function saveQuickAdd() {
		if (!quickAddAmount || quickAddAmount <= 0 || !quickAddCategory) return;
		
		saving = true;
		try {
			const res = await fetch('/api/transactions/quick-add', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					amount: quickAddAmount,
					category: quickAddCategory,
					merchant: quickAddMerchant || quickAddCategory,
					date: quickAddDate
				})
			});
			
			if (res.ok) {
				showQuickAdd = false;
				quickAddAmount = 0;
				quickAddMerchant = '';
				quickAddDate = new Date().toISOString().slice(0, 10);
				await loadBudgets(); // Refresh to show updated spending
			}
		} catch (e) {
			console.error('Failed to add transaction:', e);
		}
		saving = false;
	}

	onMount(() => {
		initTheme();
		isDark = getTheme() === 'dark';
		loadBudgets();
	});

	// Get encouraging message based on overall status
	function getEncouragingMessage(): { icon: string; message: string; subtext: string } {
		if (!summary) return { icon: 'fa-chart-line', message: 'Set up your first budget', subtext: 'Every dollar you save is a dollar invested in your future' };
		
		if (summary.overallTrend === 'improving') {
			// Calculate what the trend improvement would be worth if invested
			const trendFutureValue = summary.overallTrendAmount * Math.pow(1.07, 10);
			return {
				icon: 'fa-fire',
				message: `You're crushing it!`,
				subtext: `${formatCurrency(Math.abs(summary.overallTrendAmount))} less than last month → ${formatCurrency(Math.round(trendFutureValue))} if invested`
			};
		} else if (summary.overallTrend === 'worsening') {
			// Calculate what the trend worsening costs in opportunity cost
			const trendOpportunityCost = Math.abs(summary.overallTrendAmount) * Math.pow(1.07, 10);
			return {
				icon: 'fa-triangle-exclamation',
				message: 'Time to refocus',
				subtext: `${formatCurrency(Math.abs(summary.overallTrendAmount))} more than last month → ${formatCurrency(Math.round(trendOpportunityCost))} opportunity cost`
			};
		} else if (summary.totalOverUnder > 0) {
			return {
				icon: 'fa-seedling',
				message: 'On track!',
				subtext: `${formatCurrency(summary.totalRemaining)} left this month → ${formatCurrency(summary.totalOpportunityCostGained)} if invested`
			};
		}
		
		return {
			icon: 'fa-bullseye',
			message: 'Keep going',
			subtext: 'Small wins compound into big results'
		};
	}

	function getProgressColor(percentUsed: number): string {
		if (percentUsed >= 100) return '#ef4444'; // red
		if (percentUsed >= 80) return '#f59e0b'; // amber
		return '#0d9488'; // teal
	}

	function getTrendIcon(trend: 'improving' | 'worsening' | 'stable'): string {
		if (trend === 'improving') return 'fa-arrow-trend-down';
		if (trend === 'worsening') return 'fa-arrow-trend-up';
		return 'fa-minus';
	}

	function getTrendColor(trend: 'improving' | 'worsening' | 'stable'): string {
		if (trend === 'improving') return '#10b981';
		if (trend === 'worsening') return '#ef4444';
		return '#6b7280';
	}
</script>

<svelte:head>
	<title>Budgets | SpentWorth</title>
</svelte:head>

<div class="min-h-screen" style="background: {isDark ? 'var(--sw-bg)' : '#f5f0e8'}">
	<Header />
	
	<main class="max-w-5xl mx-auto px-4 py-6 sm:py-8">
		<!-- Page Header -->
		<div class="mb-6 sm:mb-8">
			<h1 class="font-display text-2xl sm:text-3xl font-bold mb-2" style="color: {isDark ? '#ffffff' : '#171717'}">
				Your Budgets
			</h1>
			<p class="text-sm sm:text-base" style="color: {isDark ? '#a3a3a3' : '#525252'}">
				Every dollar under budget is a dollar invested in your future
			</p>
		</div>

		{#if loading}
			<div class="flex items-center justify-center py-20">
				<i class="fa-solid fa-spinner fa-spin text-2xl text-sw-accent"></i>
			</div>
		{:else}
			<!-- Encouraging Message Banner -->
			{@const encouragement = getEncouragingMessage()}
			<div class="rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8" style="background: {isDark ? 'rgba(13,148,136,0.1)' : 'rgba(13,148,136,0.08)'}; border: 1px solid {isDark ? 'rgba(13,148,136,0.3)' : 'rgba(13,148,136,0.2)'}">
				<div class="flex items-start gap-4">
					<div class="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style="background: {isDark ? 'rgba(13,148,136,0.2)' : 'rgba(13,148,136,0.15)'}">
						<i class="fa-solid {encouragement.icon} text-xl text-sw-accent"></i>
					</div>
					<div>
						<h2 class="font-display font-semibold text-lg sm:text-xl mb-1" style="color: {isDark ? '#ffffff' : '#171717'}">
							{encouragement.message}
						</h2>
						<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#525252'}">
							{encouragement.subtext}
						</p>
					</div>
				</div>
			</div>

			<!-- Summary Cards -->
			{#if summary && budgets.length > 0}
				<div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
					<div class="rounded-xl p-4" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
						<p class="text-xs mb-1" style="color: {isDark ? '#a3a3a3' : '#737373'}">Total Budget</p>
						<p class="font-mono text-lg sm:text-xl font-semibold" style="color: {isDark ? '#ffffff' : '#171717'}">{formatCurrency(summary.totalBudget)}</p>
					</div>
					<div class="rounded-xl p-4" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
						<p class="text-xs mb-1" style="color: {isDark ? '#a3a3a3' : '#737373'}">Spent This Month</p>
						<p class="font-mono text-lg sm:text-xl font-semibold" style="color: {isDark ? '#ffffff' : '#171717'}">{formatCurrency(summary.totalSpent)}</p>
					</div>
					<div class="rounded-xl p-4" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
						<p class="text-xs mb-1" style="color: {isDark ? '#a3a3a3' : '#737373'}">Remaining</p>
						<p class="font-mono text-lg sm:text-xl font-semibold" style="color: {summary.totalRemaining > 0 ? '#10b981' : '#ef4444'}">{formatCurrency(summary.totalRemaining)}</p>
					</div>
					<div class="rounded-xl p-4" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
						<p class="text-xs mb-1" style="color: {isDark ? '#a3a3a3' : '#737373'}">
							{summary.totalOverUnder >= 0 ? 'Potential Gain' : 'Opportunity Cost'}
						</p>
						<p class="font-mono text-lg sm:text-xl font-semibold" style="color: {summary.totalOverUnder >= 0 ? '#0d9488' : '#ef4444'}">
							{summary.totalOverUnder >= 0 ? formatCurrency(summary.totalOpportunityCostGained) : formatCurrency(summary.totalOpportunityCostLost)}
						</p>
						<p class="text-[10px]" style="color: {isDark ? '#737373' : '#9ca3af'}">in 10 years @ 7%</p>
					</div>
				</div>
			{/if}

			<!-- Charts Section -->
			{#if summary && budgets.length > 0}
				<div class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
					<!-- Budget Usage Donut Chart -->
					<div class="rounded-2xl p-4 sm:p-6" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}; box-shadow: {isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.06)'}">
						<h3 class="font-display font-semibold mb-4 text-base sm:text-lg" style="color: {isDark ? '#ffffff' : '#171717'}">Budget Usage</h3>
						<div class="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
							<div class="relative flex-shrink-0">
								{#if summary}
									{@const spentPercent = summary.totalBudget > 0 ? (summary.totalSpent / summary.totalBudget) * 360 : 0}
									{@const remainingPercent = summary.totalBudget > 0 ? (summary.totalRemaining / summary.totalBudget) * 360 : 0}
									<svg viewBox="0 0 200 200" class="w-32 h-32 sm:w-44 sm:h-44">
									{#if spentPercent > 0}
										<path d={getDonutPath(0, spentPercent)} fill="#ef4444" class="hover:opacity-80 transition-opacity">
											<title>Spent: {formatCurrency(summary.totalSpent)}</title>
										</path>
									{/if}
									{#if remainingPercent > 0}
										<path d={getDonutPath(spentPercent, spentPercent + remainingPercent)} fill="#10b981" class="hover:opacity-80 transition-opacity">
											<title>Remaining: {formatCurrency(summary.totalRemaining)}</title>
										</path>
									{/if}
										<text x="100" y="95" text-anchor="middle" class="text-[10px] sm:text-xs" style="fill: {isDark ? '#a3a3a3' : '#737373'}">Used</text>
										<text x="100" y="115" text-anchor="middle" class="font-display font-bold text-sm sm:text-base" style="fill: {isDark ? '#ffffff' : '#171717'}">{summary.totalBudget > 0 ? Math.round((summary.totalSpent / summary.totalBudget) * 100) : 0}%</text>
									</svg>
								{/if}
							</div>
							<div class="flex-1 w-full space-y-2">
								<div class="flex items-center gap-2">
									<div class="w-3 h-3 rounded-sm" style="background: #ef4444"></div>
									<span class="text-sm flex-1" style="color: {isDark ? '#ffffff' : '#171717'}">Spent</span>
									<span class="font-mono text-xs" style="color: {isDark ? '#a3a3a3' : '#737373'}">{formatCurrency(summary.totalSpent)}</span>
								</div>
								<div class="flex items-center gap-2">
									<div class="w-3 h-3 rounded-sm" style="background: #10b981"></div>
									<span class="text-sm flex-1" style="color: {isDark ? '#ffffff' : '#171717'}">Remaining</span>
									<span class="font-mono text-xs" style="color: {isDark ? '#a3a3a3' : '#737373'}">{formatCurrency(summary.totalRemaining)}</span>
								</div>
							</div>
						</div>
					</div>

					<!-- Budget vs Spent Bar Chart -->
					<div class="rounded-2xl p-4 sm:p-6" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}; box-shadow: {isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.06)'}">
						<h3 class="font-display font-semibold mb-4 text-base sm:text-lg" style="color: {isDark ? '#ffffff' : '#171717'}">Budget vs Spent</h3>
						{#if budgets.length > 0}
							{@const chartBudgets = budgets.slice(0, 8)}
							{@const maxBudget = chartBudgets.length > 0 ? Math.max(...chartBudgets.map(b => Math.max(b.monthlyLimit || 0, b.currentSpent || 0, 1)), 1) : 1}
							<div class="h-48 sm:h-56 flex items-end gap-1.5 sm:gap-2">
							{#each chartBudgets as budget}
								{@const budgetHeight = maxBudget > 0 ? ((budget.monthlyLimit || 0) / maxBudget) * 100 : 0}
								{@const spentHeight = maxBudget > 0 ? ((budget.currentSpent || 0) / maxBudget) * 100 : 0}
								{@const isOver = (budget.currentSpent || 0) > (budget.monthlyLimit || 0)}
								<div class="flex-1 flex flex-col items-center gap-1 group relative">
									<div class="w-full flex flex-col items-center justify-end" style="height: 180px;">
										<!-- Budget limit bar (background) -->
										<div 
											class="w-full rounded-t transition-all"
											style="height: {Math.max(budgetHeight, 2)}%; background: {isDark ? '#2a2a2a' : '#e5e5e5'}; opacity: 0.3;"
										></div>
										<!-- Spent bar (foreground) -->
										<div 
											class="w-full rounded-t transition-all relative group-hover:opacity-90"
											style="height: {Math.max(spentHeight, 2)}%; background: {isOver ? '#ef4444' : '#0d9488'}; margin-top: -{Math.max(spentHeight, 2)}%;"
										>
											<div class="absolute -top-12 left-1/2 -translate-x-1/2 rounded px-2 py-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none" style="background: {isDark ? '#0a0a0a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
												<p class="font-medium" style="color: {isDark ? '#ffffff' : '#171717'}">{budget.category}</p>
												<p style="color: {isDark ? '#a3a3a3' : '#737373'}">Spent: {formatCurrency(budget.currentSpent)}</p>
												<p style="color: {isDark ? '#a3a3a3' : '#737373'}">Budget: {formatCurrency(budget.monthlyLimit)}</p>
											</div>
										</div>
									</div>
									<span class="text-[9px] sm:text-[10px] truncate w-full text-center" style="color: {isDark ? '#a3a3a3' : '#737373'}" title={budget.category}>
										{budget.category.split(' ')[0]}
									</span>
								</div>
							{/each}
							</div>
						{/if}
					</div>
				</div>
			{/if}

			<!-- Budget Cards -->
			<div class="space-y-4 mb-6">
				{#each budgets as budget}
					<div class="rounded-2xl overflow-hidden" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}; box-shadow: {isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.04)'}">
						<div class="p-4 sm:p-5">
							<!-- Header Row -->
							<div class="flex items-start justify-between mb-3">
								<div class="flex-1 min-w-0">
									<div class="flex items-center gap-2 mb-1">
										<h3 class="font-display font-semibold text-base sm:text-lg truncate" style="color: {isDark ? '#ffffff' : '#171717'}">
											{budget.category}
										</h3>
										{#if budget.trend !== 'stable'}
											<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs" style="background: {getTrendColor(budget.trend)}20; color: {getTrendColor(budget.trend)}">
												<i class="fa-solid {getTrendIcon(budget.trend)} text-[10px]"></i>
												{budget.trend === 'improving' ? 'Improving' : 'Watch out'}
											</span>
										{/if}
									</div>
									<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">
										{formatCurrency(budget.currentSpent)} of {formatCurrency(budget.monthlyLimit)}
									</p>
								</div>
								<div class="flex items-center gap-2">
									<button 
										onclick={() => editingBudget = { ...budget }}
										class="p-2 rounded-lg transition-colors hover:bg-sw-surface/50"
										style="color: {isDark ? '#a3a3a3' : '#737373'}"
									>
										<i class="fa-solid fa-pen text-sm"></i>
									</button>
									<button 
										onclick={() => deleteBudget(budget.id)}
										class="p-2 rounded-lg transition-colors hover:bg-red-500/10"
										style="color: {isDark ? '#a3a3a3' : '#737373'}"
									>
										<i class="fa-solid fa-trash text-sm"></i>
									</button>
								</div>
							</div>

							<!-- Progress Bar -->
							<div class="mb-3">
								<div class="h-3 rounded-full overflow-hidden" style="background: {isDark ? '#0a0a0a' : '#f0ebe3'}">
									<div 
										class="h-full rounded-full transition-all duration-500"
										style="width: {Math.min(budget.percentUsed, 100)}%; background: {getProgressColor(budget.percentUsed)}"
									></div>
								</div>
								<div class="flex justify-between mt-1">
									<span class="text-xs" style="color: {isDark ? '#737373' : '#9ca3af'}">{budget.percentUsed}% used</span>
									<span class="text-xs" style="color: {isDark ? '#737373' : '#9ca3af'}">{formatCurrency(budget.remaining)} left</span>
								</div>
							</div>

							<!-- Opportunity Cost Message -->
							<div class="rounded-xl p-3" style="background: {isDark ? 'rgba(10,10,10,0.5)' : '#f9f6f1'}">
								{#if budget.overUnder >= 0}
									<div class="flex items-center gap-2">
										<i class="fa-solid fa-piggy-bank text-sw-accent"></i>
										<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#525252'}">
											Invest the 
											<span class="font-semibold text-sw-accent">{formatCurrency(budget.remaining)}</span> 
											left this month → 
											<span class="font-semibold text-sw-accent">{formatCurrency(budget.opportunityCostGained)}</span> in 10 years
										</p>
									</div>
								{:else}
									<div class="flex items-center gap-2">
										<i class="fa-solid fa-triangle-exclamation text-amber-500"></i>
										<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#525252'}">
											Over by 
											<span class="font-semibold text-red-500">{formatCurrency(Math.abs(budget.overUnder))}</span>
											→ 
											<span class="font-semibold text-red-500">{formatCurrency(budget.opportunityCostLost)}</span> lost opportunity
										</p>
									</div>
								{/if}

								{#if budget.trendAmount !== 0}
									<p class="text-xs mt-2" style="color: {isDark ? '#737373' : '#9ca3af'}">
										{#if budget.trendAmount > 0}
											<i class="fa-solid fa-arrow-down text-green-500"></i>
											{formatCurrency(budget.trendAmount)} less than last month — keep it up!
										{:else}
											<i class="fa-solid fa-arrow-up text-red-500"></i>
											{formatCurrency(Math.abs(budget.trendAmount))} more than last month
										{/if}
									</p>
								{/if}
							</div>
						</div>
					</div>
				{/each}
			</div>

			<!-- Action Buttons -->
			<div class="flex flex-col sm:flex-row gap-3 mb-6">
				<!-- Quick Add Transaction -->
				<button 
					onclick={() => { showQuickAdd = true; quickAddCategory = budgets[0]?.category || allCategories[0]; }}
					class="flex-1 rounded-xl p-4 flex items-center justify-center gap-3 transition-all hover:scale-[1.01]"
					style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}"
				>
					<i class="fa-solid fa-receipt" style="color: {isDark ? '#a3a3a3' : '#737373'}"></i>
					<span class="font-display font-semibold" style="color: {isDark ? '#ffffff' : '#171717'}">Log Spending</span>
				</button>
				
				{#if availableCategories.length > 0}
					<!-- Add Single Budget (Primary) -->
					<button 
						onclick={() => { showAddModal = true; newCategory = availableCategories[0]; }}
						class="flex-1 rounded-xl p-4 flex items-center justify-center gap-3 transition-all hover:scale-[1.01] btn-primary"
					>
						<i class="fa-solid fa-plus"></i>
						<span class="font-display font-semibold">Add Budget</span>
					</button>
					
					<!-- Quick Setup (Secondary/Outlined) -->
					{#if availableCategories.length >= 3}
						<button 
							onclick={initQuickSetup}
							class="flex-1 rounded-xl p-4 flex items-center justify-center gap-3 transition-all hover:scale-[1.01]"
							style="background: transparent; border: 2px dashed {isDark ? '#404040' : '#d4cfc5'}"
						>
							<i class="fa-solid fa-layer-group" style="color: {isDark ? '#a3a3a3' : '#737373'}"></i>
							<span class="font-display font-semibold" style="color: {isDark ? '#a3a3a3' : '#737373'}">Quick Setup</span>
						</button>
					{/if}
				{/if}
			</div>

			<!-- All Categories Budgeted -->
			{#if availableCategories.length === 0 && budgets.length > 0}
				<div class="text-center py-4 mb-6 rounded-xl" style="background: {isDark ? 'rgba(16,185,129,0.1)' : 'rgba(16,185,129,0.08)'}">
					<i class="fa-solid fa-check-circle text-2xl text-green-500 mb-2"></i>
					<p class="font-display font-semibold" style="color: {isDark ? '#ffffff' : '#171717'}">All categories budgeted!</p>
				</div>
			{/if}

			<!-- Empty State -->
			{#if budgets.length === 0 && !loading}
				<div class="text-center py-12 sm:py-16">
					<div class="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center" style="background: {isDark ? 'rgba(13,148,136,0.1)' : 'rgba(13,148,136,0.08)'}">
						<i class="fa-solid fa-wallet text-3xl text-sw-accent"></i>
					</div>
					<h2 class="font-display text-xl font-semibold mb-2" style="color: {isDark ? '#ffffff' : '#171717'}">
						Start your journey
					</h2>
					<p class="text-sm mb-6 max-w-md mx-auto" style="color: {isDark ? '#a3a3a3' : '#737373'}">
						Set spending limits for your categories. Every dollar you don't spend is a dollar invested in your future self.
					</p>
					<button 
						onclick={() => { showAddModal = true; newCategory = availableCategories[0] || ''; }}
						class="btn-primary px-6 py-3"
					>
						<i class="fa-solid fa-plus mr-2"></i>
						Create Your First Budget
					</button>
				</div>
			{/if}
		{/if}
	</main>
</div>

<!-- Add Budget Modal -->
{#if showAddModal}
	<div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
		<div class="rounded-2xl max-w-md w-full p-6" style="background: {isDark ? '#1a1a1a' : '#ffffff'}">
			<h2 class="font-display text-xl font-semibold mb-4" style="color: {isDark ? '#ffffff' : '#171717'}">
				Create Budget
			</h2>
			
			<div class="space-y-4">
				<div>
					<label class="block text-sm mb-2" style="color: {isDark ? '#a3a3a3' : '#737373'}">Category</label>
					<select 
						bind:value={newCategory}
						class="w-full px-4 py-3 rounded-xl text-base"
						style="background: {isDark ? '#0a0a0a' : '#f5f0e8'}; border: 1px solid {isDark ? '#2a2a2a' : '#d4cfc5'}; color: {isDark ? '#ffffff' : '#171717'}"
					>
						{#each availableCategories as category}
							<option value={category}>{category}</option>
						{/each}
					</select>
				</div>
				
				<div>
					<label class="block text-sm mb-2" style="color: {isDark ? '#a3a3a3' : '#737373'}">Monthly Limit</label>
					<div class="flex items-center rounded-xl overflow-hidden" style="background: {isDark ? '#0a0a0a' : '#f5f0e8'}; border: 1px solid {isDark ? '#2a2a2a' : '#d4cfc5'}">
						<span class="px-4 text-lg" style="color: {isDark ? '#737373' : '#9ca3af'}">$</span>
						<input 
							type="number" 
							bind:value={newLimit}
							min="1"
							class="flex-1 px-2 py-3 text-lg bg-transparent outline-none"
							style="color: {isDark ? '#ffffff' : '#171717'}"
						/>
					</div>
				</div>

				<!-- Preview -->
				<div class="rounded-xl p-4" style="background: {isDark ? 'rgba(13,148,136,0.1)' : 'rgba(13,148,136,0.08)'}">
					<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#525252'}">
						<i class="fa-solid fa-lightbulb text-sw-accent mr-2"></i>
						Every dollar you save from this budget and invest could grow to 
						<span class="font-semibold text-sw-accent">{formatCurrency(calculateFutureValue(newLimit))}</span> in 10 years at 7% return
					</p>
				</div>
			</div>

			<div class="flex gap-3 mt-6">
				<button 
					onclick={() => showAddModal = false}
					class="flex-1 px-4 py-3 rounded-xl font-display font-semibold transition-colors"
					style="background: {isDark ? '#2a2a2a' : '#e5e5e5'}; color: {isDark ? '#ffffff' : '#171717'}"
				>
					Cancel
				</button>
				<button 
					onclick={saveBudget}
					disabled={saving || !newCategory || newLimit <= 0}
					class="flex-1 btn-primary py-3"
				>
					{#if saving}
						<i class="fa-solid fa-spinner fa-spin mr-2"></i>
					{/if}
					Create Budget
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Edit Budget Modal -->
{#if editingBudget}
	<div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
		<div class="rounded-2xl max-w-md w-full p-6" style="background: {isDark ? '#1a1a1a' : '#ffffff'}">
			<h2 class="font-display text-xl font-semibold mb-4" style="color: {isDark ? '#ffffff' : '#171717'}">
				Edit {editingBudget.category} Budget
			</h2>
			
			<div class="space-y-4">
				<div>
					<label class="block text-sm mb-2" style="color: {isDark ? '#a3a3a3' : '#737373'}">Monthly Limit</label>
					<div class="flex items-center rounded-xl overflow-hidden" style="background: {isDark ? '#0a0a0a' : '#f5f0e8'}; border: 1px solid {isDark ? '#2a2a2a' : '#d4cfc5'}">
						<span class="px-4 text-lg" style="color: {isDark ? '#737373' : '#9ca3af'}">$</span>
						<input 
							type="number" 
							bind:value={editingBudget.monthlyLimit}
							min="1"
							class="flex-1 px-2 py-3 text-lg bg-transparent outline-none"
							style="color: {isDark ? '#ffffff' : '#171717'}"
						/>
					</div>
				</div>

				<div class="rounded-xl p-4" style="background: {isDark ? 'rgba(10,10,10,0.5)' : '#f9f6f1'}">
					<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#525252'}">
						Currently spent: <span class="font-semibold">{formatCurrency(editingBudget.currentSpent)}</span>
					</p>
					<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#525252'}">
						Last month: <span class="font-semibold">{formatCurrency(editingBudget.previousSpent)}</span>
					</p>
				</div>
			</div>

			<div class="flex gap-3 mt-6">
				<button 
					onclick={() => editingBudget = null}
					class="flex-1 px-4 py-3 rounded-xl font-display font-semibold transition-colors"
					style="background: {isDark ? '#2a2a2a' : '#e5e5e5'}; color: {isDark ? '#ffffff' : '#171717'}"
				>
					Cancel
				</button>
				<button 
					onclick={updateBudget}
					disabled={saving || editingBudget.monthlyLimit <= 0}
					class="flex-1 btn-primary py-3"
				>
					{#if saving}
						<i class="fa-solid fa-spinner fa-spin mr-2"></i>
					{/if}
					Save Changes
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Quick Setup Modal (Bulk Budget Creation) -->
{#if showQuickSetup}
	<div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
		<div class="rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col" style="background: {isDark ? '#1a1a1a' : '#ffffff'}">
			<div class="p-6 border-b" style="border-color: {isDark ? '#2a2a2a' : '#e5e5e5'}">
				<h2 class="font-display text-xl font-semibold mb-1" style="color: {isDark ? '#ffffff' : '#171717'}">
					<i class="fa-solid fa-bolt text-amber-500 mr-2"></i>
					Quick Setup
				</h2>
				<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">
					Set limits for multiple categories at once. Set to $0 to skip.
				</p>
			</div>
			
			<div class="flex-1 overflow-y-auto p-6 space-y-3">
				{#each Object.entries(quickSetupBudgets) as [category, limit]}
					<div class="flex items-center gap-3 p-3 rounded-xl" style="background: {isDark ? '#0a0a0a' : '#f9f6f1'}">
						<span class="flex-1 text-sm font-medium truncate" style="color: {isDark ? '#ffffff' : '#171717'}">{category}</span>
						<div class="flex items-center rounded-lg overflow-hidden w-28" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#d4cfc5'}">
							<span class="px-2 text-sm" style="color: {isDark ? '#737373' : '#9ca3af'}">$</span>
							<input 
								type="number" 
								value={limit}
								oninput={(e) => quickSetupBudgets[category] = parseInt(e.currentTarget.value) || 0}
								min="0"
								step="50"
								class="w-full px-1 py-2 text-sm bg-transparent outline-none text-right"
								style="color: {isDark ? '#ffffff' : '#171717'}"
							/>
						</div>
					</div>
				{/each}
			</div>

			<div class="p-6 border-t" style="border-color: {isDark ? '#2a2a2a' : '#e5e5e5'}; background: {isDark ? 'rgba(10,10,10,0.5)' : '#f9f6f1'}">
				<div class="mb-4 text-center">
					<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">
						Total monthly budget: 
						<span class="font-semibold" style="color: {isDark ? '#ffffff' : '#171717'}">
							{formatCurrency(Object.values(quickSetupBudgets).reduce((a, b) => a + b, 0))}
						</span>
					</p>
				</div>
				<div class="flex gap-3">
					<button 
						onclick={() => showQuickSetup = false}
						class="flex-1 px-4 py-3 rounded-xl font-display font-semibold transition-colors"
						style="background: {isDark ? '#2a2a2a' : '#e5e5e5'}; color: {isDark ? '#ffffff' : '#171717'}"
					>
						Cancel
					</button>
					<button 
						onclick={saveQuickSetup}
						disabled={saving}
						class="flex-1 btn-primary py-3"
					>
						{#if saving}
							<i class="fa-solid fa-spinner fa-spin mr-2"></i>
						{/if}
						Create {Object.values(quickSetupBudgets).filter(v => v > 0).length} Budgets
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Quick Add Transaction Modal -->
{#if showQuickAdd}
	<div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
		<div class="rounded-2xl max-w-md w-full p-6" style="background: {isDark ? '#1a1a1a' : '#ffffff'}">
			<h2 class="font-display text-xl font-semibold mb-1" style="color: {isDark ? '#ffffff' : '#171717'}">
				<i class="fa-solid fa-receipt text-sw-accent mr-2"></i>
				Log Spending
			</h2>
			<p class="text-sm mb-4" style="color: {isDark ? '#a3a3a3' : '#737373'}">
				Quickly add a transaction without importing a CSV
			</p>
			
			<div class="space-y-4">
				<div>
					<label class="block text-sm mb-2" style="color: {isDark ? '#a3a3a3' : '#737373'}">Amount</label>
					<div class="flex items-center rounded-xl overflow-hidden" style="background: {isDark ? '#0a0a0a' : '#f5f0e8'}; border: 1px solid {isDark ? '#2a2a2a' : '#d4cfc5'}">
						<span class="px-4 text-lg" style="color: {isDark ? '#737373' : '#9ca3af'}">$</span>
						<input 
							type="number" 
							bind:value={quickAddAmount}
							min="0.01"
							step="0.01"
							placeholder="0.00"
							class="flex-1 px-2 py-3 text-lg bg-transparent outline-none"
							style="color: {isDark ? '#ffffff' : '#171717'}"
						/>
					</div>
				</div>

				<div>
					<label class="block text-sm mb-2" style="color: {isDark ? '#a3a3a3' : '#737373'}">Category</label>
					<select 
						bind:value={quickAddCategory}
						class="w-full px-4 py-3 rounded-xl text-base"
						style="background: {isDark ? '#0a0a0a' : '#f5f0e8'}; border: 1px solid {isDark ? '#2a2a2a' : '#d4cfc5'}; color: {isDark ? '#ffffff' : '#171717'}"
					>
						{#each allCategories as category}
							<option value={category}>{category}</option>
						{/each}
					</select>
				</div>

				<div>
					<label class="block text-sm mb-2" style="color: {isDark ? '#a3a3a3' : '#737373'}">Merchant (optional)</label>
					<input 
						type="text" 
						bind:value={quickAddMerchant}
						placeholder="e.g., Kroger, Amazon..."
						class="w-full px-4 py-3 rounded-xl text-base"
						style="background: {isDark ? '#0a0a0a' : '#f5f0e8'}; border: 1px solid {isDark ? '#2a2a2a' : '#d4cfc5'}; color: {isDark ? '#ffffff' : '#171717'}"
					/>
				</div>

				<div>
					<label class="block text-sm mb-2" style="color: {isDark ? '#a3a3a3' : '#737373'}">Date</label>
					<input 
						type="date" 
						bind:value={quickAddDate}
						class="w-full px-4 py-3 rounded-xl text-base"
						style="background: {isDark ? '#0a0a0a' : '#f5f0e8'}; border: 1px solid {isDark ? '#2a2a2a' : '#d4cfc5'}; color: {isDark ? '#ffffff' : '#171717'}"
					/>
				</div>
			</div>

			<div class="flex gap-3 mt-6">
				<button 
					onclick={() => showQuickAdd = false}
					class="flex-1 px-4 py-3 rounded-xl font-display font-semibold transition-colors"
					style="background: {isDark ? '#2a2a2a' : '#e5e5e5'}; color: {isDark ? '#ffffff' : '#171717'}"
				>
					Cancel
				</button>
				<button 
					onclick={saveQuickAdd}
					disabled={saving || !quickAddAmount || quickAddAmount <= 0 || !quickAddCategory}
					class="flex-1 btn-primary py-3"
				>
					{#if saving}
						<i class="fa-solid fa-spinner fa-spin mr-2"></i>
					{/if}
					Add Transaction
				</button>
			</div>
		</div>
	</div>
{/if}

