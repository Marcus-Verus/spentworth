<script lang="ts">
	import type { SubscriptionSummary, TrackedSubscription, UpcomingCharge } from '$lib/types';

	interface Props {
		isDark?: boolean;
	}

	let { isDark = false }: Props = $props();

	let loading = $state(true);
	let summary = $state<SubscriptionSummary | null>(null);
	let expanded = $state(false);
	let updatingId = $state<string | null>(null);

	// Modal state
	let showDetailModal = $state(false);
	let selectedSub = $state<TrackedSubscription | null>(null);

	$effect(() => {
		loadSubscriptions();
	});

	async function loadSubscriptions() {
		loading = true;
		try {
			const res = await fetch('/api/subscriptions?lookahead=14');
			const json = await res.json();
			if (json.ok) {
				summary = json.data.summary;
			}
		} catch (e) {
			console.error('Failed to load subscriptions:', e);
		}
		loading = false;
	}

	async function toggleEssential(sub: TrackedSubscription) {
		updatingId = sub.id;
		try {
			await fetch('/api/subscriptions', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					id: sub.id,
					isEssential: !sub.isEssential
				})
			});
			await loadSubscriptions();
		} catch (e) {
			console.error('Failed to update subscription:', e);
		}
		updatingId = null;
	}

	async function markCanceling(sub: TrackedSubscription) {
		updatingId = sub.id;
		try {
			await fetch('/api/subscriptions', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					id: sub.id,
					status: sub.status === 'canceling' ? 'active' : 'canceling'
				})
			});
			await loadSubscriptions();
		} catch (e) {
			console.error('Failed to update subscription:', e);
		}
		updatingId = null;
	}

	function openDetail(sub: TrackedSubscription) {
		selectedSub = sub;
		showDetailModal = true;
	}

	function formatCurrency(amount: number): string {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		}).format(amount);
	}

	function getDaysLabel(days: number): string {
		if (days === 0) return 'Today';
		if (days === 1) return 'Tomorrow';
		return `${days} days`;
	}

	function getStatusColor(status: string): string {
		switch (status) {
			case 'active': return isDark ? '#10b981' : '#059669';
			case 'trial': return isDark ? '#f59e0b' : '#d97706';
			case 'canceling': return isDark ? '#ef4444' : '#dc2626';
			default: return isDark ? '#737373' : '#9ca3af';
		}
	}

	function getStatusIcon(status: string): string {
		switch (status) {
			case 'active': return 'fa-circle-check';
			case 'trial': return 'fa-clock';
			case 'canceling': return 'fa-circle-xmark';
			default: return 'fa-circle';
		}
	}
</script>

<!-- Upcoming Charges Panel -->
<div 
	class="rounded-2xl overflow-hidden transition-all"
	style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}"
