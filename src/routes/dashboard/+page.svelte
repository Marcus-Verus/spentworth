<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import type { DashboardSummary, HiddenDataInfo, UploadNudgeData, PhilosophyPreset } from '$lib/types';
	import Header from '$lib/components/Header.svelte';
	import Onboarding from '$lib/components/Onboarding.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import FinancialScore from '$lib/components/FinancialScore.svelte';
	import UpcomingCharges from '$lib/components/UpcomingCharges.svelte';
	import StreakBadge from '$lib/components/StreakBadge.svelte';
	import ShareCard from '$lib/components/ShareCard.svelte';
	import { initTheme, getTheme, setTheme } from '$lib/stores/theme';

	let isDark = $state(false);
	let isPro = $state(false);

	let { data } = $props();

	let summary = $state<DashboardSummary | null>(null);
	let loading = $state(true);
	let updating = $state(false); // For date range changes (keeps content visible)
	
	// Upload nudge
	let uploadNudge = $state<UploadNudgeData | null>(null);
	let nudgeDismissed = $state(false);
	
	// Monthly trends
	interface TrendData {
		currentMonth: { label: string; totalSpent: number; transactionCount: number };
		previousMonth: { label: string; totalSpent: number; transactionCount: number };
		change: number;
		changePercent: number;
		opportunityCostChange: number;
	}
	let trends = $state<TrendData | null>(null);
	
	// Onboarding
	let showOnboarding = $state(false);
	
	// Share Report
	let showShareCard = $state(false);
	let shareData = $state<{
		year: number;
		projectionYear: number;
		totalSpent: number;
		projectedFutureValue: number;
		topCategories: Array<{ name: string; spent: number; percentage: number }>;
		philosophy: PhilosophyPreset;
	} | null>(null);
	let loadingShare = $state(false);

	async function openShareCard() {
		loadingShare = true;
		try {
			const currentYear = new Date().getFullYear();
			const res = await fetch(`/api/share?year=${currentYear}&projectionYears=20`);
			const json = await res.json();
			if (json.ok && json.data.hasData) {
				shareData = {
					year: json.data.year,
					projectionYear: json.data.projectionYear,
					totalSpent: json.data.totalSpent,
					projectedFutureValue: json.data.projectedFutureValue,
					topCategories: json.data.topCategories || [],
					philosophy: json.data.philosophy || 'comfortable_saver'
				};
				showShareCard = true;
			}
		} catch (e) {
			console.error('Failed to load share data:', e);
		}
		loadingShare = false;
	}
	
	// Date range selector
	type DateRangeOption = 'last_month' | 'last_3_months' | 'last_6_months' | 'ytd' | 'last_year' | 'all_time';
	let selectedDateRange = $state<DateRangeOption>('all_time');
	
	// Projection toggle (null = actual, number = years projection)
	type ProjectionOption = null | 5 | 10 | 20 | 30;
	let projectionYears = $state<ProjectionOption>(null);
	
	function calculateProjection(currentValue: number, years: number): number {
		// 7% annual return assumption
		const annualReturn = 0.07;
		return currentValue * Math.pow(1 + annualReturn, years);
	}
	
	function getProjectedValues() {
		if (!summary) return { value: 0, gain: 0, gainPercent: 0 };
		
		if (projectionYears === null) {
			// Actual values
			return {
				value: summary.totalFutureValue,
				gain: summary.totalDelta,
				gainPercent: summary.totalSpent > 0 ? summary.totalDelta / summary.totalSpent : 0
			};
		}
		
		// Projected values - compound the current future value forward
		const projectedValue = calculateProjection(summary.totalFutureValue, projectionYears);
		const gain = projectedValue - summary.totalSpent;
		return {
			value: projectedValue,
			gain,
			gainPercent: summary.totalSpent > 0 ? gain / summary.totalSpent : 0
		};
	}
	
	const dateRangeOptions: { value: DateRangeOption; label: string; shortLabel: string }[] = [
		{ value: 'last_month', label: 'Last Month', shortLabel: '1M' },
		{ value: 'last_3_months', label: 'Last 3 Months', shortLabel: '3M' },
		{ value: 'last_6_months', label: 'Last 6 Months', shortLabel: '6M' },
		{ value: 'ytd', label: 'Year to Date', shortLabel: 'YTD' },
		{ value: 'last_year', label: 'Last 12 Months', shortLabel: '1Y' },
		{ value: 'all_time', label: 'All Time', shortLabel: 'All' }
	];
	
	function getDateRangeParams(range: DateRangeOption): { from?: string; to?: string } {
		const now = new Date();
		const today = now.toISOString().slice(0, 10);
		
		switch (range) {
			case 'last_month': {
				const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
				const to = new Date(now.getFullYear(), now.getMonth(), 0);
				return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
			}
			case 'last_3_months': {
				const from = new Date(now);
				from.setMonth(from.getMonth() - 3);
				return { from: from.toISOString().slice(0, 10), to: today };
			}
			case 'last_6_months': {
				const from = new Date(now);
				from.setMonth(from.getMonth() - 6);
				return { from: from.toISOString().slice(0, 10), to: today };
			}
			case 'ytd': {
				const from = new Date(now.getFullYear(), 0, 1);
				return { from: from.toISOString().slice(0, 10), to: today };
			}
			case 'last_year': {
				const from = new Date(now);
				from.setFullYear(from.getFullYear() - 1);
				return { from: from.toISOString().slice(0, 10), to: today };
			}
			case 'all_time':
			default:
				return {};
		}
	}
	
	async function selectDateRange(range: DateRangeOption) {
		selectedDateRange = range;
		updating = true;
		
		const params = new URLSearchParams();
		const { from, to } = getDateRangeParams(range);
		if (from) params.set('from', from);
		if (to) params.set('to', to);
		
		const url = `/api/dashboard/summary${params.toString() ? '?' + params.toString() : ''}`;
		const res = await fetch(url);
		const json = await res.json();

		if (json.ok) {
			summary = json.data;
		}
		updating = false;
	}

	onMount(async () => {
		initTheme();
		isDark = getTheme() === 'dark';
		
		// Parallelize ALL initial API calls for faster loading
		const [subRes, settingsRes] = await Promise.all([
			fetch('/api/stripe/subscription').catch(() => null),
			fetch('/api/settings').catch(() => null),
			// Start loading main data immediately in parallel
			loadSummary(),
			loadTrends(),
			loadUploadNudge()
		]);
		
		// Check Pro status
		try {
			if (subRes?.ok) {
				const subData = await subRes.json();
				isPro = subData.plan === 'pro' && ['active', 'trialing'].includes(subData.status);
			}
		} catch { /* ignore */ }
		
		if (!isPro && isDark) {
			setTheme('light');
			isDark = false;
		}
		
		// Check onboarding from database
		try {
			if (settingsRes?.ok) {
				const settingsData = await settingsRes.json();
				const onboardingCompleted = settingsData.data?.onboardingCompleted ?? false;
				if (!onboardingCompleted) {
					showOnboarding = true;
				}
			}
		} catch { /* ignore */ }
	});

	async function loadUploadNudge() {
		try {
			const res = await fetch('/api/upload-nudge');
			const json = await res.json();
			if (json.ok) {
				uploadNudge = json.data;
			}
		} catch (e) {
			console.error('Failed to load upload nudge:', e);
		}
	}

	async function loadSummary() {
		loading = true;
		
		const params = new URLSearchParams();
		const { from, to } = getDateRangeParams(selectedDateRange);
		if (from) params.set('from', from);
		if (to) params.set('to', to);
		
		const url = `/api/dashboard/summary${params.toString() ? '?' + params.toString() : ''}`;
		const res = await fetch(url);
		const json = await res.json();

		if (json.ok) {
			summary = json.data;
		}
		loading = false;
	}

	async function loadTrends() {
		try {
			const res = await fetch('/api/dashboard/trends');
			const json = await res.json();
			if (json.ok) {
				trends = json.data;
			}
		} catch (e) {
			console.error('Failed to load trends:', e);
		}
	}

	async function handleLogout() {
		// Clear cached plan to avoid flash on next login
		localStorage.removeItem('sw_user_plan');
		await data.supabase.auth.signOut();
		goto('/');
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

	function getTickerName(ticker: string): string {
		const tickerMap: Record<string, string> = {
			'SPY': 'S&P 500',
			'VTI': 'Total Stock Market',
			'VOO': 'S&P 500',
			'QQQ': 'Nasdaq 100'
		};
		return tickerMap[ticker] || ticker;
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

	function getDisplayCategories() {
		if (!summary) return [];
		const threshold = summary.totalSpent * 0.03;
		const main: typeof summary.categories = [];
		let otherSpent = 0;
		let otherFuture = 0;
		
		for (const cat of summary.categories) {
			if (cat.spent >= threshold && main.length < 6) {
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
			displayCategories = getDisplayCategories();
			maxMonthlySpend = Math.max(...summary.monthly.map(m => m.spent), 1);
		}
	});

	let maxMonthlySpend = $state(1);
	let displayCategories = $state<Array<{category: string; spent: number; future: number; delta: number}>>([]);
	
	function formatMonth(monthStr: string) {
		const [year, month] = monthStr.split('-');
		return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', {
			month: 'short',
			year: '2-digit'
		});
	}
