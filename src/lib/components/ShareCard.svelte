<script lang="ts">
	import { PHILOSOPHY_PRESETS, type PhilosophyPreset } from '$lib/types';

	interface Props {
		year: number;
		projectionYear: number;
		totalSpent: number;
		projectedFutureValue: number;
		topCategories?: Array<{ name: string; spent: number; percentage: number }>;
		philosophy?: PhilosophyPreset;
		isDark?: boolean;
		onClose?: () => void;
	}

	let { 
		year, 
		projectionYear, 
		totalSpent, 
		projectedFutureValue, 
		topCategories = [],
		philosophy = 'comfortable_saver',
		isDark = false,
		onClose 
	}: Props = $props();

	let copying = $state(false);
	let copied = $state(false);
	let cardRef = $state<HTMLDivElement | null>(null);

	// Use $derived to react to philosophy changes
	const philosophyConfig = $derived(PHILOSOPHY_PRESETS[philosophy]);

	function formatCurrency(amount: number): string {
		if (amount >= 1000000) {
			return `$${(amount / 1000000).toFixed(1)}M`;
		}
		if (amount >= 1000) {
			return `$${(amount / 1000).toFixed(0)}K`;
		}
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		}).format(amount);
	}

	function formatFullCurrency(amount: number): string {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		}).format(amount);
	}

	function getGrowthMultiple(): string {
		const multiple = projectedFutureValue / totalSpent;
		return multiple.toFixed(1);
	}

	async function copyToClipboard() {
		copying = true;
		const text = `My ${year} spending of ${formatFullCurrency(totalSpent)} would be worth ${formatFullCurrency(projectedFutureValue)} in ${projectionYear} if invested! 📈\n\nTracked with SpentWorth`;
		
		try {
			await navigator.clipboard.writeText(text);
			copied = true;
			setTimeout(() => copied = false, 2000);
		} catch (e) {
			// Error handling - copy failed silently
		}
		copying = false;
	}

	async function downloadImage() {
		if (!cardRef) return;
		
		// Use html2canvas if available, otherwise fallback to screenshot instructions
		try {
			// Dynamic import for html2canvas
			const html2canvas = (await import('html2canvas')).default;
			const canvas = await html2canvas(cardRef, {
				backgroundColor: null,
				scale: 2,
				logging: false
			});
			
			const link = document.createElement('a');
			link.download = `spentworth-${year}-report.png`;
			link.href = canvas.toDataURL('image/png');
			link.click();
		} catch (e) {
			// Fallback: show instructions
			alert('To save this card, take a screenshot of the card area.');
		}
	}

	// Get gradient based on philosophy
	function getGradient(): string {
		switch (philosophy) {
			case 'aggressive_builder':
				return 'linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)';
			case 'debt_first':
				return 'linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #b91c1c 100%)';
			case 'family_budget':
				return 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 50%, #6d28d9 100%)';
			default: // comfortable_saver
				return 'linear-gradient(135deg, #22c55e 0%, #16a34a 50%, #15803d 100%)';
		}
	}
</script>

<!-- Modal Overlay -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div 
	class="fixed inset-0 z-50 flex items-center justify-center p-4"
	style="background: rgba(0,0,0,0.7); backdrop-filter: blur(4px)"
	onclick={onClose}
	role="button"
	tabindex="0"
	aria-label="Close share card"
	onkeydown={(e) => e.key === 'Escape' && onClose?.()}
>
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_interactive_supports_focus -->
	<div 
		class="w-full max-w-lg"
		onclick={(e) => e.stopPropagation()}
		role="dialog"
		aria-label="Share your spending report"
	>
		<!-- The Share Card -->
		<div 
			bind:this={cardRef}
			class="rounded-3xl overflow-hidden shadow-2xl"
			style="background: {getGradient()}"
		>
			<!-- Header Pattern -->
			<div class="relative px-8 pt-8 pb-6">
				<!-- Decorative circles -->
				<div class="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10" style="background: white; transform: translate(30%, -30%)"></div>
				<div class="absolute bottom-0 left-0 w-24 h-24 rounded-full opacity-10" style="background: white; transform: translate(-30%, 30%)"></div>
				
				<!-- Logo -->
				<div class="flex items-center gap-2 mb-6">
					<div class="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
						<span class="text-white font-bold text-sm">SW</span>
					</div>
					<span class="text-white/80 font-medium text-sm">SpentWorth</span>
				</div>

				<!-- Main Headline -->
				<h2 class="text-white text-2xl sm:text-3xl font-bold leading-tight mb-2">
					My {year} spending<br/>
					would be worth...
				</h2>
			</div>

			<!-- Value Display -->
			<div class="bg-white/10 backdrop-blur-sm px-8 py-6">
				<div class="flex items-end gap-3 mb-2">
					<span class="text-white text-5xl sm:text-6xl font-bold tracking-tight">
						{formatCurrency(projectedFutureValue)}
					</span>
					<span class="text-white/70 text-lg mb-2">in {projectionYear}</span>
				</div>
				
				<div class="flex items-center gap-4 text-white/80 text-sm">
					<span>
						<i class="fa-solid fa-arrow-up mr-1"></i>
						{getGrowthMultiple()}x growth
					</span>
					<span>•</span>
					<span>
						From {formatCurrency(totalSpent)} spent
					</span>
				</div>
			</div>

			<!-- Categories (if provided) -->
			{#if topCategories.length > 0}
				<div class="px-8 py-5 bg-black/10">
					<p class="text-white/60 text-xs uppercase tracking-wider mb-3">Top Categories</p>
					<div class="flex flex-wrap gap-2">
						{#each topCategories.slice(0, 3) as cat}
							<span class="px-3 py-1.5 rounded-full text-sm font-medium bg-white/15 text-white">
								{cat.name} · {cat.percentage}%
							</span>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Philosophy Badge -->
			<div class="px-8 py-4 bg-black/20 flex items-center justify-between">
				<div class="flex items-center gap-2">
					<i class="fa-solid {philosophyConfig.icon} text-white/60"></i>
					<span class="text-white/60 text-sm">{philosophyConfig.name}</span>
				</div>
				<span class="text-white/40 text-xs">
					{projectionYear - year} years @ 7% return
				</span>
			</div>
		</div>

		<!-- Action Buttons -->
		<div class="flex gap-3 mt-4">
			<button
				onclick={copyToClipboard}
				disabled={copying}
				class="flex-1 px-4 py-3 rounded-xl text-sm font-semibold transition-all bg-white text-gray-900 hover:bg-gray-100 disabled:opacity-50"
			>
				{#if copied}
					<i class="fa-solid fa-check mr-2 text-green-500"></i>
					Copied!
				{:else}
					<i class="fa-solid fa-copy mr-2"></i>
					Copy Text
				{/if}
			</button>
			<button
				onclick={downloadImage}
				class="flex-1 px-4 py-3 rounded-xl text-sm font-semibold transition-all bg-white/10 text-white hover:bg-white/20 border border-white/20"
			>
				<i class="fa-solid fa-download mr-2"></i>
				Save Image
			</button>
		</div>

		<!-- Close hint -->
		<p class="text-center text-white/40 text-sm mt-4">
			Click outside or press Escape to close
		</p>
	</div>
</div>

