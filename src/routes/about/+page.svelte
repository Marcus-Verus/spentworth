<script lang="ts">
	import Logo from '$lib/components/Logo.svelte';

	// Public pages always use light mode (dark mode is Pro-only)
	const isDark = false;
</script>

<svelte:head>
	<title>About | SpentWorth</title>
</svelte:head>

<div class="min-h-screen" style="background: {isDark ? 'var(--sw-bg)' : '#f5f0e8'}">
	<!-- Header -->
	<header class="border-b backdrop-blur-md sticky top-0 z-50" style="border-color: {isDark ? 'rgba(42,42,42,0.3)' : 'rgba(0,0,0,0.1)'}; background: {isDark ? 'rgba(10,10,10,0.9)' : 'rgba(245,240,232,0.9)'}">
		<div class="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
			<a href="/" class="flex items-center gap-2">
				<div class="rounded-xl bg-sw-accent flex items-center justify-center text-white p-1.5">
					<Logo size="sm" class="text-white" />
				</div>
				<span class="font-display text-lg font-semibold" style="color: {isDark ? '#ffffff' : '#171717'}">SpentWorth</span>
			</a>
			<a href="/login" class="text-sm font-medium" style="color: #737373">Log in</a>
		</div>
	</header>

	<main class="max-w-3xl mx-auto px-4 py-12">
		<!-- Hero -->
		<div class="text-center mb-12">
			<h1 class="font-display text-3xl sm:text-4xl font-bold mb-4" style="color: {isDark ? '#ffffff' : '#171717'}">
				We believe everyone deserves<br/>
				<span class="text-sw-accent">financial clarity</span>
			</h1>
			<p class="text-lg" style="color: {isDark ? '#a3a3a3' : '#525252'}">
				SpentWorth helps you see where your money goes and what it could become.
			</p>
		</div>

		<div class="space-y-12" style="color: {isDark ? '#a3a3a3' : '#525252'}">
			<!-- Story -->
			<section>
				<h2 class="font-display text-2xl font-semibold mb-4" style="color: {isDark ? '#ffffff' : '#171717'}">Our Story</h2>
				<div class="space-y-4">
					<p>SpentWorth was born from a simple frustration: most budgeting apps tell you what you spent, but not what that spending actually cost you.</p>
					<p>When we realized that a $5 daily coffee habit could have been worth $47,000 if invested over 10 years, we knew there had to be a better way to visualize the true cost of our spending decisions.</p>
					<p>We built SpentWorth to answer the question: <em>"Is this purchase worth what it's really costing me?"</em></p>
				</div>
			</section>

			<!-- Mission -->
			<section class="rounded-xl p-6" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
				<h2 class="font-display text-xl font-semibold mb-3" style="color: {isDark ? '#ffffff' : '#171717'}">Our Mission</h2>
				<p class="text-lg">Help people make informed financial decisions by showing them the true opportunity cost of their spending.</p>
			</section>

			<!-- Values -->
			<section>
				<h2 class="font-display text-2xl font-semibold mb-6" style="color: {isDark ? '#ffffff' : '#171717'}">What We Believe</h2>
				<div class="grid sm:grid-cols-2 gap-4">
					<div class="rounded-xl p-5" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
						<i class="fa-solid fa-eye text-sw-accent text-xl mb-3"></i>
						<h3 class="font-display font-semibold mb-2" style="color: {isDark ? '#ffffff' : '#171717'}">Transparency</h3>
						<p class="text-sm">No hidden fees, no dark patterns. You should always know exactly what you're getting.</p>
					</div>
					<div class="rounded-xl p-5" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
						<i class="fa-solid fa-user-shield text-sw-accent text-xl mb-3"></i>
						<h3 class="font-display font-semibold mb-2" style="color: {isDark ? '#ffffff' : '#171717'}">Privacy First</h3>
						<p class="text-sm">Your financial data is yours. We don't sell it, share it, or use it for advertising.</p>
					</div>
					<div class="rounded-xl p-5" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
						<i class="fa-solid fa-lightbulb text-sw-accent text-xl mb-3"></i>
						<h3 class="font-display font-semibold mb-2" style="color: {isDark ? '#ffffff' : '#171717'}">Simplicity</h3>
						<p class="text-sm">Personal finance shouldn't require a degree. We make complex insights simple.</p>
					</div>
					<div class="rounded-xl p-5" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
						<i class="fa-solid fa-hand-holding-heart text-sw-accent text-xl mb-3"></i>
						<h3 class="font-display font-semibold mb-2" style="color: {isDark ? '#ffffff' : '#171717'}">Empowerment</h3>
						<p class="text-sm">We educate, not guilt. Our goal is to help you make confident financial decisions.</p>
					</div>
				</div>
			</section>

			<!-- Different -->
			<section>
				<h2 class="font-display text-2xl font-semibold mb-4" style="color: {isDark ? '#ffffff' : '#171717'}">What Makes Us Different</h2>
				<div class="space-y-4">
					<p><strong style="color: {isDark ? '#ffffff' : '#171717'}">We focus on opportunity cost.</strong> Most apps just show you spent $150 on dining. We show you that's $2,530 you could have in 10 years.</p>
					<p><strong style="color: {isDark ? '#ffffff' : '#171717'}">No bank linking required.</strong> Just upload your CSV exports. It's faster, safer, and puts you in control.</p>
					<p><strong style="color: {isDark ? '#ffffff' : '#171717'}">We're building for the long term.</strong> Not just tracking today's expenses, but showing how today's decisions affect tomorrow's wealth.</p>
				</div>
			</section>

			<!-- Contact -->
			<section class="text-center">
				<h2 class="font-display text-2xl font-semibold mb-4" style="color: {isDark ? '#ffffff' : '#171717'}">Get in Touch</h2>
				<p class="mb-6">Questions, feedback, or just want to say hi?</p>
				<a href="mailto:hello@spentworth.com" class="btn-primary inline-flex items-center gap-2 px-6 py-3">
					<i class="fa-solid fa-envelope"></i>
					hello@spentworth.com
				</a>
			</section>
		</div>
	</main>
</div>

