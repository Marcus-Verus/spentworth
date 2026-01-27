<script lang="ts">
	import type { SuggestedRule } from '$lib/types';

	interface Props {
		batchId: string;
		isDark?: boolean;
		onComplete?: () => void;
	}

	let { batchId, isDark = false, onComplete }: Props = $props();

	let loading = $state(true);
	let suggestions = $state<SuggestedRule[]>([]);
	let processingId = $state<string | null>(null);
	let currentIndex = $state(0);
	let dismissed = $state(false);

	$effect(() => {
		if (batchId) {
			generateSuggestions();
		}
	});

	async function generateSuggestions() {
		loading = true;
		try {
			// First, generate suggestions
			const genRes = await fetch('/api/rules/suggestions', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ batchId })
			});

			// Then fetch them
			const res = await fetch(`/api/rules/suggestions?batchId=${batchId}&status=pending`);
			const json = await res.json();
			if (json.ok) {
				suggestions = json.data;
			}
		} catch (e) {
			// Error handling - generate failed silently
		}
		loading = false;
	}

	async function acceptSuggestion(suggestion: SuggestedRule, applyToExisting = true) {
		processingId = suggestion.id;
		try {
			await fetch('/api/rules/suggestions', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action: 'accept',
					id: suggestion.id,
					applyToExisting
				})
			});
			
			// Move to next
			suggestions = suggestions.filter(s => s.id !== suggestion.id);
			if (currentIndex >= suggestions.length && suggestions.length > 0) {
				currentIndex = suggestions.length - 1;
			}
			
			if (suggestions.length === 0 && onComplete) {
				onComplete();
			}
		} catch (e) {
			// Error handling - accept failed silently
		}
		processingId = null;
	}

	async function rejectSuggestion(suggestion: SuggestedRule) {
		processingId = suggestion.id;
		try {
			await fetch('/api/rules/suggestions', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action: 'reject',
					id: suggestion.id
				})
			});
			
			suggestions = suggestions.filter(s => s.id !== suggestion.id);
			if (currentIndex >= suggestions.length && suggestions.length > 0) {
				currentIndex = suggestions.length - 1;
			}
			
			if (suggestions.length === 0 && onComplete) {
				onComplete();
			}
		} catch (e) {
			// Error handling - reject failed silently
		}
		processingId = null;
	}

	function skipAll() {
		dismissed = true;
		if (onComplete) onComplete();
	}

	function formatCurrency(amount: number): string {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		}).format(amount);
	}

	function getConfidenceLabel(confidence: number): string {
		if (confidence >= 0.9) return 'High confidence';
		if (confidence >= 0.7) return 'Good match';
		return 'Suggested';
	}

	function getConfidenceColor(confidence: number): string {
		if (confidence >= 0.9) return '#22c55e';
		if (confidence >= 0.7) return '#f59e0b';
		return isDark ? '#737373' : '#9ca3af';
	}
</script>

