<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import type { DashboardSummary, RecurringCharge } from '$lib/types';
	import Header from '$lib/components/Header.svelte';
	import Onboarding from '$lib/components/Onboarding.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import { initTheme, getTheme } from '$lib/stores/theme';

	let isDark = $state(false);

	interface Goal {
		id: string;
		name: string;
		goal_type: string;
		target_category?: string;
		target_merchant?: string;
		target_amount: number;
		current_period_spent: number;
		progress_pct: number;
		remaining: number;
		over_budget: boolean;
		projected_value: number;
		project_years: number;
		enabled: boolean;
	}

	let { data } = $props();

	let summary = $state<DashboardSummary | null>(null);
	let loading = $state(true);
	let recalculating = $state(false);
	let recalcMessage = $state<string | null>(null);
	let merchantView = $state<'frequency' | 'spend'>('frequency');
	
	// What-if calculator state
	let whatIfYears = $state(10);
	let selectedWhatIf = $state<RecurringCharge | null>(null);
	
	// Goals state
	let goals = $state<Goal[]>([]);
	let showGoalForm = $state(false);
	let newGoalName = $state('');
	let newGoalType = $state<'reduce_category' | 'reduce_merchant'>('reduce_category');
	let newGoalTarget = $state('');
	let newGoalAmount = $state(100);
	
	// How it works
	let showHowItWorks = $state(false);
	
	// Onboarding
	let showOnboarding = $state(false);

	onMount(async () => {
		initTheme();
		isDark = getTheme() === 'dark';
		
		// Check if user has completed onboarding
		const onboardingCompleted = localStorage.getItem('sw_onboarding_completed');
		if (!onboardingCompleted) {
			showOnboarding = true;
		}
		
		await Promise.all([loadSummary(), loadGoals()]);
	});
	
	async function loadGoals() {
		const res = await fetch('/api/goals');
		const json = await res.json();
		if (json.ok) {
			goals = json.data || [];
		}
	}
	
	async function createGoal() {
		if (!newGoalName || !newGoalAmount) return;
		
		const res = await fetch('/api/goals', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				name: newGoalName,
				goal_type: newGoalType,
				target_category: newGoalType === 'reduce_category' ? newGoalTarget : null,
				target_merchant: newGoalType === 'reduce_merchant' ? newGoalTarget : null,
				target_amount: newGoalAmount,
				project_years: 10
			})
		});
		
		const json = await res.json();
		if (json.ok) {
			await loadGoals();
			showGoalForm = false;
			newGoalName = '';
			newGoalTarget = '';
			newGoalAmount = 100;
		}
	}
	
	async function deleteGoal(goalId: string) {
		if (!confirm('Delete this goal?')) return;
		await fetch(`/api/goals/${goalId}`, { method: 'DELETE' });
		await loadGoals();
	}

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

	// Calculate "what if" projection
	function calculateWhatIf(monthlyAmount: number, years: number) {
		const annualReturn = 0.07;
		let total = 0;
		// Monthly contributions compounded
		for (let month = 0; month < years * 12; month++) {
			total = (total + monthlyAmount) * Math.pow(1 + annualReturn, 1/12);
		}
		return total;
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
		const threshold = summary.totalSpent * 0.03;
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
			maxDaySpend = Math.max(...summary.dayOfWeek.map(d => d.spent), 1);
		}
	});

	let maxMonthlySpend = $state(1);
	let maxDaySpend = $state(1);
	let displayCategories = $state<typeof summary.categories>([]);
</script>

