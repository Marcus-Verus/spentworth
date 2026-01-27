<script lang="ts">
	import type { ScoreBreakdown } from '$lib/types';

	interface Props {
		isDark?: boolean;
	}

	let { isDark = false }: Props = $props();

	let loading = $state(true);
	let breakdown = $state<ScoreBreakdown | null>(null);
	let showDetails = $state(false);

	$effect(() => {
		loadScore();
	});

	async function loadScore() {
		loading = true;
		try {
			const res = await fetch('/api/score');
			const json = await res.json();
			if (json.ok) {
				breakdown = json.data;
			}
		} catch (e) {
			// Error handling - load failed silently
		}
		loading = false;
	}

	function getScoreColor(score: number): string {
		if (score >= 80) return '#22c55e'; // Green
		if (score >= 60) return '#f59e0b'; // Amber
		if (score >= 40) return '#f97316'; // Orange
		return '#ef4444'; // Red
	}

	function getScoreLabel(score: number): string {
		if (score >= 85) return 'Excellent';
		if (score >= 70) return 'Good';
		if (score >= 55) return 'Fair';
		if (score >= 40) return 'Needs Work';
		return 'Critical';
	}

	function getScoreEmoji(score: number): string {
		if (score >= 85) return '🏆';
		if (score >= 70) return '✨';
		if (score >= 55) return '📈';
		if (score >= 40) return '⚠️';
		return '🚨';
	}

	function getTrendIcon(trend: string): string {
		switch (trend) {
			case 'improving': return 'fa-arrow-trend-up';
			case 'declining': return 'fa-arrow-trend-down';
			default: return 'fa-minus';
		}
	}

	function getTrendColor(trend: string): string {
		switch (trend) {
			case 'improving': return '#22c55e';
			case 'declining': return '#ef4444';
			default: return isDark ? '#737373' : '#9ca3af';
		}
	}

	function formatCurrency(amount: number): string {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		}).format(amount);
	}

	// Calculate the SVG arc for the score ring
	function getScoreArc(score: number): string {
		const radius = 54;
		const circumference = 2 * Math.PI * radius;
		const progress = (score / 100) * circumference;
		return `${progress} ${circumference}`;
	}

	const componentLabels: Record<string, { label: string; icon: string }> = {
		budgetAdherenceScore: { label: 'Budgets', icon: 'fa-wallet' },
		spendingConsistencyScore: { label: 'Consistency', icon: 'fa-chart-line' },
		subscriptionHealthScore: { label: 'Subscriptions', icon: 'fa-repeat' },
		savingsRateScore: { label: 'Savings', icon: 'fa-piggy-bank' },
		goalProgressScore: { label: 'Goals', icon: 'fa-bullseye' }
	};
</script>

<!-- Financial Score Card -->
<div 
	class="rounded-2xl overflow-hidden transition-all"
	style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}"
