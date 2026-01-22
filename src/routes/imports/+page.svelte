<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import type { ImportBatch, BatchSummary } from '$lib/types';
	import Header from '$lib/components/Header.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import { initTheme, getTheme, setTheme } from '$lib/stores/theme';

	let { data } = $props();
	let isDark = $state(false);

	let batches = $state<ImportBatch[]>([]);
	let loading = $state(true);
	let uploading = $state(false);
	let uploadError = $state<string | null>(null);
	let dragOver = $state(false);
	let showFormatHelp = $state(false);
	
	// Tier usage info
	let tierUsage = $state<{
		plan: 'free' | 'pro';
		isProActive: boolean;
		imports: { used: number; limit: number | null };
	} | null>(null);

	onMount(async () => {
		initTheme();
		isDark = getTheme() === 'dark';
		
		// Check Pro status for dark mode
		await loadTierUsage();
		
		// If not Pro and dark mode is on, reset to light
		if (tierUsage && !tierUsage.isProActive && isDark) {
			setTheme('light');
			isDark = false;
		}
	});

	$effect(() => {
		loadBatches();
	});

	async function loadTierUsage() {
		try {
			const res = await fetch('/api/tier');
			const json = await res.json();
			if (json.ok) {
				tierUsage = json.data;
			}
		} catch (err) {
			console.error('Failed to load tier usage:', err);
		}
	}

	async function loadBatches() {
		loading = true;
		const res = await fetch('/api/imports');
		const json = await res.json();
		if (json.ok) {
			batches = json.data.batches;
		}
		loading = false;
	}

	async function handleFileUpload(file: File) {
		// Check if user has reached their import limit
		if (tierUsage && tierUsage.imports.limit !== null && tierUsage.imports.used >= tierUsage.imports.limit) {
			uploadError = `You've used all ${tierUsage.imports.limit} imports this month. Upgrade to Pro for unlimited imports.`;
			return;
		}

		uploading = true;
		uploadError = null;

		const formData = new FormData();
		formData.append('file', file);
		formData.append('sourceName', file.name);

		try {
			const res = await fetch('/api/imports/create', {
				method: 'POST',
				body: formData
			});

			const json = await res.json();

			if (json.ok) {
				goto(`/imports/${json.data.batchId}`);
			} else {
				// Handle tier limit error with upgrade prompt
				if (res.status === 403) {
					uploadError = json.message || 'Import limit reached. Upgrade to Pro for unlimited imports.';
				} else {
					uploadError = json.error || json.message || 'Upload failed';
				}
			}
		} catch (err) {
			uploadError = 'Upload failed. Please try again.';
		}

		uploading = false;
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		dragOver = false;

		const files = e.dataTransfer?.files;
		if (files && files.length > 0) {
			handleFileUpload(files[0]);
		}
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		dragOver = true;
	}

	function handleDragLeave() {
		dragOver = false;
	}

	function handleFileSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		if (input.files && input.files.length > 0) {
			handleFileUpload(input.files[0]);
		}
	}

	async function deleteBatch(batchId: string) {
		if (!confirm('Are you sure you want to delete this import?')) return;

		await fetch(`/api/imports/${batchId}`, { method: 'DELETE' });
		loadBatches();
	}

	function formatDate(dateStr: string) {
		return new Date(dateStr).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	function formatCurrency(amount: number) {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD'
		}).format(amount);
	}
</script>