{#if !dismissed && !loading && suggestions.length > 0}
	{@const currentSuggestion = suggestions[currentIndex]}
	
	<!-- Guided Rules Modal/Banner -->
	<div 
		class="rounded-2xl overflow-hidden animate-fade-in"
		style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}; box-shadow: {isDark ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(0,0,0,0.08)'}"
	>
		<!-- Header -->
		<div 
			class="px-6 py-4 flex items-center gap-4"
			style="background: linear-gradient(135deg, rgba(139,92,246,0.1), rgba(139,92,246,0.05))"
		>
			<div class="w-12 h-12 rounded-xl bg-purple-500 flex items-center justify-center">
				<i class="fa-solid fa-wand-magic-sparkles text-white text-xl"></i>
			</div>
			<div class="flex-1">
				<h3 class="font-display text-lg font-semibold" style="color: {isDark ? '#ffffff' : '#171717'}">
					Quick Rules Setup
				</h3>
				<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">
					{suggestions.length} smart rule{suggestions.length > 1 ? 's' : ''} detected • One tap to apply
				</p>
			</div>
			<button
				onclick={skipAll}
				class="p-2 rounded-lg transition-colors hover:bg-purple-500/10"
				title="Skip all"
			>
				<i class="fa-solid fa-xmark" style="color: {isDark ? '#737373' : '#a3a3a3'}"></i>
			</button>
		</div>

		<!-- Progress dots -->
		{#if suggestions.length > 1}
			<div class="flex justify-center gap-1.5 py-3 border-b" style="border-color: {isDark ? '#262626' : '#f3f4f6'}">
				{#each suggestions as _, i}
					<div 
						class="w-2 h-2 rounded-full transition-all"
						style="background: {i === currentIndex ? '#8b5cf6' : (isDark ? '#3a3a3a' : '#e5e5e5')}; transform: {i === currentIndex ? 'scale(1.2)' : 'scale(1)'}"
					></div>
				{/each}
			</div>
		{/if}

		<!-- Current Suggestion -->
		<div class="p-6">
			<div class="mb-4">
				<!-- Confidence badge -->
				<div class="flex items-center gap-2 mb-3">
					<span 
						class="text-xs font-medium px-2 py-0.5 rounded-full"
						style="background: {getConfidenceColor(currentSuggestion.confidence)}20; color: {getConfidenceColor(currentSuggestion.confidence)}"
					>
						{getConfidenceLabel(currentSuggestion.confidence)}
					</span>
					<span class="text-xs" style="color: {isDark ? '#737373' : '#9ca3af'}">
						{currentSuggestion.affectedCount} transactions • {formatCurrency(currentSuggestion.affectedAmount)}
					</span>
				</div>

				<!-- Rule preview -->
				<div class="rounded-xl p-4 space-y-3" style="background: {isDark ? '#0f0f0f' : '#f9fafb'}">
					<!-- Match pattern -->
					<div>
						<p class="text-xs uppercase tracking-wide mb-1" style="color: {isDark ? '#525252' : '#9ca3af'}">
							When merchant contains
						</p>
						<p class="font-mono font-medium" style="color: {isDark ? '#ffffff' : '#171717'}">
							"{currentSuggestion.matchValue}"
						</p>
						{#if currentSuggestion.sampleMerchants.length > 0}
							<p class="text-xs mt-1" style="color: {isDark ? '#525252' : '#9ca3af'}">
								e.g., {currentSuggestion.sampleMerchants.slice(0, 2).join(', ')}
							</p>
						{/if}
					</div>

					<!-- Arrow -->
					<div class="flex justify-center">
						<i class="fa-solid fa-arrow-down" style="color: {isDark ? '#3a3a3a' : '#d4d4d4'}"></i>
					</div>

					<!-- Action -->
					<div>
						<p class="text-xs uppercase tracking-wide mb-1" style="color: {isDark ? '#525252' : '#9ca3af'}">
							Auto-categorize as
						</p>
						<div class="flex items-center gap-2">
							<span class="px-3 py-1.5 rounded-lg text-sm font-medium bg-purple-500/10 text-purple-500">
								{currentSuggestion.suggestedCategory || 'Uncategorized'}
							</span>
						</div>
					</div>
				</div>
			</div>

			<!-- Actions -->
			<div class="flex gap-3">
				<button
					onclick={() => rejectSuggestion(currentSuggestion)}
					disabled={processingId === currentSuggestion.id}
					class="flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
					style="background: {isDark ? '#262626' : '#f5f5f5'}; color: {isDark ? '#a3a3a3' : '#737373'}"
				>
					<i class="fa-solid fa-xmark mr-1"></i>
					Skip
				</button>
				<button
					onclick={() => acceptSuggestion(currentSuggestion, true)}
					disabled={processingId === currentSuggestion.id}
					class="flex-[2] px-4 py-3 rounded-xl text-sm font-semibold transition-all bg-purple-500 text-white hover:bg-purple-600 disabled:opacity-50"
				>
					{#if processingId === currentSuggestion.id}
						<i class="fa-solid fa-spinner fa-spin mr-1"></i>
					{:else}
						<i class="fa-solid fa-check mr-1"></i>
					{/if}
					Create Rule
				</button>
			</div>

			<!-- Skip all link -->
			<button
				onclick={skipAll}
				class="w-full mt-3 text-xs font-medium transition-colors"
				style="color: {isDark ? '#525252' : '#9ca3af'}"
			>
				Skip all and continue →
			</button>
		</div>
	</div>
{:else if loading}
	<div class="rounded-2xl p-8 flex items-center justify-center" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
		<div class="text-center">
			<div class="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin mx-auto mb-3"></div>
			<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">Analyzing your transactions...</p>
		</div>
	</div>
{/if}

<style>
	@keyframes fade-in {
		from { opacity: 0; transform: translateY(8px); }
		to { opacity: 1; transform: translateY(0); }
	}
	.animate-fade-in {
		animation: fade-in 0.3s ease-out;
	}
</style>

