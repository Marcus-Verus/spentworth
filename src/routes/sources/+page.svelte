<script lang="ts">
	import { onMount } from 'svelte';
	import Header from '$lib/components/Header.svelte';
	import { initTheme, getTheme } from '$lib/stores/theme';
	import type { UserSource } from '$lib/types';

	let isDark = $state(false);
	let loading = $state(true);
	let sources = $state<(UserSource & { daysSinceUpload: number | null; needsUpload: boolean })[]>([]);
	let saving = $state(false);

	// Add/Edit modal
	let showModal = $state(false);
	let editingSource = $state<UserSource | null>(null);
	let formName = $state('');
	let formType = $state<'bank' | 'credit_card' | 'investment' | 'other'>('bank');
	let formInstitution = $state('');
	let formReminderDays = $state(7);

	// Common institutions
	const institutions = [
		'Chase', 'Bank of America', 'Wells Fargo', 'Citi', 'Capital One',
		'American Express', 'Discover', 'US Bank', 'PNC', 'TD Bank',
		'Ally', 'Marcus', 'Fidelity', 'Vanguard', 'Charles Schwab',
		'Other'
	];

	onMount(async () => {
		initTheme();
		isDark = getTheme() === 'dark';
		await loadSources();
	});

	async function loadSources() {
		loading = true;
		try {
			const res = await fetch('/api/sources');
			const json = await res.json();
			if (json.ok) {
				sources = json.data;
			}
		} catch (e) {
			// Error handling - load failed silently
		}
		loading = false;
	}

	function openAddModal() {
		editingSource = null;
		formName = '';
		formType = 'bank';
		formInstitution = '';
		formReminderDays = 7;
		showModal = true;
	}

	function openEditModal(source: UserSource) {
		editingSource = source;
		formName = source.name;
		formType = source.sourceType;
		formInstitution = source.institution || '';
		formReminderDays = source.uploadReminderDays;
		showModal = true;
	}

	async function saveSource() {
		if (!formName.trim()) return;

		saving = true;
		try {
			if (editingSource) {
				// Update existing
				await fetch('/api/sources', {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						id: editingSource.id,
						name: formName,
						sourceType: formType,
						institution: formInstitution || null,
						uploadReminderDays: formReminderDays
					})
				});
			} else {
				// Create new
				await fetch('/api/sources', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						name: formName,
						sourceType: formType,
						institution: formInstitution || null,
						uploadReminderDays: formReminderDays
					})
				});
			}
			showModal = false;
			await loadSources();
		} catch (e) {
			// Error handling - save failed silently
		}
		saving = false;
	}

	async function deleteSource(id: string) {
		if (!confirm('Are you sure you want to remove this source?')) return;

		try {
			await fetch('/api/sources', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id })
			});
			await loadSources();
		} catch (e) {
			// Error handling - delete failed silently
		}
	}

	async function markUploaded(source: UserSource) {
		try {
			await fetch('/api/sources', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					id: source.id,
					lastUploadedAt: new Date().toISOString()
				})
			});
			await loadSources();
		} catch (e) {
			// Error handling - mark uploaded failed silently
		}
	}

	function getTypeIcon(type: string): string {
		switch (type) {
			case 'bank': return 'fa-building-columns';
			case 'credit_card': return 'fa-credit-card';
			case 'investment': return 'fa-chart-line';
			default: return 'fa-wallet';
		}
	}

	function getTypeLabel(type: string): string {
		switch (type) {
			case 'bank': return 'Bank Account';
			case 'credit_card': return 'Credit Card';
			case 'investment': return 'Investment';
			default: return 'Other';
		}
	}

	function formatLastUpload(dateStr: string | null): string {
		if (!dateStr) return 'Never';
		const date = new Date(dateStr);
		const now = new Date();
		const days = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
		
		if (days === 0) return 'Today';
		if (days === 1) return 'Yesterday';
		if (days < 7) return `${days} days ago`;
		if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}

	let sourcesNeedingUpload = $derived(sources.filter(s => s.needsUpload && s.enabled));
	let sourcesUpToDate = $derived(sources.filter(s => !s.needsUpload && s.enabled));
</script>