<div class="min-h-screen">
	<Header onLogout={handleLogout} />

	<main class="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
		{#if loading}
			<div class="flex items-center justify-center py-24">
				<div class="w-8 h-8 rounded-full border-2 border-sw-accent border-t-transparent animate-spin"></div>
			</div>
		{:else if !summary || summary.totalSpent === 0}
			<!-- Empty state -->
			<EmptyState type="no-data" />
		{:else}
			<!-- Date Range Header + How it works -->
			<div class="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
				{#if summary.dateMin && summary.dateMax}
					<p class="text-xs sm:text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">
						Tracking <span class="font-medium" style="color: {isDark ? '#ffffff' : '#171717'}">{formatDate(summary.dateMin)}</span> to <span class="font-medium" style="color: {isDark ? '#ffffff' : '#171717'}">{formatDate(summary.dateMax)}</span>
						<span class="text-sw-accent">({getDateRangeText()})</span>
					</p>
				{/if}
				<button 
					onclick={() => showHowItWorks = !showHowItWorks}
					class="text-xs flex items-center gap-1 self-start sm:self-auto transition-colors"
					style="color: {isDark ? '#a3a3a3' : '#737373'}"
				>
					<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					How it works
				</button>
			</div>
			
			{#if showHowItWorks}
				<div class="mb-8 rounded-2xl p-6" style="background: {isDark ? 'linear-gradient(135deg, rgba(13,148,136,0.05), rgba(6,182,212,0.05))' : 'linear-gradient(135deg, rgba(13,148,136,0.08), rgba(6,182,212,0.08))'}; border: 1px solid {isDark ? 'rgba(13,148,136,0.2)' : 'rgba(13,148,136,0.15)'}">
					<h3 class="font-display font-semibold mb-3" style="color: {isDark ? '#ffffff' : '#171717'}">How SpentWorth Works</h3>
					<div class="grid md:grid-cols-3 gap-6 text-sm">
						<div>
							<div class="w-8 h-8 rounded-lg flex items-center justify-center text-sw-accent mb-2" style="background: rgba(13,148,136,0.2)">1</div>
							<p class="font-medium mb-1" style="color: {isDark ? '#ffffff' : '#171717'}">Track Your Spending</p>
							<p style="color: {isDark ? '#a3a3a3' : '#737373'}">Import your bank statements and we categorize your purchases automatically.</p>
						</div>
						<div>
							<div class="w-8 h-8 rounded-lg flex items-center justify-center text-sw-accent mb-2" style="background: rgba(13,148,136,0.2)">2</div>
							<p class="font-medium mb-1" style="color: {isDark ? '#ffffff' : '#171717'}">Calculate Opportunity Cost</p>
							<p style="color: {isDark ? '#a3a3a3' : '#737373'}">For each purchase, we calculate what it would be worth today if you'd invested in {summary.ticker} instead.</p>
						</div>
						<div>
							<div class="w-8 h-8 rounded-lg flex items-center justify-center text-sw-accent mb-2" style="background: rgba(13,148,136,0.2)">3</div>
							<p class="font-medium mb-1" style="color: {isDark ? '#ffffff' : '#171717'}">Make Smarter Choices</p>
							<p style="color: {isDark ? '#a3a3a3' : '#737373'}">See which spending habits cost you the most, set goals, and watch your potential savings grow.</p>
						</div>
					</div>
					<p class="mt-4 text-xs" style="color: {isDark ? '#a3a3a3' : '#737373'}">
						<i class="fa-solid fa-lightbulb mr-1 text-sw-accent"></i><strong style="color: {isDark ? '#ffffff' : '#171717'}">Example:</strong> You spent $100 at Amazon 6 months ago. If you'd invested that in SPY instead, it might be worth $104 today — that's $4 in "opportunity cost" you left on the table.
					</p>
				</div>
			{/if}

			<!-- Hero Stats -->
			<div class="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
				<div class="rounded-2xl p-4 sm:p-6 group relative" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}; box-shadow: {isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.06)'}">
					<p class="text-xs sm:text-sm mb-1 sm:mb-2 flex items-center gap-1" style="color: {isDark ? '#a3a3a3' : '#737373'}">
						Total Spent
					</p>
					<p class="font-display text-2xl sm:text-4xl font-bold tracking-tight" style="color: {isDark ? '#ffffff' : '#171717'}">{formatCurrency(summary.totalSpent)}</p>
					<p class="text-[10px] sm:text-xs mt-1 sm:mt-2" style="color: {isDark ? '#737373' : '#9ca3af'}">{summary.transactionCount} purchases • avg {formatCurrency(summary.avgTransaction)}</p>
				</div>
				
				<div class="rounded-2xl p-4 sm:p-6 group relative" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}; box-shadow: {isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.06)'}">
					<p class="text-xs sm:text-sm mb-1 sm:mb-2 flex items-center gap-1" style="color: {isDark ? '#a3a3a3' : '#737373'}">
						Today's Value
					</p>
					<p class="font-display text-2xl sm:text-4xl font-bold tracking-tight text-sw-accent">{formatCurrency(summary.totalFutureValue)}</p>
					<p class="text-[10px] sm:text-xs mt-1 sm:mt-2" style="color: {isDark ? '#737373' : '#9ca3af'}">If invested in {summary.ticker}</p>
				</div>
				
				<div class="rounded-2xl p-4 sm:p-6 group relative" style="background: {isDark ? 'linear-gradient(135deg, rgba(13,148,136,0.15), rgba(13,148,136,0.05))' : 'linear-gradient(135deg, rgba(13,148,136,0.1), rgba(13,148,136,0.02))'}; border: 1px solid {isDark ? 'rgba(13,148,136,0.3)' : 'rgba(13,148,136,0.2)'}">
					<p class="text-xs sm:text-sm mb-1 sm:mb-2 flex items-center gap-1" style="color: {isDark ? '#a3a3a3' : '#737373'}">
						Left on the Table
					</p>
					<p class="font-display text-2xl sm:text-4xl font-bold tracking-tight text-sw-accent">
						{summary.totalDelta >= 0 ? '+' : ''}{formatCurrency(summary.totalDelta)}
					</p>
					<p class="text-[10px] sm:text-xs mt-1" style="color: {isDark ? '#737373' : '#9ca3af'}">
						{formatPercent(summary.totalSpent > 0 ? summary.totalDelta / summary.totalSpent : 0)} growth over {getDateRangeText()}
					</p>
				</div>
			</div>

			<!-- Quick Stats Row -->
			{#if summary.biggestPurchase}
				<div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
					<div class="rounded-xl p-3 sm:p-4" style="background: {isDark ? 'rgba(38,38,38,0.6)' : 'rgba(245,240,232,0.6)'}; border: 1px solid {isDark ? 'rgba(64,64,64,0.3)' : '#d4cfc5'}">
						<p class="text-[10px] sm:text-xs mb-1" style="color: {isDark ? '#a3a3a3' : '#737373'}">Biggest Splurge</p>
						<p class="font-mono text-base sm:text-lg" style="color: {isDark ? '#ffffff' : '#171717'}">{formatCurrency(summary.biggestPurchase.amount)}</p>
						<p class="text-[10px] sm:text-xs truncate" style="color: {isDark ? '#737373' : '#9ca3af'}">{summary.biggestPurchase.merchant}</p>
					</div>
					<div class="rounded-xl p-3 sm:p-4" style="background: {isDark ? 'rgba(38,38,38,0.6)' : 'rgba(245,240,232,0.6)'}; border: 1px solid {isDark ? 'rgba(64,64,64,0.3)' : '#d4cfc5'}">
						<p class="text-[10px] sm:text-xs mb-1" style="color: {isDark ? '#a3a3a3' : '#737373'}">Spendy Day</p>
						<p class="font-mono text-base sm:text-lg" style="color: {isDark ? '#ffffff' : '#171717'}">{summary.biggestSpendingDay.day}s</p>
						<p class="text-[10px] sm:text-xs" style="color: {isDark ? '#737373' : '#9ca3af'}">{formatCurrency(summary.biggestSpendingDay.spent)}</p>
					</div>
					<div class="rounded-xl p-3 sm:p-4" style="background: {isDark ? 'rgba(38,38,38,0.6)' : 'rgba(245,240,232,0.6)'}; border: 1px solid {isDark ? 'rgba(64,64,64,0.3)' : '#d4cfc5'}">
						<p class="text-[10px] sm:text-xs mb-1" style="color: {isDark ? '#a3a3a3' : '#737373'}">Monthly Avg</p>
						<p class="font-mono text-base sm:text-lg" style="color: {isDark ? '#ffffff' : '#171717'}">{formatCurrency(summary.totalSpent / Math.max(summary.monthly.length, 1))}</p>
						<p class="text-[10px] sm:text-xs" style="color: {isDark ? '#737373' : '#9ca3af'}">{summary.monthly.length} months</p>
					</div>
					<div class="rounded-xl p-3 sm:p-4" style="background: {isDark ? 'rgba(38,38,38,0.6)' : 'rgba(245,240,232,0.6)'}; border: 1px solid {isDark ? 'rgba(64,64,64,0.3)' : '#d4cfc5'}">
						<p class="text-[10px] sm:text-xs mb-1" style="color: {isDark ? '#a3a3a3' : '#737373'}">Subscriptions</p>
						<p class="font-mono text-base sm:text-lg" style="color: {isDark ? '#ffffff' : '#171717'}">{formatCurrency(summary.recurringCharges.reduce((a, r) => a + r.monthlyEstimate, 0))}/mo</p>
						<p class="text-[10px] sm:text-xs" style="color: {isDark ? '#737373' : '#9ca3af'}">{summary.recurringCharges.length} detected</p>
					</div>
				</div>
			{/if}

			<!-- Calculation Method Banner -->
			{#if summary.usingFallback > 0}
				<div class="mb-8 rounded-xl p-4 flex items-center justify-between" style="background: rgba(245,158,11,0.05); border: 1px solid rgba(245,158,11,0.3)">
					<div class="flex items-center gap-3">
						<div class="w-8 h-8 rounded-lg flex items-center justify-center" style="background: rgba(245,158,11,0.2)">
							<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
						</div>
						<div>
							<p class="text-sm font-medium" style="color: {isDark ? '#ffffff' : '#171717'}">{summary.usingRealPrices > 0 ? 'Mixed calculation' : 'Using estimates'}</p>
							<p class="text-xs" style="color: {isDark ? '#a3a3a3' : '#737373'}">{summary.usingRealPrices} real prices, {summary.usingFallback} estimated</p>
						</div>
					</div>
					<button onclick={recalculateWithRealPrices} disabled={recalculating} class="btn btn-secondary text-sm">
						{recalculating ? 'Fetching...' : 'Refresh Prices'}
					</button>
				</div>
			{/if}
			
			{#if recalcMessage}
				<div class="mb-6 rounded-lg p-4 text-sm" style="background: {isDark ? 'rgba(38,38,38,0.6)' : '#ffffff'}; border: 1px solid {isDark ? 'rgba(64,64,64,0.5)' : '#e5e5e5'}; color: {isDark ? '#ffffff' : '#171717'}">{recalcMessage}</div>
			{/if}

			<!-- Charts Row -->
			<div class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
				<!-- Donut Chart -->
				<div class="rounded-2xl p-4 sm:p-6" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}; box-shadow: {isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.06)'}">
					<h3 class="font-display font-semibold mb-3 sm:mb-4 text-sm sm:text-base" style="color: {isDark ? '#ffffff' : '#171717'}">Spending by Category</h3>
					<div class="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
						<div class="relative flex-shrink-0">
							<svg viewBox="0 0 200 200" class="w-32 h-32 sm:w-44 sm:h-44">
								{#each displayCategories as cat, i}
									{@const total = summary.totalSpent}
									{@const startAngle = displayCategories.slice(0, i).reduce((acc, c) => acc + (c.spent / total) * 360, 0)}
									{@const angle = (cat.spent / total) * 360}
									{#if angle > 0.5}
										<path d={getDonutPath(startAngle, startAngle + angle - 0.5)} fill={COLORS[i % COLORS.length]} class="hover:opacity-80 transition-opacity cursor-pointer">
											<title>{cat.category}: {formatCurrency(cat.spent)}</title>
										</path>
									{/if}
								{/each}
								<text x="100" y="95" text-anchor="middle" class="text-[10px] sm:text-xs" style="fill: {isDark ? '#a3a3a3' : '#737373'}">Total</text>
								<text x="100" y="115" text-anchor="middle" class="font-display font-bold text-sm sm:text-base" style="fill: {isDark ? '#ffffff' : '#171717'}">{formatCurrency(summary.totalSpent)}</text>
							</svg>
						</div>
						<div class="flex-1 w-full grid grid-cols-2 sm:grid-cols-1 gap-1 sm:gap-2">
							{#each displayCategories as cat, i}
								<div class="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
									<div class="w-2 h-2 sm:w-3 sm:h-3 rounded-sm flex-shrink-0" style="background: {COLORS[i % COLORS.length]}"></div>
									<span class="flex-1 truncate" style="color: {isDark ? '#ffffff' : '#171717'}">{cat.category}</span>
									<span class="font-mono text-[10px] sm:text-xs" style="color: {isDark ? '#a3a3a3' : '#737373'}">{formatCurrency(cat.spent)}</span>
								</div>
							{/each}
						</div>
					</div>
				</div>

				<!-- Day of Week Chart -->
				<div class="rounded-2xl p-4 sm:p-6" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}; box-shadow: {isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.06)'}">
					<h3 class="font-display font-semibold mb-3 sm:mb-4 text-sm sm:text-base" style="color: {isDark ? '#ffffff' : '#171717'}">Spending by Day</h3>
					<div class="h-36 sm:h-44 flex items-end gap-1 sm:gap-2">
						{#each summary.dayOfWeek as day}
							{@const height = (day.spent / maxDaySpend) * 100}
							{@const isMax = day.day === summary.biggestSpendingDay.day}
							<div class="flex-1 flex flex-col items-center gap-1">
								<div class="w-full flex flex-col items-center justify-end" style="height: 110px;">
									<div 
										class="w-full rounded-t transition-all cursor-pointer relative group"
										style="height: {Math.max(height, 4)}%; background: linear-gradient(to top, {isMax ? '#0d9488' : 'rgba(13,148,136,0.5)'}, {isMax ? 'rgba(13,148,136,0.8)' : 'rgba(13,148,136,0.3)'});"
									>
										<div class="absolute -top-16 left-1/2 -translate-x-1/2 rounded px-2 py-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none hidden sm:block" style="background: {isDark ? '#0a0a0a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
											<p class="font-medium" style="color: {isDark ? '#ffffff' : '#171717'}">{formatCurrency(day.spent)}</p>
											<p style="color: {isDark ? '#a3a3a3' : '#737373'}">{day.count} transactions</p>
										</div>
									</div>
								</div>
								<span class="text-[10px] sm:text-xs" style="color: {isMax ? '#0d9488' : (isDark ? '#a3a3a3' : '#737373')}; font-weight: {isMax ? '500' : '400'}">{day.dayShort}</span>
							</div>
						{/each}
					</div>
				</div>
			</div>

			<!-- Monthly Spending -->
			<div class="rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}; box-shadow: {isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.06)'}">
				<h3 class="font-display font-semibold mb-3 sm:mb-4 text-sm sm:text-base" style="color: {isDark ? '#ffffff' : '#171717'}">Monthly Spending</h3>
				{#if summary.monthly.length > 0}
					<div class="h-28 sm:h-32 flex items-end gap-0.5 sm:gap-1 overflow-x-auto pb-1">
						{#each summary.monthly as month}
							{@const height = (month.spent / maxMonthlySpend) * 100}
							<div class="flex-1 flex flex-col items-center gap-1 min-w-[20px] sm:min-w-0">
								<div class="w-full flex flex-col items-center justify-end" style="height: 90px;">
									<div class="w-full rounded-t transition-all cursor-pointer relative group" style="height: {Math.max(height, 4)}%; background: linear-gradient(to top, #0d9488, rgba(13,148,136,0.6));">
										<div class="absolute -top-16 left-1/2 -translate-x-1/2 rounded px-2 py-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none hidden sm:block" style="background: {isDark ? '#0a0a0a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
											<p class="font-medium" style="color: {isDark ? '#ffffff' : '#171717'}">{formatCurrency(month.spent)}</p>
											<p class="text-sw-accent text-[10px]">→ {formatCurrency(month.future)}</p>
										</div>
									</div>
								</div>
								<span class="text-[8px] sm:text-[10px] truncate w-full text-center" style="color: {isDark ? '#a3a3a3' : '#737373'}">{formatMonth(month.month)}</span>
							</div>
						{/each}
					</div>
				{:else}
					<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">Not enough data</p>
				{/if}
			</div>

			<!-- Recurring Charges + What-If Calculator -->
			{#if summary.recurringCharges.length > 0}
				<div class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
					<!-- Recurring Charges -->
					<div class="rounded-2xl overflow-hidden" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}; box-shadow: {isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.06)'}">
						<div class="px-4 sm:px-6 py-3 sm:py-4" style="border-bottom: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
							<h3 class="font-display font-semibold text-sm sm:text-base" style="color: {isDark ? '#ffffff' : '#171717'}">Recurring Charges</h3>
							<p class="text-xs sm:text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">Subscriptions and regular payments</p>
						</div>
						<div class="max-h-64 sm:max-h-80 overflow-y-auto" style="border-color: {isDark ? 'rgba(64,64,64,0.3)' : '#e5e5e5'}">
							{#each summary.recurringCharges as charge}
								<button 
									onclick={() => selectedWhatIf = charge}
									class="w-full px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between transition-colors text-left"
									style="background: {selectedWhatIf?.merchant === charge.merchant ? 'rgba(13,148,136,0.1)' : 'transparent'}; border-bottom: 1px solid {isDark ? 'rgba(64,64,64,0.3)' : '#f0f0f0'}"
								>
									<div class="min-w-0 flex-1 mr-3">
										<p class="font-medium text-sm sm:text-base truncate" style="color: {isDark ? '#ffffff' : '#171717'}">{charge.merchant}</p>
										<p class="text-[10px] sm:text-xs" style="color: {isDark ? '#737373' : '#9ca3af'}">{charge.frequency} • {charge.count}×</p>
									</div>
									<div class="text-right flex-shrink-0">
										<p class="font-mono text-sm sm:text-base" style="color: {isDark ? '#ffffff' : '#171717'}">{formatCurrency(charge.avgAmount)}</p>
										<p class="text-[10px] sm:text-xs" style="color: {isDark ? '#737373' : '#9ca3af'}">{formatCurrency(charge.yearlyEstimate)}/yr</p>
									</div>
								</button>
							{/each}
						</div>
						<div class="px-4 sm:px-6 py-2.5 sm:py-3" style="background: {isDark ? 'rgba(10,10,10,0.3)' : 'rgba(245,240,232,0.5)'}; border-top: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
							<div class="flex justify-between text-xs sm:text-sm">
								<span style="color: {isDark ? '#a3a3a3' : '#737373'}">Total recurring</span>
								<span class="font-mono font-medium" style="color: {isDark ? '#ffffff' : '#171717'}">{formatCurrency(summary.recurringCharges.reduce((a, r) => a + r.monthlyEstimate, 0))}/mo</span>
							</div>
						</div>
					</div>

					<!-- What-If Calculator -->
					<div class="rounded-2xl p-4 sm:p-6" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}; box-shadow: {isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.06)'}">
						<div class="flex items-center gap-3 mb-3">
							<div class="w-8 h-8 rounded-lg flex items-center justify-center" style="background: rgba(13,148,136,0.1)">
								<i class="fa-solid fa-calculator text-sw-accent text-sm"></i>
							</div>
							<div>
								<h3 class="font-display font-semibold text-sm sm:text-base" style="color: {isDark ? '#ffffff' : '#171717'}">What If Calculator</h3>
								<p class="text-xs" style="color: {isDark ? '#a3a3a3' : '#737373'}">
									{selectedWhatIf ? `If you cancelled ${selectedWhatIf.merchant}...` : 'Select a subscription'}
								</p>
							</div>
						</div>
						
						{#if selectedWhatIf}
							{@const monthlyAmount = selectedWhatIf.monthlyEstimate}
							{@const futureValue = calculateWhatIf(monthlyAmount, whatIfYears)}
							{@const totalContributed = monthlyAmount * whatIfYears * 12}
							{@const gains = futureValue - totalContributed}
							
							<div class="space-y-3 sm:space-y-4">
								<div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
									<label class="text-xs sm:text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">Time horizon:</label>
									<div class="flex rounded-lg p-1 w-full sm:w-auto" style="background: {isDark ? '#0a0a0a' : '#f5f0e8'}">
										{#each [5, 10, 20, 30] as years}
											<button 
												onclick={() => whatIfYears = years}
												class="flex-1 sm:flex-none px-3 py-1.5 sm:py-1 text-xs rounded-md transition-colors"
												style="background: {whatIfYears === years ? '#0d9488' : 'transparent'}; color: {whatIfYears === years ? '#ffffff' : (isDark ? '#a3a3a3' : '#737373')}"
											>
												{years}yr
											</button>
										{/each}
									</div>
								</div>
								
								<div class="rounded-xl p-3 sm:p-4 space-y-2 sm:space-y-3 text-sm" style="background: {isDark ? 'rgba(10,10,10,0.5)' : '#f9f6f1'}">
									<div class="flex justify-between">
										<span class="text-xs sm:text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">Monthly savings</span>
										<span class="font-mono" style="color: {isDark ? '#ffffff' : '#171717'}">{formatCurrency(monthlyAmount)}</span>
									</div>
									<div class="flex justify-between">
										<span class="text-xs sm:text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">Total contributed</span>
										<span class="font-mono" style="color: {isDark ? '#ffffff' : '#171717'}">{formatCurrency(totalContributed)}</span>
									</div>
									<div class="flex justify-between">
										<span class="text-xs sm:text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">Investment gains (7%)</span>
										<span class="font-mono text-sw-accent">+{formatCurrency(gains)}</span>
									</div>
									<div class="pt-2 sm:pt-3 flex justify-between items-center" style="border-top: 1px solid {isDark ? 'rgba(64,64,64,0.5)' : '#e5e5e5'}">
										<span class="font-medium text-xs sm:text-sm" style="color: {isDark ? '#ffffff' : '#171717'}">In {whatIfYears} years</span>
										<span class="font-display text-xl sm:text-2xl font-bold text-sw-accent">{formatCurrency(futureValue)}</span>
									</div>
								</div>
								
								<p class="text-[10px] sm:text-xs text-center" style="color: {isDark ? '#737373' : '#9ca3af'}">
									Cancel & invest {formatCurrency(monthlyAmount)}/mo → {formatCurrency(futureValue)}
								</p>
							</div>
						{:else}
							<div class="rounded-xl p-6 sm:p-8 text-center" style="background: {isDark ? 'rgba(10,10,10,0.5)' : '#f9f6f1'}; border: 1px dashed {isDark ? '#2a2a2a' : '#d4cfc5'}">
								<i class="fa-solid fa-hand-pointer text-sw-accent text-xl mb-2"></i>
								<p class="text-xs sm:text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">Tap a subscription above to see projections</p>
							</div>
						{/if}
					</div>
				</div>
			{/if}

			<!-- Merchant Frequency -->
			<div class="rounded-2xl overflow-hidden mb-6 sm:mb-8" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}; box-shadow: {isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.06)'}">
				<div class="px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2" style="border-bottom: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
					<div>
						<h3 class="font-display font-semibold text-sm sm:text-base" style="color: {isDark ? '#ffffff' : '#171717'}">Where Your Money Goes</h3>
						<p class="text-xs sm:text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">Your favorite places to spend</p>
					</div>
					<div class="flex rounded-lg p-1 self-start sm:self-auto" style="background: {isDark ? '#0a0a0a' : '#f5f0e8'}">
						<button onclick={() => merchantView = 'frequency'} class="px-2.5 sm:px-3 py-1 text-[10px] sm:text-xs rounded-md transition-colors" style="background: {merchantView === 'frequency' ? (isDark ? '#262626' : '#ffffff') : 'transparent'}; color: {merchantView === 'frequency' ? (isDark ? '#ffffff' : '#171717') : (isDark ? '#a3a3a3' : '#737373')}">Most Visits</button>
						<button onclick={() => merchantView = 'spend'} class="px-2.5 sm:px-3 py-1 text-[10px] sm:text-xs rounded-md transition-colors" style="background: {merchantView === 'spend' ? (isDark ? '#262626' : '#ffffff') : 'transparent'}; color: {merchantView === 'spend' ? (isDark ? '#ffffff' : '#171717') : (isDark ? '#a3a3a3' : '#737373')}">Most Spent</button>
					</div>
				</div>
				<div>
					{#each (merchantView === 'frequency' ? summary.topMerchants : summary.topMerchantsBySpend).slice(0, 10) as merchant, i}
						{@const maxCount = summary.topMerchants[0]?.count || 1}
						{@const maxSpend = summary.topMerchantsBySpend[0]?.totalSpent || 1}
						{@const barWidth = merchantView === 'frequency' ? (merchant.count / maxCount) * 100 : (merchant.totalSpent / maxSpend) * 100}
						
						<div class="px-3 sm:px-6 py-2.5 sm:py-3 transition-colors" style="border-bottom: 1px solid {isDark ? 'rgba(64,64,64,0.3)' : '#f0f0f0'}">
							<div class="flex items-start sm:items-center gap-2 sm:gap-4">
								<div class="w-6 h-6 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-sw-accent font-mono text-xs sm:text-sm flex-shrink-0" style="background: rgba(13,148,136,0.1)">{i + 1}</div>
								<div class="flex-1 min-w-0">
									<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-0.5 sm:gap-0 mb-1">
										<p class="font-medium text-sm sm:text-base truncate" style="color: {isDark ? '#ffffff' : '#171717'}">{merchant.merchant}</p>
										<div class="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm flex-shrink-0">
											<span style="color: {isDark ? '#a3a3a3' : '#737373'}">{merchant.count}×</span>
											<span class="font-mono" style="color: {isDark ? '#ffffff' : '#171717'}">{formatCurrency(merchant.totalSpent)}</span>
											<span class="text-sw-accent text-[10px] sm:text-xs hidden sm:inline">→ {formatCurrency(merchant.totalFuture)}</span>
										</div>
									</div>
									<div class="h-1 sm:h-1.5 rounded-full overflow-hidden" style="background: {isDark ? '#262626' : '#f5f0e8'}">
										<div class="h-full rounded-full transition-all" style="width: {barWidth}%; background: rgba(13,148,136,0.6);"></div>
									</div>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<!-- Year-over-Year Comparison -->
			{#if summary.yoyComparison}
				<div class="rounded-2xl overflow-hidden mb-6 sm:mb-8" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}; box-shadow: {isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.06)'}">
					<div class="px-4 sm:px-6 py-3 sm:py-4" style="border-bottom: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
						<h3 class="font-display font-semibold text-sm sm:text-base" style="color: {isDark ? '#ffffff' : '#171717'}">Year-over-Year</h3>
						<p class="text-xs sm:text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">Compared to same period last year</p>
					</div>
					<div class="p-4 sm:p-6">
						<div class="grid grid-cols-3 gap-2 sm:gap-6 mb-4 sm:mb-6">
							<div class="text-center">
								<p class="text-[10px] sm:text-sm mb-1" style="color: {isDark ? '#a3a3a3' : '#737373'}">Last Year</p>
								<p class="font-display text-base sm:text-2xl font-bold" style="color: {isDark ? '#ffffff' : '#171717'}">{formatCurrency(summary.yoyComparison.lastYearTotal)}</p>
								<p class="text-[10px] sm:text-xs" style="color: {isDark ? '#737373' : '#9ca3af'}">{summary.yoyComparison.lastYearTxCount} txns</p>
							</div>
							<div class="text-center">
								<p class="text-[10px] sm:text-sm mb-1" style="color: {isDark ? '#a3a3a3' : '#737373'}">This Year</p>
								<p class="font-display text-base sm:text-2xl font-bold" style="color: {isDark ? '#ffffff' : '#171717'}">{formatCurrency(summary.yoyComparison.currentYearTotal)}</p>
								<p class="text-[10px] sm:text-xs" style="color: {isDark ? '#737373' : '#9ca3af'}">{summary.transactionCount} txns</p>
							</div>
							<div class="text-center">
								<p class="text-[10px] sm:text-sm mb-1" style="color: {isDark ? '#a3a3a3' : '#737373'}">Change</p>
								<p class="font-display text-base sm:text-2xl font-bold {summary.yoyComparison.changeAmount > 0 ? 'text-red-400' : 'text-sw-accent'}">
									{summary.yoyComparison.changeAmount > 0 ? '+' : ''}{formatCurrency(summary.yoyComparison.changeAmount)}
								</p>
								<p class="text-[10px] sm:text-xs {summary.yoyComparison.changePct > 0 ? 'text-red-400' : 'text-sw-accent'}">
									{summary.yoyComparison.changePct > 0 ? '↑' : '↓'} {Math.abs(summary.yoyComparison.changePct)}%
								</p>
							</div>
						</div>
						
						{#if summary.yoyComparison.categoryChanges.length > 0}
							<div class="pt-3 sm:pt-4" style="border-top: 1px solid {isDark ? 'rgba(64,64,64,0.5)' : '#e5e5e5'}">
								<p class="text-xs sm:text-sm font-medium mb-2 sm:mb-3" style="color: {isDark ? '#ffffff' : '#171717'}">Biggest Changes</p>
								<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
									{#each summary.yoyComparison.categoryChanges.slice(0, 6) as change}
										<div class="flex items-center justify-between px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm" style="background: {isDark ? 'rgba(10,10,10,0.3)' : 'rgba(245,240,232,0.5)'}">
											<span class="truncate flex-1 mr-2" style="color: {isDark ? '#ffffff' : '#171717'}">{change.category}</span>
											<div class="flex items-center gap-1 sm:gap-2 flex-shrink-0">
												<span class="hidden sm:inline" style="color: {isDark ? '#a3a3a3' : '#737373'}">{formatCurrency(change.lastYear)} →</span>
												<span class="font-mono" style="color: {isDark ? '#ffffff' : '#171717'}">{formatCurrency(change.currentYear)}</span>
												<span class="text-[10px] sm:text-xs font-mono px-1 sm:px-1.5 py-0.5 rounded {change.change > 0 ? 'bg-red-400/10 text-red-400' : 'bg-sw-accent/10 text-sw-accent'}">
													{change.change > 0 ? '+' : ''}{change.changePct}%
												</span>
											</div>
										</div>
									{/each}
								</div>
							</div>
						{/if}
					</div>
				</div>
			{/if}

			<!-- Goals Section -->
			<div class="rounded-2xl overflow-hidden mb-6 sm:mb-8" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}; box-shadow: {isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.06)'}">
				<div class="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between" style="border-bottom: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
					<div>
						<h3 class="font-display font-semibold text-sm sm:text-base" style="color: {isDark ? '#ffffff' : '#171717'}">Spending Goals</h3>
						<p class="text-xs sm:text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">Set limits and track progress</p>
					</div>
					<button onclick={() => showGoalForm = !showGoalForm} class="btn btn-secondary text-xs sm:text-sm px-2 sm:px-4">
						{showGoalForm ? 'Cancel' : '+ New'}
					</button>
				</div>
				
				{#if showGoalForm}
					<div class="px-4 sm:px-6 py-3 sm:py-4" style="background: {isDark ? 'rgba(10,10,10,0.3)' : 'rgba(245,240,232,0.5)'}; border-bottom: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
						<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
							<div>
								<label class="block text-[10px] sm:text-xs mb-1" style="color: {isDark ? '#a3a3a3' : '#737373'}">Goal Name</label>
								<input 
									type="text" 
									bind:value={newGoalName}
									placeholder="e.g., Cut dining out"
									class="w-full px-3 py-2 rounded-lg text-sm"
									style="background: {isDark ? '#0a0a0a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#d4cfc5'}; color: {isDark ? '#ffffff' : '#171717'}"
								/>
							</div>
							<div>
								<label class="block text-[10px] sm:text-xs mb-1" style="color: {isDark ? '#a3a3a3' : '#737373'}">Type</label>
								<select bind:value={newGoalType} class="w-full px-3 py-2 rounded-lg text-sm" style="background: {isDark ? '#0a0a0a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#d4cfc5'}; color: {isDark ? '#ffffff' : '#171717'}">
									<option value="reduce_category">Limit Category</option>
									<option value="reduce_merchant">Limit Merchant</option>
								</select>
							</div>
							<div>
								<label class="block text-[10px] sm:text-xs mb-1" style="color: {isDark ? '#a3a3a3' : '#737373'}">
									{newGoalType === 'reduce_category' ? 'Category' : 'Merchant'}
								</label>
								{#if newGoalType === 'reduce_category'}
									<select bind:value={newGoalTarget} class="w-full px-3 py-2 rounded-lg text-sm" style="background: {isDark ? '#0a0a0a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#d4cfc5'}; color: {isDark ? '#ffffff' : '#171717'}">
										<option value="">Select...</option>
										{#each displayCategories as cat}
											<option value={cat.category}>{cat.category}</option>
										{/each}
									</select>
								{:else}
									<input 
										type="text" 
										bind:value={newGoalTarget}
										placeholder="e.g., Starbucks"
										class="w-full px-3 py-2 rounded-lg text-sm"
										style="background: {isDark ? '#0a0a0a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#d4cfc5'}; color: {isDark ? '#ffffff' : '#171717'}"
									/>
								{/if}
							</div>
							<div>
								<label class="block text-[10px] sm:text-xs mb-1" style="color: {isDark ? '#a3a3a3' : '#737373'}">Monthly Limit ($)</label>
								<div class="flex gap-2">
									<input 
										type="number" 
										bind:value={newGoalAmount}
										min="1"
										class="flex-1 px-3 py-2 rounded-lg text-sm"
										style="background: {isDark ? '#0a0a0a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#d4cfc5'}; color: {isDark ? '#ffffff' : '#171717'}"
									/>
									<button onclick={createGoal} class="btn btn-primary text-sm">Add</button>
								</div>
							</div>
						</div>
					</div>
				{/if}
				
				{#if goals.length > 0}
					<div>
						{#each goals as goal}
							<div class="px-4 sm:px-6 py-3 sm:py-4 transition-colors" style="border-bottom: 1px solid {isDark ? 'rgba(64,64,64,0.3)' : '#f0f0f0'}">
								<div class="flex items-start sm:items-center justify-between mb-2 gap-2">
									<div class="min-w-0 flex-1">
										<p class="font-medium text-sm sm:text-base truncate" style="color: {isDark ? '#ffffff' : '#171717'}">{goal.name}</p>
										<p class="text-[10px] sm:text-xs truncate" style="color: {isDark ? '#737373' : '#9ca3af'}">
											{goal.goal_type === 'reduce_category' ? goal.target_category : goal.target_merchant}
										</p>
									</div>
									<div class="flex items-center gap-2 sm:gap-4 flex-shrink-0">
										<div class="text-right">
											<p class="font-mono text-xs sm:text-sm {goal.over_budget ? 'text-red-400' : 'text-sw-accent'}">
												{formatCurrency(goal.current_period_spent)} / {formatCurrency(goal.target_amount)}
											</p>
											<p class="text-[10px] sm:text-xs" style="color: {isDark ? '#737373' : '#9ca3af'}">
												{goal.over_budget ? 'Over!' : `${formatCurrency(goal.remaining)} left`}
											</p>
										</div>
										<button onclick={() => deleteGoal(goal.id)} class="text-sw-text-dim hover:text-red-400 transition-colors p-1">
											<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
											</svg>
										</button>
									</div>
								</div>
								<!-- Progress bar -->
								<div class="h-1.5 sm:h-2 rounded-full overflow-hidden" style="background: {isDark ? '#262626' : '#f5f0e8'}">
									<div 
										class="h-full rounded-full transition-all {goal.over_budget ? 'bg-red-400' : 'bg-sw-accent'}"
										style="width: {Math.min(goal.progress_pct, 100)}%;"
									></div>
								</div>
								{#if goal.projected_value > 0}
									<p class="text-[10px] sm:text-xs mt-1.5 sm:mt-2 hidden sm:block" style="color: {isDark ? '#737373' : '#9ca3af'}">
										If under budget: Save {formatCurrency(goal.target_amount - goal.current_period_spent)}/mo → {formatCurrency(goal.projected_value)} in {goal.project_years}yr
									</p>
								{/if}
							</div>
						{/each}
					</div>
				{:else if !showGoalForm}
					<div class="px-4 sm:px-6 py-6 sm:py-8 text-center">
						<p class="text-xs sm:text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">No goals yet. Create one to track spending limits!</p>
					</div>
				{/if}
			</div>

			<!-- Top Transactions -->
			{#if summary.topTransactions.length > 0}
				<div class="rounded-2xl overflow-hidden mb-6 sm:mb-8" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}; box-shadow: {isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.06)'}">
					<div class="px-4 sm:px-6 py-3 sm:py-4" style="border-bottom: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
						<h3 class="font-display font-semibold text-sm sm:text-base" style="color: {isDark ? '#ffffff' : '#171717'}">Your Costliest Choices</h3>
						<p class="text-xs sm:text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">Biggest opportunity cost purchases</p>
					</div>
					<div>
						{#each summary.topTransactions.slice(0, 8) as tx, i}
							<div class="px-3 sm:px-6 py-2.5 sm:py-3 flex items-center gap-2 sm:gap-4 transition-colors" style="border-bottom: 1px solid {isDark ? 'rgba(64,64,64,0.3)' : '#f0f0f0'}">
								<div class="w-6 h-6 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-sw-accent font-mono text-xs sm:text-sm flex-shrink-0" style="background: rgba(13,148,136,0.1)">{i + 1}</div>
								<div class="flex-1 min-w-0">
									<p class="font-medium text-sm sm:text-base truncate" style="color: {isDark ? '#ffffff' : '#171717'}">{tx.merchant}</p>
									<p class="text-[10px] sm:text-xs" style="color: {isDark ? '#737373' : '#9ca3af'}">{formatShortDate(tx.date)}</p>
								</div>
								<div class="text-right flex-shrink-0">
									<p class="font-mono text-xs sm:text-sm" style="color: {isDark ? '#ffffff' : '#171717'}">{formatCurrency(tx.amount)}</p>
								</div>
								<div class="hidden sm:block" style="color: {isDark ? '#a3a3a3' : '#737373'}">→</div>
								<div class="text-right flex-shrink-0">
									<p class="font-mono text-xs sm:text-sm text-sw-accent">{formatCurrency(tx.futureValue)}</p>
									<p class="text-[10px] sm:text-xs text-sw-accent">+{formatCurrency(tx.growth)}</p>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Category Details (collapsible) -->
			<details class="rounded-2xl overflow-hidden" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}; box-shadow: {isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.06)'}">
				<summary class="px-4 sm:px-6 py-3 sm:py-4 cursor-pointer transition-colors" style="color: {isDark ? '#ffffff' : '#171717'}">
					<span class="font-display font-semibold text-sm sm:text-base">Full Category Breakdown</span>
					<span class="text-xs sm:text-sm ml-2" style="color: {isDark ? '#a3a3a3' : '#737373'}">({summary.categories.length})</span>
				</summary>
				<div style="border-top: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
					{#each summary.categories as cat, i}
						{@const barWidth = summary.totalSpent > 0 ? (cat.spent / summary.totalSpent) * 100 : 0}
						<div class="px-3 sm:px-6 py-2.5 sm:py-3 transition-colors" style="border-bottom: 1px solid {isDark ? 'rgba(64,64,64,0.3)' : '#f0f0f0'}">
							<div class="flex items-center justify-between mb-1 gap-2">
								<div class="flex items-center gap-1.5 sm:gap-2 min-w-0">
									<div class="w-2 h-2 sm:w-3 sm:h-3 rounded-sm flex-shrink-0" style="background: {COLORS[i % COLORS.length]}"></div>
									<span class="font-medium text-xs sm:text-sm truncate" style="color: {isDark ? '#ffffff' : '#171717'}">{cat.category}</span>
								</div>
								<div class="flex items-center gap-1.5 sm:gap-3 text-xs sm:text-sm flex-shrink-0">
									<span style="color: {isDark ? '#a3a3a3' : '#737373'}">{formatCurrency(cat.spent)}</span>
									<span class="text-sw-accent hidden sm:inline">→</span>
									<span class="hidden sm:inline" style="color: {isDark ? '#ffffff' : '#171717'}">{formatCurrency(cat.future)}</span>
									<span class="text-sw-accent font-mono text-[10px] sm:text-xs">+{formatCurrency(cat.delta)}</span>
								</div>
							</div>
							<div class="h-1 sm:h-1.5 rounded-full overflow-hidden" style="background: {isDark ? '#262626' : '#f5f0e8'}">
								<div class="h-full rounded-full transition-all" style="width: {barWidth}%; background: {COLORS[i % COLORS.length]};"></div>
							</div>
						</div>
					{/each}
				</div>
			</details>

			<!-- Info footer -->
			<div class="mt-6 sm:mt-8 text-center text-xs sm:text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">
				<p>Tracking {summary.ticker} • <a href="/settings" class="text-sw-accent hover:underline">Change ticker</a></p>
			</div>
		{/if}
	</main>
</div>

<!-- Onboarding Modal -->
{#if showOnboarding}
	<Onboarding onComplete={() => showOnboarding = false} />
{/if}