</script>

<div class="min-h-screen">
	<Header onLogout={handleLogout} />

	<main class="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
		{#if loading}
			<div class="flex items-center justify-center py-24">
				<div class="w-8 h-8 rounded-full border-2 border-sw-accent border-t-transparent animate-spin"></div>
			</div>
		{:else if !summary || summary.totalSpent === 0}
			<EmptyState type="no-data" />
		{:else}
			<!-- Upload Nudge Banner -->
			{#if uploadNudge?.show && !nudgeDismissed}
				<div 
					class="mb-6 rounded-xl p-4 flex items-center gap-4 animate-fade-in"
					style="background: linear-gradient(135deg, rgba(245,158,11,0.1), rgba(249,115,22,0.08)); border: 1px solid rgba(245,158,11,0.2)"
				>
					<div class="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
						<i class="fa-solid fa-upload text-amber-500"></i>
					</div>
					<div class="flex-1 min-w-0">
						<p class="font-medium text-sm" style="color: {isDark ? '#fbbf24' : '#d97706'}">
							{uploadNudge.message}
						</p>
						{#if uploadNudge.sourcesNeedingUpload.length > 0}
							<p class="text-xs mt-0.5" style="color: {isDark ? '#a3a3a3' : '#737373'}">
								{uploadNudge.sourcesNeedingUpload.map(s => s.name).slice(0, 3).join(', ')}
								{#if uploadNudge.sourcesNeedingUpload.length > 3}
									+{uploadNudge.sourcesNeedingUpload.length - 3} more
								{/if}
							</p>
						{/if}
					</div>
					<div class="flex items-center gap-2 flex-shrink-0">
						<a
							href="/imports"
							class="px-4 py-2 rounded-lg text-sm font-semibold transition-colors bg-amber-500 text-white hover:bg-amber-600"
						>
							Upload Now
						</a>
						<button
							onclick={() => nudgeDismissed = true}
							class="p-2 rounded-lg transition-colors hover:bg-amber-500/10"
							title="Dismiss"
						>
							<i class="fa-solid fa-xmark" style="color: {isDark ? '#a3a3a3' : '#737373'}"></i>
						</button>
					</div>
				</div>
			{/if}

			<!-- Page Header with Streaks -->
			<div class="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
				<div>
					<h1 class="font-display text-2xl sm:text-3xl font-semibold tracking-tight mb-2" style="color: {isDark ? '#ffffff' : '#171717'}">
						Welcome back
					</h1>
					<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">
						Here's your spending overview
						{#if summary.dateMin && summary.dateMax}
							 • {formatDate(summary.dateMin)} – {formatDate(summary.dateMax)}
						{/if}
					</p>
				</div>
				<!-- Actions: Streak badges + Share button -->
				<div class="flex items-center gap-3">
					<StreakBadge {isDark} compact={true} />
					<button
						onclick={openShareCard}
						disabled={loadingShare}
						class="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all hover:scale-105"
						style="background: linear-gradient(135deg, rgba(139,92,246,0.15), rgba(139,92,246,0.08)); border: 1px solid rgba(139,92,246,0.2); color: #8b5cf6"
						title="Share your spending report"
					>
						{#if loadingShare}
							<i class="fa-solid fa-spinner fa-spin"></i>
						{:else}
							<i class="fa-solid fa-share-nodes"></i>
						{/if}
						<span class="hidden sm:inline">Share</span>
					</button>
				</div>
			</div>

			<!-- Date Range Pills -->
			<div class="flex items-center gap-1.5 mb-6 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
				{#each dateRangeOptions as option}
					<button
						onclick={() => selectDateRange(option.value)}
						disabled={updating}
						class="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap"
						style="background: {selectedDateRange === option.value 
							? (isDark ? 'linear-gradient(135deg, #388E3C, #2E7D32)' : '#388E3C') 
							: (isDark ? '#262626' : '#f5f0e8')}; 
							color: {selectedDateRange === option.value 
								? '#ffffff' 
								: (isDark ? '#a3a3a3' : '#525252')};
							border: 1px solid {selectedDateRange === option.value 
								? 'transparent' 
								: (isDark ? '#3a3a3a' : '#d4cfc5')};
							opacity: {updating ? '0.6' : '1'}"
					>
						{option.shortLabel}
					</button>
				{/each}
				{#if updating}
					<div class="w-4 h-4 rounded-full border-2 border-sw-accent border-t-transparent animate-spin ml-2"></div>
				{/if}
			</div>

			<!-- Projection Toggle -->
			<div class="flex items-center justify-between mb-4">
				<p class="text-xs" style="color: {isDark ? '#737373' : '#9ca3af'}">
					{projectionYears === null ? 'Actual value today' : `Projected in ${projectionYears} years @ 7% return`}
				</p>
				<div class="inline-flex rounded-lg p-0.5" style="background: {isDark ? '#0a0a0a' : '#f5f0e8'}">
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
							style="background: {projectionYears === option.value ? (isDark ? '#1a1a1a' : '#ffffff') : 'transparent'}; 
								   color: {projectionYears === option.value ? (isDark ? '#ffffff' : '#171717') : (isDark ? '#737373' : '#737373')};
								   box-shadow: {projectionYears === option.value ? (isDark ? '0 1px 2px rgba(0,0,0,0.3)' : '0 1px 2px rgba(0,0,0,0.05)') : 'none'}"
						>
							{option.label}
						</button>
					{/each}
				</div>
			</div>

			<!-- Hero Stats -->
			{@const projected = getProjectedValues()}
			<div class="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8 transition-opacity duration-200" style="opacity: {updating ? '0.5' : '1'}">
				<div class="rounded-2xl p-5 sm:p-6 text-center" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
					<p class="text-xs sm:text-sm mb-1" style="color: {isDark ? '#a3a3a3' : '#737373'}">Total Spent</p>
					<p class="font-display text-2xl sm:text-3xl font-bold tracking-tight" style="color: {isDark ? '#ffffff' : '#171717'}">{formatCurrency(summary.totalSpent)}</p>
					<p class="text-[10px] sm:text-xs mt-1" style="color: {isDark ? '#737373' : '#9ca3af'}">{summary.transactionCount} transactions</p>
				</div>
				
				<div class="rounded-2xl p-5 sm:p-6 text-center" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
					<p class="text-xs sm:text-sm mb-1" style="color: {isDark ? '#a3a3a3' : '#737373'}">
						{projectionYears === null ? `If Invested in ${getTickerName(summary.ticker)}` : `Projected Value`}
					</p>
					<p class="font-display text-2xl sm:text-3xl font-bold tracking-tight text-sw-accent">{formatCurrency(projected.value)}</p>
					<p class="text-[10px] sm:text-xs mt-1" style="color: {isDark ? '#737373' : '#9ca3af'}">
						{projectionYears === null ? "Today's value" : `In ${projectionYears} years`}
					</p>
				</div>
				
				<div class="rounded-2xl p-5 sm:p-6 text-center" style="background: {isDark ? 'linear-gradient(135deg, rgba(56,142,60,0.15), rgba(56,142,60,0.05))' : 'linear-gradient(135deg, rgba(56,142,60,0.1), rgba(56,142,60,0.02))'}; border: 1px solid {isDark ? 'rgba(56,142,60,0.3)' : 'rgba(56,142,60,0.2)'}">
					<p class="text-xs sm:text-sm mb-1" style="color: {isDark ? '#a3a3a3' : '#737373'}">
						{projectionYears === null ? 'Opportunity Cost' : 'Potential Gain'}
					</p>
					<p class="font-display text-2xl sm:text-3xl font-bold tracking-tight text-sw-accent">
						+{formatCurrency(projected.gain)}
					</p>
					<p class="text-[10px] sm:text-xs mt-1" style="color: {isDark ? '#737373' : '#9ca3af'}">
						{formatPercent(projected.gainPercent)} growth
					</p>
				</div>
			</div>

			<!-- Price Data Source Indicator -->
			{#if summary.usingFallback > 0}
				{@const fallbackPercent = Math.round((summary.usingFallback / summary.transactionCount) * 100)}
				{@const allFallback = summary.usingRealPrices === 0}
				<div 
					class="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg text-xs"
					style="background: {isDark ? 'rgba(251,191,36,0.1)' : 'rgba(251,191,36,0.08)'}; border: 1px solid {isDark ? 'rgba(251,191,36,0.3)' : 'rgba(251,191,36,0.2)'}; color: {isDark ? '#fbbf24' : '#b45309'}"
				>
					<i class="fa-solid fa-info-circle"></i>
					<span>
						{#if allFallback}
							Using estimated 7% annual return (price data unavailable for {summary.ticker})
						{:else}
							{fallbackPercent}% of transactions use estimated returns (older dates without price data)
						{/if}
					</span>
					<a 
						href="/settings#investments" 
						class="ml-auto underline hover:no-underline"
						style="color: inherit"
					>
						Settings
					</a>
				</div>
			{/if}

			<!-- Monthly Trend Alert -->
			{#if trends && trends.change !== 0}
				<div class="rounded-xl p-4 mb-6" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-3">
							<div class="w-10 h-10 rounded-full flex items-center justify-center" style="background: {trends.change < 0 ? '#22c55e' : '#ef4444'}">
								<i class="fa-solid {trends.change < 0 ? 'fa-arrow-trend-down' : 'fa-arrow-trend-up'} text-white"></i>
							</div>
							<div>
								<p class="font-medium text-sm" style="color: {isDark ? '#ffffff' : '#171717'}">
									{trends.change < 0 ? 'Spending down' : 'Spending up'} vs last month
								</p>
								<p class="text-xs" style="color: {isDark ? '#a3a3a3' : '#737373'}">
									{formatCurrency(Math.abs(trends.change))} {trends.change < 0 ? 'less' : 'more'} than {trends.previousMonth.label}
								</p>
							</div>
						</div>
						<a href="/insights" class="text-xs font-medium text-sw-accent hover:underline">
							View details →
						</a>
					</div>
				</div>
			{/if}

			<!-- Financial Score & Upcoming Charges Row -->
			<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
				<FinancialScore {isDark} />
				<UpcomingCharges {isDark} />
			</div>

			<!-- Two Column Layout -->
			<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
				<!-- Category Donut -->
				<div class="rounded-2xl p-5 sm:p-6" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
					<h3 class="font-display font-semibold mb-4" style="color: {isDark ? '#ffffff' : '#171717'}">Spending by Category</h3>
					<div class="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
						<div class="relative flex-shrink-0">
							<svg viewBox="0 0 200 200" class="w-36 h-36">
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
								<text x="100" y="95" text-anchor="middle" class="text-[10px]" style="fill: {isDark ? '#a3a3a3' : '#737373'}">Total</text>
								<text x="100" y="115" text-anchor="middle" class="font-display font-bold text-sm" style="fill: {isDark ? '#ffffff' : '#171717'}">{formatCurrency(summary.totalSpent)}</text>
							</svg>
						</div>
						<div class="flex-1 w-full space-y-1.5">
							{#each displayCategories as cat, i}
								<div class="flex items-center gap-2 text-sm">
									<div class="w-3 h-3 rounded-sm flex-shrink-0" style="background: {COLORS[i % COLORS.length]}"></div>
									<span class="flex-1 truncate" style="color: {isDark ? '#ffffff' : '#171717'}">{cat.category}</span>
									<span class="font-mono text-xs" style="color: {isDark ? '#a3a3a3' : '#737373'}">{formatCurrency(cat.spent)}</span>
								</div>
							{/each}
						</div>
					</div>
				</div>

				<!-- Monthly Spending Chart -->
				<div class="rounded-2xl p-5 sm:p-6" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
					<h3 class="font-display font-semibold mb-4" style="color: {isDark ? '#ffffff' : '#171717'}">Monthly Spending</h3>
					{#if summary.monthly.length > 0}
						<div class="h-32 flex items-end gap-1 overflow-x-auto pb-1">
							{#each summary.monthly.slice(-12) as month}
								{@const height = (month.spent / maxMonthlySpend) * 100}
								<div class="flex-1 flex flex-col items-center gap-1 min-w-[28px]">
									<div class="w-full flex flex-col items-center justify-end" style="height: 100px;">
										<div 
											class="w-full rounded-t transition-all cursor-pointer relative group"
											style="height: {Math.max(height, 4)}%; background: linear-gradient(to top, #388E3C, rgba(56,142,60,0.6));"
											title="{formatMonth(month.month)}: {formatCurrency(month.spent)}"
										></div>
									</div>
									<span class="text-[9px] truncate w-full text-center" style="color: {isDark ? '#a3a3a3' : '#737373'}">{formatMonth(month.month)}</span>
								</div>
							{/each}
						</div>
					{:else}
						<p class="text-sm text-center py-8" style="color: {isDark ? '#a3a3a3' : '#737373'}">Not enough data</p>
					{/if}
				</div>
			</div>

			<!-- Quick Stats Row -->
			{#if summary.biggestPurchase}
				<div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
					<div class="rounded-xl p-4" style="background: {isDark ? 'rgba(38,38,38,0.6)' : 'rgba(245,240,232,0.6)'}; border: 1px solid {isDark ? 'rgba(64,64,64,0.3)' : '#d4cfc5'}">
						<p class="text-xs mb-1" style="color: {isDark ? '#a3a3a3' : '#737373'}">Biggest Purchase</p>
						<p class="font-display font-semibold text-lg" style="color: {isDark ? '#ffffff' : '#171717'}">{formatCurrency(summary.biggestPurchase.amount)}</p>
						<p class="text-[10px] truncate" style="color: {isDark ? '#737373' : '#9ca3af'}">{summary.biggestPurchase.merchant}</p>
					</div>
					<div class="rounded-xl p-4" style="background: {isDark ? 'rgba(38,38,38,0.6)' : 'rgba(245,240,232,0.6)'}; border: 1px solid {isDark ? 'rgba(64,64,64,0.3)' : '#d4cfc5'}">
						<p class="text-xs mb-1" style="color: {isDark ? '#a3a3a3' : '#737373'}">Spendy Day</p>
						<p class="font-display font-semibold text-lg" style="color: {isDark ? '#ffffff' : '#171717'}">{summary.biggestSpendingDay.day}s</p>
						<p class="text-[10px]" style="color: {isDark ? '#737373' : '#9ca3af'}">{formatCurrency(summary.biggestSpendingDay.spent)} total</p>
					</div>
					<div class="rounded-xl p-4" style="background: {isDark ? 'rgba(38,38,38,0.6)' : 'rgba(245,240,232,0.6)'}; border: 1px solid {isDark ? 'rgba(64,64,64,0.3)' : '#d4cfc5'}">
						<p class="text-xs mb-1" style="color: {isDark ? '#a3a3a3' : '#737373'}">Monthly Average</p>
						<p class="font-display font-semibold text-lg" style="color: {isDark ? '#ffffff' : '#171717'}">{formatCurrency(summary.totalSpent / Math.max(summary.monthly.length, 1))}</p>
						<p class="text-[10px]" style="color: {isDark ? '#737373' : '#9ca3af'}">{summary.monthly.length} months</p>
					</div>
					<div class="rounded-xl p-4" style="background: {isDark ? 'rgba(38,38,38,0.6)' : 'rgba(245,240,232,0.6)'}; border: 1px solid {isDark ? 'rgba(64,64,64,0.3)' : '#d4cfc5'}">
						<p class="text-xs mb-1" style="color: {isDark ? '#a3a3a3' : '#737373'}">Subscriptions</p>
						<p class="font-display font-semibold text-lg" style="color: {isDark ? '#ffffff' : '#171717'}">{formatCurrency(summary.recurringCharges.reduce((a, r) => a + r.monthlyEstimate, 0))}/mo</p>
						<p class="text-[10px]" style="color: {isDark ? '#737373' : '#9ca3af'}">{summary.recurringCharges.length} detected</p>
					</div>
				</div>
			{/if}

			<!-- Navigation Cards -->
			<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
				<a href="/transactions" class="rounded-xl p-5 transition-all hover:scale-[1.02] group" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
					<div class="flex items-center gap-4">
						<div class="w-12 h-12 rounded-xl bg-green-600 flex items-center justify-center">
							<i class="fa-solid fa-list text-xl text-white"></i>
						</div>
						<div class="flex-1">
							<p class="font-display font-semibold" style="color: {isDark ? '#ffffff' : '#171717'}">Transactions</p>
							<p class="text-xs" style="color: {isDark ? '#a3a3a3' : '#737373'}">View, search & edit all spending</p>
						</div>
						<i class="fa-solid fa-chevron-right text-xs group-hover:translate-x-1 transition-transform" style="color: {isDark ? '#525252' : '#a3a3a3'}"></i>
					</div>
				</a>

				<a href="/budgets" class="rounded-xl p-5 transition-all hover:scale-[1.02] group" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
					<div class="flex items-center gap-4">
						<div class="w-12 h-12 rounded-xl bg-indigo-500 flex items-center justify-center">
							<i class="fa-solid fa-wallet text-xl text-white"></i>
						</div>
						<div class="flex-1">
							<p class="font-display font-semibold" style="color: {isDark ? '#ffffff' : '#171717'}">Budgets</p>
							<p class="text-xs" style="color: {isDark ? '#a3a3a3' : '#737373'}">Set limits & track progress</p>
						</div>
						<i class="fa-solid fa-chevron-right text-xs group-hover:translate-x-1 transition-transform" style="color: {isDark ? '#525252' : '#a3a3a3'}"></i>
					</div>
				</a>

				<a href="/insights" class="rounded-xl p-5 transition-all hover:scale-[1.02] group" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
					<div class="flex items-center gap-4">
						<div class="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center">
							<i class="fa-solid fa-lightbulb text-xl text-white"></i>
						</div>
						<div class="flex-1">
							<p class="font-display font-semibold" style="color: {isDark ? '#ffffff' : '#171717'}">Insights</p>
							<p class="text-xs" style="color: {isDark ? '#a3a3a3' : '#737373'}">Patterns & opportunities</p>
						</div>
						<i class="fa-solid fa-chevron-right text-xs group-hover:translate-x-1 transition-transform" style="color: {isDark ? '#525252' : '#a3a3a3'}"></i>
					</div>
				</a>
			</div>

			<!-- Footer -->
			<div class="mt-8 text-center text-xs" style="color: {isDark ? '#525252' : '#9ca3af'}">
				<p>Tracking {getTickerName(summary.ticker)} • <a href="/settings" class="text-sw-accent hover:underline">Settings</a></p>
			</div>
		{/if}
	</main>
</div>

<!-- Onboarding Modal -->
{#if showOnboarding}
	<Onboarding onComplete={() => showOnboarding = false} />
{/if}

<!-- Share Card Modal -->
{#if showShareCard && shareData}
	<ShareCard
		year={shareData.year}
		projectionYear={shareData.projectionYear}
		totalSpent={shareData.totalSpent}
		projectedFutureValue={shareData.projectedFutureValue}
		topCategories={shareData.topCategories}
		philosophy={shareData.philosophy}
		{isDark}
		onClose={() => showShareCard = false}
	/>
{/if}