>
	{#if loading}
		<div class="p-8 flex items-center justify-center">
			<div class="w-6 h-6 rounded-full border-2 border-sw-accent border-t-transparent animate-spin"></div>
		</div>
	{:else if breakdown}
		{@const score = breakdown.score}
		<!-- Main Score Display -->
		<div class="p-6 pb-4">
			<div class="flex items-center gap-6">
				<!-- Score Ring -->
				<div class="relative flex-shrink-0">
					<svg class="w-28 h-28 -rotate-90" viewBox="0 0 120 120">
						<!-- Background ring -->
						<circle
							cx="60" cy="60" r="54"
							fill="none"
							stroke={isDark ? '#262626' : '#e5e5e5'}
							stroke-width="8"
						/>
						<!-- Score ring -->
						<circle
							cx="60" cy="60" r="54"
							fill="none"
							stroke={getScoreColor(score.overallScore)}
							stroke-width="8"
							stroke-linecap="round"
							stroke-dasharray={getScoreArc(score.overallScore)}
							class="transition-all duration-1000 ease-out"
						/>
					</svg>
					<div class="absolute inset-0 flex flex-col items-center justify-center">
						<span class="font-display text-3xl font-bold" style="color: {getScoreColor(score.overallScore)}">
							{score.overallScore}
						</span>
						<span class="text-[10px] uppercase tracking-wider" style="color: {isDark ? '#737373' : '#9ca3af'}">
							Score
						</span>
					</div>
				</div>

				<!-- Score Info -->
				<div class="flex-1">
					<div class="flex items-center gap-2 mb-1">
						<span class="text-xl">{getScoreEmoji(score.overallScore)}</span>
						<h3 class="font-display text-lg font-semibold" style="color: {isDark ? '#ffffff' : '#171717'}">
							{getScoreLabel(score.overallScore)}
						</h3>
					</div>
					
					<!-- Trend -->
					<div class="flex items-center gap-2 mb-3">
						<i class="fa-solid {getTrendIcon(score.scoreTrend)} text-xs" style="color: {getTrendColor(score.scoreTrend)}"></i>
						<span class="text-sm" style="color: {getTrendColor(score.scoreTrend)}">
							{#if score.scoreTrend === 'improving'}
								+{score.scoreChange30d} pts this month
							{:else if score.scoreTrend === 'declining'}
								{score.scoreChange30d} pts this month
							{:else}
								Holding steady
							{/if}
						</span>
					</div>

					<!-- Investable Delta -->
					{#if score.monthlyInvestableDelta > 0}
						<div 
							class="rounded-lg px-3 py-2"
							style="background: {isDark ? 'rgba(34,197,94,0.1)' : 'rgba(34,197,94,0.05)'}"
						>
							<p class="text-[10px] uppercase tracking-wide mb-0.5" style="color: {isDark ? '#737373' : '#9ca3af'}">
								Investable potential
							</p>
							<p class="font-display font-semibold text-green-500">
								{formatCurrency(score.monthlyInvestableDelta)}/mo
							</p>
						</div>
					{/if}
				</div>
			</div>
		</div>

		<!-- Toggle Details -->
		<button
			onclick={() => showDetails = !showDetails}
			class="w-full px-6 py-3 flex items-center justify-between border-t transition-colors"
			style="border-color: {isDark ? '#262626' : '#f3f4f6'}; background: {isDark ? '#0f0f0f' : '#fafafa'}"
		>
			<span class="text-sm font-medium" style="color: {isDark ? '#a3a3a3' : '#737373'}">
				Score Breakdown
			</span>
			<i class="fa-solid fa-chevron-{showDetails ? 'up' : 'down'} text-xs" style="color: {isDark ? '#525252' : '#a3a3a3'}"></i>
		</button>

		<!-- Expanded Details -->
		{#if showDetails}
			<div class="px-6 py-4 space-y-4 border-t" style="border-color: {isDark ? '#262626' : '#f3f4f6'}">
				<!-- Component Scores -->
				<div class="space-y-3">
					{#each Object.entries(componentLabels) as [key, meta]}
						{@const value = score[key as keyof typeof score] as number}
						<div>
							<div class="flex items-center justify-between mb-1">
								<div class="flex items-center gap-2">
									<i class="fa-solid {meta.icon} text-xs" style="color: {isDark ? '#525252' : '#9ca3af'}"></i>
									<span class="text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">{meta.label}</span>
								</div>
								<span class="font-mono text-sm font-medium" style="color: {getScoreColor(value)}">{value}</span>
							</div>
							<div class="h-1.5 rounded-full overflow-hidden" style="background: {isDark ? '#262626' : '#e5e5e5'}">
								<div 
									class="h-full rounded-full transition-all duration-500"
									style="width: {value}%; background: {getScoreColor(value)}"
								></div>
							</div>
						</div>
					{/each}
				</div>

				<!-- Leak Score -->
				{#if score.monthlyLeakAmount > 0}
					<div 
						class="rounded-xl p-4"
						style="background: {isDark ? 'rgba(239,68,68,0.05)' : 'rgba(239,68,68,0.03)'}; border: 1px solid {isDark ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.08)'}"
					>
						<div class="flex items-center gap-2 mb-2">
							<i class="fa-solid fa-droplet text-red-400 text-xs"></i>
							<span class="text-sm font-medium" style="color: {isDark ? '#fca5a5' : '#dc2626'}">
								Spending Leak
							</span>
						</div>
						<p class="text-xs" style="color: {isDark ? '#a3a3a3' : '#737373'}">
							<strong class="text-red-400">{formatCurrency(score.monthlyLeakAmount)}/mo</strong> going to discretionary categories that could be invested instead.
						</p>
					</div>
				{/if}

				<!-- Top Insight -->
				{#if breakdown.insights.length > 0}
					{@const topInsight = breakdown.insights[0]}
					<div 
						class="rounded-xl p-4"
						style="background: {topInsight.type === 'positive' 
							? (isDark ? 'rgba(34,197,94,0.05)' : 'rgba(34,197,94,0.03)')
							: topInsight.type === 'negative'
								? (isDark ? 'rgba(239,68,68,0.05)' : 'rgba(239,68,68,0.03)')
								: (isDark ? '#0f0f0f' : '#fafafa')
						}"
					>
						<div class="flex items-center gap-2 mb-1">
							<i class="fa-solid {topInsight.type === 'positive' ? 'fa-circle-check text-green-500' : topInsight.type === 'negative' ? 'fa-triangle-exclamation text-red-400' : 'fa-info-circle'}" 
								style="color: {topInsight.type === 'positive' ? '#22c55e' : topInsight.type === 'negative' ? '#f87171' : (isDark ? '#737373' : '#9ca3af')}"
							></i>
							<span class="text-sm font-medium" style="color: {isDark ? '#ffffff' : '#171717'}">
								{topInsight.title}
							</span>
						</div>
						<p class="text-xs" style="color: {isDark ? '#a3a3a3' : '#737373'}">
							{topInsight.description}
						</p>
					</div>
				{/if}

				<!-- Top Improvement -->
				{#if breakdown.improvements.length > 0}
					{@const topImprovement = breakdown.improvements[0]}
					<div 
						class="rounded-xl p-4"
						style="background: {isDark ? 'rgba(56,142,60,0.05)' : 'rgba(56,142,60,0.03)'}; border: 1px solid {isDark ? 'rgba(56,142,60,0.1)' : 'rgba(56,142,60,0.08)'}"
					>
						<div class="flex items-center justify-between mb-1">
							<span class="text-sm font-medium" style="color: {isDark ? '#ffffff' : '#171717'}">
								<i class="fa-solid fa-lightbulb text-amber-400 mr-1"></i>
								{topImprovement.title}
							</span>
							<span class="text-xs font-mono text-green-500">+{topImprovement.potentialPoints} pts</span>
						</div>
						<p class="text-xs" style="color: {isDark ? '#a3a3a3' : '#737373'}">
							{topImprovement.description}
						</p>
					</div>
				{/if}
			</div>
		{/if}
	{:else}
		<div class="p-6 text-center">
			<div class="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style="background: {isDark ? '#262626' : '#f5f5f5'}">
				<i class="fa-solid fa-chart-simple" style="color: {isDark ? '#525252' : '#d4d4d4'}"></i>
			</div>
			<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">
				Add transactions to see your score
			</p>
		</div>
	{/if}
</div>

