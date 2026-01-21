<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { initTheme, getTheme } from '$lib/stores/theme';

	let isDark = $state(false);
	let activeTab = $state<'dashboard' | 'budgets' | 'insights'>('dashboard');

	onMount(() => {
		initTheme();
		isDark = getTheme() === 'dark';
	});

	function formatCurrency(amount: number): string {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		}).format(amount);
	}

	// Calculate opportunity cost (7% annual return over years)
	function calculateOpportunityCost(monthlyAmount: number, years: number = 10): number {
		let total = 0;
		for (let month = 0; month < years * 12; month++) {
			total = (total + monthlyAmount) * Math.pow(1.07, 1 / 12);
		}
		return Math.round(total);
	}

	// Sample data - realistic spending patterns
	const sampleSummary = {
		totalSpent: 4847,
		totalFutureValue: 6203,
		transactionCount: 89,
		dateRange: 'Dec 2025 - Jan 2026',
		categories: [
			{ name: 'Dining & Restaurants', spent: 892, futureValue: 1142 },
			{ name: 'Groceries', spent: 687, futureValue: 879 },
			{ name: 'Subscriptions', spent: 487, futureValue: 623 },
			{ name: 'Shopping', spent: 534, futureValue: 683 },
			{ name: 'Auto & Transport', spent: 412, futureValue: 527 },
			{ name: 'Coffee & Drinks', spent: 234, futureValue: 299 },
			{ name: 'Entertainment', spent: 189, futureValue: 242 },
			{ name: 'Other', spent: 1412, futureValue: 1808 }
		],
		topMerchants: [
			{ name: 'Amazon', visits: 12, total: 423, category: 'Shopping' },
			{ name: 'Starbucks', visits: 18, total: 127, category: 'Coffee & Drinks' },
			{ name: 'Netflix', visits: 2, total: 31, category: 'Subscriptions' },
			{ name: 'Uber Eats', visits: 8, total: 198, category: 'Food Delivery' },
			{ name: 'Target', visits: 4, total: 156, category: 'Shopping' }
		],
		recurringCharges: [
			{ merchant: 'Netflix', monthlyEstimate: 15.49, category: 'Subscriptions' },
			{ merchant: 'Spotify', monthlyEstimate: 10.99, category: 'Subscriptions' },
			{ merchant: 'Disney+', monthlyEstimate: 13.99, category: 'Subscriptions' },
			{ merchant: 'Adobe Creative Cloud', monthlyEstimate: 54.99, category: 'Subscriptions' },
			{ merchant: 'ChatGPT Plus', monthlyEstimate: 20.00, category: 'Subscriptions' },
			{ merchant: 'iCloud Storage', monthlyEstimate: 2.99, category: 'Subscriptions' },
			{ merchant: 'YouTube Premium', monthlyEstimate: 13.99, category: 'Subscriptions' },
			{ merchant: 'Gym Membership', monthlyEstimate: 49.99, category: 'Fitness & Gym' }
		]
	};

	const sampleBudgets = [
		{ category: 'Dining & Restaurants', limit: 600, spent: 892, previous: 734 },
		{ category: 'Groceries', limit: 700, spent: 687, previous: 712 },
		{ category: 'Coffee & Drinks', limit: 100, spent: 234, previous: 189 },
		{ category: 'Shopping', limit: 300, spent: 534, previous: 467 },
		{ category: 'Entertainment', limit: 200, spent: 189, previous: 203 }
	];

	const sampleInsights = [
		{
			title: 'Your #1 opportunity cost: Dining',
			description: 'You spend ~$892/month on dining. Cut 30% and invest the $268/month savings → $46,000 in 10 years.',
			opportunityCost: 46000
		},
		{
			title: 'Coffee habit adding up',
			description: '18 visits to Starbucks this month (~$7 each). That\'s $127/month → $22,000 in 10 years if invested.',
			opportunityCost: 22000
		},
		{
			title: 'Subscription audit time',
			description: 'You\'re spending $182/month on subscriptions. That\'s $2,190/year → $31,000 if invested over 10 years.',
			opportunityCost: 31000
		},
		{
			title: 'Shopping is 78% over budget',
			description: 'You budgeted $300 but spent $534. The $234 overspend costs $40,000 in lost opportunity over 10 years.',
			opportunityCost: 40000
		}
	];

	// Calculate totals
	const totalSubscriptions = sampleSummary.recurringCharges.reduce((a, b) => a + b.monthlyEstimate, 0);
	const subscriptionOpportunityCost = calculateOpportunityCost(totalSubscriptions);

	function getProgressColor(percent: number): string {
		if (percent >= 100) return '#ef4444';
		if (percent >= 80) return '#f59e0b';
		return '#0d9488';
	}
