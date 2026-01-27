<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import Logo from '$lib/components/Logo.svelte';

	let isDark = $state(false);
	
	// Tour state
	let tourStep = $state(0);
	let tourActive = $state(true);
	let tourComplete = $state(false);
	
	// Interactive demo state
	let selectedCategory = $state<string | null>(null);
	let showBudgetModal = $state(false);
	let budgetCreated = $state(false);
	let budgetAmount = $state(150);
	
	// Projection toggle
	type ProjectionOption = null | 5 | 10 | 20 | 30;
	let projectionYears = $state<ProjectionOption>(5);

	// ============================================
	// SAMPLE DATA - Sarah's spending story
	// Realistic numbers: ~$3,100/month discretionary
	// ============================================
	
	const sampleData = {
		userName: "Sarah",
		totalSpent: 18472,
		totalFutureValue: 22580,
		totalDelta: 4108,
		transactionCount: 312,
		ticker: 'SPY',
		dateMin: '2025-07-01',
		dateMax: '2026-01-20',
		
		categories: [
			{ category: 'Groceries', spent: 4180, future: 5110, delta: 930 },
			{ category: 'Dining & Restaurants', spent: 3240, future: 3960, delta: 720 },
			{ category: 'Transportation', spent: 2890, future: 3530, delta: 640 },
			{ category: 'Shopping', spent: 2650, future: 3240, delta: 590 },
			{ category: 'Entertainment', spent: 1840, future: 2250, delta: 410 },
			{ category: 'Subscriptions', spent: 1124, future: 1374, delta: 250 },
			{ category: 'Health & Fitness', spent: 1420, future: 1736, delta: 316 },
			{ category: 'Other', spent: 1128, future: 1380, delta: 252 }
		],
		
		monthly: [
			{ month: '2025-07', spent: 2890 },
			{ month: '2025-08', spent: 3240 },
			{ month: '2025-09', spent: 2780 },
			{ month: '2025-10', spent: 3150 },
			{ month: '2025-11', spent: 3620 },
			{ month: '2025-12', spent: 2150 },
			{ month: '2026-01', spent: 642 }
		],
		
		subscriptions: [
			{ name: 'Netflix', amount: 22.99, lastCharged: '2026-01-15', category: 'Entertainment' },
			{ name: 'Spotify Family', amount: 16.99, lastCharged: '2026-01-12', category: 'Entertainment' },
			{ name: 'Equinox', amount: 185.00, lastCharged: '2026-01-05', used: false },
			{ name: 'Adobe Creative Cloud', amount: 59.99, lastCharged: '2026-01-08', category: 'Software' },
			{ name: 'iCloud+ 200GB', amount: 2.99, lastCharged: '2026-01-20', category: 'Software' },
			{ name: 'NYT + Athletic', amount: 25.00, lastCharged: '2026-01-14', category: 'News' },
			{ name: 'Max', amount: 15.99, lastCharged: '2026-01-10', category: 'Entertainment' },
			{ name: 'ChatGPT Plus', amount: 20.00, lastCharged: '2026-01-18', category: 'Software' },
			{ name: 'Headspace', amount: 12.99, lastCharged: '2026-01-03', category: 'Health', used: false }
		],
		
		biggestPurchase: { amount: 847, merchant: 'West Elm', date: '2025-11-24' },
		biggestSpendingDay: { day: 'Saturday', spent: 4120 },
		
		// Financial score components
		score: {
			overallScore: 58,
			budgetAdherenceScore: 52,
			spendingConsistencyScore: 64,
			subscriptionHealthScore: 41,
			savingsRateScore: 68,
			goalProgressScore: 65,
			scoreTrend: 'improving',
			scoreChange30d: 3,
			monthlyInvestableDelta: 485,
			monthlyLeakAmount: 312
		},
		
		// Insights
		insights: [
			{
				type: 'warning',
				icon: 'fa-dumbbell',
				title: 'Unused Equinox Membership',
				description: "You haven't visited Equinox in 52 days but are paying $185/mo. That's $2,220/year.",
				potentialSavings: 2220
			},
			{
				type: 'insight',
				icon: 'fa-utensils',
				title: 'Restaurant Spending Up',
				description: "You spent $540 on dining last month — 22% above your 6-month average of $443.",
				potentialSavings: 580
			},
			{
				type: 'positive',
				icon: 'fa-gift',
				title: 'Holiday Discipline',
				description: "December spending was $2,150 — you stayed 33% under November despite the holidays.",
				potentialSavings: 0
			}
		]
	};

	// Calculate projections
	function calculateProjection(currentValue: number, years: number): number {
		const annualReturn = 0.07;
		return currentValue * Math.pow(1 + annualReturn, years);
	}

	function getProjectedValues() {
		if (projectionYears === null) {
			return {
				value: sampleData.totalFutureValue,
				gain: sampleData.totalDelta,
				gainPercent: sampleData.totalDelta / sampleData.totalSpent
			};
		}
		const projectedValue = calculateProjection(sampleData.totalFutureValue, projectionYears);
		const gain = projectedValue - sampleData.totalSpent;
		return {
			value: projectedValue,
			gain,
			gainPercent: gain / sampleData.totalSpent
		};
	}

	// Formatting helpers
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

	function formatMonth(monthStr: string) {
		const [year, month] = monthStr.split('-');
		return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', {
			month: 'short',
			year: '2-digit'
		});
	}

	// Donut chart
	const COLORS = [
		'#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#ef4444',
		'#ec4899', '#6366f1', '#4CAF50', '#f97316', '#84cc16'
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

	function getScoreColor(score: number): string {
		if (score >= 80) return '#22c55e';
		if (score >= 60) return '#f59e0b';
		if (score >= 40) return '#f97316';
		return '#ef4444';
	}

	function getScoreLabel(score: number): string {
		if (score >= 85) return 'Excellent';
		if (score >= 70) return 'Good';
		if (score >= 55) return 'Fair';
		if (score >= 40) return 'Needs Work';
		return 'Critical';
	}

	function getScoreArc(score: number): string {
		const radius = 54;
		const circumference = 2 * Math.PI * radius;
		const progress = (score / 100) * circumference;
		return `${progress} ${circumference}`;
	}

	// Tour steps
	const tourSteps = [
		{
			title: "Welcome to SpentWorth!",
			description: "This is Sarah's dashboard. She uploaded 6 months of bank statements. Let's explore what SpentWorth revealed about her spending.",
			highlight: null
		},
		{
			title: "The Big Picture",
			description: "Sarah spent $18,472 over 6 months on discretionary spending. If she'd invested that in an index fund, it could be worth $25,900 in 5 years.",
			highlight: 'hero-stats'
		},
		{
			title: "Subscriptions Found",
			description: "SpentWorth detected 9 recurring charges totaling $362/month. That Equinox membership? Sarah hasn't been in 52 days.",
			highlight: 'subscriptions'
		},
		{
			title: "Financial Score",
			description: "This score shows overall financial health. Sarah's at 58 — the unused $185/mo Equinox membership is a big factor.",
			highlight: 'score'
		},
		{
			title: "Pattern Detection",
			description: "SpentWorth finds patterns you might miss. Sarah's restaurant spending was 22% above average last month.",
			highlight: 'insights'
		},
		{
			title: "Ready to see YOUR spending?",
			description: "Sign up free, upload your bank statement CSV, and discover your own opportunities. No bank login required — your data stays private.",
			highlight: null,
			isFinal: true
		}
	];

	function nextTourStep() {
		if (tourStep < tourSteps.length - 1) {
			tourStep++;
		} else {
			tourComplete = true;
			tourActive = false;
		}
	}

	function skipTour() {
		tourActive = false;
	}

	function restartTour() {
		tourStep = 0;
		tourActive = true;
		tourComplete = false;
	}

	// Budget modal
	function createBudget() {
		budgetCreated = true;
		showBudgetModal = false;
	}

	const maxMonthlySpend = Math.max(...sampleData.monthly.map(m => m.spent), 1);
	const totalSubscriptionCost = sampleData.subscriptions.reduce((a, s) => a + s.amount, 0);
	const monthlyDining = sampleData.categories[0].spent / sampleData.monthly.length;
	
	// Reactive projected values
	let projected = $derived(getProjectedValues());
	let budgetProgress = $derived(Math.min(monthlyDining / budgetAmount * 100, 100));

	onMount(() => {
		// Light mode for demo
		isDark = false;
	});
</script>

<svelte:head>
	<title>SpentWorth Demo — See What Your Spending Could Be Worth</title>
	<meta name="description" content="Try SpentWorth with sample data. See how we reveal your spending patterns, hidden subscriptions, and opportunity costs." />
</svelte:head>

<div class="min-h-screen bg-[#faf7f2]">
	<!-- Demo Header -->
	<header class="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-stone-200/60">
		<div class="max-w-6xl mx-auto px-4 sm:px-6">
			<div class="flex items-center justify-between h-14">
				<a href="/" class="flex items-center gap-2">
					<div class="rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white p-1.5">
						<Logo size="sm" class="text-white" />
					</div>
					<span class="font-display text-lg font-bold text-stone-800">SpentWorth</span>
				</a>
				
				<div class="flex items-center gap-3">
					<!-- Demo badge -->
					<span class="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-stone-100 text-stone-600 border border-stone-200">
						<i class="fa-solid fa-flask"></i>
						Demo Mode
					</span>
					
					<button
						onclick={restartTour}
						class="p-2 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition-colors"
						title="Restart tour"
					>
						<i class="fa-solid fa-rotate-left"></i>
					</button>
					
				<a
					href="/signup"
					class="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-500 transition-colors"
				>
					Sign Up Free
				</a>
				</div>
			</div>
		</div>
	</header>

	<!-- Main Content -->
	<main class="max-w-6xl mx-auto px-4 sm:px-6 py-6">
		<!-- Demo Banner -->
		<div class="mb-6 rounded-xl p-4 bg-white border border-stone-200 shadow-sm">
			<div class="flex items-center gap-4">
				<div class="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center flex-shrink-0">
					<i class="fa-solid fa-flask text-stone-500"></i>
				</div>
				<div class="flex-1">
					<p class="font-medium text-sm text-stone-800">
						You're viewing sample data
					</p>
					<p class="text-xs text-stone-500">
						This is Sarah's spending. Sign up to track your own.
					</p>
				</div>
				<a
					href="/signup"
					class="hidden sm:block px-4 py-2 rounded-lg text-sm font-semibold bg-green-600 text-white hover:bg-green-500 transition-colors"
				>
					Try With Your Data
				</a>
			</div>
		</div>

		<!-- Page Header -->
		<div class="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
			<div>
				<h1 class="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-stone-900">
					Welcome back, {sampleData.userName}
				</h1>
				<p class="text-sm text-stone-500">
					Here's your spending overview • Jul 2025 – Jan 2026
				</p>
			</div>
		</div>

		<!-- Projection Toggle -->
		<div class="flex items-center justify-between mb-4">
			<p class="text-xs text-stone-400">
				{projectionYears === null ? 'Actual value today' : `Projected in ${projectionYears} years @ 7% return`}
			</p>
			<div class="inline-flex rounded-lg p-0.5 bg-stone-100">
				{#each [
					{ value: null, label: 'Now' },
					{ value: 5, label: '5yr' },
					{ value: 10, label: '10yr' },
					{ value: 20, label: '20yr' },
					{ value: 30, label: '30yr' }
				] as option}
					<button
						onclick={() => projectionYears = option.value as ProjectionOption}
						class="px-2.5 py-1 rounded-md text-xs font-medium transition-all"
						style="background: {projectionYears === option.value ? '#ffffff' : 'transparent'}; 
							   color: {projectionYears === option.value ? '#171717' : '#737373'};
							   box-shadow: {projectionYears === option.value ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'}"
					>
						{option.label}
					</button>
				{/each}
			</div>
		</div>

		<!-- Hero Stats -->
		<div id="hero-stats" class="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6 relative">
			<div class="rounded-2xl p-5 sm:p-6 text-center bg-white border border-stone-200">
				<p class="text-xs sm:text-sm mb-1 text-stone-500">Total Spent</p>
				<p class="font-display text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">{formatCurrency(sampleData.totalSpent)}</p>
				<p class="text-[10px] sm:text-xs mt-1 text-stone-400">{sampleData.transactionCount} transactions</p>
			</div>
			
			<div class="rounded-2xl p-5 sm:p-6 text-center bg-white border border-stone-200">
				<p class="text-xs sm:text-sm mb-1 text-stone-500">
					{projectionYears === null ? 'If Invested in S&P 500' : 'Projected Value'}
				</p>
				<p class="font-display text-2xl sm:text-3xl font-bold tracking-tight text-green-600">{formatCurrency(projected.value)}</p>
				<p class="text-[10px] sm:text-xs mt-1 text-stone-400">
					{projectionYears === null ? "Today's value" : `In ${projectionYears} years`}
				</p>
			</div>
			
			<div class="rounded-2xl p-5 sm:p-6 text-center bg-white border border-stone-200">
				<p class="text-xs sm:text-sm mb-1 text-stone-500">
					{projectionYears === null ? 'Opportunity Cost' : 'Potential Gain'}
				</p>
				<p class="font-display text-2xl sm:text-3xl font-bold tracking-tight text-green-600">
					+{formatCurrency(projected.gain)}
				</p>
				<p class="text-[10px] sm:text-xs mt-1 text-stone-400">
					{formatPercent(projected.gainPercent)} growth
				</p>
			</div>
		</div>

		<!-- Financial Score & Subscriptions Row -->
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
			<!-- Financial Score Card -->
			<div id="score" class="rounded-2xl overflow-hidden bg-white border border-stone-200 relative">
				<div class="p-6 pb-4">
					<div class="flex items-center gap-6">
						<!-- Score Ring -->
						<div class="relative flex-shrink-0">
							<svg class="w-28 h-28 -rotate-90" viewBox="0 0 120 120">
								<circle cx="60" cy="60" r="54" fill="none" stroke="#e5e5e5" stroke-width="8" />
								<circle
									cx="60" cy="60" r="54"
									fill="none"
									stroke={getScoreColor(sampleData.score.overallScore)}
									stroke-width="8"
									stroke-linecap="round"
									stroke-dasharray={getScoreArc(sampleData.score.overallScore)}
									class="transition-all duration-1000 ease-out"
								/>
							</svg>
							<div class="absolute inset-0 flex flex-col items-center justify-center">
								<span class="font-display text-3xl font-bold" style="color: {getScoreColor(sampleData.score.overallScore)}">
									{sampleData.score.overallScore}
								</span>
								<span class="text-[10px] uppercase tracking-wider text-stone-400">Score</span>
							</div>
						</div>

						<!-- Score Info -->
						<div class="flex-1">
							<div class="flex items-center gap-2 mb-1">
								<i class="fa-solid fa-gauge text-lg" style="color: {getScoreColor(sampleData.score.overallScore)}"></i>
								<h3 class="font-display text-lg font-semibold text-stone-900">
									{getScoreLabel(sampleData.score.overallScore)}
								</h3>
							</div>
							
							<div class="flex items-center gap-2 mb-3">
								<i class="fa-solid fa-arrow-trend-up text-xs text-green-500"></i>
								<span class="text-sm text-green-500">+{sampleData.score.scoreChange30d} pts this month</span>
							</div>

							<div class="rounded-lg px-3 py-2 bg-stone-50 border border-stone-100">
								<p class="text-[10px] uppercase tracking-wide mb-0.5 text-stone-400">Investable potential</p>
								<p class="font-display font-semibold text-green-600">
									{formatCurrency(sampleData.score.monthlyInvestableDelta)}/mo
								</p>
							</div>
						</div>
					</div>
				</div>

				<!-- Score breakdown -->
				<div class="px-6 py-4 border-t border-stone-100 bg-stone-50">
					<div class="grid grid-cols-5 gap-2">
						{#each [
							{ label: 'Budgets', score: sampleData.score.budgetAdherenceScore },
							{ label: 'Consistency', score: sampleData.score.spendingConsistencyScore },
							{ label: 'Subscriptions', score: sampleData.score.subscriptionHealthScore },
							{ label: 'Savings', score: sampleData.score.savingsRateScore },
							{ label: 'Goals', score: sampleData.score.goalProgressScore }
						] as item}
							<div class="text-center">
								<div class="text-xs font-mono font-medium mb-1" style="color: {getScoreColor(item.score)}">{item.score}</div>
								<div class="h-1 rounded-full bg-stone-200 overflow-hidden">
									<div class="h-full rounded-full" style="width: {item.score}%; background: {getScoreColor(item.score)}"></div>
								</div>
								<div class="text-[9px] mt-1 text-stone-400">{item.label}</div>
							</div>
						{/each}
					</div>
				</div>
			</div>

			<!-- Subscriptions Card -->
			<div id="subscriptions" class="rounded-2xl overflow-hidden bg-white border border-stone-200 relative">
				<div class="p-5">
					<div class="flex items-center justify-between mb-4">
						<h3 class="font-display font-semibold text-stone-900">Subscriptions Detected</h3>
						<span class="text-xs font-medium text-stone-500">
							{sampleData.subscriptions.length} found
						</span>
					</div>
					
					<div class="space-y-2 mb-4 max-h-40 overflow-y-auto">
						{#each sampleData.subscriptions as sub}
							<div class="flex items-center justify-between text-sm">
								<div class="flex items-center gap-2">
									{#if sub.used === false}
										<span class="w-2 h-2 rounded-full bg-amber-500" title="Unused"></span>
									{:else}
										<span class="w-2 h-2 rounded-full bg-stone-300"></span>
									{/if}
									<span class="text-stone-900">{sub.name}</span>
									{#if sub.used === false}
										<span class="text-[10px] font-medium text-amber-600">Unused</span>
									{/if}
								</div>
								<span class="font-mono text-stone-500">${sub.amount.toFixed(2)}/mo</span>
							</div>
						{/each}
					</div>
					
					<div class="pt-3 border-t border-stone-100">
						<div class="flex items-center justify-between text-sm mb-1">
							<span class="text-stone-500">Total Monthly</span>
							<span class="font-semibold text-stone-900">${totalSubscriptionCost.toFixed(2)}/mo</span>
						</div>
						<p class="text-xs text-stone-400">
							→ <span class="text-green-600 font-semibold">{formatCurrency(totalSubscriptionCost * 12 * 5 * 1.4)}</span> if invested over 5 years
						</p>
					</div>
				</div>
			</div>
		</div>

			<!-- Insights Row -->
		<div id="insights" class="mb-6 relative">
			<h3 class="font-display font-semibold text-stone-900 mb-3">Insights</h3>
			<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
				{#each sampleData.insights as insight}
					<div class="rounded-xl p-4 bg-white border border-stone-200">
						<div class="flex items-center gap-2 mb-2">
							<div 
								class="w-7 h-7 rounded-lg flex items-center justify-center"
								style="background: {insight.type === 'warning' ? '#f59e0b' : insight.type === 'positive' ? '#22c55e' : '#6366f1'}"
							>
								<i class="fa-solid {insight.icon} text-xs text-white"></i>
							</div>
							<span class="text-sm font-medium text-stone-900">{insight.title}</span>
						</div>
						<p class="text-xs text-stone-500 leading-relaxed">{insight.description}</p>
						{#if insight.potentialSavings > 0}
							<p class="text-xs font-medium mt-2 text-stone-700">
								Potential savings: <span class="text-green-600">{formatCurrency(insight.potentialSavings)}/year</span>
							</p>
						{/if}
					</div>
				{/each}
			</div>
		</div>

		<!-- Two Column Layout -->
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
			<!-- Category Donut -->
			<div class="rounded-2xl p-5 sm:p-6 bg-white border border-stone-200">
				<h3 class="font-display font-semibold mb-4 text-stone-900">Spending by Category</h3>
				<div class="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
					<div class="relative flex-shrink-0">
						<svg viewBox="0 0 200 200" class="w-36 h-36">
							{#each sampleData.categories as cat, i}
								{@const total = sampleData.totalSpent}
								{@const startAngle = sampleData.categories.slice(0, i).reduce((acc, c) => acc + (c.spent / total) * 360, 0)}
								{@const angle = (cat.spent / total) * 360}
								{#if angle > 0.5}
									<path 
										d={getDonutPath(startAngle, startAngle + angle - 0.5)} 
										fill={COLORS[i % COLORS.length]} 
										class="hover:opacity-80 transition-opacity cursor-pointer"
										onclick={() => selectedCategory = selectedCategory === cat.category ? null : cat.category}
									>
										<title>{cat.category}: {formatCurrency(cat.spent)}</title>
									</path>
								{/if}
							{/each}
							<text x="100" y="95" text-anchor="middle" class="text-[10px]" fill="#737373">Total</text>
							<text x="100" y="115" text-anchor="middle" class="font-display font-bold text-sm" fill="#171717">{formatCurrency(sampleData.totalSpent)}</text>
						</svg>
					</div>
					<div class="flex-1 w-full space-y-1.5">
						{#each sampleData.categories.slice(0, 6) as cat, i}
							<div 
								class="flex items-center gap-2 text-sm cursor-pointer rounded px-1 -mx-1 transition-colors"
								class:bg-stone-100={selectedCategory === cat.category}
								onclick={() => selectedCategory = selectedCategory === cat.category ? null : cat.category}
							>
								<div class="w-3 h-3 rounded-sm flex-shrink-0" style="background: {COLORS[i % COLORS.length]}"></div>
								<span class="flex-1 truncate text-stone-900">{cat.category}</span>
								<span class="font-mono text-xs text-stone-500">{formatCurrency(cat.spent)}</span>
							</div>
						{/each}
					</div>
				</div>
				
				{#if selectedCategory}
					{@const cat = sampleData.categories.find(c => c.category === selectedCategory)}
					{#if cat}
						<div class="mt-4 pt-4 border-t border-stone-100">
							<div class="flex items-center justify-between text-sm">
								<span class="text-stone-500">If invested instead:</span>
								<span class="font-semibold text-green-600">{formatCurrency(cat.future)} → +{formatCurrency(cat.delta)}</span>
							</div>
						</div>
					{/if}
				{/if}
			</div>

			<!-- Monthly Spending Chart -->
			<div class="rounded-2xl p-5 sm:p-6 bg-white border border-stone-200">
				<h3 class="font-display font-semibold mb-4 text-stone-900">Monthly Spending</h3>
				<div class="h-32 flex items-end gap-2">
					{#each sampleData.monthly as month}
						{@const height = (month.spent / maxMonthlySpend) * 100}
						<div class="flex-1 flex flex-col items-center gap-1 min-w-[36px]">
							<div class="w-full flex flex-col items-center justify-end" style="height: 100px;">
								<div 
									class="w-full rounded-t transition-all cursor-pointer group relative"
									style="height: {Math.max(height, 4)}%; background: linear-gradient(to top, #388E3C, rgba(56,142,60,0.6));"
									title="{formatMonth(month.month)}: {formatCurrency(month.spent)}"
								></div>
							</div>
							<span class="text-[9px] truncate w-full text-center text-stone-500">{formatMonth(month.month)}</span>
						</div>
					{/each}
				</div>
				
				<div class="mt-4 pt-4 border-t border-stone-100 flex items-center justify-between text-sm">
					<span class="text-stone-500">December was your best month!</span>
					<span class="text-green-600 font-medium">-29% vs Nov</span>
				</div>
			</div>
		</div>

		<!-- Quick Stats Row -->
		<div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
			<div class="rounded-xl p-4 bg-stone-50 border border-stone-200">
				<p class="text-xs mb-1 text-stone-500">Biggest Purchase</p>
				<p class="font-display font-semibold text-lg text-stone-900">{formatCurrency(sampleData.biggestPurchase.amount)}</p>
				<p class="text-[10px] truncate text-stone-400">{sampleData.biggestPurchase.merchant}</p>
			</div>
			<div class="rounded-xl p-4 bg-stone-50 border border-stone-200">
				<p class="text-xs mb-1 text-stone-500">Spendy Day</p>
				<p class="font-display font-semibold text-lg text-stone-900">{sampleData.biggestSpendingDay.day}s</p>
				<p class="text-[10px] text-stone-400">{formatCurrency(sampleData.biggestSpendingDay.spent)} total</p>
			</div>
			<div class="rounded-xl p-4 bg-stone-50 border border-stone-200">
				<p class="text-xs mb-1 text-stone-500">Monthly Average</p>
				<p class="font-display font-semibold text-lg text-stone-900">{formatCurrency(sampleData.totalSpent / sampleData.monthly.length)}</p>
				<p class="text-[10px] text-stone-400">{sampleData.monthly.length} months</p>
			</div>
			<div class="rounded-xl p-4 bg-stone-50 border border-stone-200">
				<p class="text-xs mb-1 text-stone-500">Subscriptions</p>
				<p class="font-display font-semibold text-lg text-stone-900">${totalSubscriptionCost.toFixed(0)}/mo</p>
				<p class="text-[10px] text-stone-400">{sampleData.subscriptions.length} detected</p>
			</div>
		</div>

		<!-- Budget Demo Section -->
		<div class="rounded-2xl p-6 bg-white border border-stone-200 mb-6">
			<div class="flex items-center gap-4 mb-4">
				<div class="w-12 h-12 rounded-xl bg-indigo-500 flex items-center justify-center">
					<i class="fa-solid fa-wallet text-white text-xl"></i>
				</div>
				<div>
					<h3 class="font-display font-semibold text-stone-900">Try Creating a Budget</h3>
					<p class="text-sm text-stone-500">See how budgets help control spending</p>
				</div>
			</div>
			
			{#if !budgetCreated}
				<button
					onclick={() => showBudgetModal = true}
					class="px-4 py-2 rounded-lg text-sm font-semibold bg-green-600 text-white hover:bg-green-500 transition-colors"
				>
					<i class="fa-solid fa-plus mr-2"></i>
					Create a Dining Budget
				</button>
			{:else}
				<div class="bg-stone-50 rounded-xl p-4 border border-stone-200">
					<div class="flex items-center justify-between mb-2">
						<span class="font-medium text-stone-900">Dining & Restaurants</span>
						<span class="text-sm text-stone-500">${budgetAmount}/mo</span>
					</div>
					<div class="h-2 rounded-full bg-stone-200 overflow-hidden mb-2">
						<div 
							class="h-full rounded-full transition-all"
							style="width: {budgetProgress}%; background: {budgetProgress > 90 ? '#dc2626' : budgetProgress > 70 ? '#d97706' : '#16a34a'}"
						></div>
					</div>
					<p class="text-xs text-stone-500">
						{monthlyDining > budgetAmount 
							? `Over budget by ${formatCurrency(monthlyDining - budgetAmount)}/mo`
							: `Under budget by ${formatCurrency(budgetAmount - monthlyDining)}/mo`
						}
					</p>
				</div>
				<p class="text-xs text-stone-600 mt-3">
					<i class="fa-solid fa-check-circle text-green-600 mr-1"></i>
					Budget created! In the real app, you'd get alerts when approaching your limit.
				</p>
			{/if}
		</div>

		<!-- Final CTA -->
		<div class="rounded-2xl p-8 bg-white border border-stone-200 text-center">
			<h2 class="font-display text-2xl font-semibold text-stone-900 mb-2">Ready to see your own spending?</h2>
			<p class="text-stone-500 mb-6 max-w-lg mx-auto">
				This was Sarah's data. Sign up to discover your own patterns, subscriptions, and opportunity costs.
			</p>
			<div class="flex flex-col sm:flex-row gap-3 justify-center">
				<a
					href="/signup"
					class="px-8 py-3 rounded-xl text-base font-semibold bg-green-600 text-white hover:bg-green-500 transition-colors"
				>
					Get Started — It's Free
				</a>
				<a
					href="/"
					class="px-6 py-3 rounded-xl text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors"
				>
					Learn More
				</a>
			</div>
			<p class="text-xs text-stone-400 mt-4">No credit card required • Your data stays private</p>
		</div>
	</main>
</div>

<!-- Tour Overlay -->
{#if tourActive}
	<div class="fixed inset-0 z-50 pointer-events-none">
		<!-- Backdrop -->
		<div class="absolute inset-0 bg-black/50 pointer-events-auto" onclick={skipTour}></div>
		
		<!-- Tour Card - fixed position at bottom center -->
		<div class="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-auto w-full max-w-md px-4">
			<div class="bg-white rounded-2xl p-6 shadow-2xl max-w-md mx-4">
				<!-- Progress dots -->
				<div class="flex justify-center gap-1.5 mb-4">
					{#each tourSteps as _, i}
						<div 
							class="w-2 h-2 rounded-full transition-all"
							style="background: {i === tourStep ? '#22c55e' : i < tourStep ? '#86efac' : '#e5e5e5'}; {i === tourStep ? 'width: 20px;' : ''}"
						></div>
					{/each}
				</div>
				
				<h3 class="font-display text-xl font-semibold text-stone-900 mb-2">{tourSteps[tourStep].title}</h3>
				<p class="text-sm text-stone-600 mb-6 leading-relaxed">{tourSteps[tourStep].description}</p>
				
				<div class="flex items-center justify-between">
					<button
						onclick={skipTour}
						class="text-sm text-stone-500 hover:text-stone-700 transition-colors"
					>
						Skip tour
					</button>
					
					{#if tourSteps[tourStep].isFinal}
						<div class="flex gap-2">
							<button
								onclick={skipTour}
								class="px-4 py-2 text-sm font-medium text-stone-600 hover:text-stone-800 transition-colors"
							>
								Explore Demo
							</button>
							<a
								href="/signup"
								class="px-6 py-2 rounded-lg text-sm font-semibold bg-green-600 text-white hover:bg-green-500 transition-colors"
							>
								Sign Up Free
							</a>
						</div>
					{:else}
						<button
							onclick={nextTourStep}
							class="px-6 py-2 rounded-lg text-sm font-semibold bg-green-600 text-white hover:bg-green-500 transition-colors"
						>
							Next
							<i class="fa-solid fa-arrow-right ml-2"></i>
						</button>
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Budget Modal -->
{#if showBudgetModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<div class="absolute inset-0 bg-black/60" onclick={() => showBudgetModal = false}></div>
		<div class="relative bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
			<h3 class="font-display text-lg font-semibold text-stone-900 mb-4">Create Dining Budget</h3>
			
			<div class="mb-4">
				<label class="text-sm text-stone-600 mb-2 block">Monthly Limit</label>
				<div class="flex items-center gap-3">
					<input 
						type="range" 
						min="50" 
						max="300" 
						step="10"
						bind:value={budgetAmount}
						class="flex-1 accent-green-600"
					/>
					<span class="font-mono text-lg font-semibold text-stone-900 w-16 text-right">${budgetAmount}</span>
				</div>
			</div>
			
			<p class="text-xs text-stone-500 mb-4">
				Sarah currently spends ~${Math.round(sampleData.categories[0].spent / sampleData.monthly.length)}/mo on dining.
				{budgetAmount < sampleData.categories[0].spent / sampleData.monthly.length 
					? 'This budget will help her cut back!' 
					: 'This gives her some wiggle room.'}
			</p>
			
			<div class="flex gap-2">
				<button
					onclick={() => showBudgetModal = false}
					class="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-stone-600 hover:bg-stone-100 transition-colors"
				>
					Cancel
				</button>
				<button
					onclick={createBudget}
					class="flex-1 px-4 py-2 rounded-lg text-sm font-semibold bg-green-600 text-white hover:bg-green-500 transition-colors"
				>
					Create Budget
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	/* Hide scrollbar but allow scrolling */
	.overflow-y-auto::-webkit-scrollbar {
		width: 4px;
	}
	.overflow-y-auto::-webkit-scrollbar-track {
		background: transparent;
	}
	.overflow-y-auto::-webkit-scrollbar-thumb {
		background: #d4d4d4;
		border-radius: 2px;
	}
</style>