>
	<!-- Header -->
	<div class="px-5 py-4 flex items-center justify-between border-b" style="border-color: {isDark ? '#2a2a2a' : '#f3f4f6'}">
		<div class="flex items-center gap-3">
			<div class="w-10 h-10 rounded-xl flex items-center justify-center" style="background: linear-gradient(135deg, #06b6d4, #0891b2)">
				<i class="fa-solid fa-calendar-days text-white"></i>
			</div>
			<div>
				<h3 class="font-display font-semibold" style="color: {isDark ? '#ffffff' : '#171717'}">
					Upcoming Charges
				</h3>
				<p class="text-xs" style="color: {isDark ? '#a3a3a3' : '#737373'}">
					Next 14 days
				</p>
			</div>
		</div>
		{#if summary}
			<div class="text-right">
				<p class="font-display font-semibold" style="color: {isDark ? '#ffffff' : '#171717'}">
					{formatCurrency(summary.totalMonthly)}<span class="text-xs font-normal" style="color: {isDark ? '#737373' : '#9ca3af'}">/mo</span>
				</p>
			</div>
		{/if}
	</div>

	<!-- Loading State -->
	{#if loading}
		<div class="p-8 flex items-center justify-center">
			<div class="w-6 h-6 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin"></div>
		</div>
	{:else if !summary || summary.upcomingCharges.length === 0}
		<div class="p-6 text-center">
			<div class="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style="background: {isDark ? '#262626' : '#f5f5f5'}">
				<i class="fa-solid fa-check text-green-500"></i>
			</div>
			<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">
				No charges in the next 14 days
			</p>
		</div>
	{:else}
		<!-- Charges List -->
		<div class="divide-y" style="border-color: {isDark ? '#262626' : '#f5f5f5'}">
			{#each summary.upcomingCharges.slice(0, expanded ? undefined : 3) as charge (charge.subscription.id)}
				{@const sub = charge.subscription}
				<div 
					class="px-5 py-3 flex items-center gap-4 transition-colors cursor-pointer hover:bg-opacity-50 {updatingId === sub.id ? 'opacity-50' : ''}"
					style="background: {isDark ? 'transparent' : 'transparent'}"
					onclick={() => openDetail(sub)}
					role="button"
					tabindex="0"
					onkeydown={(e) => e.key === 'Enter' && openDetail(sub)}
				>
					<!-- Status indicator -->
					<div class="flex-shrink-0">
						<div 
							class="w-2 h-2 rounded-full"
							style="background: {getStatusColor(sub.status)}"
							title={sub.status}
						></div>
					</div>

					<!-- Main content -->
					<div class="flex-1 min-w-0">
						<div class="flex items-center gap-2">
							<p class="font-medium truncate text-sm" style="color: {isDark ? '#ffffff' : '#171717'}">
								{sub.merchantName}
							</p>
							{#if sub.isEssential}
								<span class="flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-500 font-medium">
									Essential
								</span>
							{/if}
							{#if sub.status === 'trial'}
								<span class="flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500 font-medium">
									Trial
								</span>
							{/if}
							{#if sub.status === 'canceling'}
								<span class="flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-500 font-medium">
									Canceling
								</span>
							{/if}
						</div>
						<p class="text-xs" style="color: {isDark ? '#737373' : '#9ca3af'}">
							{getDaysLabel(charge.daysUntil)} · {sub.billingCycle}
						</p>
					</div>

					<!-- Amount & Future Value -->
					<div class="text-right flex-shrink-0">
						<p class="font-mono font-medium text-sm" style="color: {isDark ? '#ffffff' : '#171717'}">
							{formatCurrency(sub.amount)}
						</p>
						{#if !sub.isEssential}
							<p class="text-[10px]" style="color: {isDark ? '#ef4444' : '#dc2626'}">
								→ {formatCurrency(charge.futureValue10yr)} in 10yr
							</p>
						{/if}
					</div>
				</div>
			{/each}
		</div>

		<!-- Expand/Collapse -->
		{#if summary.upcomingCharges.length > 3}
			<button
				onclick={() => expanded = !expanded}
				class="w-full px-5 py-3 text-sm font-medium transition-colors"
				style="color: {isDark ? '#a3a3a3' : '#737373'}; background: {isDark ? '#0f0f0f' : '#fafafa'}"
			>
				{expanded ? 'Show less' : `Show ${summary.upcomingCharges.length - 3} more`}
				<i class="fa-solid fa-chevron-{expanded ? 'up' : 'down'} ml-1 text-xs"></i>
			</button>
		{/if}

		<!-- Summary Footer -->
		{#if summary.nonEssentialMonthly > 0}
			<div 
				class="px-5 py-3 border-t text-xs"
				style="border-color: {isDark ? '#262626' : '#f3f4f6'}; background: {isDark ? 'rgba(239,68,68,0.05)' : 'rgba(239,68,68,0.03)'}"
			>
				<div class="flex items-center justify-between">
					<span style="color: {isDark ? '#a3a3a3' : '#737373'}">
						Non-essential subscriptions
					</span>
					<span class="font-medium" style="color: {isDark ? '#ef4444' : '#dc2626'}">
						{formatCurrency(summary.nonEssentialMonthly)}/mo
					</span>
				</div>
				<p class="mt-1" style="color: {isDark ? '#737373' : '#9ca3af'}">
					If canceled: <strong class="text-green-500">{formatCurrency(summary.potentialSavings10yr)}</strong> in 10 years, 
					<strong class="text-green-500">{formatCurrency(summary.potentialSavings20yr)}</strong> in 20 years
				</p>
			</div>
		{/if}
	{/if}
</div>

<!-- Detail Modal -->
{#if showDetailModal && selectedSub}
	<div 
		class="fixed inset-0 z-50 flex items-center justify-center p-4"
		style="background: rgba(0,0,0,0.6)"
		onclick={() => showDetailModal = false}
		role="button"
		tabindex="0"
		onkeydown={(e) => e.key === 'Escape' && (showDetailModal = false)}
	>
		<div 
			class="w-full max-w-md rounded-2xl p-6"
			style="background: {isDark ? '#1a1a1a' : '#ffffff'}"
			onclick={(e) => e.stopPropagation()}
			role="dialog"
		>
			<!-- Header -->
			<div class="flex items-center gap-4 mb-6">
				<div 
					class="w-14 h-14 rounded-xl flex items-center justify-center"
					style="background: linear-gradient(135deg, rgba(6,182,212,0.2), rgba(8,145,178,0.1))"
				>
					<i class="fa-solid {getStatusIcon(selectedSub.status)} text-2xl" style="color: {getStatusColor(selectedSub.status)}"></i>
				</div>
				<div class="flex-1 min-w-0">
					<h3 class="font-display text-lg font-semibold truncate" style="color: {isDark ? '#ffffff' : '#171717'}">
						{selectedSub.merchantName}
					</h3>
					<p class="text-sm capitalize" style="color: {getStatusColor(selectedSub.status)}">
						{selectedSub.status}
					</p>
				</div>
				<button
					onclick={() => showDetailModal = false}
					class="p-2 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
				>
					<i class="fa-solid fa-xmark" style="color: {isDark ? '#737373' : '#a3a3a3'}"></i>
				</button>
			</div>

			<!-- Details -->
			<div class="space-y-4 mb-6">
				<div class="flex justify-between">
					<span class="text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">Amount</span>
					<span class="font-mono font-semibold" style="color: {isDark ? '#ffffff' : '#171717'}">
						{formatCurrency(selectedSub.amount)}/{selectedSub.billingCycle.replace('ly', '')}
					</span>
				</div>
				{#if selectedSub.nextChargeDate}
					<div class="flex justify-between">
						<span class="text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">Next charge</span>
						<span class="font-medium" style="color: {isDark ? '#ffffff' : '#171717'}">
							{new Date(selectedSub.nextChargeDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
						</span>
					</div>
				{/if}
				{#if selectedSub.category}
					<div class="flex justify-between">
						<span class="text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">Category</span>
						<span class="text-sm" style="color: {isDark ? '#ffffff' : '#171717'}">{selectedSub.category}</span>
					</div>
				{/if}

				<!-- Future Value Calculator -->
				{#if !selectedSub.isEssential}
					<div 
						class="rounded-xl p-4 mt-4"
						style="background: {isDark ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.05)'}; border: 1px solid {isDark ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.1)'}"
					>
						<p class="text-xs font-medium mb-2" style="color: {isDark ? '#fca5a5' : '#dc2626'}">
							If you cancel this subscription...
						</p>
						<div class="grid grid-cols-2 gap-4">
							<div>
								<p class="text-[10px] uppercase tracking-wide" style="color: {isDark ? '#737373' : '#9ca3af'}">In 10 years</p>
								<p class="font-display font-bold text-lg text-green-500">
									{formatCurrency(selectedSub.amount * 12 * Math.pow(1.07, 10))}
								</p>
							</div>
							<div>
								<p class="text-[10px] uppercase tracking-wide" style="color: {isDark ? '#737373' : '#9ca3af'}">In 20 years</p>
								<p class="font-display font-bold text-lg text-green-500">
									{formatCurrency(selectedSub.amount * 12 * Math.pow(1.07, 20))}
								</p>
							</div>
						</div>
					</div>
				{/if}
			</div>

			<!-- Actions -->
			<div class="flex gap-3">
				<button
					onclick={() => { toggleEssential(selectedSub!); showDetailModal = false; }}
					class="flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-all {selectedSub.isEssential ? 'bg-gray-100 dark:bg-gray-800' : 'bg-green-500/10 text-green-600 dark:text-green-400'}"
					style="background: {selectedSub.isEssential ? (isDark ? '#262626' : '#f5f5f5') : 'rgba(34,197,94,0.1)'}; color: {selectedSub.isEssential ? (isDark ? '#a3a3a3' : '#737373') : '#22c55e'}"
				>
					<i class="fa-solid fa-{selectedSub.isEssential ? 'star' : 'star'} mr-1"></i>
					{selectedSub.isEssential ? 'Remove Essential' : 'Mark Essential'}
				</button>
				<button
					onclick={() => { markCanceling(selectedSub!); showDetailModal = false; }}
					class="flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-all"
					style="background: {selectedSub.status === 'canceling' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)'}; color: {selectedSub.status === 'canceling' ? '#22c55e' : '#ef4444'}"
				>
					<i class="fa-solid fa-{selectedSub.status === 'canceling' ? 'undo' : 'circle-xmark'} mr-1"></i>
					{selectedSub.status === 'canceling' ? 'Keep Active' : 'Mark Canceling'}
				</button>
			</div>
		</div>
	</div>
{/if}

