<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	// Using CSS transitions for row animations instead of Svelte transitions
	// (Svelte transitions don't work well with table rows)
	import { CATEGORIES, type BatchSummary, type RawRowEffective, type PreviewTab, type TransactionKind, type Category } from '$lib/types';
	import { initTheme, getTheme } from '$lib/stores/theme';

	let { data } = $props();
	let isDark = $state(false);

	const batchId = $derived($page.params.batchId);
	
	onMount(() => {
		initTheme();
		isDark = getTheme() === 'dark';
		// Initial load on mount only
		loadRows();
	});

	let tab = $state<PreviewTab>('included');
	let rows = $state<RawRowEffective[]>([]);
	let summary = $state<BatchSummary | null>(null);
	let loading = $state(true);
	let currentPage = $state(1);
	let totalRows = $state(0);
	let pageSize = $state(50);
	let searchQuery = $state('');
	let selected = $state<Set<string>>(new Set());
	let committing = $state(false);
	let commitError = $state<string | null>(null);
	
	// Track rows that are animating out (for smooth departure)
	let departingRows = $state<Set<string>>(new Set());

	// Rule creation modal state
	let showRuleModal = $state(false);
	let ruleModalMerchant = $state('');
	let ruleModalKind = $state<TransactionKind>('purchase');
	let ruleModalCategory = $state<string | null>(null);
	let ruleModalExclude = $state(false);
	let creatingRule = $state(false);

	const kindOptions: { value: TransactionKind; label: string }[] = [
		{ value: 'purchase', label: 'Purchase' },
		{ value: 'income', label: 'Income' },
		{ value: 'transfer', label: 'Transfer' },
		{ value: 'cc_payment', label: 'CC Payment' },
		{ value: 'refund', label: 'Refund' },
		{ value: 'cash_withdrawal', label: 'Cash Withdrawal' },
		{ value: 'fee_interest', label: 'Fee/Interest' },
		{ value: 'unknown', label: 'Unknown' }
	];

	// No $effect here - loadRows() is called explicitly:
	// - onMount (initial load)
	// - Tab buttons (user clicks tab)
	// - Pagination buttons (user clicks prev/next)
	// - Search (user presses enter)
	// Category/type changes do NOT call loadRows - they use optimistic updates

	// Check if a row should be visible in the current tab
	function shouldRowBeVisible(row: RawRowEffective): boolean {
		switch (tab) {
			case 'included':
				return row.effectiveIncludedInSpend;
			case 'excluded':
				return !row.effectiveIncludedInSpend && !row.isDuplicate && row.effectiveKind !== 'unknown' && row.parseStatus !== 'error';
			case 'needs_review':
				return !row.effectiveIncludedInSpend && !row.isDuplicate && (row.parseStatus === 'error' || row.effectiveKind === 'unknown');
			case 'duplicates':
				return row.isDuplicate && !row.effectiveIncludedInSpend;
			case 'uncategorized':
				return row.effectiveKind === 'purchase' && 
				       row.effectiveIncludedInSpend && 
				       !row.isDuplicate &&
				       (!row.effectiveCategory || row.effectiveCategory === 'Uncategorized');
			default:
				return true;
		}
	}

	// Animate row out and then remove it
	function animateRowOut(rowId: string) {
		// Add to departing set (triggers CSS animation)
		departingRows = new Set([...departingRows, rowId]);
		
		// After animation completes, remove from rows array
		setTimeout(() => {
			rows = rows.filter(r => r.id !== rowId);
			departingRows = new Set([...departingRows].filter(id => id !== rowId));
			// Update total count
			totalRows = Math.max(0, totalRows - 1);
		}, 300); // Match CSS transition duration
	}

	// Animate multiple rows out
	function animateRowsOut(rowIds: string[]) {
		if (rowIds.length === 0) return;
		
		// Add all to departing set
		departingRows = new Set([...departingRows, ...rowIds]);
		
		// After animation, remove all
		setTimeout(() => {
			const idsSet = new Set(rowIds);
			rows = rows.filter(r => !idsSet.has(r.id));
			departingRows = new Set([...departingRows].filter(id => !idsSet.has(id)));
			totalRows = Math.max(0, totalRows - rowIds.length);
		}, 300);
	}

	async function loadRows() {
		loading = true;
		const params = new URLSearchParams({
			tab,
			page: currentPage.toString(),
			pageSize: pageSize.toString(),
			q: searchQuery
		});

		const res = await fetch(`/api/imports/${batchId}/rows?${params}`);
		const json = await res.json();

		if (json.ok) {
			rows = json.data.rows;
			summary = json.data.summary;
			totalRows = json.data.totalRows;
		}
		loading = false;
	}

	// Update just the summary from API response (no row refresh)
	function updateSummaryFromResponse(json: { ok: boolean; data?: { summary: BatchSummary } }) {
		if (json.ok && json.data?.summary) {
			summary = json.data.summary;
		}
	}

	async function updateOverride(rowId: string, patch: Record<string, unknown>) {
		// Optimistically update UI for include toggle
		if (patch.includedInSpend !== undefined) {
			rows = rows.map(r => r.id === rowId ? { ...r, effectiveIncludedInSpend: patch.includedInSpend as boolean } : r);
		}

		const res = await fetch(`/api/imports/${batchId}/override`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				rawTransactionIds: [rowId],
				patch
			})
		});

		// Just update summary from response, don't refresh rows
		const json = await res.json();
		updateSummaryFromResponse(json);
	}

	// Handle kind change
	// For refunds or income on a single transaction (positive amount), only update that one row
	// For other kinds, apply to all rows with same merchant
	async function handleKindChange(row: RawRowEffective, newKind: TransactionKind) {
		const merchantNorm = row.merchantNorm;
		const isPositiveAmount = row.amountSigned !== null && row.amountSigned > 0;
		const isRefundOrIncome = newKind === 'refund' || newKind === 'income';
		
		// Only update this single row if:
		// 1. It's a positive amount (likely already a refund/credit)
		// 2. We're changing TO refund or income
		// This allows refunds from the same merchant to be classified individually
		const updateSingleRowOnly = isPositiveAmount || isRefundOrIncome;
		
		// Find rows that will be updated
		const rowsToUpdate = updateSingleRowOnly
			? [row]
			: (merchantNorm ? rows.filter(r => r.merchantNorm === merchantNorm) : [row]);
		
		// Optimistically update UI - no full refresh needed
		rows = rows.map(r => {
			if (updateSingleRowOnly) {
				if (r.id === row.id) {
					return { ...r, effectiveKind: newKind, effectiveIncludedInSpend: newKind === 'purchase' };
				}
			} else {
				if (merchantNorm && r.merchantNorm === merchantNorm) {
					return { ...r, effectiveKind: newKind, effectiveIncludedInSpend: newKind === 'purchase' };
				}
			}
			return r;
		});
		
		// Check which updated rows no longer belong in current view and animate them out
		const rowsToRemove = rowsToUpdate
			.map(r => ({ ...r, effectiveKind: newKind, effectiveIncludedInSpend: newKind === 'purchase' }))
			.filter(r => !shouldRowBeVisible(r))
			.map(r => r.id);
		
		if (rowsToRemove.length > 0) {
			animateRowsOut(rowsToRemove);
		}
		
		const idsToUpdate = rowsToUpdate.map(r => r.id);
		
		// Fire API call and update summary only (no row refresh)
		fetch(`/api/imports/${batchId}/override`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				rawTransactionIds: idsToUpdate,
				patch: { kind: newKind },
				applyToAllWithMerchant: updateSingleRowOnly ? undefined : merchantNorm
			})
		}).then(res => res.json()).then(updateSummaryFromResponse);

		// Show rule modal immediately (don't wait for API)
		// Only show for batch updates (not for single refunds)
		if (row.merchantNorm && newKind !== row.systemKind && !updateSingleRowOnly) {
			ruleModalMerchant = row.merchantNorm;
			ruleModalKind = newKind;
			ruleModalExclude = newKind !== 'purchase';
			ruleModalCategory = null;
			showRuleModal = true;
		}
	}

	// Handle category change - apply to ALL rows with same merchant (for purchases)
	async function handleCategoryChange(row: RawRowEffective, newCategory: string) {
		const merchantNorm = row.merchantNorm;
		
		// Find all rows with same merchant that will be updated
		const rowsToUpdate = merchantNorm 
			? rows.filter(r => r.merchantNorm === merchantNorm)
			: [row];
		
		// Optimistically update UI - update all rows with same merchant
		rows = rows.map(r => {
			if (merchantNorm && r.merchantNorm === merchantNorm) {
				return { ...r, effectiveCategory: newCategory };
			}
			return r;
		});
		
		// Check which updated rows no longer belong in current view and animate them out
		const rowsToRemove = rowsToUpdate
			.map(r => ({ ...r, effectiveCategory: newCategory }))
			.filter(r => !shouldRowBeVisible(r))
			.map(r => r.id);
		
		if (rowsToRemove.length > 0) {
			animateRowsOut(rowsToRemove);
		}
		
		const sameMerchantIds = rowsToUpdate.map(r => r.id);
		
		// Fire API call and update summary only (no row refresh)
		fetch(`/api/imports/${batchId}/override`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				rawTransactionIds: sameMerchantIds,
				patch: { category: newCategory },
				applyToAllWithMerchant: merchantNorm
			})
		}).then(res => res.json()).then(updateSummaryFromResponse);

		// Show rule modal immediately (don't wait for API)
		if (row.merchantNorm && newCategory !== row.systemCategory) {
			ruleModalMerchant = row.merchantNorm;
			ruleModalKind = 'purchase';
			ruleModalCategory = newCategory;
			ruleModalExclude = false;
			showRuleModal = true;
		}
	}

	async function createRule() {
		creatingRule = true;

		await fetch('/api/rules', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				matchType: 'contains',
				matchField: 'merchant_norm',
				matchValue: ruleModalMerchant,
				actionExclude: ruleModalExclude,
				setKind: ruleModalKind,
				setCategory: ruleModalCategory
			})
		});

		creatingRule = false;
		showRuleModal = false;

		// Re-apply rules to current batch - but don't refresh the whole table
		// The user already made their change optimistically, rule is just for future imports
		await fetch(`/api/imports/${batchId}/apply-rules`, { method: 'POST' });
		// Don't call loadRows() - the current view is already correct from optimistic updates
	}

	function closeRuleModal() {
		showRuleModal = false;
	}

	async function bulkOverride(patch: Record<string, unknown>) {
		if (selected.size === 0) return;

		const selectedIds = Array.from(selected);
		
		// Optimistically update UI
		rows = rows.map(r => {
			if (selected.has(r.id)) {
				return { ...r, ...patch };
			}
			return r;
		});

		// Check which rows should animate out
		if (patch.includedInSpend !== undefined) {
			const rowsToRemove = selectedIds.filter(id => {
				const row = rows.find(r => r.id === id);
				if (!row) return false;
				const updatedRow = { ...row, ...patch };
				return !shouldRowBeVisible(updatedRow as RawRowEffective);
			});
			if (rowsToRemove.length > 0) {
				animateRowsOut(rowsToRemove);
			}
		}

		selected = new Set();

		const res = await fetch(`/api/imports/${batchId}/override`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				rawTransactionIds: selectedIds,
				patch
			})
		});

		// Just update summary, don't refresh rows
		const json = await res.json();
		updateSummaryFromResponse(json);
	}

	async function bulkDelete() {
		if (selected.size === 0) return;
		if (!confirm(`Delete ${selected.size} row${selected.size > 1 ? 's' : ''}? This cannot be undone.`)) return;

		const selectedIds = Array.from(selected);
		
		// Animate rows out
		animateRowsOut(selectedIds);
		selected = new Set();

		const res = await fetch(`/api/imports/${batchId}/rows`, {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ rowIds: selectedIds })
		});

		const json = await res.json();
		updateSummaryFromResponse(json);
	}

	async function handleCommit() {
		committing = true;
		commitError = null;

		try {
			const res = await fetch(`/api/imports/${batchId}/commit`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({})
			});

			const json = await res.json();

			if (json.ok) {
				goto('/dashboard');
			} else {
				commitError = json.error || 'Commit failed';
			}
		} catch (err) {
			commitError = 'Commit failed. Please try again.';
		}

		committing = false;
	}

	function toggleSelect(rowId: string) {
		const newSet = new Set(selected);
		if (newSet.has(rowId)) {
			newSet.delete(rowId);
		} else {
			newSet.add(rowId);
		}
		selected = newSet;
	}

	function selectAll() {
		if (selected.size === rows.length) {
			selected = new Set();
		} else {
			selected = new Set(rows.map(r => r.id));
		}
	}

	function formatCurrency(amount: number | null, showSign = false) {
		if (amount === null) return '-';
		const formatted = new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD'
		}).format(Math.abs(amount));
		
		if (showSign) {
			return amount < 0 ? `-${formatted}` : `+${formatted}`;
		}
		return formatted;
	}
	
	function getAmountColor(amount: number | null) {
		if (amount === null) return '';
		return amount > 0 ? 'text-green-400' : 'text-sw-text';
	}

	function formatDate(dateStr: string | null) {
		if (!dateStr) return '-';
		return new Date(dateStr).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric'
		});
	}

	function getKindBadgeClass(kind: TransactionKind): string {
		switch (kind) {
			case 'purchase': return 'badge-success';
			case 'refund': return 'badge-info';
			case 'transfer': return 'badge-neutral';
			case 'cc_payment': return 'badge-neutral';
			case 'income': return 'badge-info';
			case 'fee_interest': return 'badge-warning';
			case 'cash_withdrawal': return 'badge-neutral';
			case 'duplicate': return 'badge-danger';
			default: return 'badge-warning';
		}
	}