<div class="min-h-screen" style="background: {isDark ? '#0a0a0a' : '#f5f0e8'}">
	<Header />

	<main class="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
		<!-- Header -->
		<div class="flex items-center justify-between mb-6">
			<div>
				<h1 class="font-display text-2xl sm:text-3xl font-bold" style="color: {isDark ? '#ffffff' : '#171717'}">
					<i class="fa-solid fa-folder-open text-sw-accent mr-2"></i>My Sources
				</h1>
				<p class="text-sm mt-1" style="color: {isDark ? '#a3a3a3' : '#737373'}">
					Track your bank accounts and upload schedules
				</p>
			</div>
			<button
				onclick={openAddModal}
				class="px-4 py-2 rounded-xl font-semibold transition-all bg-sw-accent text-white hover:bg-sw-accent/90"
			>
				<i class="fa-solid fa-plus mr-1.5"></i>Add Source
			</button>
		</div>

		{#if loading}
			<div class="flex items-center justify-center py-16">
				<div class="w-8 h-8 rounded-full border-2 border-sw-accent border-t-transparent animate-spin"></div>
			</div>
		{:else if sources.length === 0}
			<!-- Empty State -->
			<div class="text-center py-12">
				<div class="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center" style="background: {isDark ? '#1a1a1a' : '#ffffff'}">
					<i class="fa-solid fa-building-columns text-3xl" style="color: {isDark ? '#404040' : '#d4d4d4'}"></i>
				</div>
				<h2 class="text-lg font-semibold mb-2" style="color: {isDark ? '#ffffff' : '#171717'}">No sources yet</h2>
				<p class="text-sm mb-6 max-w-md mx-auto" style="color: {isDark ? '#a3a3a3' : '#737373'}">
					Add your bank accounts and credit cards to track upload schedules and get reminders when it's time to refresh your data.
				</p>
				<button
					onclick={openAddModal}
					class="px-6 py-3 rounded-xl font-semibold transition-all bg-sw-accent text-white hover:bg-sw-accent/90"
				>
					<i class="fa-solid fa-plus mr-2"></i>Add Your First Source
				</button>
			</div>
		{:else}
			<!-- Sources Needing Upload -->
			{#if sourcesNeedingUpload.length > 0}
				<div class="mb-8">
					<h2 class="text-sm font-semibold mb-3 flex items-center gap-2" style="color: {isDark ? '#fbbf24' : '#d97706'}">
						<i class="fa-solid fa-clock"></i>
						Needs Upload ({sourcesNeedingUpload.length})
					</h2>
					<div class="space-y-3">
						{#each sourcesNeedingUpload as source (source.id)}
							<div 
								class="rounded-xl p-4 transition-all"
								style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 2px solid {isDark ? 'rgba(251,191,36,0.3)' : 'rgba(217,119,6,0.3)'}; box-shadow: {isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.04)'}"
							>
								<div class="flex items-center gap-4">
									<div 
										class="w-12 h-12 rounded-xl flex items-center justify-center"
										style="background: rgba(251,191,36,0.1)"
									>
										<i class="fa-solid {getTypeIcon(source.sourceType)} text-amber-500"></i>
									</div>
									<div class="flex-1 min-w-0">
										<p class="font-semibold truncate" style="color: {isDark ? '#ffffff' : '#171717'}">
											{source.name}
										</p>
										<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">
											{source.institution || getTypeLabel(source.sourceType)} · Last: {formatLastUpload(source.lastUploadedAt)}
										</p>
									</div>
									<div class="flex items-center gap-2">
										<a
											href="/imports"
											class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors bg-amber-500 text-white hover:bg-amber-600"
										>
											<i class="fa-solid fa-upload mr-1"></i>Upload
										</a>
										<button
											onclick={() => markUploaded(source)}
											class="p-2 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
											title="Mark as uploaded"
										>
											<i class="fa-solid fa-check" style="color: {isDark ? '#737373' : '#a3a3a3'}"></i>
										</button>
									</div>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Up to Date Sources -->
			{#if sourcesUpToDate.length > 0}
				<div>
					<h2 class="text-sm font-semibold mb-3 flex items-center gap-2" style="color: {isDark ? '#10b981' : '#059669'}">
						<i class="fa-solid fa-check-circle"></i>
						Up to Date ({sourcesUpToDate.length})
					</h2>
					<div class="space-y-3">
						{#each sourcesUpToDate as source (source.id)}
							<div 
								class="rounded-xl p-4 transition-all hover:scale-[1.01]"
								style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}; box-shadow: {isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.04)'}"
							>
								<div class="flex items-center gap-4">
									<div 
										class="w-12 h-12 rounded-xl flex items-center justify-center"
										style="background: {isDark ? '#0a0a0a' : '#f5f0e8'}"
									>
										<i class="fa-solid {getTypeIcon(source.sourceType)} text-sw-accent"></i>
									</div>
									<div class="flex-1 min-w-0">
										<p class="font-semibold truncate" style="color: {isDark ? '#ffffff' : '#171717'}">
											{source.name}
										</p>
										<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">
											{source.institution || getTypeLabel(source.sourceType)} · Last: {formatLastUpload(source.lastUploadedAt)}
										</p>
									</div>
									<div class="flex items-center gap-2">
										<button
											onclick={() => openEditModal(source)}
											class="p-2 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
											title="Edit"
										>
											<i class="fa-solid fa-pen" style="color: {isDark ? '#737373' : '#a3a3a3'}"></i>
										</button>
										<button
											onclick={() => deleteSource(source.id)}
											class="p-2 rounded-lg transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
											title="Delete"
										>
											<i class="fa-solid fa-trash text-red-500"></i>
										</button>
									</div>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		{/if}

		<!-- Tips Card -->
		<div 
			class="mt-8 rounded-xl p-6"
			style="background: {isDark ? '#1a1a1a' : '#f5f5f5'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}"
		>
			<h3 class="font-semibold mb-3 flex items-center gap-2" style="color: {isDark ? '#ffffff' : '#171717'}">
				<i class="fa-solid fa-lightbulb text-amber-500"></i>Tips for Easy Uploads
			</h3>
			<ul class="space-y-2 text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">
				<li><i class="fa-solid fa-check text-sw-accent mr-2"></i>Most banks let you download CSV from "Statements" or "Activity"</li>
				<li><i class="fa-solid fa-check text-sw-accent mr-2"></i>Set a weekly reminder to upload fresh data</li>
				<li><i class="fa-solid fa-check text-sw-accent mr-2"></i>SpentWorth auto-detects duplicates, so don't worry about overlap</li>
			</ul>
		</div>
	</main>

	<!-- Add/Edit Modal -->
	{#if showModal}
		<div class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(0,0,0,0.5)">
			<div 
				class="w-full max-w-md rounded-2xl p-6"
				style="background: {isDark ? '#1a1a1a' : '#ffffff'}"
			>
				<h3 class="font-display text-xl font-semibold mb-6" style="color: {isDark ? '#ffffff' : '#171717'}">
					{editingSource ? 'Edit Source' : 'Add Source'}
				</h3>

				<div class="space-y-4">
					<!-- Name -->
					<div>
						<label class="block text-sm font-medium mb-2" style="color: {isDark ? '#ffffff' : '#171717'}">
							Name
						</label>
						<input
							type="text"
							bind:value={formName}
							placeholder="e.g., Chase Checking"
							class="w-full px-4 py-2.5 rounded-lg text-sm"
							style="background: {isDark ? '#0a0a0a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#d4cfc5'}; color: {isDark ? '#ffffff' : '#171717'}"
						/>
					</div>

					<!-- Type -->
					<div>
						<label class="block text-sm font-medium mb-2" style="color: {isDark ? '#ffffff' : '#171717'}">
							Type
						</label>
						<div class="grid grid-cols-2 gap-2">
							{#each [['bank', 'Bank Account'], ['credit_card', 'Credit Card'], ['investment', 'Investment'], ['other', 'Other']] as [value, label]}
								<button
									onclick={() => formType = value as typeof formType}
									class="px-3 py-2 rounded-lg text-sm text-left transition-colors {formType === value ? 'ring-2 ring-sw-accent' : ''}"
									style="background: {formType === value ? 'rgba(13,148,136,0.1)' : (isDark ? '#0a0a0a' : '#f5f5f5')}; color: {isDark ? '#ffffff' : '#171717'}"
								>
									<i class="fa-solid {getTypeIcon(value)} mr-2 text-sw-accent"></i>{label}
								</button>
							{/each}
						</div>
					</div>

					<!-- Institution -->
					<div>
						<label class="block text-sm font-medium mb-2" style="color: {isDark ? '#ffffff' : '#171717'}">
							Institution (optional)
						</label>
						<select
							bind:value={formInstitution}
							class="w-full px-4 py-2.5 rounded-lg text-sm"
							style="background: {isDark ? '#0a0a0a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#d4cfc5'}; color: {isDark ? '#ffffff' : '#171717'}"
						>
							<option value="">Select institution...</option>
							{#each institutions as inst}
								<option value={inst}>{inst}</option>
							{/each}
						</select>
					</div>

					<!-- Reminder Days -->
					<div>
						<label class="block text-sm font-medium mb-2" style="color: {isDark ? '#ffffff' : '#171717'}">
							Remind me to upload every
						</label>
						<select
							bind:value={formReminderDays}
							class="w-full px-4 py-2.5 rounded-lg text-sm"
							style="background: {isDark ? '#0a0a0a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#d4cfc5'}; color: {isDark ? '#ffffff' : '#171717'}"
						>
							<option value={3}>3 days</option>
							<option value={7}>7 days (weekly)</option>
							<option value={14}>14 days (bi-weekly)</option>
							<option value={30}>30 days (monthly)</option>
						</select>
					</div>
				</div>

				<div class="flex gap-3 mt-6">
					<button
						onclick={() => showModal = false}
						class="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
						style="background: {isDark ? '#2a2a2a' : '#f5f0e8'}; color: {isDark ? '#ffffff' : '#171717'}"
					>
						Cancel
					</button>
					<button
						onclick={saveSource}
						disabled={saving || !formName.trim()}
						class="flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-colors bg-sw-accent text-white hover:bg-sw-accent/90 disabled:opacity-50"
					>
						{#if saving}
							<i class="fa-solid fa-spinner fa-spin mr-1"></i>
						{/if}
						{editingSource ? 'Save Changes' : 'Add Source'}
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>

