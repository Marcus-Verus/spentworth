<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import type { DashboardSummary, RecurringCharge } from '$lib/types';

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

	onMount(async () => {
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
			<!-- Date Range Header + How it works -->
			<div class="mb-6 flex items-center justify-between">
				{#if summary.dateMin && summary.dateMax}
					<p class="text-sm text-sw-text-dim">
						Tracking spending from <span class="text-sw-text font-medium">{formatDate(summary.dateMin)}</span> to <span class="text-sw-text font-medium">{formatDate(summary.dateMax)}</span>
						<span class="text-sw-accent">({getDateRangeText()})</span>
					</p>
				{/if}
				<button 
					onclick={() => showHowItWorks = !showHowItWorks}
					class="text-xs text-sw-text-dim hover:text-sw-text flex items-center gap-1"
				>
					<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					How it works
				</button>
			</div>
			
			{#if showHowItWorks}
				<div class="mb-8 bg-gradient-to-br from-sw-accent/5 to-cyan-500/5 rounded-2xl border border-sw-accent/20 p-6">
					<h3 class="font-display font-semibold mb-3">How SpentWorth Works</h3>
					<div class="grid md:grid-cols-3 gap-6 text-sm">
						<div>
							<div class="w-8 h-8 rounded-lg bg-sw-accent/20 flex items-center justify-center text-sw-accent mb-2">1</div>
							<p class="font-medium mb-1">Track Your Spending</p>
							<p class="text-sw-text-dim">Import your bank statements and we categorize your purchases automatically.</p>
						</div>
						<div>
							<div class="w-8 h-8 rounded-lg bg-sw-accent/20 flex items-center justify-center text-sw-accent mb-2">2</div>
							<p class="font-medium mb-1">Calculate Opportunity Cost</p>
							<p class="text-sw-text-dim">For each purchase, we calculate what it would be worth today if you'd invested in {summary.ticker} instead.</p>
						</div>
						<div>
							<div class="w-8 h-8 rounded-lg bg-sw-accent/20 flex items-center justify-center text-sw-accent mb-2">3</div>
							<p class="font-medium mb-1">Make Smarter Choices</p>
							<p class="text-sw-text-dim">See which spending habits cost you the most, set goals, and watch your potential savings grow.</p>
						</div>
					</div>
					<p class="mt-4 text-xs text-sw-text-dim">
						<i class="fa-solid fa-lightbulb mr-1 text-sw-accent"></i><strong>Example:</strong> You spent $100 at Amazon 6 months ago. If you'd invested that in SPY instead, it might be worth $104 today — that's $4 in "opportunity cost" you left on the table.
					</p>
				</div>
			{/if}

			<!-- Hero Stats -->
			<div class="grid md:grid-cols-3 gap-6 mb-8">
				<div class="bg-sw-surface/60 rounded-2xl p-6 border border-sw-border/50 group relative">
					<p class="text-sm text-sw-text-dim mb-2 flex items-center gap-1">
						Total Spent
						<span class="cursor-help text-sw-text-dim/50 hover:text-sw-text-dim">
							<svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
						</span>
					</p>
					<p class="font-display text-4xl font-bold tracking-tight">{formatCurrency(summary.totalSpent)}</p>
					<p class="text-xs text-sw-text-dim mt-2">{summary.transactionCount} purchases • avg {formatCurrency(summary.avgTransaction)}</p>
					<!-- Tooltip -->
					<div class="absolute left-0 right-0 top-full mt-2 p-3 bg-sw-bg border border-sw-border rounded-lg text-xs text-sw-text-dim opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 shadow-lg">
						The total amount you spent on purchases (excluding transfers, payments, refunds, etc.)
					</div>
				</div>
				
				<div class="bg-sw-surface/60 rounded-2xl p-6 border border-sw-border/50 group relative">
					<p class="text-sm text-sw-text-dim mb-2 flex items-center gap-1">
						Today's Value
						<span class="cursor-help text-sw-text-dim/50 hover:text-sw-text-dim">
							<svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
						</span>
					</p>
					<p class="font-display text-4xl font-bold tracking-tight text-sw-accent">{formatCurrency(summary.totalFutureValue)}</p>
					<p class="text-xs text-sw-text-dim mt-2">If you'd invested in {summary.ticker} instead</p>
					<!-- Tooltip -->
					<div class="absolute left-0 right-0 top-full mt-2 p-3 bg-sw-bg border border-sw-border rounded-lg text-xs text-sw-text-dim opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 shadow-lg">
						What your money would be worth today if you had invested each purchase amount into {summary.ticker} (S&P 500 ETF) on the day you made that purchase.
					</div>
				</div>
				
				<div class="bg-gradient-to-br from-sw-accent/20 to-sw-accent/5 rounded-2xl p-6 border border-sw-accent/30 group relative">
					<p class="text-sm text-sw-text-dim mb-2 flex items-center gap-1">
						You Left on the Table
						<span class="cursor-help text-sw-text-dim/50 hover:text-sw-text-dim">
							<svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
						</span>
					</p>
					<p class="font-display text-4xl font-bold tracking-tight text-sw-accent">
						{summary.totalDelta >= 0 ? '+' : ''}{formatCurrency(summary.totalDelta)}
					</p>
					<p class="text-sm text-sw-text-dim mt-1">
						{formatPercent(summary.totalSpent > 0 ? summary.totalDelta / summary.totalSpent : 0)} growth over {getDateRangeText()}
					</p>
					<!-- Tooltip -->
					<div class="absolute left-0 right-0 top-full mt-2 p-3 bg-sw-bg border border-sw-border rounded-lg text-xs text-sw-text-dim opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 shadow-lg">
						This is your "opportunity cost" — the potential gains you missed by spending instead of investing. It's the difference between Today's Value and what you actually spent.
					</div>
				</div>
			</div>

			<!-- Quick Stats Row -->
			{#if summary.biggestPurchase}
				<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
					<div class="bg-sw-surface/40 rounded-xl p-4 border border-sw-border/30">
						<p class="text-xs text-sw-text-dim mb-1"><i class="fa-solid fa-money-bill-wave mr-1.5 text-sw-accent"></i>Biggest Splurge</p>
						<p class="font-mono text-lg">{formatCurrency(summary.biggestPurchase.amount)}</p>
						<p class="text-xs text-sw-text-dim truncate">{summary.biggestPurchase.merchant}</p>
					</div>
					<div class="bg-sw-surface/40 rounded-xl p-4 border border-sw-border/30">
						<p class="text-xs text-sw-text-dim mb-1"><i class="fa-solid fa-calendar-day mr-1.5 text-sw-accent"></i>Spendy Day</p>
						<p class="font-mono text-lg">{summary.biggestSpendingDay.day}s</p>
						<p class="text-xs text-sw-text-dim">{formatCurrency(summary.biggestSpendingDay.spent)} total</p>
					</div>
					<div class="bg-sw-surface/40 rounded-xl p-4 border border-sw-border/30">
						<p class="text-xs text-sw-text-dim mb-1"><i class="fa-solid fa-chart-line mr-1.5 text-sw-accent"></i>Monthly Avg</p>
						<p class="font-mono text-lg">{formatCurrency(summary.totalSpent / Math.max(summary.monthly.length, 1))}</p>
						<p class="text-xs text-sw-text-dim">{summary.monthly.length} months tracked</p>
					</div>
					<div class="bg-sw-surface/40 rounded-xl p-4 border border-sw-border/30">
						<p class="text-xs text-sw-text-dim mb-1"><i class="fa-solid fa-rotate mr-1.5 text-sw-accent"></i>Subscriptions</p>
						<p class="font-mono text-lg">{formatCurrency(summary.recurringCharges.reduce((a, r) => a + r.monthlyEstimate, 0))}/mo</p>
						<p class="text-xs text-sw-text-dim">{summary.recurringCharges.length} detected</p>
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
							<p class="text-sm font-medium">{summary.usingRealPrices > 0 ? 'Mixed calculation' : 'Using estimates'}</p>
							<p class="text-xs text-sw-text-dim">{summary.usingRealPrices} real prices, {summary.usingFallback} estimated</p>
						</div>
					</div>
					<button onclick={recalculateWithRealPrices} disabled={recalculating} class="btn btn-secondary text-sm">
						{recalculating ? 'Fetching...' : 'Refresh Prices'}
					</button>
				</div>
			{/if}
			
			{#if recalcMessage}
				<div class="mb-6 rounded-lg bg-sw-surface/60 border border-sw-border/50 p-4 text-sm">{recalcMessage}</div>
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
										<path d={getDonutPath(startAngle, startAngle + angle - 0.5)} fill={COLORS[i % COLORS.length]} class="hover:opacity-80 transition-opacity cursor-pointer">
											<title>{cat.category}: {formatCurrency(cat.spent)}</title>
										</path>
									{/if}
								{/each}
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

				<!-- Day of Week Chart -->
				<div class="bg-sw-surface/60 rounded-2xl border border-sw-border/50 p-6">
					<h3 class="font-display font-semibold mb-4">Spending by Day</h3>
					<div class="h-44 flex items-end gap-2">
						{#each summary.dayOfWeek as day}
							{@const height = (day.spent / maxDaySpend) * 100}
							{@const isMax = day.day === summary.biggestSpendingDay.day}
							<div class="flex-1 flex flex-col items-center gap-1">
								<div class="w-full flex flex-col items-center justify-end" style="height: 130px;">
									<div 
										class="w-full rounded-t transition-all cursor-pointer relative group {isMax ? 'bg-gradient-to-t from-sw-accent to-sw-accent/80' : 'bg-gradient-to-t from-sw-accent/50 to-sw-accent/30'}"
										style="height: {Math.max(height, 4)}%;"
									>
										<div class="absolute -top-16 left-1/2 -translate-x-1/2 bg-sw-bg border border-sw-border rounded px-2 py-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
											<p class="font-medium">{formatCurrency(day.spent)}</p>
											<p class="text-sw-text-dim">{day.count} transactions</p>
										</div>
									</div>
								</div>
								<span class="text-xs text-sw-text-dim {isMax ? 'text-sw-accent font-medium' : ''}">{day.dayShort}</span>
							</div>
						{/each}
					</div>
				</div>
			</div>

			<!-- Monthly Spending -->
			<div class="bg-sw-surface/60 rounded-2xl border border-sw-border/50 p-6 mb-8">
				<h3 class="font-display font-semibold mb-4">Monthly Spending</h3>
				{#if summary.monthly.length > 0}
					<div class="h-32 flex items-end gap-1">
						{#each summary.monthly as month}
							{@const height = (month.spent / maxMonthlySpend) * 100}
							<div class="flex-1 flex flex-col items-center gap-1 min-w-0">
								<div class="w-full flex flex-col items-center justify-end" style="height: 100px;">
									<div class="w-full bg-gradient-to-t from-sw-accent to-sw-accent/60 rounded-t transition-all hover:from-sw-accent/80 cursor-pointer relative group" style="height: {Math.max(height, 4)}%;">
										<div class="absolute -top-16 left-1/2 -translate-x-1/2 bg-sw-bg border border-sw-border rounded px-2 py-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
											<p class="font-medium">{formatCurrency(month.spent)}</p>
											<p class="text-sw-accent text-[10px]">→ {formatCurrency(month.future)}</p>
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

			<!-- Recurring Charges + What-If Calculator -->
			{#if summary.recurringCharges.length > 0}
				<div class="grid lg:grid-cols-2 gap-6 mb-8">
					<!-- Recurring Charges -->
					<div class="bg-sw-surface/60 rounded-2xl border border-sw-border/50 overflow-hidden">
						<div class="px-6 py-4 border-b border-sw-border/50">
							<h3 class="font-display font-semibold">Recurring Charges</h3>
							<p class="text-sm text-sw-text-dim">Detected subscriptions and regular payments</p>
						</div>
						<div class="divide-y divide-sw-border/30 max-h-80 overflow-y-auto">
							{#each summary.recurringCharges as charge}
								<button 
									onclick={() => selectedWhatIf = charge}
									class="w-full px-6 py-3 flex items-center justify-between hover:bg-sw-bg/30 transition-colors text-left {selectedWhatIf?.merchant === charge.merchant ? 'bg-sw-accent/10' : ''}"
								>
									<div>
										<p class="font-medium">{charge.merchant}</p>
										<p class="text-xs text-sw-text-dim">{charge.frequency} • {charge.count} charges</p>
									</div>
									<div class="text-right">
										<p class="font-mono">{formatCurrency(charge.avgAmount)}</p>
										<p class="text-xs text-sw-text-dim">{formatCurrency(charge.yearlyEstimate)}/yr</p>
									</div>
								</button>
							{/each}
						</div>
						<div class="px-6 py-3 bg-sw-bg/30 border-t border-sw-border/50">
							<div class="flex justify-between text-sm">
								<span class="text-sw-text-dim">Total recurring</span>
								<span class="font-mono font-medium">{formatCurrency(summary.recurringCharges.reduce((a, r) => a + r.monthlyEstimate, 0))}/mo</span>
							</div>
						</div>
					</div>

					<!-- What-If Calculator -->
					<div class="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-2xl border border-purple-500/30 p-6">
						<h3 class="font-display font-semibold mb-2"><i class="fa-solid fa-lightbulb mr-2 text-purple-400"></i>What If Calculator</h3>
						<p class="text-sm text-sw-text-dim mb-4">
							{selectedWhatIf ? `If you cancelled ${selectedWhatIf.merchant}...` : 'Select a recurring charge to see projections'}
						</p>
						
						{#if selectedWhatIf}
							{@const monthlyAmount = selectedWhatIf.monthlyEstimate}
							{@const futureValue = calculateWhatIf(monthlyAmount, whatIfYears)}
							{@const totalContributed = monthlyAmount * whatIfYears * 12}
							{@const gains = futureValue - totalContributed}
							
							<div class="space-y-4">
								<div class="flex items-center gap-4">
									<label class="text-sm text-sw-text-dim">Time horizon:</label>
									<div class="flex rounded-lg bg-sw-bg p-1">
										{#each [5, 10, 20, 30] as years}
											<button 
												onclick={() => whatIfYears = years}
												class="px-3 py-1 text-xs rounded-md transition-colors {whatIfYears === years ? 'bg-purple-500 text-white' : 'text-sw-text-dim hover:text-sw-text'}"
											>
												{years}yr
											</button>
										{/each}
									</div>
								</div>
								
								<div class="bg-sw-bg/50 rounded-xl p-4 space-y-3">
									<div class="flex justify-between">
										<span class="text-sw-text-dim">Monthly savings</span>
										<span class="font-mono">{formatCurrency(monthlyAmount)}</span>
									</div>
									<div class="flex justify-between">
										<span class="text-sw-text-dim">Total contributed</span>
										<span class="font-mono">{formatCurrency(totalContributed)}</span>
									</div>
									<div class="flex justify-between">
										<span class="text-sw-text-dim">Investment gains (7%)</span>
										<span class="font-mono text-sw-accent">+{formatCurrency(gains)}</span>
									</div>
									<div class="border-t border-sw-border/50 pt-3 flex justify-between">
										<span class="font-medium">In {whatIfYears} years</span>
										<span class="font-display text-2xl font-bold text-purple-400">{formatCurrency(futureValue)}</span>
									</div>
								</div>
								
								<p class="text-xs text-sw-text-dim text-center">
									Cancelling {selectedWhatIf.merchant} and investing {formatCurrency(monthlyAmount)}/mo could grow to {formatCurrency(futureValue)} in {whatIfYears} years
								</p>
							</div>
						{:else}
							<div class="bg-sw-bg/50 rounded-xl p-8 text-center">
								<p class="text-sw-text-dim"><i class="fa-solid fa-arrow-left mr-1"></i>Click a recurring charge to see how much you could save</p>
							</div>
						{/if}
					</div>
				</div>
			{/if}

			<!-- Merchant Frequency -->
			<div class="bg-sw-surface/60 rounded-2xl border border-sw-border/50 overflow-hidden mb-8">
				<div class="px-6 py-4 border-b border-sw-border/50 flex items-center justify-between">
					<div>
						<h3 class="font-display font-semibold"><i class="fa-solid fa-store mr-2 text-sw-accent"></i>Where Your Money Goes</h3>
						<p class="text-sm text-sw-text-dim">Your favorite places to spend</p>
					</div>
					<div class="flex rounded-lg bg-sw-bg p-1">
						<button onclick={() => merchantView = 'frequency'} class="px-3 py-1 text-xs rounded-md transition-colors {merchantView === 'frequency' ? 'bg-sw-surface text-sw-text' : 'text-sw-text-dim hover:text-sw-text'}">Most Visits</button>
						<button onclick={() => merchantView = 'spend'} class="px-3 py-1 text-xs rounded-md transition-colors {merchantView === 'spend' ? 'bg-sw-surface text-sw-text' : 'text-sw-text-dim hover:text-sw-text'}">Most Spent</button>
					</div>
				</div>
				<div class="divide-y divide-sw-border/30">
					{#each (merchantView === 'frequency' ? summary.topMerchants : summary.topMerchantsBySpend).slice(0, 10) as merchant, i}
						{@const maxCount = summary.topMerchants[0]?.count || 1}
						{@const maxSpend = summary.topMerchantsBySpend[0]?.totalSpent || 1}
						{@const barWidth = merchantView === 'frequency' ? (merchant.count / maxCount) * 100 : (merchant.totalSpent / maxSpend) * 100}
						
						<div class="px-6 py-3 hover:bg-sw-bg/30 transition-colors">
							<div class="flex items-center gap-4">
								<div class="w-8 h-8 rounded-lg bg-sw-accent/10 flex items-center justify-center text-sw-accent font-mono text-sm flex-shrink-0">{i + 1}</div>
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
										<div class="h-full bg-sw-accent/60 rounded-full transition-all" style="width: {barWidth}%;"></div>
									</div>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<!-- Year-over-Year Comparison -->
			{#if summary.yoyComparison}
				<div class="bg-sw-surface/60 rounded-2xl border border-sw-border/50 overflow-hidden mb-8">
					<div class="px-6 py-4 border-b border-sw-border/50">
						<h3 class="font-display font-semibold"><i class="fa-solid fa-chart-column mr-2 text-sw-accent"></i>Year-over-Year</h3>
						<p class="text-sm text-sw-text-dim">Compared to same period last year</p>
					</div>
					<div class="p-6">
						<div class="grid md:grid-cols-3 gap-6 mb-6">
							<div class="text-center">
								<p class="text-sm text-sw-text-dim mb-1">Last Year</p>
								<p class="font-display text-2xl font-bold">{formatCurrency(summary.yoyComparison.lastYearTotal)}</p>
								<p class="text-xs text-sw-text-dim">{summary.yoyComparison.lastYearTxCount} transactions</p>
							</div>
							<div class="text-center">
								<p class="text-sm text-sw-text-dim mb-1">This Year</p>
								<p class="font-display text-2xl font-bold">{formatCurrency(summary.yoyComparison.currentYearTotal)}</p>
								<p class="text-xs text-sw-text-dim">{summary.transactionCount} transactions</p>
							</div>
							<div class="text-center">
								<p class="text-sm text-sw-text-dim mb-1">Change</p>
								<p class="font-display text-2xl font-bold {summary.yoyComparison.changeAmount > 0 ? 'text-red-400' : 'text-sw-accent'}">
									{summary.yoyComparison.changeAmount > 0 ? '+' : ''}{formatCurrency(summary.yoyComparison.changeAmount)}
								</p>
								<p class="text-xs {summary.yoyComparison.changePct > 0 ? 'text-red-400' : 'text-sw-accent'}">
									{summary.yoyComparison.changePct > 0 ? '↑' : '↓'} {Math.abs(summary.yoyComparison.changePct)}%
								</p>
							</div>
						</div>
						
						{#if summary.yoyComparison.categoryChanges.length > 0}
							<div class="border-t border-sw-border/50 pt-4">
								<p class="text-sm font-medium mb-3">Biggest Changes by Category</p>
								<div class="grid md:grid-cols-2 gap-2">
									{#each summary.yoyComparison.categoryChanges.slice(0, 6) as change}
										<div class="flex items-center justify-between px-3 py-2 bg-sw-bg/30 rounded-lg">
											<span class="text-sm truncate">{change.category}</span>
											<div class="flex items-center gap-2">
												<span class="text-xs text-sw-text-dim">{formatCurrency(change.lastYear)} →</span>
												<span class="text-sm font-mono">{formatCurrency(change.currentYear)}</span>
												<span class="text-xs font-mono px-1.5 py-0.5 rounded {change.change > 0 ? 'bg-red-400/10 text-red-400' : 'bg-sw-accent/10 text-sw-accent'}">
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
			<div class="bg-sw-surface/60 rounded-2xl border border-sw-border/50 overflow-hidden mb-8">
				<div class="px-6 py-4 border-b border-sw-border/50 flex items-center justify-between">
					<div>
						<h3 class="font-display font-semibold"><i class="fa-solid fa-bullseye mr-2 text-sw-accent"></i>Spending Goals</h3>
						<p class="text-sm text-sw-text-dim">Set limits and track your progress</p>
					</div>
					<button onclick={() => showGoalForm = !showGoalForm} class="btn btn-secondary text-sm">
						{showGoalForm ? 'Cancel' : '+ New Goal'}
					</button>
				</div>
				
				{#if showGoalForm}
					<div class="px-6 py-4 bg-sw-bg/30 border-b border-sw-border/50">
						<div class="grid md:grid-cols-4 gap-4">
							<div>
								<label class="block text-xs text-sw-text-dim mb-1">Goal Name</label>
								<input 
									type="text" 
									bind:value={newGoalName}
									placeholder="e.g., Cut dining out"
									class="w-full px-3 py-2 bg-sw-bg border border-sw-border rounded-lg text-sm"
								/>
							</div>
							<div>
								<label class="block text-xs text-sw-text-dim mb-1">Type</label>
								<select bind:value={newGoalType} class="w-full px-3 py-2 bg-sw-bg border border-sw-border rounded-lg text-sm">
									<option value="reduce_category">Limit Category</option>
									<option value="reduce_merchant">Limit Merchant</option>
								</select>
							</div>
							<div>
								<label class="block text-xs text-sw-text-dim mb-1">
									{newGoalType === 'reduce_category' ? 'Category' : 'Merchant'}
								</label>
								{#if newGoalType === 'reduce_category'}
									<select bind:value={newGoalTarget} class="w-full px-3 py-2 bg-sw-bg border border-sw-border rounded-lg text-sm">
										<option value="">Select category...</option>
										{#each displayCategories as cat}
											<option value={cat.category}>{cat.category}</option>
										{/each}
									</select>
								{:else}
									<input 
										type="text" 
										bind:value={newGoalTarget}
										placeholder="e.g., Starbucks"
										class="w-full px-3 py-2 bg-sw-bg border border-sw-border rounded-lg text-sm"
									/>
								{/if}
							</div>
							<div>
								<label class="block text-xs text-sw-text-dim mb-1">Monthly Limit ($)</label>
								<div class="flex gap-2">
									<input 
										type="number" 
										bind:value={newGoalAmount}
										min="1"
										class="flex-1 px-3 py-2 bg-sw-bg border border-sw-border rounded-lg text-sm"
									/>
									<button onclick={createGoal} class="btn btn-primary text-sm">Add</button>
								</div>
							</div>
						</div>
					</div>
				{/if}
				
				{#if goals.length > 0}
					<div class="divide-y divide-sw-border/30">
						{#each goals as goal}
							<div class="px-6 py-4 hover:bg-sw-bg/30 transition-colors">
								<div class="flex items-center justify-between mb-2">
									<div>
										<p class="font-medium">{goal.name}</p>
										<p class="text-xs text-sw-text-dim">
											{goal.goal_type === 'reduce_category' ? `Category: ${goal.target_category}` : `Merchant: ${goal.target_merchant}`}
										</p>
									</div>
									<div class="flex items-center gap-4">
										<div class="text-right">
											<p class="font-mono {goal.over_budget ? 'text-red-400' : 'text-sw-accent'}">
												{formatCurrency(goal.current_period_spent)} / {formatCurrency(goal.target_amount)}
											</p>
											<p class="text-xs text-sw-text-dim">
												{goal.over_budget ? 'Over budget!' : `${formatCurrency(goal.remaining)} remaining`}
											</p>
										</div>
										<button onclick={() => deleteGoal(goal.id)} class="text-sw-text-dim hover:text-red-400 transition-colors">
											<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
											</svg>
										</button>
									</div>
								</div>
								<!-- Progress bar -->
								<div class="h-2 bg-sw-bg rounded-full overflow-hidden">
									<div 
										class="h-full rounded-full transition-all {goal.over_budget ? 'bg-red-400' : 'bg-sw-accent'}"
										style="width: {Math.min(goal.progress_pct, 100)}%;"
									></div>
								</div>
								{#if goal.projected_value > 0}
									<p class="text-xs text-sw-text-dim mt-2">
										<i class="fa-solid fa-piggy-bank mr-1 text-sw-accent"></i>If you stay under budget: Save {formatCurrency(goal.target_amount - goal.current_period_spent)}/mo → {formatCurrency(goal.projected_value)} in {goal.project_years} years
									</p>
								{/if}
							</div>
						{/each}
					</div>
				{:else if !showGoalForm}
					<div class="px-6 py-8 text-center text-sw-text-dim">
						<p>No goals yet. Create one to track your spending limits!</p>
					</div>
				{/if}
			</div>

			<!-- Top Transactions -->
			{#if summary.topTransactions.length > 0}
				<div class="bg-sw-surface/60 rounded-2xl border border-sw-border/50 overflow-hidden mb-8">
					<div class="px-6 py-4 border-b border-sw-border/50">
						<h3 class="font-display font-semibold"><i class="fa-solid fa-coins mr-2 text-sw-accent"></i>Your Costliest Choices</h3>
						<p class="text-sm text-sw-text-dim">The purchases that would've grown the most if invested</p>
					</div>
					<div class="divide-y divide-sw-border/30">
						{#each summary.topTransactions.slice(0, 8) as tx, i}
							<div class="px-6 py-3 flex items-center gap-4 hover:bg-sw-bg/30 transition-colors">
								<div class="w-8 h-8 rounded-lg bg-sw-accent/10 flex items-center justify-center text-sw-accent font-mono text-sm">{i + 1}</div>
								<div class="flex-1 min-w-0">
									<p class="font-medium truncate">{tx.merchant}</p>
									<p class="text-xs text-sw-text-dim">{formatShortDate(tx.date)}</p>
								</div>
								<div class="text-right"><p class="font-mono">{formatCurrency(tx.amount)}</p></div>
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
								<div class="h-full rounded-full transition-all" style="width: {barWidth}%; background: {COLORS[i % COLORS.length]};"></div>
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
