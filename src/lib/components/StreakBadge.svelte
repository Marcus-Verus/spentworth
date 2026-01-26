<script lang="ts">
	import type { EnhancedStreaks, StreakDisplay } from '$lib/types';

	interface Props {
		isDark?: boolean;
		compact?: boolean;
	}

	let { isDark = false, compact = false }: Props = $props();

	let loading = $state(true);
	let streaks = $state<EnhancedStreaks | null>(null);
	let activeStreaks = $state<StreakDisplay[]>([]);

	$effect(() => {
		loadStreaks();
	});

	async function loadStreaks() {
		loading = true;
		try {
			const res = await fetch('/api/review-inbox?status=pending&limit=1');
			const json = await res.json();
			if (json.ok && json.data.streaks) {
				const s = json.data.streaks;
				streaks = s;
				
				// Build active streaks list (only show streaks > 0)
				const displays: StreakDisplay[] = [];
				
				if (s.reviewStreakCurrent > 0) {
					displays.push({
						type: 'review',
						label: 'Review',
						current: s.reviewStreakCurrent,
						best: s.reviewStreakBest,
						icon: 'fa-check-double',
						color: '#22c55e',
						sublabel: `${s.totalItemsCleared} total cleared`
					});
				}
				
				if (s.uploadStreakCurrent > 0) {
					displays.push({
						type: 'upload',
						label: 'Upload',
						current: s.uploadStreakCurrent,
						best: s.uploadStreakBest,
						icon: 'fa-arrow-up-from-bracket',
						color: '#06b6d4',
						sublabel: 'weeks in a row'
					});
				}
				
				if (s.budgetStreakCurrent && s.budgetStreakCurrent > 0) {
					displays.push({
						type: 'budget',
						label: 'Budget',
						current: s.budgetStreakCurrent,
						best: s.budgetStreakBest || 0,
						icon: 'fa-wallet',
						color: '#8b5cf6',
						sublabel: 'days under budget'
					});
				}

				activeStreaks = displays;
			}
		} catch (e) {
			console.error('Failed to load streaks:', e);
		}
		loading = false;
	}

	function getStreakEmoji(count: number): string {
		if (count >= 30) return '🏆';
		if (count >= 14) return '🔥';
		if (count >= 7) return '⚡';
		if (count >= 3) return '✨';
		return '';
	}
</script>

{#if !loading && activeStreaks.length > 0}
	{#if compact}
		<!-- Compact inline display -->
		<div class="flex items-center gap-3">
			{#each activeStreaks.slice(0, 2) as streak}
				<div 
					class="flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all hover:scale-105"
					style="background: {streak.color}15"
					title="{streak.label}: {streak.current} day streak (best: {streak.best})"
				>
					<i class="fa-solid {streak.icon} text-[10px]" style="color: {streak.color}"></i>
					<span class="text-xs font-semibold" style="color: {streak.color}">
						{streak.current}
					</span>
					{#if getStreakEmoji(streak.current)}
						<span class="text-xs">{getStreakEmoji(streak.current)}</span>
					{/if}
				</div>
			{/each}
		</div>
	{:else}
		<!-- Full display -->
		<div 
			class="rounded-xl p-4"
			style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}"
		>
			<div class="flex items-center gap-2 mb-3">
				<i class="fa-solid fa-fire text-amber-500 text-sm"></i>
				<h4 class="text-sm font-semibold" style="color: {isDark ? '#ffffff' : '#171717'}">
					Your Streaks
				</h4>
			</div>
			
			<div class="flex flex-wrap gap-2">
				{#each activeStreaks as streak}
					<div 
						class="flex items-center gap-2 px-3 py-2 rounded-lg transition-all"
						style="background: {streak.color}10; border: 1px solid {streak.color}20"
					>
						<div 
							class="w-8 h-8 rounded-lg flex items-center justify-center"
							style="background: {streak.color}20"
						>
							<i class="fa-solid {streak.icon} text-sm" style="color: {streak.color}"></i>
						</div>
						<div>
							<div class="flex items-center gap-1">
								<span class="font-display font-bold" style="color: {streak.color}">
									{streak.current}
								</span>
								<span class="text-xs" style="color: {isDark ? '#a3a3a3' : '#737373'}">
									{streak.label}
								</span>
								{#if getStreakEmoji(streak.current)}
									<span class="text-sm">{getStreakEmoji(streak.current)}</span>
								{/if}
							</div>
							{#if streak.sublabel}
								<p class="text-[10px]" style="color: {isDark ? '#525252' : '#9ca3af'}">
									{streak.sublabel}
								</p>
							{/if}
						</div>
					</div>
				{/each}
			</div>
			
			<!-- Personal best hint (subtle) -->
			{#if activeStreaks.some(s => s.current === s.best && s.current > 3)}
				<p class="text-[10px] mt-3 text-center" style="color: {isDark ? '#525252' : '#9ca3af'}">
					🎯 You're at your personal best!
				</p>
			{/if}
		</div>
	{/if}
{/if}

