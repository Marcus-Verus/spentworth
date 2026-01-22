<script lang="ts">
	import { initTheme, getTheme } from '$lib/stores/theme';
	import { onMount } from 'svelte';

	let { onComplete = () => {} } = $props();
	
	let isDark = $state(false);
	let step = $state(0);
	
	const steps = [
		{
			title: "Welcome to SpentWorth",
			subtitle: "See where your money really goes — and what it could become.",
			icon: "fa-solid fa-coins",
			content: "We help you understand your spending by showing the opportunity cost of every purchase. What if that $5 coffee was invested instead?"
		},
		{
			title: "Import Your Spending",
			subtitle: "No account linking required.",
			icon: "fa-solid fa-file-arrow-up",
			content: "Download a CSV from your bank and upload it here. We automatically categorize your transactions — no manual tagging needed."
		},
		{
			title: "Discover Insights",
			subtitle: "See patterns you never noticed.",
			icon: "fa-solid fa-chart-pie",
			content: "Track recurring subscriptions, find your biggest spending categories, and see what your money could have grown to if invested."
		},
		{
			title: "Set Goals & Save",
			subtitle: "Build the life you want.",
			icon: "fa-solid fa-piggy-bank",
			content: "Set spending limits on categories or merchants. Watch your potential savings grow as you make mindful choices."
		}
	];

	onMount(() => {
		initTheme();
		isDark = getTheme() === 'dark';
	});
	
	function next() {
		if (step < steps.length - 1) {
			step++;
		} else {
			complete();
		}
	}
	
	function skip() {
		complete();
	}
	
	function complete() {
		localStorage.setItem('sw_onboarding_completed', 'true');
		onComplete();
	}
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center p-4 safe-area-top safe-area-bottom" style="background: {isDark ? 'rgba(0,0,0,0.9)' : 'rgba(0,0,0,0.6)'}; backdrop-filter: blur(4px);">
	<div 
		class="w-full max-w-lg rounded-3xl p-6 sm:p-8 relative overflow-hidden max-h-[90vh] overflow-y-auto"
		style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25)"
	>
		<!-- Progress dots -->
		<div class="flex justify-center gap-2 mb-6 sm:mb-8">
			{#each steps as _, i}
				<button
					onclick={() => step = i}
					class="w-2 h-2 rounded-full transition-all min-w-[8px] min-h-[8px]"
					style="background: {step === i ? '#388E3C' : (isDark ? '#404040' : '#d4d4d4')}; {step === i ? 'width: 24px;' : ''}"
					aria-label="Go to step {i + 1}"
				></button>
			{/each}
		</div>
		
		<!-- Content -->
		<div class="text-center">
			<!-- Icon -->
			<div 
				class="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl mx-auto mb-4 sm:mb-6 flex items-center justify-center"
				style="background: {isDark ? 'rgba(56,142,60,0.15)' : 'rgba(56,142,60,0.1)'};"
			>
				<i class="{steps[step].icon} text-2xl sm:text-3xl text-sw-accent"></i>
			</div>
			
			<!-- Title & Subtitle -->
			<h2 class="font-display text-xl sm:text-2xl font-bold mb-2" style="color: {isDark ? '#ffffff' : '#171717'}">{steps[step].title}</h2>
			<p class="text-sm mb-3 sm:mb-4" style="color: #388E3C">{steps[step].subtitle}</p>
			
			<!-- Description -->
			<p class="text-sm leading-relaxed mb-6 sm:mb-8" style="color: {isDark ? '#a3a3a3' : '#737373'}">{steps[step].content}</p>
		</div>
		
		<!-- Actions -->
		<div class="flex items-center justify-between">
			<button
				onclick={skip}
				class="text-sm transition-colors hover:opacity-80"
				style="color: {isDark ? '#a3a3a3' : '#525252'}"
			>
				Skip
			</button>
			
			<button
				onclick={next}
				class="btn btn-primary px-6"
			>
				{step === steps.length - 1 ? "Get Started" : "Next"}
				{#if step < steps.length - 1}
					<i class="fa-solid fa-arrow-right ml-2 text-sm"></i>
				{/if}
			</button>
		</div>
		
		<!-- Decorative gradient -->
		<div 
			class="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-30 blur-3xl pointer-events-none"
			style="background: linear-gradient(135deg, #388E3C, #4CAF50)"
		></div>
	</div>
</div>

