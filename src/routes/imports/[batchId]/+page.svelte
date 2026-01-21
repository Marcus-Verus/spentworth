<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import type { BatchSummary, RawRowEffective, PreviewTab, TransactionKind, Category, CATEGORIES } from '$lib/types';

	let { data } = $props();

	const batchId = $derived($page.params.batchId);

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

	// Rule creation modal state
	let showRuleModal = $state(false);
	let ruleModalMerchant = $state('');
	let ruleModalKind = $state<TransactionKind>('purchase');
	let ruleModalCategory = $state<string | null>(null);
	let ruleModalExclude = $state(false);
	let creatingRule = $state(false);

	const categories = ['Groceries', 'Dining', 'Coffee', 'Delivery', 'Shopping', 'Gas/Transport', 'Subscriptions', 'Travel', 'Entertainment', 'Healthcare', 'Utilities', 'Housing', 'Personal Care', 'Education', 'Gifts', 'Uncategorized'];

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

	$effect(() => {
		loadRows();
	});

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

	async function updateOverride(rowId: string, patch: Record<string, unknown>) {
		await fetch(`/api/imports/${batchId}/override`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				rawTransactionIds: [rowId],
				patch
			})
		});

		// Refresh to get updated summary
		loadRows();
	}

	// Handle kind change - apply to ALL rows with same merchant
	async function handleKindChange(row: RawRowEffective, newKind: TransactionKind) {
		// Find all rows with the same merchant and update them all
		const merchantNorm = row.merchantNorm;
		const sameMerchantRows = merchantNorm 
			? rows.filter(r => r.merchantNorm === merchantNorm).map(r => r.id)
			: [row.id];
		
		await fetch(`/api/imports/${batchId}/override`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				rawTransactionIds: sameMerchantRows,
				patch: { kind: newKind },
				applyToAllWithMerchant: merchantNorm // Also update any rows not in current page
			})
		});

		// Prompt to create a rule if merchant exists and kind changed from system
		if (row.merchantNorm && newKind !== row.systemKind) {
			ruleModalMerchant = row.merchantNorm;
			ruleModalKind = newKind;
			ruleModalExclude = newKind !== 'purchase';
			ruleModalCategory = null;
			showRuleModal = true;
		}
		
		loadRows();
	}

	// Handle category change - apply to ALL rows with same merchant
	async function handleCategoryChange(row: RawRowEffective, newCategory: string) {
		// Find all rows with the same merchant and update them all
		const merchantNorm = row.merchantNorm;
		const sameMerchantRows = merchantNorm 
			? rows.filter(r => r.merchantNorm === merchantNorm).map(r => r.id)
			: [row.id];
		
		await fetch(`/api/imports/${batchId}/override`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				rawTransactionIds: sameMerchantRows,
				patch: { category: newCategory },
				applyToAllWithMerchant: merchantNorm // Also update any rows not in current page
			})
		});

		// Prompt to create a rule if merchant exists and category changed
		if (row.merchantNorm && newCategory !== row.systemCategory) {
			ruleModalMerchant = row.merchantNorm;
			ruleModalKind = 'purchase';
			ruleModalCategory = newCategory;
			ruleModalExclude = false;
			showRuleModal = true;
		}
		
		loadRows();
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

		// Re-apply rules to current batch - update all matching rows
		await fetch(`/api/imports/${batchId}/apply-rules`, { method: 'POST' });
		loadRows();
	}

	function closeRuleModal() {
		showRuleModal = false;
	}

	async function bulkOverride(patch: Record<string, unknown>) {
		if (selected.size === 0) return;

		await fetch(`/api/imports/${batchId}/override`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				rawTransactionIds: Array.from(selected),
				patch
			})
		});

		selected = new Set();
		loadRows();
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
	<header class="border-b border-sw-border/50 bg-sw-bg/80 backdrop-blur-sm sticky top-0 z-40">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
			<div class="flex items-center gap-2 sm:gap-4 min-w-0">
				<a href="/imports" class="text-sw-text-dim hover:text-sw-text transition-colors flex-shrink-0" aria-label="Back to imports">
					<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
					</svg>
				</a>
				<h1 class="font-display text-base sm:text-xl font-semibold truncate">Import Preview</h1>
			</div>
			<button
				onclick={handleCommit}
				disabled={committing || !summary || summary.rowsIncluded === 0}
				class="btn btn-primary text-sm sm:text-base px-3 sm:px-4 py-1.5 sm:py-2 flex-shrink-0"
			>
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
			<div class="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-4 mb-4 sm:mb-6">
				<div class="stat-card p-2 sm:p-4">
					<p class="text-[10px] sm:text-sm text-sw-text-dim mb-0.5 sm:mb-1">Rows</p>
					<p class="font-display text-lg sm:text-2xl font-bold">{summary.rowsTotal}</p>
				</div>
				<div class="stat-card p-2 sm:p-4">
					<p class="text-[10px] sm:text-sm text-sw-text-dim mb-0.5 sm:mb-1">Included</p>
					<p class="font-display text-lg sm:text-2xl font-bold text-sw-accent">{formatCurrency(summary.totalIncludedSpend)}</p>
					<p class="text-[8px] sm:text-xs text-sw-text-dim hidden sm:block">{summary.rowsIncluded} rows</p>
				</div>
				<div class="stat-card p-2 sm:p-4">
					<p class="text-[10px] sm:text-sm text-sw-text-dim mb-0.5 sm:mb-1">Excluded</p>
					<p class="font-display text-lg sm:text-2xl font-bold">{formatCurrency(summary.totalExcludedAmount)}</p>
					<p class="text-[8px] sm:text-xs text-sw-text-dim hidden sm:block">{summary.rowsExcluded} rows</p>
				</div>
				<div class="stat-card p-2 sm:p-4 hidden sm:block">
					<p class="text-[10px] sm:text-sm text-sw-text-dim mb-0.5 sm:mb-1">Review</p>
					<p class="font-display text-lg sm:text-2xl font-bold text-sw-warning">{summary.rowsNeedsReview}</p>
				</div>
				<div class="stat-card p-2 sm:p-4 hidden sm:block">
					<p class="text-[10px] sm:text-sm text-sw-text-dim mb-0.5 sm:mb-1">Duplicates</p>
					<p class="font-display text-lg sm:text-2xl font-bold">{summary.rowsDuplicates}</p>
				</div>
			</div>

			<!-- Tabs -->
			<div class="flex items-center gap-0.5 sm:gap-1 mb-3 sm:mb-4 border-b border-sw-border overflow-x-auto scrollbar-hide">
				{#each [
					{ id: 'included', label: 'Included', labelShort: 'Incl', count: summary.rowsIncluded },
					{ id: 'uncategorized', label: 'Uncategorized', labelShort: 'Uncat', count: summary.rowsUncategorized, highlight: true },
					{ id: 'excluded', label: 'Excluded', labelShort: 'Excl', count: summary.rowsExcluded - summary.rowsNeedsReview - summary.rowsDuplicates },
					{ id: 'needs_review', label: 'Needs Review', labelShort: 'Review', count: summary.rowsNeedsReview },
					{ id: 'duplicates', label: 'Duplicates', labelShort: 'Dupe', count: summary.rowsDuplicates }
				] as tabItem}
					<button
						onclick={() => { tab = tabItem.id as PreviewTab; currentPage = 1; loadRows(); }}
						class="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap {tab === tabItem.id ? 'border-sw-accent text-sw-accent' : 'border-transparent text-sw-text-dim hover:text-sw-text'}"
					>
						<span class="hidden sm:inline">{tabItem.label}</span>
						<span class="sm:hidden">{tabItem.labelShort}</span>
						<span class="ml-1 px-1 sm:px-1.5 py-0.5 rounded-full text-[10px] sm:text-xs {tabItem.highlight && tabItem.count > 0 ? 'bg-amber-500/30 text-amber-300' : 'bg-sw-surface'}">{tabItem.count}</span>
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
					<button onclick={() => selected = new Set()} class="text-xs sm:text-sm text-sw-text-dim hover:text-sw-text">Clear</button>
				</div>
			{/if}

			<!-- Search -->
			<div class="mb-3 sm:mb-4">
				<input
					type="text"
					bind:value={searchQuery}
					onkeyup={(e) => { if (e.key === 'Enter') { currentPage = 1; loadRows(); }}}
					placeholder="Search..."
					class="input text-sm w-full sm:max-w-sm"
				/>
			</div>

			<!-- Desktop Table -->
			<div class="table-container bg-sw-surface/50 hidden md:block">
				<table class="table w-full">
					<thead>
						<tr>
							<th class="w-10">
								<input
									type="checkbox"
									checked={selected.size === rows.length && rows.length > 0}
									onchange={selectAll}
									class="rounded border-sw-border"
								/>
							</th>
							<th class="w-20">Date</th>
							<th class="text-left">Merchant</th>
							<th class="w-24 text-right pr-4">Amount</th>
							<th class="w-28 text-center">Type</th>
							<th class="w-36 text-center">Category</th>
							<th class="w-20 text-center">Included</th>
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
							{#each rows as row}
								<tr class="{selected.has(row.id) ? 'bg-sw-accent/5' : ''}">
									<td>
										<div class="flex justify-center">
											<input
												type="checkbox"
												checked={selected.has(row.id)}
												onchange={() => toggleSelect(row.id)}
												class="rounded border-sw-border"
											/>
										</div>
									</td>
									<td class="font-mono text-sm">{formatDate(row.dateChosen)}</td>
									<td>
										<div class="truncate" title={row.descriptionRaw || ''}>
											{row.merchantRaw || row.descriptionRaw || '-'}
										</div>
										{#if row.parseStatus === 'error'}
											<span class="text-xs text-sw-danger">{row.parseError}</span>
										{/if}
									</td>
									<td class="text-right font-mono pr-4 {getAmountColor(row.amountSigned)}">{formatCurrency(row.amountSigned, true)}</td>
									<td>
										<div class="flex justify-center">
											<select
												value={row.effectiveKind}
												onchange={(e) => handleKindChange(row, e.currentTarget.value as TransactionKind)}
												class="text-xs bg-sw-bg text-sw-text border border-sw-border rounded px-2 py-1 cursor-pointer"
											>
												{#each kindOptions as opt}
													<option value={opt.value} class="bg-sw-bg text-sw-text">{opt.label}</option>
												{/each}
											</select>
										</div>
									</td>
									<td>
										<div class="flex justify-center">
											{#if row.effectiveKind === 'purchase'}
												<select
													value={row.effectiveCategory || 'Uncategorized'}
													onchange={(e) => handleCategoryChange(row, e.currentTarget.value)}
													class="text-xs bg-sw-bg text-sw-text border border-sw-border rounded px-2 py-1 cursor-pointer"
												>
													{#each categories as cat}
														<option value={cat} class="bg-sw-bg text-sw-text">{cat}</option>
													{/each}
												</select>
											{:else}
												<span class="text-sw-text-dim">-</span>
											{/if}
										</div>
									</td>
									<td>
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
					<div class="text-center py-8 text-sw-text-dim text-sm">
						No transactions in this view
					</div>
				{:else}
					{#each rows as row}
						<div class="bg-sw-surface/60 rounded-xl border border-sw-border/50 p-3 {selected.has(row.id) ? 'border-sw-accent/50 bg-sw-accent/5' : ''}">
							<div class="flex items-start gap-2 mb-2">
								<input
									type="checkbox"
									checked={selected.has(row.id)}
									onchange={() => toggleSelect(row.id)}
									class="rounded border-sw-border mt-0.5"
								/>
								<div class="flex-1 min-w-0">
									<div class="flex items-start justify-between gap-2">
										<div class="min-w-0">
											<p class="font-medium text-sm truncate">{row.merchantRaw || row.descriptionRaw || '-'}</p>
											<p class="text-[10px] text-sw-text-dim">{formatDate(row.dateChosen)}</p>
										</div>
										<p class="font-mono text-sm flex-shrink-0 {getAmountColor(row.amountSigned)}">{formatCurrency(row.amountSigned, true)}</p>
									</div>
								</div>
							</div>
							<div class="flex items-center gap-2 ml-6">
								<select
									value={row.effectiveKind}
									onchange={(e) => handleKindChange(row, e.currentTarget.value as TransactionKind)}
									class="text-[10px] bg-sw-bg text-sw-text border border-sw-border rounded px-1.5 py-1 cursor-pointer flex-1"
								>
									{#each kindOptions as opt}
										<option value={opt.value} class="bg-sw-bg text-sw-text">{opt.label}</option>
									{/each}
								</select>
								{#if row.effectiveKind === 'purchase'}
									<select
										value={row.effectiveCategory || 'Uncategorized'}
										onchange={(e) => handleCategoryChange(row, e.currentTarget.value)}
										class="text-[10px] bg-sw-bg text-sw-text border border-sw-border rounded px-1.5 py-1 cursor-pointer flex-1"
									>
										{#each categories as cat}
											<option value={cat} class="bg-sw-bg text-sw-text">{cat}</option>
										{/each}
									</select>
								{/if}
								<button
									onclick={() => updateOverride(row.id, { includedInSpend: !row.effectiveIncludedInSpend })}
									class="toggle scale-75 origin-right {row.effectiveIncludedInSpend ? 'toggle-checked' : 'toggle-unchecked'}"
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
		<footer class="border-t border-sw-border/50 bg-sw-surface/50 py-3 sm:py-4">
			<div class="max-w-7xl mx-auto px-3 sm:px-6 flex flex-col sm:flex-row items-center justify-between text-[10px] sm:text-sm gap-1 sm:gap-0">
				<div class="text-sw-text-dim text-center sm:text-left">
					<span>{summary.dateMin ? formatDate(summary.dateMin) : '-'} - {summary.dateMax ? formatDate(summary.dateMax) : '-'}</span>
					<span class="hidden sm:inline"> • {summary.currency}</span>
				</div>
				<div class="text-sw-text-dim">
					Delay: 1 day • SPY
				</div>
			</div>
		</footer>
	{/if}
</div>

<!-- Create Rule Modal -->
{#if showRuleModal}
	<div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onclick={closeRuleModal}>
		<div class="card max-w-md w-full mx-4 animate-slide-up" onclick={(e) => e.stopPropagation()}>
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
