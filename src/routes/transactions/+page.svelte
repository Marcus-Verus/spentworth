<script lang="ts">
	import { onMount } from 'svelte';
	import Header from '$lib/components/Header.svelte';
	import { initTheme, getTheme, setTheme } from '$lib/stores/theme';
	import { CATEGORIES, CATEGORY_HIERARCHY, getSubcategories } from '$lib/types';

	let isDark = $state(false);

	interface Transaction {
		id: string;
		date: string;
		amount: number;
		merchant: string | null;
		category: string | null;
		subcategory: string | null;
		kind: string;
		description: string | null;
		included_in_spend: boolean;
		future_value: number | null;
		growth_delta: number | null;
	}

	// State
	let transactions = $state<Transaction[]>([]);
	let loading = $state(true);
	let page = $state(1);
	let totalPages = $state(1);
	let total = $state(0);
	
	// Filters
	let search = $state('');
	let categoryFilter = $state('');
	let dateFrom = $state('');
	let dateTo = $state('');
	let sortBy = $state<'date' | 'amount'>('date');
	let sortOrder = $state<'desc' | 'asc'>('desc');
	
	// Edit modal
	let editingTransaction = $state<Transaction | null>(null);
	let editForm = $state({ merchant: '', category: '', subcategory: '', amount: 0, date: '', description: '' });
	let editSaving = $state(false);
	let editError = $state<string | null>(null);
	
	// Delete
	let deletingId = $state<string | null>(null);

	// Multi-select
	let selectedIds = $state<Set<string>>(new Set());
	let showBulkModal = $state(false);
	let bulkCategory = $state('');
	let bulkSubcategory = $state('');
	let bulkSaving = $state(false);
	let bulkCreateRule = $state(false);

	// Get available subcategories for bulk modal
	let bulkSubcategories = $derived(getSubcategories(bulkCategory));

	// Apply to all prompt
	let showApplyToAll = $state(false);
	let applyToAllMerchant = $state('');
	let applyToAllCategory = $state('');
	let applyToAllCount = $state(0);
	let applyingToAll = $state(false);
	let createRuleChecked = $state(true);

	// Derived state for select all
	let allSelected = $derived(transactions.length > 0 && selectedIds.size === transactions.length);
	let someSelected = $derived(selectedIds.size > 0 && selectedIds.size < transactions.length);
	let selectedTransactions = $derived(transactions.filter(tx => selectedIds.has(tx.id)));

	// Unique merchants in selected transactions (must come after selectedTransactions)
	let uniqueMerchants = $derived([...new Set(selectedTransactions.map(tx => tx.merchant).filter(Boolean))]);

	function toggleSelect(id: string) {
		const newSet = new Set(selectedIds);
		if (newSet.has(id)) {
			newSet.delete(id);
		} else {
			newSet.add(id);
		}
		selectedIds = newSet;
	}

	function toggleSelectAll() {
		if (allSelected) {
			selectedIds = new Set();
		} else {
			selectedIds = new Set(transactions.map(tx => tx.id));
		}
	}

	function clearSelection() {
		selectedIds = new Set();
	}

	async function bulkCategorize() {
		if (selectedIds.size === 0 || !bulkCategory) return;
		
		bulkSaving = true;
		try {
			const res = await fetch('/api/transactions/bulk-categorize', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					transactionIds: Array.from(selectedIds),
					category: bulkCategory,
					subcategory: bulkSubcategory || null,
					createRule: bulkCreateRule
				})
			});
			
			const json = await res.json();
			
			if (json.ok) {
				showBulkModal = false;
				bulkCategory = '';
				bulkSubcategory = '';
				clearSelection();
				await loadTransactions();
			}
		} catch (e) {
			// Error handling - bulk categorize failed silently
		}
		bulkSaving = false;
	}

	// Category stats
	let categoryStats = $derived.by(() => {
		const stats = new Map<string, { count: number; total: number }>();
		for (const tx of transactions) {
			const cat = tx.category || 'Uncategorized';
			if (!stats.has(cat)) stats.set(cat, { count: 0, total: 0 });
			const s = stats.get(cat)!;
			s.count++;
			s.total += Math.abs(tx.amount);
		}
		return Array.from(stats.entries())
			.map(([category, data]) => ({ category, ...data }))
			.sort((a, b) => b.total - a.total);
	});

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
			day: 'numeric',
			year: 'numeric'
		});
	}

	function formatShortDate(dateStr: string): string {
		return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric'
		});
	}

	async function loadTransactions() {
		loading = true;
		clearSelection(); // Clear selection when loading new data
		try {
			const params = new URLSearchParams();
			params.set('page', page.toString());
			params.set('limit', '30');
			params.set('sortBy', sortBy);
			params.set('sortOrder', sortOrder);
			if (search) params.set('search', search);
			if (categoryFilter) params.set('category', categoryFilter);
			if (dateFrom) params.set('from', dateFrom);
			if (dateTo) params.set('to', dateTo);

			const res = await fetch(`/api/transactions/quick-add?${params.toString()}`);
			const json = await res.json();
			
			if (json.ok) {
				transactions = json.data.transactions;
				page = json.data.pagination.page;
				totalPages = json.data.pagination.totalPages;
				total = json.data.pagination.total;
			}
		} catch (e) {
			// Error handling - load failed silently
		}
		loading = false;
	}

	function applyFilters() {
		page = 1;
		loadTransactions();
	}

	function clearFilters() {
		search = '';
		categoryFilter = '';
		dateFrom = '';
		dateTo = '';
		page = 1;
		loadTransactions();
	}

	function openEditModal(tx: Transaction) {
		editingTransaction = tx;
		editForm = {
			merchant: tx.merchant || '',
			category: tx.category || '',
			subcategory: tx.subcategory || '',
			amount: Math.abs(tx.amount),
			date: tx.date,
			description: tx.description || ''
		};
		editError = null;
	}

	// Get available subcategories for current category in edit form
	let editSubcategories = $derived(getSubcategories(editForm.category));

	async function saveTransaction() {
		if (!editingTransaction) return;
		
		editSaving = true;
		editError = null;
		
		const originalCategory = editingTransaction.category;
		const newCategory = editForm.category;
		const merchant = editForm.merchant;
		const categoryChanged = originalCategory !== newCategory && newCategory && merchant;
		
		try {
			const res = await fetch(`/api/transactions/${editingTransaction.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					merchant: editForm.merchant,
					category: editForm.category,
					subcategory: editForm.subcategory || null,
					amount: editForm.amount,
					date: editForm.date,
					description: editForm.description
				})
			});
			
			const json = await res.json();
			
			if (json.ok) {
				editingTransaction = null;
				
				// If category changed, check if there are other transactions with same merchant
				if (categoryChanged) {
					try {
						const countRes = await fetch(`/api/transactions/bulk-categorize?merchant=${encodeURIComponent(merchant)}&excludeCategory=${encodeURIComponent(newCategory)}`);
						const countJson = await countRes.json();
						
						if (countJson.ok && countJson.data.count > 0) {
							// Show "apply to all" prompt
							applyToAllMerchant = merchant;
							applyToAllCategory = newCategory;
							applyToAllCount = countJson.data.count;
							showApplyToAll = true;
						}
					} catch {
						// Ignore - this is just a convenience feature
					}
				}
				
				await loadTransactions();
			} else {
				editError = json.error || 'Failed to save';
			}
		} catch (e) {
			editError = 'Failed to save transaction';
		}
		
		editSaving = false;
	}

	async function applyToAllTransactions() {
		applyingToAll = true;
		
		try {
			const res = await fetch('/api/transactions/bulk-categorize', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					merchant: applyToAllMerchant,
					category: applyToAllCategory,
					createRule: createRuleChecked
				})
			});
			
			const json = await res.json();
			
			if (json.ok) {
				showApplyToAll = false;
				await loadTransactions();
			}
		} catch (e) {
			// Error handling - apply to all failed silently
		}
		
		applyingToAll = false;
	}

	function dismissApplyToAll() {
		showApplyToAll = false;
		applyToAllMerchant = '';
		applyToAllCategory = '';
		applyToAllCount = 0;
	}

	async function deleteTransaction(id: string) {
		if (!confirm('Delete this transaction? This cannot be undone.')) return;
		
		deletingId = id;
		try {
			const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
			if (res.ok) {
				await loadTransactions();
			}
		} catch (e) {
			// Error handling - delete failed silently
		}
		deletingId = null;
	}

	function toggleSort(field: 'date' | 'amount') {
		if (sortBy === field) {
			sortOrder = sortOrder === 'desc' ? 'asc' : 'desc';
		} else {
			sortBy = field;
			sortOrder = 'desc';
		}
		loadTransactions();
	}

	onMount(async () => {
		initTheme();
		isDark = getTheme() === 'dark';
		
		// Check Pro status
		try {
			const subRes = await fetch('/api/stripe/subscription');
			if (subRes.ok) {
				const subData = await subRes.json();
				const isPro = subData.plan === 'pro' && ['active', 'trialing'].includes(subData.status);
				if (!isPro && isDark) {
					setTheme('light');
					isDark = false;
				}
			}
		} catch { /* ignore */ }
		
		loadTransactions();
	});
</script>

<svelte:head>
	<title>Transactions | SpentWorth</title>
</svelte:head>

<div class="min-h-screen" style="background: {isDark ? 'var(--sw-bg)' : '#f5f0e8'}">
	<Header />
	
	<main class="max-w-6xl mx-auto px-4 py-6 sm:py-8">
		<!-- Page Header -->
		<div class="mb-6">
			<h1 class="font-display text-2xl sm:text-3xl font-bold mb-2" style="color: {isDark ? '#ffffff' : '#171717'}">
				Transactions
			</h1>
			<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#525252'}">
				View, search, and manage all your spending
			</p>
		</div>

		<div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
			<!-- Sidebar - Filters & Stats -->
			<div class="lg:col-span-1 space-y-4">
				<!-- Filters Card -->
				<div class="rounded-xl p-4" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
					<h3 class="font-display font-semibold mb-3" style="color: {isDark ? '#ffffff' : '#171717'}">
						<i class="fa-solid fa-filter text-sw-accent mr-2 text-sm"></i>Filters
					</h3>
					
					<div class="space-y-3">
						<!-- Search -->
						<div>
							<label for="filter-search" class="block text-xs mb-1" style="color: {isDark ? '#a3a3a3' : '#737373'}">Search</label>
							<input 
								id="filter-search"
								type="text" 
								bind:value={search}
								onkeydown={(e) => e.key === 'Enter' && applyFilters()}
								placeholder="Merchant or description..."
								class="w-full px-3 py-2 rounded-lg text-sm"
								style="background: {isDark ? '#0a0a0a' : '#f9f6f1'}; border: 1px solid {isDark ? '#2a2a2a' : '#d4cfc5'}; color: {isDark ? '#ffffff' : '#171717'}"
							/>
						</div>
						
						<!-- Category -->
						<div>
							<label for="filter-category" class="block text-xs mb-1" style="color: {isDark ? '#a3a3a3' : '#737373'}">Category</label>
							<select 
								id="filter-category"
								bind:value={categoryFilter}
								class="w-full px-3 py-2 rounded-lg text-sm"
								style="background: {isDark ? '#0a0a0a' : '#f9f6f1'}; border: 1px solid {isDark ? '#2a2a2a' : '#d4cfc5'}; color: {isDark ? '#ffffff' : '#171717'}"
							>
								<option value="">All categories</option>
								{#each CATEGORIES as cat}
									<option value={cat}>{cat}</option>
									{#each getSubcategories(cat) as sub}
										<option value="{cat}:{sub}">&nbsp;&nbsp;› {sub}</option>
									{/each}
								{/each}
							</select>
						</div>
						
					<!-- Date Range -->
					<div class="grid grid-cols-2 gap-1 sm:gap-2">
						<div>
							<label for="filter-date-from" class="block text-xs mb-1" style="color: {isDark ? '#a3a3a3' : '#737373'}">From</label>
							<input 
								id="filter-date-from"
								type="date" 
								bind:value={dateFrom}
								class="w-full px-1 sm:px-2 py-2 rounded-lg text-xs"
								style="background: {isDark ? '#0a0a0a' : '#f9f6f1'}; border: 1px solid {isDark ? '#2a2a2a' : '#d4cfc5'}; color: {isDark ? '#ffffff' : '#171717'}"
							/>
						</div>
						<div>
							<label for="filter-date-to" class="block text-xs mb-1" style="color: {isDark ? '#a3a3a3' : '#737373'}">To</label>
							<input 
								id="filter-date-to"
								type="date" 
								bind:value={dateTo}
								class="w-full px-1 sm:px-2 py-2 rounded-lg text-xs"
								style="background: {isDark ? '#0a0a0a' : '#f9f6f1'}; border: 1px solid {isDark ? '#2a2a2a' : '#d4cfc5'}; color: {isDark ? '#ffffff' : '#171717'}"
							/>
						</div>
					</div>
						
						<!-- Filter Actions -->
						<div class="flex gap-2 pt-2">
							<button 
								onclick={applyFilters}
								class="flex-1 px-3 py-2 rounded-lg text-sm font-medium text-white"
								style="background: linear-gradient(135deg, #388E3C, #2E7D32)"
							>
								Apply
							</button>
							<button 
								onclick={clearFilters}
								class="px-3 py-2 rounded-lg text-sm"
								style="background: {isDark ? '#262626' : '#f5f0e8'}; color: {isDark ? '#a3a3a3' : '#737373'}"
							>
								Clear
							</button>
						</div>
					</div>
				</div>

				<!-- Category Stats (visible on desktop) -->
				{#if categoryStats.length > 0 && !loading}
					<div class="hidden lg:block rounded-xl p-4" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
						<h3 class="font-display font-semibold mb-3 text-sm" style="color: {isDark ? '#ffffff' : '#171717'}">
							This Page
						</h3>
						<div class="space-y-2">
							{#each categoryStats.slice(0, 6) as stat}
								<button 
									onclick={() => { categoryFilter = stat.category; applyFilters(); }}
									class="w-full flex items-center justify-between text-xs p-2 rounded-lg transition-colors hover:bg-sw-accent/10"
									style="background: {categoryFilter === stat.category ? 'rgba(56,142,60,0.1)' : 'transparent'}"
								>
									<span style="color: {isDark ? '#ffffff' : '#171717'}">{stat.category}</span>
									<span class="font-mono" style="color: {isDark ? '#a3a3a3' : '#737373'}">{formatCurrency(stat.total)}</span>
								</button>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Quick Links -->
				<div class="rounded-xl p-4" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
					<h3 class="font-display font-semibold mb-3 text-sm" style="color: {isDark ? '#ffffff' : '#171717'}">
						Quick Links
					</h3>
					<div class="space-y-2">
						<a href="/imports" class="flex items-center gap-2 text-sm p-2 rounded-lg transition-colors hover:bg-sw-accent/10" style="color: {isDark ? '#a3a3a3' : '#737373'}">
							<i class="fa-solid fa-upload text-sw-accent"></i>
							Import Transactions
						</a>
						<a href="/budgets" class="flex items-center gap-2 text-sm p-2 rounded-lg transition-colors hover:bg-sw-accent/10" style="color: {isDark ? '#a3a3a3' : '#737373'}">
							<i class="fa-solid fa-wallet text-sw-accent"></i>
							Manage Budgets
						</a>
					</div>
				</div>
			</div>

			<!-- Main Content - Transaction List -->
			<div class="lg:col-span-3">
				<!-- Summary Bar -->
				<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
					<div class="flex items-center gap-4">
						{#if selectedIds.size > 0}
							<div class="flex items-center gap-3">
								<button 
									onclick={clearSelection}
									class="p-1.5 rounded-lg transition-colors hover:bg-sw-accent/10"
									style="color: {isDark ? '#a3a3a3' : '#737373'}"
									title="Clear selection"
								>
									<i class="fa-solid fa-xmark"></i>
								</button>
								<p class="text-sm font-medium text-sw-accent">
									{selectedIds.size} selected
								</p>
							</div>
						{:else}
							<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">
								{#if loading}
									Loading...
								{:else}
									<span class="font-semibold" style="color: {isDark ? '#ffffff' : '#171717'}">{total}</span> transactions
								{/if}
							</p>
						{/if}
					</div>
					
					<!-- Sort Controls -->
					<div class="flex items-center gap-2">
						<span class="text-xs" style="color: {isDark ? '#737373' : '#9ca3af'}">Sort by:</span>
						<button 
							onclick={() => toggleSort('date')}
							class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
							style="background: {sortBy === 'date' ? 'rgba(56,142,60,0.15)' : (isDark ? '#262626' : '#f5f0e8')}; color: {sortBy === 'date' ? '#388E3C' : (isDark ? '#a3a3a3' : '#737373')}"
						>
							Date {#if sortBy === 'date'}<i class="fa-solid fa-arrow-{sortOrder === 'desc' ? 'down' : 'up'} ml-1 text-[10px]"></i>{/if}
						</button>
						<button 
							onclick={() => toggleSort('amount')}
							class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
							style="background: {sortBy === 'amount' ? 'rgba(56,142,60,0.15)' : (isDark ? '#262626' : '#f5f0e8')}; color: {sortBy === 'amount' ? '#388E3C' : (isDark ? '#a3a3a3' : '#737373')}"
						>
							Amount {#if sortBy === 'amount'}<i class="fa-solid fa-arrow-{sortOrder === 'desc' ? 'down' : 'up'} ml-1 text-[10px]"></i>{/if}
						</button>
					</div>
				</div>

				<!-- Transaction List -->
				<div class="rounded-xl overflow-hidden" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
					{#if loading}
						<div class="p-12 text-center">
							<div class="w-8 h-8 rounded-full border-2 border-sw-accent border-t-transparent animate-spin mx-auto mb-3"></div>
							<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">Loading transactions...</p>
						</div>
					{:else if transactions.length === 0}
						<div class="p-12 text-center">
							<i class="fa-solid fa-receipt text-3xl mb-3" style="color: {isDark ? '#404040' : '#d4d4d4'}"></i>
							<p class="font-medium mb-1" style="color: {isDark ? '#ffffff' : '#171717'}">No transactions found</p>
							<p class="text-sm mb-4" style="color: {isDark ? '#a3a3a3' : '#737373'}">
								{search || categoryFilter || dateFrom || dateTo ? 'Try adjusting your filters' : 'Import some transactions to get started'}
							</p>
							{#if !search && !categoryFilter}
								<a href="/imports" class="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white" style="background: linear-gradient(135deg, #388E3C, #2E7D32)">
									<i class="fa-solid fa-upload"></i>
									Import Transactions
								</a>
							{/if}
						</div>
					{:else}
						<!-- Select All Header -->
						<div class="px-4 py-2 flex items-center gap-3 border-b" style="background: {isDark ? 'rgba(10,10,10,0.5)' : '#f9f6f1'}; border-color: {isDark ? '#2a2a2a' : '#e5e5e5'}">
							<label class="flex items-center cursor-pointer">
								<input 
									type="checkbox" 
									checked={allSelected}
									indeterminate={someSelected}
									onchange={toggleSelectAll}
									class="w-4 h-4 rounded accent-sw-accent cursor-pointer"
								/>
							</label>
							<span class="text-xs" style="color: {isDark ? '#737373' : '#9ca3af'}">
								{allSelected ? 'Deselect all' : 'Select all'}
							</span>
						</div>

						<div class="divide-y" style="border-color: {isDark ? '#2a2a2a' : '#f0f0f0'}">
							{#each transactions as tx}
								<div 
									class="p-4 flex items-center gap-4 transition-colors hover:bg-sw-accent/5"
									style="background: {selectedIds.has(tx.id) ? (isDark ? 'rgba(56,142,60,0.1)' : 'rgba(56,142,60,0.05)') : 'transparent'}"
								>
									<!-- Checkbox -->
									<label class="flex-shrink-0 cursor-pointer">
										<input 
											type="checkbox" 
											checked={selectedIds.has(tx.id)}
											onchange={() => toggleSelect(tx.id)}
											class="w-4 h-4 rounded accent-sw-accent cursor-pointer"
										/>
									</label>

									<!-- Date -->
									<div class="w-14 text-center flex-shrink-0">
										<p class="text-xs font-medium" style="color: {isDark ? '#ffffff' : '#171717'}">
											{formatShortDate(tx.date)}
										</p>
										<p class="text-[10px]" style="color: {isDark ? '#737373' : '#9ca3af'}">
											{new Date(tx.date + 'T00:00:00').getFullYear()}
										</p>
									</div>
									
									<!-- Details -->
									<div class="flex-1 min-w-0">
										<div class="flex items-center gap-2 mb-0.5">
											<p class="font-medium text-sm truncate" style="color: {isDark ? '#ffffff' : '#171717'}">
												{tx.merchant || 'Unknown'}
											</p>
										</div>
										<div class="flex items-center gap-2">
											{#if tx.category}
												<span class="text-[10px] px-2 py-0.5 rounded-full" style="background: {isDark ? '#262626' : '#f5f0e8'}; color: {isDark ? '#a3a3a3' : '#737373'}">
													{tx.subcategory ? `${tx.category} › ${tx.subcategory}` : tx.category}
												</span>
											{/if}
											{#if tx.description}
												<span class="text-[10px] truncate hidden sm:inline" style="color: {isDark ? '#525252' : '#a3a3a3'}">
													{tx.description.slice(0, 30)}{tx.description.length > 30 ? '...' : ''}
												</span>
											{/if}
										</div>
									</div>
									
									<!-- Amount & Growth -->
									<div class="text-right flex-shrink-0">
										<p class="font-mono font-medium text-sm" style="color: {isDark ? '#ffffff' : '#171717'}">
											{formatCurrency(Math.abs(tx.amount))}
										</p>
										{#if tx.growth_delta && tx.growth_delta > 0}
											<p class="text-[10px] text-sw-accent">
												+{formatCurrency(tx.growth_delta)}
											</p>
										{/if}
									</div>
									
									<!-- Actions -->
									<div class="flex items-center gap-1 flex-shrink-0">
										<button 
											onclick={() => openEditModal(tx)}
											class="p-2 rounded-lg transition-colors hover:bg-sw-accent/10"
											style="color: {isDark ? '#a3a3a3' : '#737373'}"
											title="Edit"
										>
											<i class="fa-solid fa-pen text-xs"></i>
										</button>
										<button 
											onclick={() => deleteTransaction(tx.id)}
											class="p-2 rounded-lg transition-colors hover:bg-red-500/10 hover:text-red-400"
											style="color: {isDark ? '#a3a3a3' : '#737373'}"
											title="Delete"
											disabled={deletingId === tx.id}
										>
											{#if deletingId === tx.id}
												<i class="fa-solid fa-spinner fa-spin text-xs"></i>
											{:else}
												<i class="fa-solid fa-trash text-xs"></i>
											{/if}
										</button>
									</div>
								</div>
							{/each}
						</div>

						<!-- Pagination -->
						{#if totalPages > 1}
							<div class="px-4 py-3 flex items-center justify-between" style="background: {isDark ? 'rgba(10,10,10,0.5)' : '#f9f6f1'}; border-top: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
								<p class="text-xs" style="color: {isDark ? '#a3a3a3' : '#737373'}">
									Page {page} of {totalPages}
								</p>
								<div class="flex items-center gap-2">
									<button 
										onclick={() => { page--; loadTransactions(); }}
										disabled={page <= 1}
										class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
										style="background: {isDark ? '#262626' : '#ffffff'}; color: {isDark ? '#ffffff' : '#171717'}; border: 1px solid {isDark ? '#3a3a3a' : '#d4cfc5'}"
									>
										<i class="fa-solid fa-chevron-left mr-1"></i> Prev
									</button>
									<button 
										onclick={() => { page++; loadTransactions(); }}
										disabled={page >= totalPages}
										class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
										style="background: {isDark ? '#262626' : '#ffffff'}; color: {isDark ? '#ffffff' : '#171717'}; border: 1px solid {isDark ? '#3a3a3a' : '#d4cfc5'}"
									>
										Next <i class="fa-solid fa-chevron-right ml-1"></i>
									</button>
								</div>
							</div>
						{/if}
					{/if}
				</div>
			</div>
		</div>
	</main>
</div>

<!-- Edit Transaction Modal -->
{#if editingTransaction}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(0,0,0,0.5);" onclick={() => editingTransaction = null}>
		<div 
			class="w-full max-w-md rounded-2xl p-6" 
			style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}"
			onclick={(e) => e.stopPropagation()}
		>
			<div class="flex items-center justify-between mb-4">
				<h3 class="font-display font-semibold text-lg" style="color: {isDark ? '#ffffff' : '#171717'}">
					Edit Transaction
				</h3>
				<button 
					onclick={() => editingTransaction = null}
					class="p-1.5 rounded-lg transition-colors"
					style="color: {isDark ? '#a3a3a3' : '#737373'}"
					aria-label="Close"
				>
					<i class="fa-solid fa-xmark"></i>
				</button>
			</div>
			
			<div class="space-y-4">
				<div>
					<label for="edit-merchant" class="block text-xs mb-1" style="color: {isDark ? '#a3a3a3' : '#737373'}">Merchant</label>
					<input 
						id="edit-merchant"
						type="text" 
						bind:value={editForm.merchant}
						class="w-full px-3 py-2 rounded-lg text-sm"
						style="background: {isDark ? '#0a0a0a' : '#f9f6f1'}; border: 1px solid {isDark ? '#2a2a2a' : '#d4cfc5'}; color: {isDark ? '#ffffff' : '#171717'}"
					/>
				</div>
				
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="edit-category" class="block text-xs mb-1" style="color: {isDark ? '#a3a3a3' : '#737373'}">Category</label>
						<select 
							id="edit-category"
							bind:value={editForm.category}
							onchange={() => editForm.subcategory = ''}
							class="w-full px-3 py-2 rounded-lg text-sm"
							style="background: {isDark ? '#0a0a0a' : '#f9f6f1'}; border: 1px solid {isDark ? '#2a2a2a' : '#d4cfc5'}; color: {isDark ? '#ffffff' : '#171717'}"
						>
							<option value="">Select category...</option>
							{#each CATEGORIES as cat}
								<option value={cat}>{cat}</option>
							{/each}
						</select>
					</div>
					<div>
						<label for="edit-subcategory" class="block text-xs mb-1" style="color: {isDark ? '#a3a3a3' : '#737373'}">Subcategory</label>
						<select 
							id="edit-subcategory"
							bind:value={editForm.subcategory}
							disabled={!editForm.category || editSubcategories.length === 0}
							class="w-full px-3 py-2 rounded-lg text-sm disabled:opacity-50"
							style="background: {isDark ? '#0a0a0a' : '#f9f6f1'}; border: 1px solid {isDark ? '#2a2a2a' : '#d4cfc5'}; color: {isDark ? '#ffffff' : '#171717'}"
						>
							<option value="">None</option>
							{#each editSubcategories as sub}
								<option value={sub}>{sub}</option>
							{/each}
						</select>
					</div>
				</div>
				
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="edit-amount" class="block text-xs mb-1" style="color: {isDark ? '#a3a3a3' : '#737373'}">Amount ($)</label>
						<input 
							id="edit-amount"
							type="number" 
							step="0.01"
							min="0"
							bind:value={editForm.amount}
							class="w-full px-3 py-2 rounded-lg text-sm"
							style="background: {isDark ? '#0a0a0a' : '#f9f6f1'}; border: 1px solid {isDark ? '#2a2a2a' : '#d4cfc5'}; color: {isDark ? '#ffffff' : '#171717'}"
						/>
					</div>
					<div>
						<label for="edit-date" class="block text-xs mb-1" style="color: {isDark ? '#a3a3a3' : '#737373'}">Date</label>
						<input 
							id="edit-date"
							type="date" 
							bind:value={editForm.date}
							class="w-full px-3 py-2 rounded-lg text-sm"
							style="background: {isDark ? '#0a0a0a' : '#f9f6f1'}; border: 1px solid {isDark ? '#2a2a2a' : '#d4cfc5'}; color: {isDark ? '#ffffff' : '#171717'}"
						/>
					</div>
				</div>
				
				<div>
					<label for="edit-description" class="block text-xs mb-1" style="color: {isDark ? '#a3a3a3' : '#737373'}">Description</label>
					<input 
						id="edit-description"
						type="text" 
						bind:value={editForm.description}
						class="w-full px-3 py-2 rounded-lg text-sm"
						style="background: {isDark ? '#0a0a0a' : '#f9f6f1'}; border: 1px solid {isDark ? '#2a2a2a' : '#d4cfc5'}; color: {isDark ? '#ffffff' : '#171717'}"
					/>
				</div>
				
				{#if editError}
					<p class="text-sm text-red-500">{editError}</p>
				{/if}
				
				<div class="flex gap-3 pt-2">
					<button 
						onclick={() => editingTransaction = null}
						class="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium"
						style="background: {isDark ? '#262626' : '#f5f0e8'}; color: {isDark ? '#ffffff' : '#171717'}"
					>
						Cancel
					</button>
					<button 
						onclick={saveTransaction}
						disabled={editSaving || !editForm.amount}
						class="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-50"
						style="background: linear-gradient(135deg, #388E3C, #2E7D32)"
					>
						{#if editSaving}
							<i class="fa-solid fa-spinner fa-spin mr-2"></i>
						{/if}
						Save
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Floating Action Bar for Multi-Select -->
{#if selectedIds.size > 0}
	<div class="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
		<div class="flex items-center gap-2 pr-3 border-r" style="border-color: {isDark ? '#3a3a3a' : '#e5e5e5'}">
			<div class="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold" style="background: linear-gradient(135deg, #388E3C, #2E7D32)">
				{selectedIds.size}
			</div>
			<span class="text-sm font-medium hidden sm:inline" style="color: {isDark ? '#ffffff' : '#171717'}">selected</span>
		</div>
		
		<button 
			onclick={() => { bulkCategory = ''; showBulkModal = true; }}
			class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all hover:scale-105"
			style="background: linear-gradient(135deg, #388E3C, #2E7D32)"
		>
			<i class="fa-solid fa-tag"></i>
			<span class="hidden sm:inline">Categorize</span>
		</button>
		
		<button 
			onclick={clearSelection}
			class="p-2 rounded-lg transition-colors hover:bg-sw-accent/10"
			style="color: {isDark ? '#a3a3a3' : '#737373'}"
			title="Clear selection"
		>
			<i class="fa-solid fa-xmark"></i>
		</button>
	</div>
{/if}

<!-- Bulk Categorize Modal -->
{#if showBulkModal}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(0,0,0,0.5);" onclick={() => showBulkModal = false}>
		<div 
			class="w-full max-w-md rounded-2xl p-6" 
			style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}"
			onclick={(e) => e.stopPropagation()}
		>
			<div class="flex items-center gap-3 mb-4">
				<div class="w-12 h-12 rounded-xl bg-green-600 flex items-center justify-center">
					<i class="fa-solid fa-tags text-xl text-white"></i>
				</div>
				<div>
					<h3 class="font-display font-semibold text-lg" style="color: {isDark ? '#ffffff' : '#171717'}">
						Bulk Categorize
					</h3>
					<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">
						{selectedIds.size} transaction{selectedIds.size !== 1 ? 's' : ''} selected
					</p>
				</div>
			</div>
			
			<!-- Preview of selected transactions -->
			{#if selectedTransactions.length > 0}
				<div class="rounded-xl p-3 mb-4 max-h-32 overflow-y-auto" style="background: {isDark ? '#0a0a0a' : '#f9f6f1'}; border: 1px solid {isDark ? '#2a2a2a' : '#d4cfc5'}">
					<div class="space-y-1">
						{#each selectedTransactions.slice(0, 5) as tx}
							<div class="flex items-center justify-between text-xs">
								<span class="truncate" style="color: {isDark ? '#ffffff' : '#171717'}">{tx.merchant || 'Unknown'}</span>
								<span class="font-mono ml-2" style="color: {isDark ? '#a3a3a3' : '#737373'}">{formatCurrency(Math.abs(tx.amount))}</span>
							</div>
						{/each}
						{#if selectedTransactions.length > 5}
							<p class="text-[10px] text-center pt-1" style="color: {isDark ? '#525252' : '#9ca3af'}">
								+{selectedTransactions.length - 5} more
							</p>
						{/if}
					</div>
				</div>
			{/if}
			
			<div class="space-y-4">
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="bulk-category" class="block text-xs mb-1" style="color: {isDark ? '#a3a3a3' : '#737373'}">Category</label>
						<select 
							id="bulk-category"
							bind:value={bulkCategory}
							onchange={() => bulkSubcategory = ''}
							class="w-full px-3 py-2 rounded-lg text-sm"
							style="background: {isDark ? '#0a0a0a' : '#f9f6f1'}; border: 1px solid {isDark ? '#2a2a2a' : '#d4cfc5'}; color: {isDark ? '#ffffff' : '#171717'}"
						>
							<option value="">Select category...</option>
							{#each CATEGORIES as cat}
								<option value={cat}>{cat}</option>
							{/each}
						</select>
					</div>
					<div>
						<label for="bulk-subcategory" class="block text-xs mb-1" style="color: {isDark ? '#a3a3a3' : '#737373'}">Subcategory</label>
						<select 
							id="bulk-subcategory"
							bind:value={bulkSubcategory}
							disabled={!bulkCategory || bulkSubcategories.length === 0}
							class="w-full px-3 py-2 rounded-lg text-sm disabled:opacity-50"
							style="background: {isDark ? '#0a0a0a' : '#f9f6f1'}; border: 1px solid {isDark ? '#2a2a2a' : '#d4cfc5'}; color: {isDark ? '#ffffff' : '#171717'}"
						>
							<option value="">None</option>
							{#each bulkSubcategories as sub}
								<option value={sub}>{sub}</option>
							{/each}
						</select>
					</div>
				</div>

				<!-- Unique merchants in selection -->
				{#if uniqueMerchants.length === 1}
					<label class="flex items-center gap-3 cursor-pointer">
						<input 
							type="checkbox" 
							bind:checked={bulkCreateRule}
							class="w-4 h-4 rounded accent-sw-accent"
						/>
						<span class="text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">
							Create rule for "{uniqueMerchants[0]}" (applies to future imports)
						</span>
					</label>
				{/if}
				
				<div class="flex gap-3 pt-2">
					<button 
						onclick={() => showBulkModal = false}
						class="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium"
						style="background: {isDark ? '#262626' : '#f5f0e8'}; color: {isDark ? '#ffffff' : '#171717'}"
					>
						Cancel
					</button>
					<button 
						onclick={bulkCategorize}
						disabled={bulkSaving || !bulkCategory}
						class="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-50"
						style="background: linear-gradient(135deg, #388E3C, #2E7D32)"
					>
						{#if bulkSaving}
							<i class="fa-solid fa-spinner fa-spin mr-2"></i>
						{/if}
						Apply to {selectedIds.size}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Apply to All Modal -->
{#if showApplyToAll}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(0,0,0,0.5);" onclick={dismissApplyToAll}>
		<div 
			class="w-full max-w-md rounded-2xl p-6" 
			style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}"
			onclick={(e) => e.stopPropagation()}
		>
			<div class="flex items-center gap-3 mb-4">
				<div class="w-12 h-12 rounded-xl bg-green-600 flex items-center justify-center">
					<i class="fa-solid fa-tags text-xl text-white"></i>
				</div>
				<div>
					<h3 class="font-display font-semibold text-lg" style="color: {isDark ? '#ffffff' : '#171717'}">
						Apply to all?
					</h3>
					<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">
						Found {applyToAllCount} more transaction{applyToAllCount !== 1 ? 's' : ''}
					</p>
				</div>
			</div>
			
			<div class="rounded-xl p-4 mb-4" style="background: {isDark ? '#0a0a0a' : '#f9f6f1'}; border: 1px solid {isDark ? '#2a2a2a' : '#d4cfc5'}">
				<p class="text-sm mb-2" style="color: {isDark ? '#a3a3a3' : '#737373'}">
					You categorized <span class="font-medium" style="color: {isDark ? '#ffffff' : '#171717'}">"{applyToAllMerchant}"</span> as:
				</p>
				<div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full" style="background: rgba(56,142,60,0.1); border: 1px solid rgba(56,142,60,0.3)">
					<i class="fa-solid fa-tag text-xs text-sw-accent"></i>
					<span class="text-sm font-medium text-sw-accent">{applyToAllCategory}</span>
				</div>
			</div>

			<p class="text-sm mb-4" style="color: {isDark ? '#a3a3a3' : '#737373'}">
				Would you like to update all <span class="font-semibold" style="color: {isDark ? '#ffffff' : '#171717'}">{applyToAllCount}</span> other transaction{applyToAllCount !== 1 ? 's' : ''} from this merchant to <span class="font-semibold text-sw-accent">{applyToAllCategory}</span>?
			</p>

			<label class="flex items-center gap-3 mb-5 cursor-pointer">
				<input 
					type="checkbox" 
					bind:checked={createRuleChecked}
					class="w-4 h-4 rounded accent-sw-accent"
				/>
				<span class="text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">
					Also create a rule for future imports
				</span>
			</label>
			
			<div class="flex gap-3">
				<button 
					onclick={dismissApplyToAll}
					class="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium"
					style="background: {isDark ? '#262626' : '#f5f0e8'}; color: {isDark ? '#ffffff' : '#171717'}"
				>
					No, just this one
				</button>
				<button 
					onclick={applyToAllTransactions}
					disabled={applyingToAll}
					class="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-50"
					style="background: linear-gradient(135deg, #388E3C, #2E7D32)"
				>
					{#if applyingToAll}
						<i class="fa-solid fa-spinner fa-spin mr-2"></i>
					{/if}
					Yes, apply to all
				</button>
			</div>
		</div>
	</div>
{/if}
