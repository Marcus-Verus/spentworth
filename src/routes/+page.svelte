<script lang="ts">
	import { goto } from '$app/navigation';

	let { data } = $props();
</script>

<div class="min-h-screen flex flex-col">
	<!-- Navigation -->
	<nav class="border-b border-sw-border/50 backdrop-blur-sm bg-sw-bg/80 sticky top-0 z-50">
		<div class="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
			<a href="/" class="flex items-center gap-3 group">
				<div class="w-10 h-10 rounded-xl bg-gradient-to-br from-sw-accent to-emerald-600 flex items-center justify-center text-sw-bg font-bold text-xl shadow-lg shadow-sw-accent/20 group-hover:shadow-sw-accent/40 transition-shadow">
					$
				</div>
				<span class="font-display text-xl font-semibold text-sw-text">SpentWorth</span>
			</a>
			<div class="flex items-center gap-4">
				{#if data.session}
					<a href="/dashboard" class="btn btn-primary">Dashboard</a>
				{:else}
					<a href="/login" class="text-sw-text-dim hover:text-sw-text transition-colors">Log in</a>
					<a href="/signup" class="btn btn-primary">Get Started</a>
				{/if}
			</div>
		</div>
	</nav>

	<!-- Hero -->
	<main class="flex-1">
		<section class="relative overflow-hidden">
			<!-- Background effects -->
			<div class="absolute inset-0 bg-glow-radial opacity-50"></div>
			<div class="absolute top-1/4 left-1/4 w-96 h-96 bg-sw-accent/10 rounded-full blur-3xl"></div>
			<div class="absolute bottom-1/4 right-1/4 w-64 h-64 bg-sw-purple/10 rounded-full blur-3xl"></div>
			
			<div class="relative max-w-7xl mx-auto px-6 py-24 lg:py-32">
				<div class="max-w-3xl mx-auto text-center">
					<h1 class="font-display text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6 animate-fade-in">
						What if you had
						<span class="text-gradient">invested</span>
						instead?
					</h1>
					<p class="text-xl text-sw-text-dim mb-10 leading-relaxed animate-slide-up" style="animation-delay: 100ms">
						Upload your bank statements and discover the opportunity cost of your spending. 
						See how much your daily coffee habit could be worth today.
					</p>
					<div class="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up" style="animation-delay: 200ms">
						{#if data.session}
							<button onclick={() => goto('/dashboard')} class="btn btn-primary text-lg px-8 py-3">
								Go to Dashboard
							</button>
						{:else}
							<button onclick={() => goto('/signup')} class="btn btn-primary text-lg px-8 py-3 glow">
								Start Free
							</button>
							<button onclick={() => goto('/login')} class="btn btn-secondary text-lg px-8 py-3">
								Sign In
							</button>
						{/if}
					</div>
				</div>

				<!-- Feature cards -->
				<div class="grid md:grid-cols-3 gap-6 mt-24">
					<div class="card animate-slide-up" style="animation-delay: 300ms">
						<div class="w-12 h-12 rounded-lg bg-sw-accent/20 flex items-center justify-center mb-4">
							<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-sw-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
							</svg>
						</div>
						<h3 class="font-display text-lg font-semibold mb-2">Upload CSV</h3>
						<p class="text-sw-text-dim">
							Import bank or credit card statements. We support all major formats and auto-detect columns.
						</p>
					</div>

					<div class="card animate-slide-up" style="animation-delay: 400ms">
						<div class="w-12 h-12 rounded-lg bg-sw-purple/20 flex items-center justify-center mb-4">
							<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-sw-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
							</svg>
						</div>
						<h3 class="font-display text-lg font-semibold mb-2">Smart Classification</h3>
						<p class="text-sw-text-dim">
							Automatic categorization with manual overrides. Create rules so future imports behave as expected.
						</p>
					</div>

					<div class="card animate-slide-up" style="animation-delay: 500ms">
						<div class="w-12 h-12 rounded-lg bg-sw-blue/20 flex items-center justify-center mb-4">
							<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-sw-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
							</svg>
						</div>
						<h3 class="font-display text-lg font-semibold mb-2">Opportunity Cost</h3>
						<p class="text-sw-text-dim">
							See what your spending would be worth if invested in SPY or your ticker of choice. Uses real price data.
						</p>
					</div>
				</div>
			</div>
		</section>

		<!-- How it works -->
		<section class="border-t border-sw-border/50 bg-sw-surface/30">
			<div class="max-w-7xl mx-auto px-6 py-24">
				<h2 class="font-display text-3xl font-bold text-center mb-16">How It Works</h2>
				
				<div class="grid md:grid-cols-4 gap-8">
					{#each [
						{ step: '01', title: 'Upload', desc: 'Drop your CSV bank statement' },
						{ step: '02', title: 'Review', desc: 'Verify classifications, exclude transfers' },
						{ step: '03', title: 'Calculate', desc: 'We fetch historical prices and compute growth' },
						{ step: '04', title: 'Visualize', desc: 'See your opportunity cost breakdown' }
					] as item, i}
						<div class="text-center">
							<div class="w-16 h-16 mx-auto rounded-full bg-sw-accent/10 border border-sw-accent/30 flex items-center justify-center mb-4">
								<span class="font-mono text-sw-accent font-bold">{item.step}</span>
							</div>
							<h3 class="font-display font-semibold mb-2">{item.title}</h3>
							<p class="text-sw-text-dim text-sm">{item.desc}</p>
						</div>
					{/each}
				</div>
			</div>
		</section>

		<!-- Transparency note -->
		<section class="border-t border-sw-border/50">
			<div class="max-w-3xl mx-auto px-6 py-16 text-center">
				<h2 class="font-display text-2xl font-bold mb-4">Built for Trust</h2>
				<p class="text-sw-text-dim leading-relaxed">
					We use adjusted close prices (dividends + splits) for accurate total return calculations. 
					Transfers, credit card payments, and ATM withdrawals are excluded by default to avoid double-counting. 
					You control what's included—create rules, override anything.
				</p>
			</div>
		</section>
	</main>

	<!-- Footer -->
	<footer class="border-t border-sw-border/50 py-8">
		<div class="max-w-7xl mx-auto px-6 text-center text-sw-text-dim text-sm">
			<p>SpentWorth — See the cost of not investing</p>
		</div>
	</footer>
</div>
