<script lang="ts">
	import { initTheme, getTheme } from '$lib/stores/theme';
	import { onMount } from 'svelte';

	type EmptyStateType = 'no-data' | 'no-imports' | 'no-goals' | 'no-transactions' | 'error';

	let { 
		type = 'no-data' as EmptyStateType,
		title = '',
		description = '',
		actionLabel = '',
		actionHref = '',
		onAction = () => {}
	} = $props();
	
	let isDark = $state(false);

	const defaults = {
		'no-data': {
			title: 'No data yet',
			description: 'Import your first bank statement to see your opportunity cost',
			actionLabel: 'Import CSV',
			actionHref: '/imports'
		},
		'no-imports': {
			title: 'No imports yet',
			description: 'Upload a CSV file from your bank to get started',
			actionLabel: 'Upload CSV',
			actionHref: ''
		},
		'no-goals': {
			title: 'No goals set',
			description: 'Create spending limits to track your progress and save more',
			actionLabel: 'Create Goal',
			actionHref: ''
		},
		'no-transactions': {
			title: 'No transactions',
			description: 'This import doesn\'t have any transactions to display',
			actionLabel: 'Back to Imports',
			actionHref: '/imports'
		},
		'error': {
			title: 'Something went wrong',
			description: 'We couldn\'t load this data. Please try again.',
			actionLabel: 'Try Again',
			actionHref: ''
		}
	};

	const config = $derived({
		title: title || defaults[type].title,
		description: description || defaults[type].description,
		actionLabel: actionLabel || defaults[type].actionLabel,
		actionHref: actionHref || defaults[type].actionHref
	});

	onMount(() => {
		initTheme();
		isDark = getTheme() === 'dark';
	});
</script>

<div class="text-center py-16 px-4">
	<!-- Illustration -->
	<div class="relative w-32 h-32 mx-auto mb-6">
		{#if type === 'no-data'}
			<!-- Chart illustration -->
			<div 
				class="absolute inset-0 rounded-2xl flex items-end justify-center gap-2 p-4"
				style="background: {isDark ? '#1a1a1a' : '#f5f0e8'}; border: 1px solid {isDark ? '#2a2a2a' : '#d4cfc5'}"
			>
				<div class="w-4 h-8 rounded-t" style="background: {isDark ? '#404040' : '#d4d4d4'}"></div>
				<div class="w-4 h-12 rounded-t" style="background: {isDark ? '#525252' : '#a3a3a3'}"></div>
				<div class="w-4 h-6 rounded-t" style="background: {isDark ? '#404040' : '#d4d4d4'}"></div>
				<div class="w-4 h-16 rounded-t bg-sw-accent/50"></div>
			</div>
			<!-- Sparkle -->
			<div class="absolute -top-2 -right-2 w-8 h-8 rounded-lg flex items-center justify-center" style="background: {isDark ? 'rgba(13,148,136,0.2)' : 'rgba(13,148,136,0.15)'}">
				<i class="fa-solid fa-sparkles text-sw-accent text-sm"></i>
			</div>
		{:else if type === 'no-imports'}
			<!-- Upload illustration -->
			<div 
				class="absolute inset-0 rounded-2xl flex flex-col items-center justify-center border-2 border-dashed"
				style="background: {isDark ? '#1a1a1a' : '#f5f0e8'}; border-color: {isDark ? '#2a2a2a' : '#d4cfc5'}"
			>
				<i class="fa-solid fa-cloud-arrow-up text-3xl mb-2" style="color: {isDark ? '#525252' : '#a3a3a3'}"></i>
				<div class="w-16 h-1 rounded" style="background: {isDark ? '#2a2a2a' : '#d4cfc5'}"></div>
			</div>
			<!-- File icon -->
			<div class="absolute -bottom-2 -right-2 w-10 h-10 rounded-lg flex items-center justify-center" style="background: {isDark ? '#262626' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}; box-shadow: 0 2px 8px rgba(0,0,0,0.1)">
				<i class="fa-solid fa-file-csv text-sw-accent"></i>
			</div>
		{:else if type === 'no-goals'}
			<!-- Target illustration -->
			<div 
				class="absolute inset-0 rounded-2xl flex items-center justify-center"
				style="background: {isDark ? '#1a1a1a' : '#f5f0e8'}; border: 1px solid {isDark ? '#2a2a2a' : '#d4cfc5'}"
			>
				<div class="w-20 h-20 rounded-full flex items-center justify-center" style="border: 3px solid {isDark ? '#404040' : '#d4d4d4'}">
					<div class="w-12 h-12 rounded-full flex items-center justify-center" style="border: 3px solid {isDark ? '#525252' : '#a3a3a3'}">
						<div class="w-4 h-4 rounded-full bg-sw-accent"></div>
					</div>
				</div>
			</div>
			<!-- Flag icon -->
			<div class="absolute -top-2 -right-2 w-8 h-8 rounded-lg flex items-center justify-center" style="background: {isDark ? 'rgba(13,148,136,0.2)' : 'rgba(13,148,136,0.15)'}">
				<i class="fa-solid fa-flag text-sw-accent text-sm"></i>
			</div>
		{:else if type === 'no-transactions'}
			<!-- List illustration -->
			<div 
				class="absolute inset-0 rounded-2xl flex flex-col items-center justify-center gap-2 p-4"
				style="background: {isDark ? '#1a1a1a' : '#f5f0e8'}; border: 1px solid {isDark ? '#2a2a2a' : '#d4cfc5'}"
			>
				<div class="w-full h-3 rounded" style="background: {isDark ? '#2a2a2a' : '#d4cfc5'}"></div>
				<div class="w-3/4 h-3 rounded" style="background: {isDark ? '#262626' : '#e5e5e5'}"></div>
				<div class="w-full h-3 rounded" style="background: {isDark ? '#2a2a2a' : '#d4cfc5'}"></div>
				<div class="w-1/2 h-3 rounded" style="background: {isDark ? '#262626' : '#e5e5e5'}"></div>
			</div>
			<!-- Search icon -->
			<div class="absolute -bottom-2 -right-2 w-10 h-10 rounded-lg flex items-center justify-center" style="background: {isDark ? '#262626' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}; box-shadow: 0 2px 8px rgba(0,0,0,0.1)">
				<i class="fa-solid fa-magnifying-glass" style="color: {isDark ? '#a3a3a3' : '#737373'}"></i>
			</div>
		{:else}
			<!-- Error illustration -->
			<div 
				class="absolute inset-0 rounded-2xl flex items-center justify-center"
				style="background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.2)"
			>
				<i class="fa-solid fa-triangle-exclamation text-4xl text-red-400"></i>
			</div>
		{/if}
	</div>

	<!-- Content -->
	<h3 class="font-display text-xl font-semibold mb-2" style="color: {isDark ? '#ffffff' : '#171717'}">{config.title}</h3>
	<p class="text-sm max-w-xs mx-auto mb-6" style="color: {isDark ? '#a3a3a3' : '#737373'}">{config.description}</p>

	<!-- Action -->
	{#if config.actionHref}
		<a href={config.actionHref} class="btn btn-primary">
			{config.actionLabel}
		</a>
	{:else if config.actionLabel}
		<button onclick={onAction} class="btn btn-primary">
			{config.actionLabel}
		</button>
	{/if}
</div>