</script>

<div class="min-h-screen flex flex-col">
	<!-- Header -->
	<header class="border-b border-sw-border/30 backdrop-blur-md bg-sw-surface/90 sticky top-0 z-50">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
			<div class="flex items-center gap-3 sm:gap-4 min-w-0">
				<a href="/imports" class="p-1.5 rounded-lg transition-colors flex-shrink-0" style="color: {isDark ? '#a3a3a3' : '#525252'}" aria-label="Back to imports">
					<i class="fa-solid fa-arrow-left"></i>
				</a>
				<h1 class="font-display text-lg sm:text-xl font-semibold truncate" style="color: {isDark ? '#ffffff' : '#171717'}">Import Preview</h1>
			</div>
			<button
				onclick={handleCommit}
				disabled={committing || !summary || summary.rowsIncluded === 0}
				class="btn btn-primary text-sm px-4 py-2 flex-shrink-0"
			>
				{#if committing}
					<i class="fa-solid fa-spinner fa-spin mr-2"></i>
				{/if}
				{committing ? 'Committing...' : 'Commit'}
			</button>
		</div>
	</header>

	{#if loading && !summary}
		<div class="flex-1 flex items-center justify-center">
			<div class="w-8 h-8 rounded-full border-2 border-sw-accent border-t-transparent animate-spin"></div>
		</div>
	{:else if summary}
		<main class="flex-1 max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 w-full">
			{#if commitError}
				<div class="p-3 sm:p-4 rounded-lg bg-sw-danger/10 border border-sw-danger/30 text-sw-danger mb-4 sm:mb-6 text-sm">
					{commitError}
				</div>
			{/if}

			<!-- Summary cards -->
			<div class="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3 mb-4 sm:mb-6">
				<div class="rounded-xl p-3 sm:p-4" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
					<p class="text-[10px] sm:text-xs mb-1" style="color: {isDark ? '#737373' : '#737373'}">Rows</p>
					<p class="font-display text-lg sm:text-2xl font-bold" style="color: {isDark ? '#ffffff' : '#171717'}">{summary.rowsTotal}</p>
				</div>
				<div class="rounded-xl p-3 sm:p-4" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
					<p class="text-[10px] sm:text-xs mb-1" style="color: {isDark ? '#737373' : '#737373'}">Included</p>
					<p class="font-display text-lg sm:text-2xl font-bold text-sw-accent">{formatCurrency(summary.totalIncludedSpend)}</p>
					<p class="text-[10px] hidden sm:block" style="color: {isDark ? '#525252' : '#9ca3af'}">{summary.rowsIncluded} rows</p>
				</div>
				<div class="rounded-xl p-3 sm:p-4" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
					<p class="text-[10px] sm:text-xs mb-1" style="color: {isDark ? '#737373' : '#737373'}">Excluded</p>
					<p class="font-display text-lg sm:text-2xl font-bold" style="color: {isDark ? '#a3a3a3' : '#525252'}">{formatCurrency(summary.totalExcludedAmount)}</p>
					<p class="text-[10px] hidden sm:block" style="color: {isDark ? '#525252' : '#9ca3af'}">{summary.rowsExcluded} rows</p>
				</div>
				<div class="rounded-xl p-3 sm:p-4 hidden sm:block" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
					<p class="text-[10px] sm:text-xs mb-1" style="color: {isDark ? '#737373' : '#737373'}">Review</p>
					<p class="font-display text-lg sm:text-2xl font-bold" style="color: #f59e0b">{summary.rowsNeedsReview}</p>
				</div>
				<div class="rounded-xl p-3 sm:p-4 hidden sm:block" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
					<p class="text-[10px] sm:text-xs mb-1" style="color: {isDark ? '#737373' : '#737373'}">Duplicates</p>
					<p class="font-display text-lg sm:text-2xl font-bold" style="color: {isDark ? '#ffffff' : '#171717'}">{summary.rowsDuplicates}</p>
				</div>
			</div>

			<!-- Tabs -->
			<div class="flex items-center gap-1 mb-4 overflow-x-auto scrollbar-hide pb-1" style="border-bottom: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
				{#each [
					{ id: 'included', label: 'Included', labelShort: 'Incl', count: summary.rowsIncluded },
					{ id: 'uncategorized', label: 'Uncategorized', labelShort: 'Uncat', count: summary.rowsUncategorized },
					{ id: 'excluded', label: 'Excluded', labelShort: 'Excl', count: summary.rowsExcluded - summary.rowsNeedsReview - summary.rowsDuplicates },
					{ id: 'needs_review', label: 'Needs Review', labelShort: 'Review', count: summary.rowsNeedsReview },
					{ id: 'duplicates', label: 'Duplicates', labelShort: 'Dupe', count: summary.rowsDuplicates }
				] as tabItem}
					<button
						onclick={() => { tab = tabItem.id as PreviewTab; currentPage = 1; loadRows(); }}
						class="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap -mb-[1px]"
						style="border-color: {tab === tabItem.id ? '#0d9488' : 'transparent'}; color: {tab === tabItem.id ? '#0d9488' : (isDark ? '#a3a3a3' : '#525252')}"
					>
						<span class="hidden sm:inline">{tabItem.label}</span>
						<span class="sm:hidden">{tabItem.labelShort}</span>
						<span 
							class="ml-1.5 px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-normal"
							style="background: {isDark ? '#262626' : '#e8e4dc'}; color: {isDark ? '#737373' : '#525252'}"
						>{tabItem.count}</span>
					</button>
				{/each}
			</div>

			<!-- Bulk actions -->
			{#if selected.size > 0}
				<div class="flex flex-wrap items-center gap-2 sm:gap-3 mb-3 sm:mb-4 p-2 sm:p-3 rounded-lg bg-sw-surface border border-sw-border">
					<span class="text-xs sm:text-sm text-sw-text-dim">{selected.size} selected</span>
					<div class="flex-1"></div>
					<button onclick={() => bulkOverride({ includedInSpend: true })} class="btn btn-secondary text-xs sm:text-sm px-2 sm:px-3">Include</button>
					<button onclick={() => bulkOverride({ includedInSpend: false })} class="btn btn-secondary text-xs sm:text-sm px-2 sm:px-3">Exclude</button>
					<button onclick={bulkDelete} class="btn text-xs sm:text-sm px-2 sm:px-3" style="background: rgba(239,68,68,0.1); color: #ef4444; border: 1px solid rgba(239,68,68,0.3)">Delete</button>
					<button onclick={() => selected = new Set()} class="text-xs sm:text-sm text-sw-text-dim hover:text-sw-text">Clear</button>
				</div>
			{/if}

			<!-- Search -->
			<div class="mb-4">
				<div class="relative w-full sm:max-w-sm">
					<i class="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-xs" style="color: {isDark ? '#525252' : '#9ca3af'}"></i>
					<input
						type="text"
						bind:value={searchQuery}
						onkeyup={(e) => { if (e.key === 'Enter') { currentPage = 1; loadRows(); }}}
						placeholder="Search merchants..."
						class="w-full pl-9 pr-3 py-2 rounded-lg text-sm"
						style="background: {isDark ? '#0a0a0a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#d4cfc5'}; color: {isDark ? '#ffffff' : '#171717'}"
					/>
				</div>
			</div>

			<!-- Desktop Table -->
			<div class="rounded-xl overflow-hidden hidden md:block" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
				<table class="w-full">
					<thead>
						<tr style="background: {isDark ? '#0f0f0f' : '#f9f6f1'}; border-bottom: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
							<th class="w-10 px-3 py-3">
								<input
									type="checkbox"
									checked={selected.size === rows.length && rows.length > 0}
									onchange={selectAll}
									class="rounded accent-sw-accent"
									style="background: {isDark ? '#0a0a0a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#d4cfc5'}"
								/>
							</th>
							<th class="w-20 px-3 py-3 text-xs font-medium" style="color: {isDark ? '#737373' : '#737373'}">Date</th>
							<th class="px-3 py-3 text-xs font-medium text-left" style="color: {isDark ? '#737373' : '#737373'}">Merchant</th>
							<th class="w-24 px-3 py-3 text-xs font-medium text-right" style="color: {isDark ? '#737373' : '#737373'}">Amount</th>
							<th class="w-28 px-3 py-3 text-xs font-medium text-center" style="color: {isDark ? '#737373' : '#737373'}">Type</th>
							<th class="w-36 px-3 py-3 text-xs font-medium text-center" style="color: {isDark ? '#737373' : '#737373'}">Category</th>
							<th class="w-20 px-3 py-3 text-xs font-medium text-center" style="color: {isDark ? '#737373' : '#737373'}">Include</th>
						</tr>
					</thead>
					<tbody>
						{#if loading}
							<tr>
								<td colspan="7" class="text-center py-8">
									<div class="w-6 h-6 rounded-full border-2 border-sw-accent border-t-transparent animate-spin mx-auto"></div>
								</td>
							</tr>
						{:else if rows.length === 0}
							<tr>
								<td colspan="7" class="text-center py-8 text-sw-text-dim">
									No transactions in this view
								</td>
							</tr>
						{:else}
							{#each rows as row (row.id)}
								<tr 
									class="transition-all duration-300 {departingRows.has(row.id) ? 'opacity-0 scale-95 -translate-x-4' : 'opacity-100'}"
									style="background: {selected.has(row.id) ? 'rgba(13,148,136,0.05)' : 'transparent'}; border-bottom: 1px solid {isDark ? '#1f1f1f' : '#f0f0f0'}"
								>
									<td class="px-3 py-2.5">
										<div class="flex justify-center">
											<input
												type="checkbox"
												checked={selected.has(row.id)}
												onchange={() => toggleSelect(row.id)}
												class="rounded accent-sw-accent"
												style="background: {isDark ? '#0a0a0a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#d4cfc5'}"
											/>
										</div>
									</td>
									<td class="px-3 py-2.5 font-mono text-sm" style="color: {isDark ? '#a3a3a3' : '#525252'}">{formatDate(row.dateChosen)}</td>
									<td class="px-3 py-2.5">
										<div class="truncate text-sm" title={row.descriptionRaw || ''} style="color: {isDark ? '#ffffff' : '#171717'}">
											{row.merchantRaw || row.descriptionRaw || '-'}
										</div>
										{#if row.parseStatus === 'error'}
											<span class="text-xs text-red-500">{row.parseError}</span>
										{/if}
									</td>
									<td class="px-3 py-2.5 text-right font-mono text-sm" style="color: {row.amountSigned && row.amountSigned > 0 ? '#22c55e' : (isDark ? '#ffffff' : '#171717')}">{formatCurrency(row.amountSigned, true)}</td>
									<td class="px-3 py-2.5">
										<div class="flex justify-center">
											<select
												value={row.effectiveKind}
												onchange={(e) => handleKindChange(row, e.currentTarget.value as TransactionKind)}
												class="text-xs rounded px-2 py-1.5 cursor-pointer"
												style="background: {isDark ? '#0a0a0a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#d4cfc5'}; color: {isDark ? '#ffffff' : '#171717'}"
											>
												{#each kindOptions as opt}
													<option value={opt.value}>{opt.label}</option>
												{/each}
											</select>
										</div>
									</td>
									<td class="px-3 py-2.5">
										<div class="flex justify-center">
											{#if row.effectiveKind === 'purchase'}
												<select
													value={row.effectiveCategory || 'Uncategorized'}
													onchange={(e) => handleCategoryChange(row, e.currentTarget.value)}
													class="text-xs rounded px-2 py-1.5 cursor-pointer"
													style="background: {isDark ? '#0a0a0a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#d4cfc5'}; color: {isDark ? '#ffffff' : '#171717'}"
												>
													{#each CATEGORIES as cat}
														<option value={cat}>{cat}</option>
													{/each}
												</select>
											{:else}
												<span style="color: {isDark ? '#525252' : '#9ca3af'}">-</span>
											{/if}
										</div>
									</td>
									<td class="px-3 py-2.5">
										<div class="flex justify-center">
											<button
												onclick={() => updateOverride(row.id, { includedInSpend: !row.effectiveIncludedInSpend })}
												class="toggle {row.effectiveIncludedInSpend ? 'toggle-checked' : 'toggle-unchecked'}"
												aria-label="Toggle included"
											>
												<span class="toggle-dot"></span>
											</button>
										</div>
									</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>

			<!-- Mobile Card View -->
			<div class="md:hidden space-y-2">
				{#if loading}
					<div class="flex items-center justify-center py-8">
						<div class="w-6 h-6 rounded-full border-2 border-sw-accent border-t-transparent animate-spin"></div>
					</div>
				{:else if rows.length === 0}
					<div class="text-center py-8 text-sm" style="color: {isDark ? '#737373' : '#737373'}">
						No transactions in this view
					</div>
				{:else}
					{#each rows as row (row.id)}
						<div 
							class="rounded-xl p-3 transition-all duration-300 {departingRows.has(row.id) ? 'opacity-0 scale-95 -translate-x-4 h-0 p-0 mb-0 overflow-hidden' : 'opacity-100'}"
							style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {selected.has(row.id) ? 'rgba(13,148,136,0.5)' : (isDark ? '#2a2a2a' : '#e5e5e5')}; {selected.has(row.id) ? 'background: rgba(13,148,136,0.03)' : ''}"
						>
							<!-- Top row: checkbox, merchant, amount -->
							<div class="flex items-start gap-3 mb-3">
								<input
									type="checkbox"
									checked={selected.has(row.id)}
									onchange={() => toggleSelect(row.id)}
									class="rounded accent-sw-accent mt-1"
									style="background: {isDark ? '#0a0a0a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#d4cfc5'}"
								/>
								<div class="flex-1 min-w-0">
									<div class="flex items-start justify-between gap-2">
										<div class="min-w-0">
											<p class="font-medium text-sm truncate" style="color: {isDark ? '#ffffff' : '#171717'}">{row.merchantRaw || row.descriptionRaw || '-'}</p>
											<p class="text-[10px]" style="color: {isDark ? '#525252' : '#9ca3af'}">{formatDate(row.dateChosen)}</p>
										</div>
										<p class="font-mono text-sm font-medium flex-shrink-0" style="color: {row.amountSigned && row.amountSigned > 0 ? '#22c55e' : (isDark ? '#ffffff' : '#171717')}">{formatCurrency(row.amountSigned, true)}</p>
									</div>
								</div>
							</div>
							<!-- Bottom row: dropdowns and toggle -->
							<div class="flex items-center gap-2 ml-7">
								<select
									value={row.effectiveKind}
									onchange={(e) => handleKindChange(row, e.currentTarget.value as TransactionKind)}
									class="text-[11px] rounded px-2 py-1.5 cursor-pointer flex-1"
									style="background: {isDark ? '#0a0a0a' : '#f9f6f1'}; border: 1px solid {isDark ? '#2a2a2a' : '#d4cfc5'}; color: {isDark ? '#ffffff' : '#171717'}"
								>
									{#each kindOptions as opt}
										<option value={opt.value}>{opt.label}</option>
									{/each}
								</select>
								{#if row.effectiveKind === 'purchase'}
									<select
										value={row.effectiveCategory || 'Uncategorized'}
										onchange={(e) => handleCategoryChange(row, e.currentTarget.value)}
										class="text-[11px] rounded px-2 py-1.5 cursor-pointer flex-1"
										style="background: {isDark ? '#0a0a0a' : '#f9f6f1'}; border: 1px solid {isDark ? '#2a2a2a' : '#d4cfc5'}; color: {isDark ? '#ffffff' : '#171717'}"
									>
										{#each CATEGORIES as cat}
											<option value={cat}>{cat}</option>
										{/each}
									</select>
								{/if}
								<button
									onclick={() => updateOverride(row.id, { includedInSpend: !row.effectiveIncludedInSpend })}
									class="toggle scale-90 {row.effectiveIncludedInSpend ? 'toggle-checked' : 'toggle-unchecked'}"
									aria-label="Toggle included"
								>
									<span class="toggle-dot"></span>
								</button>
							</div>
						</div>
					{/each}
				{/if}
			</div>

			<!-- Pagination -->
			{#if totalRows > pageSize}
				<div class="flex flex-col sm:flex-row items-center justify-between mt-3 sm:mt-4 gap-2">
					<p class="text-xs sm:text-sm text-sw-text-dim">
						{(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, totalRows)} of {totalRows}
					</p>
					<div class="flex items-center gap-2">
						<button
							onclick={() => { currentPage--; loadRows(); }}
							disabled={currentPage === 1}
							class="btn btn-secondary text-xs sm:text-sm px-2 sm:px-3"
						>
							Prev
						</button>
						<button
							onclick={() => { currentPage++; loadRows(); }}
							disabled={currentPage * pageSize >= totalRows}
							class="btn btn-secondary text-xs sm:text-sm px-2 sm:px-3"
						>
							Next
						</button>
					</div>
				</div>
			{/if}
		</main>

		<!-- Footer with reconciliation info -->
		<footer class="safe-area-bottom" style="border-top: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}; background: {isDark ? 'rgba(26,26,26,0.5)' : 'rgba(249,246,241,0.5)'}">
			<div class="max-w-7xl mx-auto px-3 sm:px-6 py-3 flex flex-col sm:flex-row items-center justify-between text-xs gap-1 sm:gap-0">
				<div style="color: {isDark ? '#737373' : '#737373'}" class="text-center sm:text-left">
					<span>Date range: {summary.dateMin ? formatDate(summary.dateMin) : '-'} – {summary.dateMax ? formatDate(summary.dateMax) : '-'}</span>
					<span class="hidden sm:inline"> • {summary.currency}</span>
				</div>
				<div style="color: {isDark ? '#525252' : '#9ca3af'}">
					Investment delay: 1 day • Ticker: SPY
				</div>
			</div>
		</footer>
	{/if}
</div>

<!-- Create Rule Modal -->
{#if showRuleModal}
	<div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 safe-area-top safe-area-bottom" onclick={closeRuleModal}>
		<div class="card max-w-md w-full animate-slide-up" onclick={(e) => e.stopPropagation()}>
			<h2 class="font-display text-lg font-semibold mb-4">Create Rule for Future Imports?</h2>
			
			<p class="text-sw-text-dim text-sm mb-4">
				Apply this classification to all transactions containing:
			</p>

			<div class="p-3 rounded-lg bg-sw-bg border border-sw-border mb-4 font-mono text-sm break-all">
				{ruleModalMerchant}
			</div>

			<div class="space-y-3 mb-6">
				<div class="flex items-center justify-between text-sm">
					<span class="text-sw-text-dim">Type:</span>
					<span class="font-medium">{kindOptions.find(k => k.value === ruleModalKind)?.label}</span>
				</div>
				{#if ruleModalCategory}
					<div class="flex items-center justify-between text-sm">
						<span class="text-sw-text-dim">Category:</span>
						<span class="font-medium">{ruleModalCategory}</span>
					</div>
				{/if}
				<div class="flex items-center justify-between text-sm">
					<span class="text-sw-text-dim">Exclude from spend:</span>
					<span class="font-medium">{ruleModalExclude ? 'Yes' : 'No'}</span>
				</div>
			</div>

			<div class="flex items-center gap-3">
				<button onclick={createRule} disabled={creatingRule} class="btn btn-primary flex-1">
					{creatingRule ? 'Creating...' : 'Yes, Create Rule'}
				</button>
				<button onclick={closeRuleModal} class="btn btn-secondary flex-1">
					No, Just This One
				</button>
			</div>
		</div>
	</div>
{/if}
