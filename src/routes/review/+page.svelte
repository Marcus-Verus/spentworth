<script lang="ts">
	import { onMount } from 'svelte';
	import Header from '$lib/components/Header.svelte';
	import { initTheme, getTheme } from '$lib/stores/theme';
	import type { ReviewInboxItem } from '$lib/types';
	import { CATEGORIES } from '$lib/types';

	let isDark = $state(false);
	let loading = $state(true);
	let generating = $state(false);
	let items = $state<ReviewInboxItem[]>([]);
	let total = $state(0);
	let streaks = $state<{ reviewStreakCurrent: number; reviewStreakBest: number; totalItemsCleared: number } | null>(null);
	let processingId = $state<string | null>(null);
	let dailyGoal = $state(5);
	let completedToday = $state(0);

	// Category selection modal
	let showCategoryModal = $state(false);
	let selectedItem = $state<ReviewInboxItem | null>(null);
	let selectedCategory = $state('');

	// Rule creation modal
	let showRuleModal = $state(false);
	let ruleItem = $state<ReviewInboxItem | null>(null);
	let creatingRule = $state(false);

	onMount(async () => {
		initTheme();
		isDark = getTheme() === 'dark';
		await loadItems();
		await loadPrefs();
	});

	async function loadItems() {
		loading = true;
		try {
			const res = await fetch('/api/review-inbox?status=pending&limit=20');
			const json = await res.json();
			if (json.ok) {
				items = json.data.items;
				total = json.data.total;
				streaks = json.data.streaks;
				completedToday = json.data.completedToday || 0;
			}
		} catch (e) {
			// Error handling - load failed silently
		}
		loading = false;
	}

	async function loadPrefs() {
		try {
			const res = await fetch('/api/notifications/prefs');
			const json = await res.json();
			if (json.ok && json.data) {
				dailyGoal = json.data.reviewInboxDailyGoal || 5;
			}
		} catch (e) {
			// Use default
		}
	}

	async function generateItems() {
		generating = true;
		try {
			const res = await fetch('/api/review-inbox/generate', { method: 'POST' });
			const json = await res.json();
			if (json.ok) {
				await loadItems();
			}
		} catch (e) {
			// Error handling - generate failed silently
		}
		generating = false;
	}

	async function dismissItem(item: ReviewInboxItem) {
		processingId = item.id;
		try {
			await fetch('/api/review-inbox', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id: item.id, action: 'dismiss' })
			});
			items = items.filter(i => i.id !== item.id);
			total = Math.max(0, total - 1);
		} catch (e) {
			// Error handling - dismiss failed silently
		}
		processingId = null;
	}

	async function completeItem(item: ReviewInboxItem) {
		processingId = item.id;
		try {
			await fetch('/api/review-inbox', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id: item.id, action: 'complete' })
			});
			items = items.filter(i => i.id !== item.id);
			total = Math.max(0, total - 1);
			completedToday++;
			if (streaks) {
				streaks.totalItemsCleared++;
			}
		} catch (e) {
			// Error handling - complete failed silently
		}
		processingId = null;
	}

	function openCategoryModal(item: ReviewInboxItem) {
		selectedItem = item;
		selectedCategory = item.data.suggestedCategory || '';
		showCategoryModal = true;
	}

	async function applyCategory() {
		if (!selectedItem || !selectedCategory) return;
		
		processingId = selectedItem.id;
		showCategoryModal = false;

		try {
			// Update the transaction category
			if (selectedItem.transactionId) {
				await fetch('/api/transactions/quick-add', {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						id: selectedItem.transactionId,
						category: selectedCategory
					})
				});
			}

			// Mark item as complete
			await completeItem(selectedItem);
		} catch (e) {
			// Error handling - apply category failed silently
		}
		
		selectedItem = null;
		processingId = null;
	}

	function openRuleModal(item: ReviewInboxItem) {
		ruleItem = item;
		showRuleModal = true;
	}

	async function createRule() {
		if (!ruleItem?.data.suggestedRule) return;
		
		creatingRule = true;
		const rule = ruleItem.data.suggestedRule;

		try {
			await fetch('/api/rules', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					matchType: rule.matchType,
					matchValue: rule.matchValue,
					matchField: 'merchant_norm',
					setCategory: rule.setCategory,
					setKind: rule.setKind,
					actionExclude: false,
					enabled: true
				})
			});

			showRuleModal = false;
			await completeItem(ruleItem);
		} catch (e) {
			// Error handling - create rule failed silently
		}
		
		creatingRule = false;
		ruleItem = null;
	}

	async function markAsSubscription(item: ReviewInboxItem) {
		processingId = item.id;
		try {
			// Update the transaction category to Subscriptions
			if (item.transactionId) {
				await fetch('/api/transactions/quick-add', {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						id: item.transactionId,
						category: 'Subscriptions'
					})
				});
			}
			await completeItem(item);
		} catch (e) {
			// Error handling - mark subscription failed silently
		}
		processingId = null;
	}

	function formatCurrency(amount: number): string {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		}).format(amount);
	}

	function formatDate(dateStr: string): string {
		return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric'
		});
	}

	function getItemIcon(type: string): string {
		switch (type) {
			case 'uncategorized': return 'fa-tag';
			case 'rule_suggestion': return 'fa-wand-magic-sparkles';
			case 'subscription_candidate': return 'fa-repeat';
			case 'duplicate_candidate': return 'fa-clone';
			case 'transfer_confirm': return 'fa-arrow-right-arrow-left';
			default: return 'fa-circle-question';
		}
	}

	function getItemColor(type: string): string {
		switch (type) {
			case 'uncategorized': return '#f59e0b';
			case 'rule_suggestion': return '#8b5cf6';
			case 'subscription_candidate': return '#06b6d4';
			case 'duplicate_candidate': return '#ef4444';
			case 'transfer_confirm': return '#10b981';
			default: return '#6b7280';
		}
	}

	function getItemTitle(item: ReviewInboxItem): string {
		switch (item.itemType) {
			case 'uncategorized':
				return `Categorize: ${item.data.merchant || 'Unknown'}`;
			case 'rule_suggestion':
				return `Create rule for ${item.data.merchant || 'merchant'}`;
			case 'subscription_candidate':
				return `Is "${item.data.merchant}" a subscription?`;
			case 'duplicate_candidate':
				return 'Possible duplicate transaction';
			case 'transfer_confirm':
				return 'Confirm this is a transfer';
			default:
				return 'Review item';
		}
	}

	function getItemDescription(item: ReviewInboxItem): string {
		switch (item.itemType) {
			case 'uncategorized':
				return `${formatCurrency(item.data.amount || 0)} on ${formatDate(item.data.date || '')}`;
			case 'rule_suggestion':
				return `${item.data.similarCount || 0} similar transactions → ${item.data.suggestedRule?.setCategory || 'category'}`;
			case 'subscription_candidate':
				return `${formatCurrency(item.data.avgAmount || 0)}/month, ${item.data.occurrences || 0} occurrences`;
			default:
				return '';
		}
	}

	let progressPercent = $derived(Math.min(100, (completedToday / dailyGoal) * 100));
	let remainingToday = $derived(Math.max(0, dailyGoal - completedToday));
