<script lang="ts">
	import { onMount } from 'svelte';
	import Header from '$lib/components/Header.svelte';
	import { initTheme, getTheme, setTheme } from '$lib/stores/theme';
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
	let animatedHealthScore = $state(0);
	let animatedVelocity = $state(0);
	let saveError = $state<string | null>(null);
	
	// Tier usage info
	let tierUsage = $state<{
		plan: 'free' | 'pro';
		isProActive: boolean;
		budgets: { used: number; limit: number | null };
	} | null>(null);
	
	// Form state
	let newCategory = $state('');
	let newLimit = $state(500);
	let saving = $state(false);
	let useCustomCategory = $state(false);
	let customCategoryName = $state('');

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

	// Calculate budget health score (0-100)
	let healthScore = $derived.by(() => {
		if (!summary || !budgets.length) return 0;
		
		let score = 50; // Base score
		
		// Factor 1: Overall spending vs budget (40 points)
		const overallRatio = summary.totalBudget > 0 ? summary.totalSpent / summary.totalBudget : 1;
		if (overallRatio <= 0.7) score += 40;
		else if (overallRatio <= 0.85) score += 30;
		else if (overallRatio <= 1) score += 20;
		else if (overallRatio <= 1.1) score += 5;
		else score -= 10;
		
		// Factor 2: Trend direction (20 points)
		if (summary.overallTrend === 'improving') score += 20;
		else if (summary.overallTrend === 'stable') score += 10;
		else score -= 5;
		
		// Factor 3: Individual budget health (20 points)
		const healthyBudgets = budgets.filter(b => b.percentUsed <= 100).length;
		const budgetHealthRatio = budgets.length > 0 ? healthyBudgets / budgets.length : 0;
		score += Math.round(budgetHealthRatio * 20);
		
		// Factor 4: Days remaining consideration (-10 to +10)
		const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
		const dayOfMonth = new Date().getDate();
		const expectedSpendRatio = dayOfMonth / daysInMonth;
		const actualSpendRatio = summary.totalBudget > 0 ? summary.totalSpent / summary.totalBudget : 0;
		
		if (actualSpendRatio < expectedSpendRatio * 0.8) score += 10;
		else if (actualSpendRatio < expectedSpendRatio) score += 5;
		else if (actualSpendRatio > expectedSpendRatio * 1.2) score -= 10;
		
		return Math.max(0, Math.min(100, score));
	});

	// Get health grade
	let healthGrade = $derived.by(() => {
		if (healthScore >= 90) return { grade: 'A+', color: '#10b981', message: 'Outstanding!' };
		if (healthScore >= 80) return { grade: 'A', color: '#10b981', message: 'Excellent' };
		if (healthScore >= 70) return { grade: 'B', color: '#388E3C', message: 'Great job' };
		if (healthScore >= 60) return { grade: 'C', color: '#f59e0b', message: 'Room to improve' };
		if (healthScore >= 50) return { grade: 'D', color: '#f97316', message: 'Needs attention' };
		return { grade: 'F', color: '#ef4444', message: 'Time to refocus' };
	});

	// Spending velocity (how fast you're spending relative to time in month)
	let spendingVelocity = $derived.by(() => {
		if (!summary || summary.totalBudget === 0) return { ratio: 0, status: 'on-track' as const, message: '' };
		
		const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
		const dayOfMonth = new Date().getDate();
		const monthProgress = dayOfMonth / daysInMonth;
		const budgetProgress = summary.totalSpent / summary.totalBudget;
		const velocity = monthProgress > 0 ? budgetProgress / monthProgress : 0;
		
		const daysRemaining = daysInMonth - dayOfMonth;
		const projectedMonthEnd = summary.totalSpent + (summary.totalSpent / dayOfMonth) * daysRemaining;
		
		if (velocity <= 0.85) return { 
			ratio: velocity, 
			status: 'under' as const, 
			message: `On track to save ${formatCurrency(summary.totalBudget - projectedMonthEnd)}`,
			projected: projectedMonthEnd
		};
		if (velocity <= 1.05) return { 
			ratio: velocity, 
			status: 'on-track' as const, 
			message: 'Pacing well through the month',
			projected: projectedMonthEnd
		};
		if (velocity <= 1.2) return { 
			ratio: velocity, 
			status: 'watch' as const, 
			message: `May exceed by ${formatCurrency(projectedMonthEnd - summary.totalBudget)}`,
			projected: projectedMonthEnd
		};
		return { 
			ratio: velocity, 
			status: 'over' as const, 
			message: `Projected to overspend by ${formatCurrency(projectedMonthEnd - summary.totalBudget)}`,
			projected: projectedMonthEnd
		};
	});

	// Smart recommendations
	let recommendations = $derived.by(() => {
		const recs: Array<{ icon: string; title: string; description: string; type: 'success' | 'warning' | 'info' | 'danger' }> = [];
		if (!summary || !budgets.length) return recs;
		
		// Check for budgets at risk
		const atRiskBudgets = budgets.filter(b => b.percentUsed >= 80 && b.percentUsed < 100);
		if (atRiskBudgets.length > 0) {
			recs.push({
				icon: 'fa-triangle-exclamation',
				title: `${atRiskBudgets.length} budget${atRiskBudgets.length > 1 ? 's' : ''} approaching limit`,
				description: atRiskBudgets.map(b => b.category).join(', '),
				type: 'warning'
			});
		}
		
		// Check for over-budget categories
		const overBudget = budgets.filter(b => b.percentUsed > 100);
		if (overBudget.length > 0) {
			const totalOver = overBudget.reduce((sum, b) => sum + Math.abs(b.overUnder), 0);
			recs.push({
				icon: 'fa-exclamation-circle',
				title: `Over budget in ${overBudget.length} categor${overBudget.length > 1 ? 'ies' : 'y'}`,
				description: `${formatCurrency(totalOver)} over — adjust spending or increase limits`,
				type: 'danger'
			});
		}
		
		// Check for improving trend
		if (summary.overallTrend === 'improving') {
			recs.push({
				icon: 'fa-fire',
				title: 'Spending is decreasing!',
				description: `${formatCurrency(Math.abs(summary.overallTrendAmount))} less than last month`,
				type: 'success'
			});
		}
		
		// Opportunity cost insight
		if (summary.totalRemaining > 100) {
			const futureValue = calculateFutureValue(summary.totalRemaining);
			recs.push({
				icon: 'fa-seedling',
				title: 'Investment opportunity',
				description: `${formatCurrency(summary.totalRemaining)} remaining could grow to ${formatCurrency(futureValue)} in 10 years`,
				type: 'info'
			});
		}
		
		// Uncategorized spending check
		const uncategorizedBudget = budgets.find(b => b.category === 'Uncategorized');
		if (uncategorizedBudget && uncategorizedBudget.currentSpent > 0) {
			recs.push({
				icon: 'fa-tags',
				title: 'Categorize your spending',
				description: `${formatCurrency(uncategorizedBudget.currentSpent)} is uncategorized`,
				type: 'info'
			});
		}
		
		return recs.slice(0, 4);
	});

	// Budget streaks (mock data - would come from API in real app)
	let budgetStreaks = $derived.by(() => {
		return budgets.map(b => ({
			category: b.category,
			streak: b.percentUsed <= 100 ? Math.floor(Math.random() * 6) + 1 : 0,
			isCurrentlyUnder: b.percentUsed <= 100
		})).filter(s => s.streak > 0).sort((a, b) => b.streak - a.streak).slice(0, 3);
	});

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

	// Animated progress ring SVG path
	function getProgressRingPath(percent: number, radius: number = 45): string {
		const circumference = 2 * Math.PI * radius;
		const offset = circumference - (Math.min(percent, 100) / 100) * circumference;
		return `stroke-dasharray: ${circumference}; stroke-dashoffset: ${offset};`;
	}

	// Colors for charts
	const COLORS = [
		'#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#ef4444',
		'#ec4899', '#6366f1', '#4CAF50', '#f97316', '#84cc16'
	];

	// Get spending by category from budgets
	function getCategorySpending() {
		if (!budgets || budgets.length === 0) return [];
		
		const categoryMap = new Map<string, number>();
		for (const budget of budgets) {
			const spent = budget.currentSpent || 0;
			if (spent > 0) {
				categoryMap.set(budget.category, (categoryMap.get(budget.category) || 0) + spent);
			}
		}
		
		const categories = Array.from(categoryMap.entries())
			.map(([category, spent]) => ({ category, spent }))
			.sort((a, b) => b.spent - a.spent);
		
		return categories;
	}

	async function loadBudgets() {
		loading = true;
		try {
			const res = await fetch('/api/budgets');
			const json = await res.json();
			if (json.ok) {
				budgets = json.data.budgets;
				summary = json.data.summary;
				
				// Animate health score
				setTimeout(() => {
					const targetScore = healthScore;
					const duration = 1000;
					const steps = 30;
					const increment = targetScore / steps;
					let current = 0;
					const interval = setInterval(() => {
						current += increment;
						if (current >= targetScore) {
							animatedHealthScore = targetScore;
							clearInterval(interval);
						} else {
							animatedHealthScore = Math.round(current);
						}
					}, duration / steps);
				}, 300);
				
				// Animate velocity
				setTimeout(() => {
					animatedVelocity = spendingVelocity.ratio * 100;
				}, 500);
			}
		} catch (e) {
			console.error('Failed to load budgets:', e);
		}
		loading = false;
	}

	async function saveBudget() {
		const categoryToSave = useCustomCategory ? customCategoryName.trim() : newCategory;
		if (!categoryToSave || newLimit <= 0) return;
		
		// Check if at budget limit before making request
		if (tierUsage && tierUsage.budgets.limit !== null && tierUsage.budgets.used >= tierUsage.budgets.limit) {
			saveError = `Free tier allows ${tierUsage.budgets.limit} budget categories. Upgrade to Pro for unlimited budgets.`;
			return;
		}
		
		saving = true;
		saveError = null;
		try {
			const res = await fetch('/api/budgets', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					category: categoryToSave,
					monthlyLimit: newLimit
				})
			});
			
			if (res.ok) {
				showAddModal = false;
				newCategory = '';
				newLimit = 500;
				useCustomCategory = false;
				customCategoryName = '';
				await loadBudgets();
				await loadTierUsage(); // Refresh tier usage after creating budget
			} else if (res.status === 403) {
				const json = await res.json();
				saveError = json.message || 'Budget limit reached. Upgrade to Pro for unlimited budgets.';
			} else {
				const json = await res.json();
				saveError = json.message || 'Failed to create budget';
			}
		} catch (e) {
			console.error('Failed to save budget:', e);
			saveError = 'Failed to create budget. Please try again.';
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

	onMount(async () => {
		initTheme();
		isDark = getTheme() === 'dark';
		
		// Check Pro status for dark mode (tier usage also tells us if Pro)
		await loadTierUsage();
		
		// If not Pro and dark mode is on, reset to light
		if (tierUsage && !tierUsage.isProActive && isDark) {
			setTheme('light');
			isDark = false;
		}
		
		loadBudgets();
	});

	async function loadTierUsage() {
		try {
			const res = await fetch('/api/tier');
			const json = await res.json();
			if (json.ok) {
				tierUsage = json.data;
			}
		} catch (err) {
			console.error('Failed to load tier usage:', err);
		}
	}

	function getProgressColor(percentUsed: number): string {
		if (percentUsed >= 100) return '#ef4444'; // red
		if (percentUsed >= 80) return '#f59e0b'; // amber
		return '#388E3C'; // green
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

	function getVelocityColor(status: string): string {
		if (status === 'under') return '#10b981';
		if (status === 'on-track') return '#388E3C';
		if (status === 'watch') return '#f59e0b';
		return '#ef4444';
	}

	// Day of month progress
	let monthProgress = $derived.by(() => {
		const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
		const dayOfMonth = new Date().getDate();
		return Math.round((dayOfMonth / daysInMonth) * 100);
	});
</script>

<svelte:head>
	<title>Budgets | SpentWorth</title>
</svelte:head>

<div class="min-h-screen" style="background: {isDark ? 'var(--sw-bg)' : '#f5f0e8'}">
	<Header />
	
	<main class="max-w-6xl mx-auto px-4 py-6 sm:py-8">
		<!-- Page Header with Budget Health Score -->
		<div class="mb-6 sm:mb-8">
			<div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
				<div>
					<h1 class="font-display text-2xl sm:text-3xl font-bold mb-2" style="color: {isDark ? '#ffffff' : '#171717'}">
						Your Budgets
					</h1>
					<p class="text-sm sm:text-base" style="color: {isDark ? '#a3a3a3' : '#525252'}">
						Every dollar under budget is a dollar invested in your future
					</p>
				</div>
				
				<!-- Quick Actions -->
				{#if !loading && availableCategories.length > 0 && (!tierUsage || tierUsage.budgets.limit === null || tierUsage.budgets.used < tierUsage.budgets.limit)}
					<button 
						onclick={() => { showAddModal = true; newCategory = availableCategories[0]; saveError = null; }}
						class="btn-primary flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
					>
						<i class="fa-solid fa-plus"></i>
						Add Budget
					</button>
				{/if}
			</div>
		</div>

		<!-- Tier usage banner for free users -->
		{#if tierUsage && tierUsage.budgets.limit !== null}
			{@const remaining = tierUsage.budgets.limit - tierUsage.budgets.used}
			{@const isAtLimit = remaining <= 0}
			<div 
				class="rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
				style="background: {isAtLimit ? 'rgba(239,68,68,0.1)' : 'rgba(56,142,60,0.1)'}; border: 1px solid {isAtLimit ? 'rgba(239,68,68,0.3)' : 'rgba(56,142,60,0.3)'};"
			>
				<div class="flex items-center gap-3">
					<div class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style="background: {isAtLimit ? '#ef4444' : '#388E3C'}">
						<i class="fa-solid {isAtLimit ? 'fa-triangle-exclamation' : 'fa-wallet'} text-sm text-white"></i>
					</div>
					<div>
						<p class="font-medium text-sm" style="color: {isDark ? '#ffffff' : '#171717'}">
							{#if isAtLimit}
								Budget category limit reached
							{:else}
								{remaining} budget slot{remaining !== 1 ? 's' : ''} remaining
							{/if}
						</p>
						<p class="text-xs" style="color: {isDark ? '#a3a3a3' : '#737373'}">
							Free plan: {tierUsage.budgets.used}/{tierUsage.budgets.limit} categories
						</p>
					</div>
				</div>
				<a href="/pricing" class="btn {isAtLimit ? 'btn-primary' : 'btn-secondary'} text-xs sm:text-sm whitespace-nowrap">
					{isAtLimit ? 'Upgrade to Pro' : 'Get Unlimited'}
				</a>
			</div>
		{/if}

		{#if loading}
			<div class="flex items-center justify-center py-20">
				<div class="text-center">
					<div class="relative w-20 h-20 mx-auto mb-4">
						<svg class="w-20 h-20 -rotate-90" viewBox="0 0 100 100">
							<circle cx="50" cy="50" r="45" fill="none" stroke={isDark ? '#2a2a2a' : '#e5e5e5'} stroke-width="8"/>
							<circle 
								cx="50" cy="50" r="45" fill="none" 
								stroke="#388E3C" stroke-width="8" stroke-linecap="round"
								class="animate-spin origin-center"
								style="stroke-dasharray: 180; stroke-dashoffset: 90;"
							/>
						</svg>
					</div>
					<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">Loading your budgets...</p>
				</div>
			</div>
		{:else if budgets.length === 0}
			<!-- Empty State -->
			<div class="text-center py-12 sm:py-20">
				<div class="max-w-md mx-auto">
					<div class="w-24 h-24 mx-auto mb-6 rounded-full bg-green-600 flex items-center justify-center relative">
						<i class="fa-solid fa-wallet text-4xl text-white"></i>
						<div class="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center shadow-md">
							<i class="fa-solid fa-plus text-sm text-white"></i>
						</div>
					</div>
					<h2 class="font-display text-2xl font-bold mb-3" style="color: {isDark ? '#ffffff' : '#171717'}">
						Start your budgeting journey
					</h2>
					<p class="text-sm mb-8 leading-relaxed" style="color: {isDark ? '#a3a3a3' : '#737373'}">
						Set spending limits for your categories. Track where your money goes and see how much you could be investing instead.
					</p>
					
				<div class="flex flex-col sm:flex-row gap-3 justify-center">
					<button 
						onclick={() => { showAddModal = true; newCategory = availableCategories[0] || ''; saveError = null; }}
						class="btn-primary px-6 py-3 rounded-xl font-medium"
					>
						<i class="fa-solid fa-plus mr-2"></i>
						Create Your First Budget
					</button>
					{#if availableCategories.length >= 3 && (!tierUsage || tierUsage.budgets.limit === null || tierUsage.budgets.limit > 3)}
						<button 
							onclick={initQuickSetup}
							class="px-6 py-3 rounded-xl font-medium transition-all hover:scale-[1.02]"
							style="background: transparent; border: 2px dashed {isDark ? '#404040' : '#d4cfc5'}; color: {isDark ? '#a3a3a3' : '#737373'}"
						>
							<i class="fa-solid fa-bolt mr-2"></i>
							Quick Setup All
						</button>
					{/if}
				</div>
				</div>
			</div>
		{:else}
			<!-- Budget Health Dashboard -->
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
				<!-- Health Score Card -->
				<div class="rounded-2xl p-5 sm:p-6 relative overflow-hidden" style="background: {isDark ? 'linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%)' : 'linear-gradient(135deg, #ffffff 0%, #f9f6f1 100%)'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
					<div class="absolute top-0 right-0 w-32 h-32 opacity-10" style="background: radial-gradient(circle, {healthGrade.color} 0%, transparent 70%);"></div>
					<div class="flex items-center gap-5">
						<!-- Animated Ring -->
						<div class="relative">
							<svg class="w-20 h-20 -rotate-90" viewBox="0 0 100 100">
								<circle cx="50" cy="50" r="45" fill="none" stroke={isDark ? '#2a2a2a' : '#e5e5e5'} stroke-width="8"/>
								<circle 
									cx="50" cy="50" r="45" fill="none" 
									stroke={healthGrade.color} stroke-width="8" stroke-linecap="round"
									style={getProgressRingPath(animatedHealthScore)}
									class="transition-all duration-1000 ease-out"
								/>
							</svg>
							<div class="absolute inset-0 flex items-center justify-center">
								<span class="font-display text-xl font-bold" style="color: {healthGrade.color}">{healthGrade.grade}</span>
							</div>
						</div>
						<div class="flex-1">
							<p class="text-xs uppercase tracking-wider mb-1" style="color: {isDark ? '#737373' : '#9ca3af'}">Budget Health</p>
							<p class="font-display text-lg font-bold mb-1" style="color: {isDark ? '#ffffff' : '#171717'}">{healthGrade.message}</p>
							<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">Score: {animatedHealthScore}/100</p>
						</div>
					</div>
				</div>

				<!-- Summary Stats Card -->
				<div class="rounded-2xl p-5 sm:p-6" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
					<p class="text-xs uppercase tracking-wider mb-3" style="color: {isDark ? '#737373' : '#9ca3af'}">This Month</p>
					<div class="space-y-2">
						<div class="flex items-center justify-between">
							<span class="text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">Budget</span>
							<span class="font-mono font-semibold" style="color: {isDark ? '#ffffff' : '#171717'}">{formatCurrency(summary?.totalBudget || 0)}</span>
						</div>
						<div class="flex items-center justify-between">
							<span class="text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">Spent</span>
							<span class="font-mono font-semibold" style="color: {isDark ? '#ffffff' : '#171717'}">{formatCurrency(summary?.totalSpent || 0)}</span>
						</div>
						<div class="flex items-center justify-between pt-2" style="border-top: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
							<span class="text-sm font-medium" style="color: {isDark ? '#ffffff' : '#171717'}">Remaining</span>
							<span class="font-mono font-bold text-lg" style="color: {(summary?.totalRemaining || 0) >= 0 ? '#10b981' : '#ef4444'}">{formatCurrency(summary?.totalRemaining || 0)}</span>
						</div>
					</div>
				</div>

				<!-- Spending Velocity Card -->
				<div class="rounded-2xl p-5 sm:p-6" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
					<p class="text-xs uppercase tracking-wider mb-3" style="color: {isDark ? '#737373' : '#9ca3af'}">Spending Pace</p>
					<div class="flex items-center gap-4">
						<div class="relative w-14 h-14 flex-shrink-0">
							<!-- Month progress background -->
							<svg class="w-14 h-14 -rotate-90" viewBox="0 0 100 100">
								<circle cx="50" cy="50" r="40" fill="none" stroke={isDark ? '#2a2a2a' : '#e5e5e5'} stroke-width="8"/>
								<!-- Expected progress (month %) -->
								<circle 
									cx="50" cy="50" r="40" fill="none" 
									stroke={isDark ? '#404040' : '#d4cfc5'} stroke-width="8" stroke-linecap="round"
									style="stroke-dasharray: {2 * Math.PI * 40}; stroke-dashoffset: {2 * Math.PI * 40 - (monthProgress / 100) * 2 * Math.PI * 40};"
								/>
								<!-- Actual spending progress -->
								<circle 
									cx="50" cy="50" r="40" fill="none" 
									stroke={getVelocityColor(spendingVelocity.status)} stroke-width="8" stroke-linecap="round"
									style="stroke-dasharray: {2 * Math.PI * 40}; stroke-dashoffset: {2 * Math.PI * 40 - (Math.min((summary?.totalSpent || 0) / (summary?.totalBudget || 1), 1)) * 2 * Math.PI * 40};"
								/>
							</svg>
						</div>
						<div class="flex-1 min-w-0">
							<p class="font-display font-semibold text-sm mb-1" style="color: {isDark ? '#ffffff' : '#171717'}">
								{#if spendingVelocity.status === 'under'}
									Ahead of pace
								{:else if spendingVelocity.status === 'on-track'}
									On track
								{:else if spendingVelocity.status === 'watch'}
									Slightly fast
								{:else}
									Overspending
								{/if}
							</p>
							<p class="text-xs truncate" style="color: {isDark ? '#a3a3a3' : '#737373'}">
								{spendingVelocity.message || `Day ${new Date().getDate()} of ${new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()}`}
							</p>
						</div>
					</div>
				</div>
			</div>

			<!-- Alerts -->
			{#if recommendations.length > 0}
				<div class="rounded-xl p-4 mb-6" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
					<div class="space-y-3">
						{#each recommendations as rec, i}
							<div 
								class="flex items-start gap-3 {i !== recommendations.length - 1 ? 'pb-3' : ''}"
								style="{i !== recommendations.length - 1 ? `border-bottom: 1px solid ${isDark ? '#2a2a2a' : '#f0ebe3'}` : ''}"
							>
								<i class="fa-solid {rec.icon} text-sm mt-0.5 flex-shrink-0" style="color: {rec.type === 'danger' ? '#ef4444' : rec.type === 'warning' ? '#f59e0b' : rec.type === 'success' ? '#10b981' : '#388E3C'}"></i>
								<div class="flex-1 min-w-0">
									<p class="text-sm" style="color: {isDark ? '#ffffff' : '#171717'}">
										<span class="font-medium">{rec.title}</span>
										<span style="color: {isDark ? '#a3a3a3' : '#737373'}"> · {rec.description}</span>
									</p>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Needs Attention Section -->
			{@const needsAttention = budgets.filter(b => b.percentUsed >= 80)}
			{@const onTrack = budgets.filter(b => b.percentUsed < 80)}
			
			{#if needsAttention.length > 0}
				<div class="mb-6">
					<h2 class="font-display text-lg font-semibold mb-3 flex items-center gap-2" style="color: {isDark ? '#ffffff' : '#171717'}">
						<i class="fa-solid fa-triangle-exclamation text-amber-500 text-sm"></i>
						Needs Attention
						<span class="text-xs font-normal px-2 py-0.5 rounded-full" style="background: rgba(245,158,11,0.15); color: #f59e0b">{needsAttention.length}</span>
					</h2>
					<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
						{#each needsAttention as budget}
							{@const ringColor = getProgressColor(budget.percentUsed)}
							<div 
								class="rounded-xl p-4 transition-all hover:scale-[1.005]" 
								style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {budget.percentUsed >= 100 ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'};"
							>
								<div class="flex items-center gap-4">
									<!-- Compact Progress Ring -->
									<div class="relative flex-shrink-0">
										<svg class="w-12 h-12 -rotate-90" viewBox="0 0 100 100">
											<circle cx="50" cy="50" r="40" fill="none" stroke={isDark ? '#2a2a2a' : '#f0ebe3'} stroke-width="10"/>
											<circle 
												cx="50" cy="50" r="40" fill="none" 
												stroke={ringColor} stroke-width="10" stroke-linecap="round"
												style="stroke-dasharray: {2 * Math.PI * 40}; stroke-dashoffset: {2 * Math.PI * 40 - (Math.min(budget.percentUsed, 100) / 100) * 2 * Math.PI * 40};"
											/>
										</svg>
										<div class="absolute inset-0 flex items-center justify-center">
											<span class="font-mono text-xs font-bold" style="color: {ringColor}">{Math.min(budget.percentUsed, 100)}%</span>
										</div>
									</div>

									<!-- Budget Info -->
									<div class="flex-1 min-w-0">
										<div class="flex items-center justify-between mb-1">
											<h3 class="font-display font-semibold text-sm truncate" style="color: {isDark ? '#ffffff' : '#171717'}">
												{budget.category}
											</h3>
											<div class="flex items-center gap-1">
												<button 
													onclick={() => editingBudget = { ...budget }}
													class="p-1.5 rounded-lg transition-colors hover:bg-sw-surface/50"
													style="color: {isDark ? '#a3a3a3' : '#737373'}"
												>
													<i class="fa-solid fa-pen text-xs"></i>
												</button>
												<button 
													onclick={() => deleteBudget(budget.id)}
													class="p-1.5 rounded-lg transition-colors hover:bg-red-500/10"
													style="color: {isDark ? '#a3a3a3' : '#737373'}"
												>
													<i class="fa-solid fa-trash text-xs"></i>
												</button>
											</div>
										</div>
										<div class="flex items-center justify-between">
											<span class="text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">
												{formatCurrency(budget.currentSpent)} / {formatCurrency(budget.monthlyLimit)}
											</span>
											<span class="text-xs font-medium" style="color: {ringColor}">
												{#if budget.overUnder >= 0}
													{formatCurrency(budget.remaining)} left
												{:else}
													{formatCurrency(Math.abs(budget.overUnder))} over
												{/if}
											</span>
										</div>
									</div>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- On Track Section - Compact List -->
			{#if onTrack.length > 0}
				<div class="mb-6">
					<h2 class="font-display text-lg font-semibold mb-3 flex items-center gap-2" style="color: {isDark ? '#ffffff' : '#171717'}">
						<i class="fa-solid fa-check-circle text-sw-accent text-sm"></i>
						On Track
						<span class="text-xs font-normal px-2 py-0.5 rounded-full" style="background: rgba(56,142,60,0.15); color: #388E3C">{onTrack.length}</span>
					</h2>
					<div class="rounded-xl overflow-hidden" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
						{#each onTrack as budget, index}
							{@const ringColor = getProgressColor(budget.percentUsed)}
							<div 
								class="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-sw-surface/30"
								style="{index !== onTrack.length - 1 ? `border-bottom: 1px solid ${isDark ? '#2a2a2a' : '#f0ebe3'}` : ''}"
							>
								<!-- Mini Progress Bar -->
								<div class="w-24 flex-shrink-0">
									<div class="h-2 rounded-full overflow-hidden" style="background: {isDark ? '#0a0a0a' : '#f0ebe3'}">
										<div 
											class="h-full rounded-full"
											style="width: {budget.percentUsed}%; background: {ringColor}"
										></div>
									</div>
								</div>
								
								<!-- Category -->
								<div class="flex-1 min-w-0">
									<span class="text-sm font-medium truncate" style="color: {isDark ? '#ffffff' : '#171717'}">{budget.category}</span>
								</div>
								
								<!-- Spent / Limit -->
								<div class="text-right flex-shrink-0">
									<span class="text-sm font-mono" style="color: {isDark ? '#a3a3a3' : '#737373'}">
										{formatCurrency(budget.currentSpent)}
									</span>
									<span class="text-xs" style="color: {isDark ? '#525252' : '#a3a3a3'}"> / {formatCurrency(budget.monthlyLimit)}</span>
								</div>
								
								<!-- Percent -->
								<div class="w-12 text-right flex-shrink-0">
									<span class="text-sm font-mono font-medium" style="color: {ringColor}">{budget.percentUsed}%</span>
								</div>
								
								<!-- Actions -->
								<div class="flex items-center gap-1 flex-shrink-0">
									<button 
										onclick={() => editingBudget = { ...budget }}
										class="p-1.5 rounded-lg transition-colors hover:bg-sw-surface/50"
										style="color: {isDark ? '#525252' : '#a3a3a3'}"
									>
										<i class="fa-solid fa-pen text-xs"></i>
									</button>
									<button 
										onclick={() => deleteBudget(budget.id)}
										class="p-1.5 rounded-lg transition-colors hover:bg-red-500/10"
										style="color: {isDark ? '#525252' : '#a3a3a3'}"
									>
										<i class="fa-solid fa-trash text-xs"></i>
									</button>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Opportunity Cost Teaser -->
			{#if summary && summary.totalRemaining > 0}
				<a href="/insights" class="block rounded-xl p-4 transition-all hover:scale-[1.01]" style="background: {isDark ? 'linear-gradient(135deg, rgba(56,142,60,0.1) 0%, rgba(56,142,60,0.05) 100%)' : 'linear-gradient(135deg, rgba(56,142,60,0.08) 0%, rgba(56,142,60,0.02) 100%)'}; border: 1px solid {isDark ? 'rgba(56,142,60,0.3)' : 'rgba(56,142,60,0.2)'}">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-3">
							<div class="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center">
								<i class="fa-solid fa-seedling text-white"></i>
							</div>
							<div>
								<p class="text-sm font-medium" style="color: {isDark ? '#ffffff' : '#171717'}">
									{formatCurrency(summary.totalRemaining)} remaining this month
								</p>
								<p class="text-xs" style="color: {isDark ? '#a3a3a3' : '#737373'}">
									If invested, could grow to <span class="font-semibold text-sw-accent">{formatCurrency(summary.totalOpportunityCostGained)}</span> in 10 years
								</p>
							</div>
						</div>
						<i class="fa-solid fa-chevron-right text-xs" style="color: {isDark ? '#525252' : '#a3a3a3'}"></i>
					</div>
				</a>
			{/if}

			<!-- Add Budget Actions -->
			{#if availableCategories.length > 0}
				<div class="flex flex-col sm:flex-row gap-3">
					{#if availableCategories.length >= 3}
						<button 
							onclick={initQuickSetup}
							class="flex-1 rounded-xl p-4 flex items-center justify-center gap-3 transition-all hover:scale-[1.01]"
							style="background: transparent; border: 2px dashed {isDark ? '#404040' : '#d4cfc5'}"
						>
							<i class="fa-solid fa-bolt text-amber-500"></i>
							<span class="font-display font-semibold" style="color: {isDark ? '#a3a3a3' : '#737373'}">Quick Setup ({availableCategories.length} remaining)</span>
						</button>
					{/if}
				</div>
			{:else if budgets.length > 0}
				<div class="text-center py-4 rounded-xl" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
					<p class="font-display font-semibold" style="color: {isDark ? '#ffffff' : '#171717'}">
						<i class="fa-solid fa-check text-green-500 mr-2"></i>
						All categories budgeted
					</p>
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
			
			{#if saveError}
				<div class="p-3 rounded-lg mb-4 flex items-start gap-3" style="background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3);">
					<i class="fa-solid fa-triangle-exclamation text-red-500 mt-0.5"></i>
					<div class="flex-1">
						<p class="text-sm text-red-500">{saveError}</p>
						{#if saveError.includes('Upgrade')}
							<a href="/pricing" class="text-sm font-medium text-sw-accent hover:underline mt-1 inline-block">View pricing →</a>
						{/if}
					</div>
				</div>
			{/if}
			
			<div class="space-y-4">
				<div>
					<div class="flex items-center justify-between mb-2">
						<label class="block text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">Category</label>
						<button 
							onclick={() => { useCustomCategory = !useCustomCategory; if (!useCustomCategory) customCategoryName = ''; }}
							class="text-xs font-medium transition-colors"
							style="color: {useCustomCategory ? '#ef4444' : '#388E3C'}"
						>
							{useCustomCategory ? 'Use preset' : '+ Custom category'}
						</button>
					</div>
					
					{#if useCustomCategory}
						<input 
							type="text"
							bind:value={customCategoryName}
							placeholder="Enter custom category name..."
							class="w-full px-4 py-3 rounded-xl text-base"
							style="background: {isDark ? '#0a0a0a' : '#f5f0e8'}; border: 1px solid {isDark ? '#2a2a2a' : '#d4cfc5'}; color: {isDark ? '#ffffff' : '#171717'}"
						/>
					{:else}
						<select 
							bind:value={newCategory}
							class="w-full px-4 py-3 rounded-xl text-base"
							style="background: {isDark ? '#0a0a0a' : '#f5f0e8'}; border: 1px solid {isDark ? '#2a2a2a' : '#d4cfc5'}; color: {isDark ? '#ffffff' : '#171717'}"
						>
							{#each availableCategories as category}
								<option value={category}>{category}</option>
							{/each}
						</select>
					{/if}
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
				<div class="rounded-xl p-4" style="background: {isDark ? 'rgba(56,142,60,0.1)' : 'rgba(56,142,60,0.08)'}">
					<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#525252'}">
						<i class="fa-solid fa-lightbulb text-sw-accent mr-2"></i>
						Every dollar you save from this budget and invest could grow to 
						<span class="font-semibold text-sw-accent">{formatCurrency(calculateFutureValue(newLimit))}</span> in 10 years at 7% return
					</p>
				</div>
			</div>

			<div class="flex gap-3 mt-6">
				<button 
					onclick={() => { showAddModal = false; useCustomCategory = false; customCategoryName = ''; }}
					class="flex-1 px-4 py-3 rounded-xl font-display font-semibold transition-colors"
					style="background: {isDark ? '#2a2a2a' : '#e5e5e5'}; color: {isDark ? '#ffffff' : '#171717'}"
				>
					Cancel
				</button>
				<button 
					onclick={saveBudget}
					disabled={saving || (useCustomCategory ? !customCategoryName.trim() : !newCategory) || newLimit <= 0}
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

<style>
	@keyframes slideUp {
		0% { opacity: 0; transform: translateY(10px); }
		100% { opacity: 1; transform: translateY(0); }
	}
</style>
