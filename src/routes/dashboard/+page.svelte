<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import type { DashboardSummary } from '$lib/types';

	let { data } = $props();

	let summary = $state<DashboardSummary | null>(null);
	let loading = $state(true);
	let sankeyContainer: HTMLDivElement;

	onMount(async () => {
		await loadSummary();
	});

	async function loadSummary() {
		loading = true;
		const res = await fetch('/api/dashboard/summary');
		const json = await res.json();

		if (json.ok) {
			summary = json.data;
			if (summary && summary.categories.length > 0) {
				// Wait for DOM update then render Sankey
				setTimeout(() => renderSankey(), 100);
			}
		}
		loading = false;
	}

	function renderSankey() {
		if (!summary || !sankeyContainer || summary.categories.length === 0) return;

		// Clear previous
		sankeyContainer.innerHTML = '';

		const width = sankeyContainer.clientWidth;
		const height = Math.max(400, summary.categories.length * 50);
		const margin = { top: 20, right: 160, bottom: 20, left: 160 };
		const innerWidth = width - margin.left - margin.right;
		const innerHeight = height - margin.top - margin.bottom;

		// Create SVG
		const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		svg.setAttribute('width', width.toString());
		svg.setAttribute('height', height.toString());
		svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

		// Create nodes and links for a simple two-column layout
		const categories = summary.categories.filter(c => c.spent > 0);
		const nodeHeight = innerHeight / categories.length;
		const nodeWidth = 20;
		const linkPadding = 10;

		// Left side: "Spending" nodes (what was spent)
		// Right side: "Would Be" nodes (future value)
		let yOffset = margin.top;

		categories.forEach((cat, i) => {
			const y = yOffset + (nodeHeight * i);
			const spentHeight = Math.max(20, (cat.spent / summary!.totalSpent) * innerHeight * 0.8);
			const futureHeight = Math.max(20, (cat.future / summary!.totalFutureValue) * innerHeight * 0.8);

			// Color based on delta percentage
			const deltaPercent = cat.spent > 0 ? (cat.delta / cat.spent) * 100 : 0;
			const hue = deltaPercent >= 0 ? 160 : 0; // Green for positive, red for negative
			const saturation = Math.min(80, Math.abs(deltaPercent));
			const color = `hsl(${hue}, ${saturation}%, 50%)`;

			// Left node (spent)
			const leftNode = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
			leftNode.setAttribute('x', margin.left.toString());
			leftNode.setAttribute('y', (y + (nodeHeight - spentHeight) / 2).toString());
			leftNode.setAttribute('width', nodeWidth.toString());
			leftNode.setAttribute('height', spentHeight.toString());
			leftNode.setAttribute('fill', color);
			leftNode.setAttribute('rx', '4');
			svg.appendChild(leftNode);

			// Left label
			const leftLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
			leftLabel.setAttribute('x', (margin.left - 10).toString());
			leftLabel.setAttribute('y', (y + nodeHeight / 2).toString());
			leftLabel.setAttribute('text-anchor', 'end');
			leftLabel.setAttribute('dominant-baseline', 'middle');
			leftLabel.setAttribute('fill', '#9ca3af');
			leftLabel.setAttribute('font-size', '12');
			leftLabel.textContent = `${cat.category}`;
			svg.appendChild(leftLabel);

			const leftAmount = document.createElementNS('http://www.w3.org/2000/svg', 'text');
			leftAmount.setAttribute('x', (margin.left - 10).toString());
			leftAmount.setAttribute('y', (y + nodeHeight / 2 + 14).toString());
			leftAmount.setAttribute('text-anchor', 'end');
			leftAmount.setAttribute('dominant-baseline', 'middle');
			leftAmount.setAttribute('fill', '#6b7280');
			leftAmount.setAttribute('font-size', '10');
			leftAmount.textContent = formatCurrency(cat.spent);
			svg.appendChild(leftAmount);

			// Right node (future value)
			const rightX = margin.left + innerWidth - nodeWidth;
			const rightNode = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
			rightNode.setAttribute('x', rightX.toString());
			rightNode.setAttribute('y', (y + (nodeHeight - futureHeight) / 2).toString());
			rightNode.setAttribute('width', nodeWidth.toString());
			rightNode.setAttribute('height', futureHeight.toString());
			rightNode.setAttribute('fill', color);
			rightNode.setAttribute('rx', '4');
			svg.appendChild(rightNode);

			// Right label
			const rightLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
			rightLabel.setAttribute('x', (rightX + nodeWidth + 10).toString());
			rightLabel.setAttribute('y', (y + nodeHeight / 2).toString());
			rightLabel.setAttribute('text-anchor', 'start');
			rightLabel.setAttribute('dominant-baseline', 'middle');
			rightLabel.setAttribute('fill', '#9ca3af');
			rightLabel.setAttribute('font-size', '12');
			rightLabel.textContent = formatCurrency(cat.future);
			svg.appendChild(rightLabel);

			const rightDelta = document.createElementNS('http://www.w3.org/2000/svg', 'text');
			rightDelta.setAttribute('x', (rightX + nodeWidth + 10).toString());
			rightDelta.setAttribute('y', (y + nodeHeight / 2 + 14).toString());
			rightDelta.setAttribute('text-anchor', 'start');
			rightDelta.setAttribute('dominant-baseline', 'middle');
			rightDelta.setAttribute('fill', cat.delta >= 0 ? '#10b981' : '#ef4444');
			rightDelta.setAttribute('font-size', '10');
			rightDelta.textContent = `${cat.delta >= 0 ? '+' : ''}${formatCurrency(cat.delta)}`;
			svg.appendChild(rightDelta);

			// Link (curved path)
			const linkY1 = y + nodeHeight / 2;
			const linkY2 = y + nodeHeight / 2;
			const x1 = margin.left + nodeWidth;
			const x2 = rightX;
			const cx = (x1 + x2) / 2;

			const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
			const thickness = Math.max(2, (cat.future / summary!.totalFutureValue) * 40);
			path.setAttribute('d', `M ${x1} ${linkY1} C ${cx} ${linkY1}, ${cx} ${linkY2}, ${x2} ${linkY2}`);
			path.setAttribute('stroke', color);
			path.setAttribute('stroke-width', thickness.toString());
			path.setAttribute('fill', 'none');
			path.setAttribute('opacity', '0.5');
			svg.appendChild(path);
		});

		sankeyContainer.appendChild(svg);
	}

	function formatCurrency(amount: number) {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		}).format(amount);
	}

	async function handleLogout() {
		await data.supabase.auth.signOut();
		goto('/');
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
				<a href="/dashboard" class="text-sw-accent font-medium">Dashboard</a>
				<a href="/imports" class="text-sw-text-dim hover:text-sw-text transition-colors">Imports</a>
				<a href="/settings" class="text-sw-text-dim hover:text-sw-text transition-colors">Settings</a>
				<button onclick={handleLogout} class="text-sw-text-dim hover:text-sw-text transition-colors">
					Logout
				</button>
			</nav>
		</div>
	</header>

	<main class="max-w-7xl mx-auto px-6 py-8">
		{#if loading}
			<div class="flex items-center justify-center py-24">
				<div class="w-8 h-8 rounded-full border-2 border-sw-accent border-t-transparent animate-spin"></div>
			</div>
		{:else if !summary || summary.totalSpent === 0}
			<!-- Empty state -->
			<div class="text-center py-24">
				<div class="w-20 h-20 mx-auto rounded-2xl bg-sw-surface flex items-center justify-center mb-6">
					<svg xmlns="http://www.w3.org/2000/svg" class="w-10 h-10 text-sw-text-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
					</svg>
				</div>
				<h2 class="font-display text-2xl font-bold mb-2">No data yet</h2>
				<p class="text-sw-text-dim mb-6">Import your first bank statement to see your opportunity cost</p>
				<a href="/imports" class="btn btn-primary">Import CSV</a>
			</div>
		{:else}
			<div class="mb-8">
				<h1 class="font-display text-3xl font-bold mb-2">Your Opportunity Cost</h1>
				<p class="text-sw-text-dim">What your spending could have been worth if invested in SPY</p>
			</div>

			<!-- Summary cards -->
			<div class="grid md:grid-cols-3 gap-6 mb-8">
				<div class="stat-card">
					<p class="text-sm text-sw-text-dim mb-1">Total Spent</p>
					<p class="font-display text-3xl font-bold">{formatCurrency(summary.totalSpent)}</p>
				</div>
				<div class="stat-card">
					<p class="text-sm text-sw-text-dim mb-1">Would Be Worth</p>
					<p class="font-display text-3xl font-bold text-sw-accent">{formatCurrency(summary.totalFutureValue)}</p>
				</div>
				<div class="stat-card">
					<p class="text-sm text-sw-text-dim mb-1">Opportunity Cost</p>
					<p class="font-display text-3xl font-bold {summary.totalDelta >= 0 ? 'text-sw-accent' : 'text-sw-danger'}">
						{summary.totalDelta >= 0 ? '+' : ''}{formatCurrency(summary.totalDelta)}
					</p>
					<p class="text-xs text-sw-text-dim mt-1">
						{summary.totalSpent > 0 ? ((summary.totalDelta / summary.totalSpent) * 100).toFixed(1) : 0}% return
					</p>
				</div>
			</div>

			<!-- Sankey visualization -->
			<div class="card mb-8">
				<h2 class="font-display text-lg font-semibold mb-4">Spending Flow</h2>
				<p class="text-sm text-sw-text-dim mb-6">Left: What you spent. Right: What it would be worth today.</p>
				<div bind:this={sankeyContainer} class="w-full overflow-x-auto"></div>
			</div>

			<!-- Category breakdown table -->
			<div class="card">
				<h2 class="font-display text-lg font-semibold mb-4">By Category</h2>
				<div class="table-container">
					<table class="table">
						<thead>
							<tr>
								<th>Category</th>
								<th class="text-right">Spent</th>
								<th class="text-right">Would Be</th>
								<th class="text-right">Delta</th>
								<th class="text-right">Return</th>
							</tr>
						</thead>
						<tbody>
							{#each summary.categories as cat}
								<tr>
									<td class="font-medium">{cat.category}</td>
									<td class="text-right font-mono">{formatCurrency(cat.spent)}</td>
									<td class="text-right font-mono text-sw-accent">{formatCurrency(cat.future)}</td>
									<td class="text-right font-mono {cat.delta >= 0 ? 'text-sw-accent' : 'text-sw-danger'}">
										{cat.delta >= 0 ? '+' : ''}{formatCurrency(cat.delta)}
									</td>
									<td class="text-right font-mono text-sw-text-dim">
										{cat.spent > 0 ? ((cat.delta / cat.spent) * 100).toFixed(1) : 0}%
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{/if}
	</main>
</div>