</script>

<div class="min-h-screen" style="background: {isDark ? '#0a0a0a' : '#f5f0e8'}">
	<Header />

	<main class="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
		<!-- Header with Progress -->
		<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
			<div>
				<h1 class="font-display text-2xl sm:text-3xl font-bold" style="color: {isDark ? '#ffffff' : '#171717'}">
					<i class="fa-solid fa-inbox text-sw-accent mr-2"></i>Review Inbox
				</h1>
				<p class="text-sm mt-1" style="color: {isDark ? '#a3a3a3' : '#737373'}">
					Clear items to improve your data quality
				</p>
			</div>

			<!-- Daily Progress -->
			<div class="flex items-center gap-4">
				<div class="text-right">
					<p class="text-sm font-medium" style="color: {isDark ? '#ffffff' : '#171717'}">
						{completedToday}/{dailyGoal} today
					</p>
					<p class="text-xs" style="color: {isDark ? '#a3a3a3' : '#737373'}">
						{remainingToday > 0 ? `${remainingToday} more to go!` : '🎉 Goal reached!'}
					</p>
				</div>
				<div class="w-16 h-16 relative">
					<svg class="w-full h-full -rotate-90" viewBox="0 0 36 36">
						<circle
							cx="18" cy="18" r="15.5"
							fill="none"
							stroke={isDark ? '#2a2a2a' : '#e5e5e5'}
							stroke-width="3"
						/>
						<circle
							cx="18" cy="18" r="15.5"
							fill="none"
							stroke="#16a34a"
							stroke-width="3"
							stroke-linecap="round"
							stroke-dasharray={`${progressPercent} 100`}
							class="transition-all duration-500"
						/>
					</svg>
					<div class="absolute inset-0 flex items-center justify-center">
						{#if progressPercent >= 100}
							<i class="fa-solid fa-check text-sw-accent"></i>
						{:else}
							<span class="text-xs font-bold" style="color: {isDark ? '#ffffff' : '#171717'}">{Math.round(progressPercent)}%</span>
						{/if}
					</div>
				</div>
			</div>
		</div>

		<!-- Streak Banner -->
		{#if streaks && streaks.reviewStreakCurrent > 0}
			<div 
				class="rounded-xl p-4 mb-6 flex items-center gap-4"
				style="background: linear-gradient(135deg, rgba(245,158,11,0.1), rgba(249,115,22,0.1)); border: 1px solid rgba(245,158,11,0.2)"
			>
				<div class="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
					<i class="fa-solid fa-fire text-amber-500 text-xl"></i>
				</div>
				<div>
					<p class="font-semibold" style="color: {isDark ? '#fbbf24' : '#d97706'}">
						{streaks.reviewStreakCurrent} day streak! 🔥
					</p>
					<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">
						{streaks.totalItemsCleared} items cleared total · Best: {streaks.reviewStreakBest} days
					</p>
				</div>
			</div>
		{/if}

		<!-- Stats Bar -->
		<div class="grid grid-cols-3 gap-4 mb-6">
			<div class="rounded-xl p-4 text-center" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
				<p class="text-2xl font-bold text-sw-accent">{total}</p>
				<p class="text-xs" style="color: {isDark ? '#a3a3a3' : '#737373'}">Pending</p>
			</div>
			<div class="rounded-xl p-4 text-center" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
				<p class="text-2xl font-bold" style="color: {isDark ? '#ffffff' : '#171717'}">{completedToday}</p>
				<p class="text-xs" style="color: {isDark ? '#a3a3a3' : '#737373'}">Today</p>
			</div>
			<div class="rounded-xl p-4 text-center" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
				<p class="text-2xl font-bold" style="color: {isDark ? '#ffffff' : '#171717'}">{streaks?.totalItemsCleared || 0}</p>
				<p class="text-xs" style="color: {isDark ? '#a3a3a3' : '#737373'}">All Time</p>
			</div>
		</div>

		<!-- Generate Button -->
		{#if items.length === 0 && !loading}
			<div class="text-center py-12">
				<div class="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center" style="background: {isDark ? '#1a1a1a' : '#ffffff'}">
					{#if completedToday >= dailyGoal}
						<i class="fa-solid fa-circle-check text-3xl text-sw-accent"></i>
					{:else}
						<i class="fa-solid fa-inbox text-3xl" style="color: {isDark ? '#404040' : '#d4d4d4'}"></i>
					{/if}
				</div>
				{#if completedToday >= dailyGoal}
					<h2 class="text-lg font-semibold mb-2" style="color: {isDark ? '#ffffff' : '#171717'}">🎉 All caught up!</h2>
					<p class="text-sm mb-6" style="color: {isDark ? '#a3a3a3' : '#737373'}">
						You've cleared {completedToday} items today. Great work!
					</p>
				{:else if completedToday > 0}
					<h2 class="text-lg font-semibold mb-2" style="color: {isDark ? '#ffffff' : '#171717'}">No pending items</h2>
					<p class="text-sm mb-6" style="color: {isDark ? '#a3a3a3' : '#737373'}">
						You've cleared {completedToday}/{dailyGoal} today. Scan for more to hit your goal!
					</p>
				{:else}
					<h2 class="text-lg font-semibold mb-2" style="color: {isDark ? '#ffffff' : '#171717'}">Inbox is empty!</h2>
					<p class="text-sm mb-6" style="color: {isDark ? '#a3a3a3' : '#737373'}">
						Scan your transactions for items that need attention
					</p>
				{/if}
				<button
					onclick={generateItems}
					disabled={generating}
					class="px-6 py-3 rounded-xl font-semibold transition-all bg-sw-accent text-white hover:bg-sw-accent/90 disabled:opacity-50"
				>
					{#if generating}
						<i class="fa-solid fa-spinner fa-spin mr-2"></i>Scanning...
					{:else}
						<i class="fa-solid fa-magnifying-glass mr-2"></i>Scan for Items
					{/if}
				</button>
			</div>
		{/if}

		<!-- Loading State -->
		{#if loading}
			<div class="flex items-center justify-center py-16">
				<div class="w-8 h-8 rounded-full border-2 border-sw-accent border-t-transparent animate-spin"></div>
			</div>
		{/if}

		<!-- Items List -->
		{#if !loading && items.length > 0}
			<div class="space-y-3">
				{#each items as item (item.id)}
					<div 
						class="rounded-xl p-4 transition-all hover:scale-[1.01] {processingId === item.id ? 'opacity-50' : ''}"
						style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}; box-shadow: {isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.04)'}"
					>
						<div class="flex items-start gap-4">
							<!-- Icon -->
							<div 
								class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
								style="background: {getItemColor(item.itemType)}20"
							>
								<i class="fa-solid {getItemIcon(item.itemType)}" style="color: {getItemColor(item.itemType)}"></i>
							</div>

							<!-- Content -->
							<div class="flex-1 min-w-0">
								<p class="font-medium truncate" style="color: {isDark ? '#ffffff' : '#171717'}">
									{getItemTitle(item)}
								</p>
								<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">
									{getItemDescription(item)}
								</p>
							</div>

							<!-- Actions -->
							<div class="flex items-center gap-2 flex-shrink-0">
								{#if item.itemType === 'uncategorized'}
									<button
										onclick={() => openCategoryModal(item)}
										disabled={processingId === item.id}
										class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors bg-sw-accent text-white hover:bg-sw-accent/90"
									>
										<i class="fa-solid fa-tag mr-1"></i>Categorize
									</button>
								{:else if item.itemType === 'rule_suggestion'}
									<button
										onclick={() => openRuleModal(item)}
										disabled={processingId === item.id}
										class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors bg-purple-500 text-white hover:bg-purple-600"
									>
										<i class="fa-solid fa-wand-magic-sparkles mr-1"></i>Create Rule
									</button>
								{:else if item.itemType === 'subscription_candidate'}
									<button
										onclick={() => markAsSubscription(item)}
										disabled={processingId === item.id}
										class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors bg-cyan-500 text-white hover:bg-cyan-600"
									>
										<i class="fa-solid fa-check mr-1"></i>Yes
									</button>
								{/if}
								
								<button
									onclick={() => dismissItem(item)}
									disabled={processingId === item.id}
									class="p-2 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
									title="Dismiss"
								>
									<i class="fa-solid fa-xmark" style="color: {isDark ? '#737373' : '#a3a3a3'}"></i>
								</button>
							</div>
						</div>
					</div>
				{/each}
			</div>

			<!-- Refresh Button -->
			<div class="mt-6 text-center">
				<button
					onclick={generateItems}
					disabled={generating}
					class="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
					style="background: {isDark ? '#2a2a2a' : '#f5f0e8'}; color: {isDark ? '#ffffff' : '#171717'}"
				>
					{#if generating}
						<i class="fa-solid fa-spinner fa-spin mr-1"></i>
					{:else}
						<i class="fa-solid fa-arrows-rotate mr-1"></i>
					{/if}
					Scan for More
				</button>
			</div>
		{/if}
	</main>

	<!-- Category Selection Modal -->
	{#if showCategoryModal && selectedItem}
		<div class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(0,0,0,0.5)">
			<div 
				class="w-full max-w-md rounded-2xl p-6 max-h-[80vh] overflow-y-auto"
				style="background: {isDark ? '#1a1a1a' : '#ffffff'}"
			>
				<h3 class="font-display text-xl font-semibold mb-4" style="color: {isDark ? '#ffffff' : '#171717'}">
					Select Category
				</h3>
				
				<p class="text-sm mb-4" style="color: {isDark ? '#a3a3a3' : '#737373'}">
					{selectedItem.data.merchant} · {formatCurrency(selectedItem.data.amount || 0)}
				</p>

				<div class="grid grid-cols-2 gap-2 mb-6">
					{#each CATEGORIES as category}
						<button
							onclick={() => selectedCategory = category}
							class="px-3 py-2 rounded-lg text-sm text-left transition-colors {selectedCategory === category ? 'ring-2 ring-sw-accent' : ''}"
							style="background: {selectedCategory === category ? 'rgba(13,148,136,0.1)' : (isDark ? '#0a0a0a' : '#f5f5f5')}; color: {isDark ? '#ffffff' : '#171717'}"
						>
							{category}
						</button>
					{/each}
				</div>

				<div class="flex gap-3">
					<button
						onclick={() => { showCategoryModal = false; selectedItem = null; }}
						class="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
						style="background: {isDark ? '#2a2a2a' : '#f5f0e8'}; color: {isDark ? '#ffffff' : '#171717'}"
					>
						Cancel
					</button>
					<button
						onclick={applyCategory}
						disabled={!selectedCategory}
						class="flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-colors bg-sw-accent text-white hover:bg-sw-accent/90 disabled:opacity-50"
					>
						Apply
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Rule Creation Modal -->
	{#if showRuleModal && ruleItem}
		<div class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(0,0,0,0.5)">
			<div 
				class="w-full max-w-md rounded-2xl p-6"
				style="background: {isDark ? '#1a1a1a' : '#ffffff'}"
			>
				<h3 class="font-display text-xl font-semibold mb-4" style="color: {isDark ? '#ffffff' : '#171717'}">
					<i class="fa-solid fa-wand-magic-sparkles text-purple-500 mr-2"></i>Create Rule
				</h3>
				
				<div class="space-y-4 mb-6">
					<div class="rounded-xl p-4" style="background: {isDark ? '#0a0a0a' : '#f5f5f5'}">
						<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">When merchant contains:</p>
						<p class="font-mono font-medium" style="color: {isDark ? '#ffffff' : '#171717'}">
							"{ruleItem.data.suggestedRule?.matchValue}"
						</p>
					</div>
					
					<div class="flex items-center gap-2">
						<i class="fa-solid fa-arrow-down" style="color: {isDark ? '#404040' : '#d4d4d4'}"></i>
					</div>
					
					<div class="rounded-xl p-4" style="background: {isDark ? '#0a0a0a' : '#f5f5f5'}">
						<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">Set category to:</p>
						<p class="font-medium text-sw-accent">
							{ruleItem.data.suggestedRule?.setCategory}
						</p>
					</div>

					<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">
						This will apply to <strong>{ruleItem.data.similarCount}</strong> existing transactions and all future matches.
					</p>
				</div>

				<div class="flex gap-3">
					<button
						onclick={() => { showRuleModal = false; ruleItem = null; }}
						class="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
						style="background: {isDark ? '#2a2a2a' : '#f5f0e8'}; color: {isDark ? '#ffffff' : '#171717'}"
					>
						Cancel
					</button>
					<button
						onclick={createRule}
						disabled={creatingRule}
						class="flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-colors bg-purple-500 text-white hover:bg-purple-600 disabled:opacity-50"
					>
						{#if creatingRule}
							<i class="fa-solid fa-spinner fa-spin mr-1"></i>
						{/if}
						Create Rule
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>

