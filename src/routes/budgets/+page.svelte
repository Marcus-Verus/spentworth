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
	let editingBudget = $state<BudgetWithProgress | null>(null);
	
	// Form state
	let newCategory = $state('');
	let newLimit = $state(500);
	let saving = $state(false);

	// Get categories that don't have budgets yet
	let availableCategories = $derived(
		CATEGORIES.filter(cat => cat !== 'Uncategorized' && !budgets.some(b => b.category === cat))
	);

	function formatCurrency(amount: number): string {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		}).format(amount);
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

	onMount(() => {
		initTheme();
		const unsubscribe = getTheme().subscribe(value => {
			isDark = value;
		});
		loadBudgets();
		return unsubscribe;
	});

	// Get encouraging message based on overall status
	function getEncouragingMessage(): { icon: string; message: string; subtext: string } {
		if (!summary) return { icon: 'fa-chart-line', message: 'Set up your first budget', subtext: 'Every dollar you save is a dollar invested in your future' };
		
		if (summary.overallTrend === 'improving') {
			return {
				icon: 'fa-fire',
				message: `You're crushing it!`,
				subtext: `${formatCurrency(Math.abs(summary.overallTrendAmount))} less than last month → ${formatCurrency(summary.totalOpportunityCostGained)} in 10 years`
			};
		} else if (summary.overallTrend === 'worsening') {
			return {
				icon: 'fa-triangle-exclamation',
				message: 'Time to refocus',
				subtext: `${formatCurrency(Math.abs(summary.overallTrendAmount))} more than last month → ${formatCurrency(summary.totalOpportunityCostLost)} opportunity cost`
			};
		} else if (summary.totalOverUnder > 0) {
			return {
				icon: 'fa-seedling',
				message: 'On track!',
				subtext: `${formatCurrency(summary.totalRemaining)} left to spend → ${formatCurrency(summary.totalOpportunityCostGained)} if you stay under`
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
											Stay under budget and invest the 
											<span class="font-semibold text-sw-accent">{formatCurrency(budget.remaining)}</span> 
											→ 
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

			<!-- Add Budget Button -->
			{#if availableCategories.length > 0}
				<button 
					onclick={() => { showAddModal = true; newCategory = availableCategories[0]; }}
					class="w-full rounded-2xl p-4 sm:p-5 flex items-center justify-center gap-3 transition-all hover:scale-[1.01]"
					style="background: {isDark ? 'rgba(13,148,136,0.1)' : 'rgba(13,148,136,0.08)'}; border: 2px dashed {isDark ? 'rgba(13,148,136,0.4)' : 'rgba(13,148,136,0.3)'}"
				>
					<i class="fa-solid fa-plus text-sw-accent"></i>
					<span class="font-display font-semibold text-sw-accent">Add Budget</span>
				</button>
			{:else if budgets.length > 0}
				<div class="text-center py-8">
					<i class="fa-solid fa-check-circle text-3xl text-sw-accent mb-3"></i>
					<p class="font-display font-semibold" style="color: {isDark ? '#ffffff' : '#171717'}">All categories budgeted!</p>
					<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">You've got budgets for every spending category</p>
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
						If you stay under {formatCurrency(newLimit)}/month and invest the difference, 
						that's <span class="font-semibold text-sw-accent">{formatCurrency(newLimit * 12 * 10 * 1.5)}</span> potential growth in 10 years
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