</script>

<svelte:head>
	<title>Demo | SpentWorth</title>
</svelte:head>

<div class="min-h-screen" style="background: {isDark ? 'var(--sw-bg)' : '#f5f0e8'}">
	<!-- Demo Banner -->
	<div class="bg-sw-accent text-white py-2 px-4 text-center text-sm">
		<span class="font-medium">You're viewing sample data.</span>
		<a href="/login" class="underline ml-2 hover:no-underline">Sign up free</a> to track your own spending.
	</div>

	<!-- Header -->
	<header class="border-b backdrop-blur-md sticky top-0 z-50" style="border-color: {isDark ? 'rgba(42,42,42,0.3)' : 'rgba(0,0,0,0.1)'}; background: {isDark ? 'rgba(10,10,10,0.9)' : 'rgba(245,240,232,0.9)'}">
		<div class="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
			<a href="/" class="flex items-center gap-2">
				<div class="w-8 h-8 rounded-xl bg-sw-accent flex items-center justify-center text-white font-bold text-lg">
					$
				</div>
				<span class="font-display text-lg font-semibold" style="color: {isDark ? '#ffffff' : '#171717'}">SpentWorth</span>
				<span class="text-xs px-2 py-0.5 rounded-full" style="background: {isDark ? '#2a2a2a' : '#e5e5e5'}; color: {isDark ? '#a3a3a3' : '#737373'}">Demo</span>
			</a>
			<a href="/login" class="btn-primary text-sm px-4 py-2">
				Get Started Free
			</a>
		</div>
	</header>

	<!-- Tab Navigation -->
	<div class="max-w-5xl mx-auto px-4 pt-4">
		<div class="flex gap-1 p-1 rounded-lg" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
			{#each [
				{ id: 'dashboard', label: 'Dashboard' },
				{ id: 'budgets', label: 'Budgets' },
				{ id: 'insights', label: 'Insights' }
			] as tab}
				<button
					onclick={() => activeTab = tab.id as typeof activeTab}
					class="flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all"
					style="background: {activeTab === tab.id ? (isDark ? '#2a2a2a' : '#f5f0e8') : 'transparent'}; 
						   color: {activeTab === tab.id ? (isDark ? '#ffffff' : '#171717') : (isDark ? '#737373' : '#9ca3af')}"
				>
					{tab.label}
				</button>
			{/each}
		</div>
	</div>

	<main class="max-w-5xl mx-auto px-4 py-6">
		<!-- Dashboard Tab -->
		{#if activeTab === 'dashboard'}
			<!-- Summary Stats -->
			<div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
				<div class="rounded-xl p-4" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
					<p class="text-xs mb-1" style="color: {isDark ? '#a3a3a3' : '#737373'}">Total Spent</p>
					<p class="font-mono text-xl font-semibold" style="color: {isDark ? '#ffffff' : '#171717'}">{formatCurrency(sampleSummary.totalSpent)}</p>
					<p class="text-xs" style="color: {isDark ? '#737373' : '#9ca3af'}">{sampleSummary.dateRange}</p>
				</div>
				<div class="rounded-xl p-4" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
					<p class="text-xs mb-1" style="color: {isDark ? '#a3a3a3' : '#737373'}">If Invested</p>
					<p class="font-mono text-xl font-semibold text-sw-accent">{formatCurrency(sampleSummary.totalFutureValue)}</p>
					<p class="text-xs" style="color: {isDark ? '#737373' : '#9ca3af'}">5yr @ 7% return</p>
				</div>
				<div class="rounded-xl p-4" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
					<p class="text-xs mb-1" style="color: {isDark ? '#a3a3a3' : '#737373'}">Transactions</p>
					<p class="font-mono text-xl font-semibold" style="color: {isDark ? '#ffffff' : '#171717'}">{sampleSummary.transactionCount}</p>
					<p class="text-xs" style="color: {isDark ? '#737373' : '#9ca3af'}">this period</p>
				</div>
				<div class="rounded-xl p-4" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
					<p class="text-xs mb-1" style="color: {isDark ? '#a3a3a3' : '#737373'}">Subscriptions</p>
					<p class="font-mono text-xl font-semibold" style="color: {isDark ? '#ffffff' : '#171717'}">{formatCurrency(totalSubscriptions)}/mo</p>
					<p class="text-xs" style="color: {isDark ? '#737373' : '#9ca3af'}">{sampleSummary.recurringCharges.length} detected</p>
				</div>
			</div>

			<!-- Categories -->
			<div class="rounded-xl p-5 mb-6" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
				<h2 class="font-display font-semibold text-lg mb-4" style="color: {isDark ? '#ffffff' : '#171717'}">Where Your Money Goes</h2>
				<div class="space-y-3">
					{#each sampleSummary.categories.slice(0, 6) as category}
						{@const percent = (category.spent / sampleSummary.totalSpent) * 100}
						{@const gain = category.futureValue - category.spent}
						<div>
							<div class="flex justify-between text-sm mb-1">
								<span style="color: {isDark ? '#ffffff' : '#171717'}">{category.name}</span>
								<div class="flex items-center gap-2">
									<span class="font-mono" style="color: {isDark ? '#ffffff' : '#171717'}">{formatCurrency(category.spent)}</span>
									<span class="text-xs px-1.5 py-0.5 rounded text-sw-accent" style="background: rgba(13,148,136,0.1)">
										+{formatCurrency(gain)}
									</span>
								</div>
							</div>
							<div class="h-2 rounded-full overflow-hidden" style="background: {isDark ? '#2a2a2a' : '#e5e5e5'}">
								<div class="h-full rounded-full bg-sw-accent" style="width: {percent}%"></div>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<!-- Subscriptions -->
			<div class="rounded-xl overflow-hidden mb-6" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
				<div class="p-4 border-b" style="border-color: {isDark ? '#2a2a2a' : '#e5e5e5'}">
					<h2 class="font-display font-semibold text-lg" style="color: {isDark ? '#ffffff' : '#171717'}">Subscriptions Detected</h2>
					<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">
						{formatCurrency(totalSubscriptions)}/month → {formatCurrency(subscriptionOpportunityCost)} if invested over 10 years
					</p>
				</div>
				<div class="divide-y" style="border-color: {isDark ? '#2a2a2a' : '#f0f0f0'}">
					{#each sampleSummary.recurringCharges as sub}
						<div class="px-4 py-3 flex items-center justify-between">
							<span class="text-sm" style="color: {isDark ? '#ffffff' : '#171717'}">{sub.merchant}</span>
							<span class="font-mono text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">{formatCurrency(sub.monthlyEstimate)}/mo</span>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Budgets Tab -->
		{#if activeTab === 'budgets'}
			<!-- Budget Summary -->
			{@const totalBudgeted = sampleBudgets.reduce((a, b) => a + b.limit, 0)}
			{@const totalSpent = sampleBudgets.reduce((a, b) => a + b.spent, 0)}
			{@const totalRemaining = totalBudgeted - totalSpent}
			{@const budgetsOnTrack = sampleBudgets.filter(b => b.spent <= b.limit).length}
			
			<div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
				<div class="rounded-xl p-4" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
					<p class="text-xs mb-1" style="color: {isDark ? '#a3a3a3' : '#737373'}">Total Budgeted</p>
					<p class="font-mono text-lg font-semibold" style="color: {isDark ? '#ffffff' : '#171717'}">{formatCurrency(totalBudgeted)}</p>
				</div>
				<div class="rounded-xl p-4" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
					<p class="text-xs mb-1" style="color: {isDark ? '#a3a3a3' : '#737373'}">Spent So Far</p>
					<p class="font-mono text-lg font-semibold" style="color: {totalSpent > totalBudgeted ? '#ef4444' : (isDark ? '#ffffff' : '#171717')}">{formatCurrency(totalSpent)}</p>
				</div>
				<div class="rounded-xl p-4" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
					<p class="text-xs mb-1" style="color: {isDark ? '#a3a3a3' : '#737373'}">Remaining</p>
					<p class="font-mono text-lg font-semibold" style="color: {totalRemaining >= 0 ? '#10b981' : '#ef4444'}">{formatCurrency(totalRemaining)}</p>
				</div>
				<div class="rounded-xl p-4" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
					<p class="text-xs mb-1" style="color: {isDark ? '#a3a3a3' : '#737373'}">On Track</p>
					<p class="font-mono text-lg font-semibold" style="color: {isDark ? '#ffffff' : '#171717'}">{budgetsOnTrack}/{sampleBudgets.length}</p>
				</div>
			</div>

			<!-- Opportunity Cost Banner -->
			{#if totalRemaining > 0}
				<div class="rounded-xl p-4 mb-6 flex items-center gap-3" style="background: rgba(13,148,136,0.1); border: 1px solid rgba(13,148,136,0.2)">
					<div class="w-10 h-10 rounded-lg flex items-center justify-center bg-sw-accent/20">
						<i class="fa-solid fa-piggy-bank text-sw-accent"></i>
					</div>
					<div>
						<p class="text-sm font-medium" style="color: {isDark ? '#ffffff' : '#171717'}">
							Stay within budget and invest the {formatCurrency(totalRemaining)} remaining
						</p>
						<p class="text-xs" style="color: {isDark ? '#a3a3a3' : '#737373'}">
							That's <span class="text-sw-accent font-semibold">{formatCurrency(calculateOpportunityCost(totalRemaining))}</span> in 10 years at 7% return
						</p>
					</div>
				</div>
			{/if}

			<!-- Budget Cards -->
			<div class="space-y-3">
				{#each sampleBudgets as budget}
					{@const percent = Math.round((budget.spent / budget.limit) * 100)}
					{@const overUnder = budget.limit - budget.spent}
					{@const trend = budget.previous - budget.spent}
					<div class="rounded-xl overflow-hidden" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
						<!-- Progress bar at top -->
						<div class="h-1.5" style="background: {isDark ? '#2a2a2a' : '#e5e5e5'}">
							<div 
								class="h-full transition-all"
								style="width: {Math.min(percent, 100)}%; background: {getProgressColor(percent)}"
							></div>
						</div>
						
						<div class="p-4">
							<div class="flex items-center justify-between mb-2">
								<div class="flex items-center gap-3">
									<div class="w-9 h-9 rounded-lg flex items-center justify-center" style="background: {isDark ? '#2a2a2a' : '#f5f0e8'}">
										{#if budget.category === 'Dining & Restaurants'}
											<i class="fa-solid fa-utensils text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}"></i>
										{:else if budget.category === 'Groceries'}
											<i class="fa-solid fa-cart-shopping text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}"></i>
										{:else if budget.category === 'Coffee & Drinks'}
											<i class="fa-solid fa-mug-hot text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}"></i>
										{:else if budget.category === 'Shopping'}
											<i class="fa-solid fa-bag-shopping text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}"></i>
										{:else}
											<i class="fa-solid fa-ticket text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}"></i>
										{/if}
									</div>
									<div>
										<h3 class="font-display font-semibold text-sm" style="color: {isDark ? '#ffffff' : '#171717'}">{budget.category}</h3>
										<p class="text-xs" style="color: {isDark ? '#737373' : '#9ca3af'}">
											{formatCurrency(budget.spent)} of {formatCurrency(budget.limit)}
										</p>
									</div>
								</div>
								<div class="text-right">
									<p class="font-mono text-lg font-semibold" style="color: {percent >= 100 ? '#ef4444' : (isDark ? '#ffffff' : '#171717')}">{percent}%</p>
									{#if trend !== 0}
										<p class="text-xs" style="color: {trend > 0 ? '#10b981' : '#ef4444'}">
											<i class="fa-solid fa-arrow-{trend > 0 ? 'down' : 'up'} mr-0.5"></i>
											{formatCurrency(Math.abs(trend))}
										</p>
									{/if}
								</div>
							</div>
							
							<!-- Bottom info row -->
							<div class="flex items-center justify-between pt-2" style="border-top: 1px solid {isDark ? '#2a2a2a' : '#f0f0f0'}">
								{#if overUnder >= 0}
									<span class="text-xs" style="color: {isDark ? '#a3a3a3' : '#737373'}">
										<i class="fa-solid fa-coins text-sw-accent mr-1"></i>
										{formatCurrency(overUnder)} left this month
									</span>
									<span class="text-xs px-2 py-0.5 rounded" style="background: rgba(13,148,136,0.1); color: #0d9488">
										+{formatCurrency(calculateOpportunityCost(overUnder, 10))} potential
									</span>
								{:else}
									<span class="text-xs" style="color: #ef4444">
										<i class="fa-solid fa-triangle-exclamation mr-1"></i>
										{formatCurrency(Math.abs(overUnder))} over budget
									</span>
									<span class="text-xs px-2 py-0.5 rounded" style="background: rgba(239,68,68,0.1); color: #ef4444">
										-{formatCurrency(calculateOpportunityCost(Math.abs(overUnder), 10))} lost
									</span>
								{/if}
							</div>
						</div>
					</div>
				{/each}
			</div>

			<!-- Quick Tips -->
			<div class="mt-6 rounded-xl p-4" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
				<p class="text-xs font-medium mb-2" style="color: {isDark ? '#a3a3a3' : '#737373'}">
					<i class="fa-solid fa-lightbulb text-amber-500 mr-1"></i>Quick tip
				</p>
				<p class="text-sm" style="color: {isDark ? '#ffffff' : '#171717'}">
					Your coffee habit is 134% of budget. Cutting just 2 coffees/week would save {formatCurrency(56)}/month — that's {formatCurrency(calculateOpportunityCost(56, 10))} in 10 years.
				</p>
			</div>
		{/if}

		<!-- Insights Tab -->
		{#if activeTab === 'insights'}
			<div class="rounded-xl p-5 mb-6" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
				<p class="text-sm mb-1" style="color: {isDark ? '#a3a3a3' : '#737373'}">Total opportunity cost</p>
				<p class="font-display text-3xl font-bold" style="color: {isDark ? '#ffffff' : '#171717'}">
					{formatCurrency(sampleInsights.reduce((a, b) => a + b.opportunityCost, 0))}
				</p>
				<p class="text-sm" style="color: {isDark ? '#737373' : '#9ca3af'}">over 10 years at 7% return</p>
			</div>

			<div class="space-y-3">
				{#each sampleInsights as insight, index}
					<div class="rounded-xl p-5" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
						<div class="flex items-start gap-4">
							<div 
								class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-semibold"
								style="background: {isDark ? '#2a2a2a' : '#f5f0e8'}; color: {isDark ? '#a3a3a3' : '#737373'}"
							>
								{index + 1}
							</div>
							<div>
								<h3 class="font-display font-semibold mb-1" style="color: {isDark ? '#ffffff' : '#171717'}">{insight.title}</h3>
								<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#525252'}">{insight.description}</p>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}

		<!-- CTA -->
		<div class="mt-8 rounded-xl p-6 text-center" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
			<h3 class="font-display font-semibold text-xl mb-2" style="color: {isDark ? '#ffffff' : '#171717'}">
				Ready to see your real numbers?
			</h3>
			<p class="text-sm mb-4" style="color: {isDark ? '#a3a3a3' : '#737373'}">
				Import your bank statements and discover what your spending actually costs your future self.
			</p>
			<a href="/login" class="btn-primary inline-flex items-center gap-2 px-6 py-3">
				<i class="fa-solid fa-rocket"></i>
				Get Started Free
			</a>
		</div>
	</main>
</div>