<div class="min-h-screen">
	<Header />

	<main class="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
		<div class="mb-6 sm:mb-8">
			<h1 class="font-display text-2xl sm:text-3xl font-bold mb-1 sm:mb-2" style="color: {isDark ? '#ffffff' : '#171717'}">Import History</h1>
			<p class="text-sm sm:text-base" style="color: {isDark ? '#a3a3a3' : '#737373'}">Upload statements and review imports</p>
		</div>

		<!-- Tier usage banner for free users -->
		{#if tierUsage && tierUsage.imports.limit !== null}
			{@const remaining = tierUsage.imports.limit - tierUsage.imports.used}
			{@const isAtLimit = remaining <= 0}
			<div 
				class="rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
				style="background: {isAtLimit ? 'rgba(239,68,68,0.1)' : 'rgba(13,148,136,0.1)'}; border: 1px solid {isAtLimit ? 'rgba(239,68,68,0.3)' : 'rgba(13,148,136,0.3)'};"
			>
				<div class="flex items-center gap-3">
					<div class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style="background: {isAtLimit ? 'rgba(239,68,68,0.2)' : 'rgba(13,148,136,0.2)'}">
						<i class="fa-solid {isAtLimit ? 'fa-triangle-exclamation' : 'fa-file-import'} text-sm" style="color: {isAtLimit ? '#ef4444' : '#0d9488'}"></i>
					</div>
					<div>
						<p class="font-medium text-sm" style="color: {isDark ? '#ffffff' : '#171717'}">
							{#if isAtLimit}
								Import limit reached
							{:else}
								{remaining} import{remaining !== 1 ? 's' : ''} remaining this month
							{/if}
						</p>
						<p class="text-xs" style="color: {isDark ? '#a3a3a3' : '#737373'}">
							Free plan: {tierUsage.imports.used}/{tierUsage.imports.limit} used
						</p>
					</div>
				</div>
				<a href="/pricing" class="btn {isAtLimit ? 'btn-primary' : 'btn-secondary'} text-xs sm:text-sm whitespace-nowrap">
					{isAtLimit ? 'Upgrade to Pro' : 'Get Unlimited'}
				</a>
			</div>
		{/if}

		<!-- Upload area -->
		<div
			class="rounded-2xl mb-6 sm:mb-8 border-2 border-dashed transition-colors cursor-pointer p-4 sm:p-6 active:scale-[0.99] touch-action-manipulation"
			style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border-color: {dragOver ? '#0d9488' : (isDark ? '#2a2a2a' : '#d4cfc5')}; {dragOver ? 'background: rgba(13,148,136,0.05);' : ''}"
			ondrop={handleDrop}
			ondragover={handleDragOver}
			ondragleave={handleDragLeave}
			role="button"
			tabindex="0"
		>
			<label class="flex flex-col items-center justify-center py-8 sm:py-12 cursor-pointer min-h-[120px]">
				<input
					type="file"
					accept=".csv"
					class="hidden"
					onchange={handleFileSelect}
					disabled={uploading}
				/>
				
				{#if uploading}
					<div class="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-sw-accent border-t-transparent animate-spin mb-3 sm:mb-4"></div>
					<p class="text-sm sm:text-base" style="color: {isDark ? '#a3a3a3' : '#737373'}">Processing...</p>
				{:else}
					<svg xmlns="http://www.w3.org/2000/svg" class="w-10 h-10 sm:w-12 sm:h-12 mb-3 sm:mb-4" style="color: {isDark ? '#a3a3a3' : '#737373'}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
					</svg>
					<p class="font-medium mb-1 text-sm sm:text-base" style="color: {isDark ? '#ffffff' : '#171717'}">Drop CSV file here</p>
					<p class="text-xs sm:text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">or tap to browse</p>
				{/if}
			</label>
		</div>

		<!-- CSV Format Help -->
		<div class="mb-4 sm:mb-6">
			<button
				onclick={() => showFormatHelp = !showFormatHelp}
				class="flex items-center gap-2 text-sm transition-colors hover:opacity-80"
				style="color: {isDark ? '#a3a3a3' : '#737373'}"
			>
				<i class="fa-solid fa-circle-question text-xs"></i>
				<span>Having trouble with your CSV?</span>
				<i class="fa-solid fa-chevron-{showFormatHelp ? 'up' : 'down'} text-xs ml-1"></i>
			</button>
			
			{#if showFormatHelp}
				<div 
					class="mt-3 p-4 rounded-xl text-sm"
					style="background: {isDark ? '#1a1a1a' : '#f5f0e8'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e0d5'}"
				>
					<h4 class="font-medium mb-3" style="color: {isDark ? '#ffffff' : '#171717'}">Supported CSV Formats</h4>
					
					<p class="mb-3" style="color: {isDark ? '#a3a3a3' : '#525252'}">
						We automatically detect columns from most bank exports. Your CSV should include:
					</p>
					
					<div class="grid gap-3 sm:grid-cols-3 mb-4">
						<div class="p-3 rounded-lg" style="background: {isDark ? '#262626' : '#ffffff'}">
							<p class="font-medium text-xs mb-1" style="color: {isDark ? '#ffffff' : '#171717'}">Date Column</p>
							<p class="text-xs" style="color: {isDark ? '#737373' : '#737373'}">
								date, transaction date, posting date, trans date
							</p>
						</div>
						<div class="p-3 rounded-lg" style="background: {isDark ? '#262626' : '#ffffff'}">
							<p class="font-medium text-xs mb-1" style="color: {isDark ? '#ffffff' : '#171717'}">Amount Column</p>
							<p class="text-xs" style="color: {isDark ? '#737373' : '#737373'}">
								amount, debit/credit (separate columns work too)
							</p>
						</div>
						<div class="p-3 rounded-lg" style="background: {isDark ? '#262626' : '#ffffff'}">
							<p class="font-medium text-xs mb-1" style="color: {isDark ? '#ffffff' : '#171717'}">Description Column</p>
							<p class="text-xs" style="color: {isDark ? '#737373' : '#737373'}">
								description, merchant, name, payee, memo
							</p>
						</div>
					</div>
					
					<div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 pt-3" style="border-top: 1px solid {isDark ? '#2a2a2a' : '#e5e0d5'}">
						<a 
							href="/spentworth-template.csv" 
							download="spentworth-template.csv"
							class="inline-flex items-center gap-2 text-sw-accent hover:underline"
						>
							<i class="fa-solid fa-download text-xs"></i>
							<span>Download template CSV</span>
						</a>
						<span class="text-xs" style="color: {isDark ? '#525252' : '#9ca3af'}">
							Use this for manual entry or as a reference format
						</span>
					</div>
				</div>
			{/if}
		</div>

		{#if uploadError}
			<div class="p-3 sm:p-4 rounded-lg mb-4 sm:mb-6 text-sm" style="background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); color: #ef4444;">
				{uploadError}
			</div>
		{/if}

		<!-- Batches list -->
		{#if loading}
			<div class="flex items-center justify-center py-12 sm:py-16">
				<div class="w-8 h-8 rounded-full border-2 border-sw-accent border-t-transparent animate-spin"></div>
			</div>
		{:else if batches.length === 0}
			<EmptyState 
				type="no-imports" 
				description="Your uploaded bank statements will appear here"
				actionLabel=""
			/>
		{:else}
			<div class="space-y-3 sm:space-y-4">
				{#each batches as batch}
					<div class="rounded-2xl p-3 sm:p-6" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}; box-shadow: {isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.06)'}">
						<!-- Mobile layout -->
						<div class="sm:hidden">
							<!-- Header row: icon, status badge, actions -->
							<div class="flex items-center justify-between mb-3">
								<div class="flex items-center gap-2">
									<div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style="background: {isDark ? '#262626' : '#f5f0e8'}">
										<i class="fa-solid fa-file-csv text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}"></i>
									</div>
									<span class="badge text-[10px] {batch.status === 'committed' ? 'badge-success' : 'badge-info'}">
										{batch.status === 'committed' ? 'Committed' : 'Pending'}
									</span>
								</div>
								<div class="flex items-center gap-1">
									{#if batch.status === 'parsed'}
										<a href="/imports/{batch.id}" class="btn btn-primary text-xs px-3 py-1.5">Review</a>
									{:else}
										<a href="/imports/{batch.id}" class="btn btn-secondary text-xs px-3 py-1.5">View</a>
									{/if}
									<button
										onclick={() => deleteBatch(batch.id)}
										class="p-1.5 rounded-lg transition-colors hover:bg-red-400/10"
										style="color: {isDark ? '#a3a3a3' : '#737373'}"
										aria-label="Delete import"
									>
										<i class="fa-solid fa-trash text-xs"></i>
									</button>
								</div>
							</div>
							
							<!-- Amount (prominent) -->
							<div class="mb-2">
								<span class="font-mono text-xl font-semibold text-sw-accent">{formatCurrency(batch.totalIncludedSpend)}</span>
								<span class="text-xs ml-2" style="color: {isDark ? '#737373' : '#9ca3af'}">{batch.rowsIncluded} transactions</span>
							</div>
							
							<!-- Date info -->
							<p class="text-xs" style="color: {isDark ? '#a3a3a3' : '#737373'}">
								Uploaded {formatDate(batch.uploadedAt)}
								{#if batch.dateMin && batch.dateMax}
									<br/>
									<span style="color: {isDark ? '#525252' : '#a3a3a3'}">Covers {formatDate(batch.dateMin)} – {formatDate(batch.dateMax)}</span>
								{/if}
							</p>
						</div>
						
						<!-- Desktop layout -->
						<div class="hidden sm:flex items-center justify-between">
							<div class="flex items-center gap-4">
								<div class="w-12 h-12 rounded-lg flex items-center justify-center" style="background: {isDark ? '#262626' : '#f5f0e8'}">
									<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" style="color: {isDark ? '#a3a3a3' : '#737373'}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
									</svg>
								</div>
								<div>
									<h3 class="font-medium" style="color: {isDark ? '#ffffff' : '#171717'}">{batch.originalFilename || batch.sourceName || 'Import'}</h3>
									<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">
										{formatDate(batch.uploadedAt)}
										{#if batch.dateMin && batch.dateMax}
											• {formatDate(batch.dateMin)} - {formatDate(batch.dateMax)}
										{/if}
									</p>
								</div>
							</div>

							<div class="flex items-center gap-6">
								<div class="text-right">
									<p class="font-mono font-medium text-sw-accent">{formatCurrency(batch.totalIncludedSpend)}</p>
									<p class="text-xs" style="color: {isDark ? '#737373' : '#9ca3af'}">{batch.rowsIncluded} transactions</p>
								</div>

								<span class="badge {batch.status === 'committed' ? 'badge-success' : 'badge-info'}">
									{batch.status === 'committed' ? 'Committed' : 'Pending'}
								</span>

								<div class="flex items-center gap-2">
									{#if batch.status === 'parsed'}
										<a href="/imports/{batch.id}" class="btn btn-primary text-sm">Review</a>
									{:else}
										<a href="/imports/{batch.id}" class="btn btn-secondary text-sm">View</a>
									{/if}
									<button
										onclick={() => deleteBatch(batch.id)}
										class="p-2 rounded-lg transition-colors hover:bg-red-400/10"
										style="color: {isDark ? '#a3a3a3' : '#737373'}"
										aria-label="Delete import"
									>
										<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
										</svg>
									</button>
								</div>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</main>
</div>
