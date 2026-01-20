<script lang="ts">
	import { goto } from '$app/navigation';
	import type { ImportBatch, BatchSummary } from '$lib/types';

	let { data } = $props();

	let batches = $state<ImportBatch[]>([]);
	let loading = $state(true);
	let uploading = $state(false);
	let uploadError = $state<string | null>(null);
	let dragOver = $state(false);

	$effect(() => {
		loadBatches();
	});

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
				uploadError = json.error || 'Upload failed';
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
	<!-- Header -->
	<header class="border-b border-sw-border/50 bg-sw-bg/80 backdrop-blur-sm sticky top-0 z-40">
		<div class="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
			<div class="flex items-center gap-4">
				<a href="/dashboard" class="flex items-center gap-3">
					<div class="w-10 h-10 rounded-xl bg-gradient-to-br from-sw-accent to-emerald-600 flex items-center justify-center text-sw-bg font-bold text-xl">
						$
					</div>
					<span class="font-display text-xl font-semibold">SpentWorth</span>
				</a>
			</div>
			<nav class="flex items-center gap-6">
				<a href="/dashboard" class="text-sw-text-dim hover:text-sw-text transition-colors">Dashboard</a>
				<a href="/imports" class="text-sw-accent font-medium">Imports</a>
				<a href="/settings" class="text-sw-text-dim hover:text-sw-text transition-colors">Settings</a>
			</nav>
		</div>
	</header>

	<main class="max-w-7xl mx-auto px-6 py-8">
		<div class="mb-8">
			<h1 class="font-display text-3xl font-bold mb-2">Import History</h1>
			<p class="text-sw-text-dim">Upload bank statements and review your transaction imports</p>
		</div>

		<!-- Upload area -->
		<div
			class="card mb-8 border-2 border-dashed transition-colors cursor-pointer {dragOver ? 'border-sw-accent bg-sw-accent/5' : 'border-sw-border hover:border-sw-text-dim'}"
			ondrop={handleDrop}
			ondragover={handleDragOver}
			ondragleave={handleDragLeave}
			role="button"
			tabindex="0"
		>
			<label class="flex flex-col items-center justify-center py-12 cursor-pointer">
				<input
					type="file"
					accept=".csv"
					class="hidden"
					onchange={handleFileSelect}
					disabled={uploading}
				/>
				
				{#if uploading}
					<div class="w-12 h-12 rounded-full border-2 border-sw-accent border-t-transparent animate-spin mb-4"></div>
					<p class="text-sw-text-dim">Processing your file...</p>
				{:else}
					<svg xmlns="http://www.w3.org/2000/svg" class="w-12 h-12 text-sw-text-dim mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
					</svg>
					<p class="font-medium mb-1">Drop your CSV file here</p>
					<p class="text-sm text-sw-text-dim">or click to browse</p>
				{/if}
			</label>
		</div>

		{#if uploadError}
			<div class="p-4 rounded-lg bg-sw-danger/10 border border-sw-danger/30 text-sw-danger mb-6">
				{uploadError}
			</div>
		{/if}

		<!-- Batches list -->
		{#if loading}
			<div class="flex items-center justify-center py-16">
				<div class="w-8 h-8 rounded-full border-2 border-sw-accent border-t-transparent animate-spin"></div>
			</div>
		{:else if batches.length === 0}
			<div class="text-center py-16 text-sw-text-dim">
				<p>No imports yet. Upload a CSV file to get started.</p>
			</div>
		{:else}
			<div class="space-y-4">
				{#each batches as batch}
					<div class="card flex items-center justify-between">
						<div class="flex items-center gap-4">
							<div class="w-12 h-12 rounded-lg bg-sw-surface flex items-center justify-center">
								<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-sw-text-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
								</svg>
							</div>
							<div>
								<h3 class="font-medium">{batch.originalFilename || batch.sourceName || 'Import'}</h3>
								<p class="text-sm text-sw-text-dim">
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
								<p class="text-xs text-sw-text-dim">{batch.rowsIncluded} transactions</p>
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
									class="p-2 rounded-lg text-sw-text-dim hover:text-sw-danger hover:bg-sw-danger/10 transition-colors"
								>
									<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
									</svg>
								</button>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</main>
</div>
