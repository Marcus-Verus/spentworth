<script lang="ts">
	import { onMount } from 'svelte';
	import Logo from '$lib/components/Logo.svelte';
	import { PUBLIC_TURNSTILE_SITE_KEY } from '$env/static/public';

	// Public pages always use light mode (dark mode is Pro-only)
	const isDark = false;

	// Contact form state
	let name = $state('');
	let email = $state('');
	let message = $state('');
	let isSubmitting = $state(false);
	let submitStatus = $state<{ type: 'success' | 'error'; message: string } | null>(null);
	let turnstileToken = $state<string | null>(null);
	let turnstileWidgetId = $state<string | null>(null);

	// Declare global turnstile
	declare global {
		interface Window {
			turnstile: {
				render: (container: string | HTMLElement, options: {
					sitekey: string;
					callback?: (token: string) => void;
					'expired-callback'?: () => void;
					'error-callback'?: () => void;
					theme?: 'light' | 'dark' | 'auto';
					size?: 'normal' | 'compact';
				}) => string;
				reset: (widgetId: string) => void;
				remove: (widgetId: string) => void;
			};
			onTurnstileLoad?: () => void;
		}
	}

	onMount(() => {
		// Load Turnstile script
		if (!document.getElementById('turnstile-script')) {
			const script = document.createElement('script');
			script.id = 'turnstile-script';
			script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad';
			script.async = true;
			script.defer = true;
			document.head.appendChild(script);
		}

		window.onTurnstileLoad = () => {
			renderTurnstile();
		};

		// If script already loaded
		if (window.turnstile) {
			renderTurnstile();
		}

		return () => {
			if (turnstileWidgetId && window.turnstile) {
				window.turnstile.remove(turnstileWidgetId);
			}
		};
	});

	function renderTurnstile() {
		const container = document.getElementById('turnstile-container');
		if (container && window.turnstile && !turnstileWidgetId) {
			turnstileWidgetId = window.turnstile.render(container, {
				sitekey: PUBLIC_TURNSTILE_SITE_KEY,
				callback: (token: string) => {
					turnstileToken = token;
				},
				'expired-callback': () => {
					turnstileToken = null;
				},
				'error-callback': () => {
					turnstileToken = null;
				},
				theme: 'light',
				size: 'normal'
			});
		}
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		
		if (!turnstileToken) {
			submitStatus = { type: 'error', message: 'Please complete the security check' };
			return;
		}

		isSubmitting = true;
		submitStatus = null;

		try {
			const response = await fetch('/api/contact', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name,
					email,
					message,
					turnstileToken
				})
			});

			const data = await response.json();

			if (response.ok) {
				submitStatus = { type: 'success', message: data.message };
				name = '';
				email = '';
				message = '';
				// Reset Turnstile
				if (turnstileWidgetId && window.turnstile) {
					window.turnstile.reset(turnstileWidgetId);
					turnstileToken = null;
				}
			} else {
				submitStatus = { type: 'error', message: data.error || 'Something went wrong' };
				// Reset Turnstile on error too
				if (turnstileWidgetId && window.turnstile) {
					window.turnstile.reset(turnstileWidgetId);
					turnstileToken = null;
				}
			}
		} catch {
			submitStatus = { type: 'error', message: 'Failed to send message. Please try again.' };
		} finally {
			isSubmitting = false;
		}
	}
</script>

<svelte:head>
	<title>Contact | SpentWorth</title>
	<meta name="description" content="Get in touch with the SpentWorth team. Questions, feedback, or partnership inquiries - we'd love to hear from you." />
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

	<main class="max-w-2xl mx-auto px-4 py-12 sm:py-16">
		<!-- Header -->
		<div class="text-center mb-10">
			<h1 class="font-display text-3xl sm:text-4xl font-bold mb-3" style="color: {isDark ? '#ffffff' : '#171717'}">
				Get in Touch
			</h1>
			<p class="text-lg" style="color: {isDark ? '#a3a3a3' : '#525252'}">
				Questions, feedback, or just want to say hi? We'd love to hear from you.
			</p>
		</div>

		<!-- Contact Form -->
		<form 
			onsubmit={handleSubmit}
			class="rounded-2xl p-6 sm:p-8 space-y-5"
			style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}"
		>
			{#if submitStatus}
				<div 
					class="p-4 rounded-xl text-sm font-medium"
					style="background: {submitStatus.type === 'success' ? 'rgba(13, 148, 136, 0.1)' : 'rgba(239, 68, 68, 0.1)'}; 
						   color: {submitStatus.type === 'success' ? '#388E3C' : '#ef4444'};
						   border: 1px solid {submitStatus.type === 'success' ? 'rgba(13, 148, 136, 0.3)' : 'rgba(239, 68, 68, 0.3)'}"
				>
					{#if submitStatus.type === 'success'}
						<i class="fa-solid fa-check-circle mr-2"></i>
					{:else}
						<i class="fa-solid fa-exclamation-circle mr-2"></i>
					{/if}
					{submitStatus.message}
				</div>
			{/if}

			<div>
				<label for="name" class="block text-sm font-medium mb-1.5" style="color: {isDark ? '#a3a3a3' : '#525252'}">
					Name
				</label>
				<input
					type="text"
					id="name"
					bind:value={name}
					required
					class="w-full px-4 py-3 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-sw-accent"
					style="background: {isDark ? '#0f0f0f' : '#f5f0e8'}; 
						   border: 1px solid {isDark ? '#2a2a2a' : '#d1ccc2'}; 
						   color: {isDark ? '#ffffff' : '#171717'}"
					placeholder="Your name"
				/>
			</div>

			<div>
				<label for="email" class="block text-sm font-medium mb-1.5" style="color: {isDark ? '#a3a3a3' : '#525252'}">
					Email
				</label>
				<input
					type="email"
					id="email"
					bind:value={email}
					required
					class="w-full px-4 py-3 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-sw-accent"
					style="background: {isDark ? '#0f0f0f' : '#f5f0e8'}; 
						   border: 1px solid {isDark ? '#2a2a2a' : '#d1ccc2'}; 
						   color: {isDark ? '#ffffff' : '#171717'}"
					placeholder="you@example.com"
				/>
			</div>

			<div>
				<label for="message" class="block text-sm font-medium mb-1.5" style="color: {isDark ? '#a3a3a3' : '#525252'}">
					Message
				</label>
				<textarea
					id="message"
					bind:value={message}
					required
					rows="6"
					class="w-full px-4 py-3 rounded-xl transition-colors resize-none focus:outline-none focus:ring-2 focus:ring-sw-accent"
					style="background: {isDark ? '#0f0f0f' : '#f5f0e8'}; 
						   border: 1px solid {isDark ? '#2a2a2a' : '#d1ccc2'}; 
						   color: {isDark ? '#ffffff' : '#171717'}"
					placeholder="How can we help?"
				></textarea>
			</div>

			<!-- Turnstile Widget -->
			<div class="flex justify-center">
				<div id="turnstile-container"></div>
			</div>

			<button
				type="submit"
				disabled={isSubmitting || !turnstileToken}
				class="w-full py-3.5 rounded-xl font-display font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
				style="background: #388E3C; color: #ffffff"
			>
				{#if isSubmitting}
					<i class="fa-solid fa-spinner fa-spin mr-2"></i>
					Sending...
				{:else}
					<i class="fa-solid fa-paper-plane mr-2"></i>
					Send Message
				{/if}
			</button>

			<p class="text-xs text-center" style="color: {isDark ? '#737373' : '#9ca3af'}">
				<i class="fa-solid fa-shield-halved mr-1"></i>
				Protected by Cloudflare Turnstile
			</p>
		</form>

		<!-- Additional Info -->
		<div class="mt-10 text-center space-y-4">
			<p class="text-sm" style="color: {isDark ? '#737373' : '#9ca3af'}">
				We typically respond within 24-48 hours.
			</p>
			<div class="flex justify-center gap-6">
				<a 
					href="/about" 
					class="text-sm font-medium text-sw-accent hover:underline"
				>
					About Us
				</a>
				<a 
					href="/pricing" 
					class="text-sm font-medium text-sw-accent hover:underline"
				>
					Pricing
				</a>
			</div>
		</div>
	</main>

	<!-- Footer -->
	<footer class="border-t" style="border-color: {isDark ? '#2a2a2a' : '#e5e5e5'}; background: {isDark ? '#0a0a0a' : '#faf7f2'}">
		<div class="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
			<!-- Main Footer Content -->
			<div class="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
				<!-- Brand Column -->
				<div class="col-span-2 md:col-span-1">
					<div class="flex items-center gap-2 mb-4">
						<div class="rounded-xl bg-sw-accent flex items-center justify-center text-white p-1.5">
							<Logo size="sm" class="text-white" />
						</div>
						<span class="font-display text-lg font-semibold" style="color: {isDark ? '#ffffff' : '#171717'}">SpentWorth</span>
					</div>
				<p class="text-sm mb-4" style="color: {isDark ? '#a3a3a3' : '#737373'}">
					Know where your money goes. Build the life you want.
				</p>
				<div class="flex items-center gap-3">
					<a href="https://x.com/spentworthapp" target="_blank" rel="noopener" aria-label="Follow us on X (Twitter)" class="w-9 h-9 rounded-lg flex items-center justify-center transition-colors hover:text-sw-accent" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; color: {isDark ? '#a3a3a3' : '#737373'}">
						<i class="fa-brands fa-x-twitter"></i>
					</a>
					<a href="https://instagram.com/spentworth" target="_blank" rel="noopener" aria-label="Follow us on Instagram" class="w-9 h-9 rounded-lg flex items-center justify-center transition-colors hover:text-sw-accent" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; color: {isDark ? '#a3a3a3' : '#737373'}">
						<i class="fa-brands fa-instagram"></i>
					</a>
					<a href="https://reddit.com/u/SpentWorthOfficial" target="_blank" rel="noopener" aria-label="Follow us on Reddit" class="w-9 h-9 rounded-lg flex items-center justify-center transition-colors hover:text-sw-accent" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; color: {isDark ? '#a3a3a3' : '#737373'}">
						<i class="fa-brands fa-reddit"></i>
					</a>
					<a href="https://www.linkedin.com" target="_blank" rel="noopener" aria-label="Follow us on LinkedIn" class="w-9 h-9 rounded-lg flex items-center justify-center transition-colors hover:text-sw-accent" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; color: {isDark ? '#a3a3a3' : '#737373'}">
						<i class="fa-brands fa-linkedin"></i>
					</a>
				</div>
				</div>

				<!-- Product -->
				<div>
					<h4 class="font-display font-semibold mb-4" style="color: {isDark ? '#ffffff' : '#171717'}">Product</h4>
					<ul class="space-y-2.5">
						<li><a href="/pricing" class="text-sm transition-colors hover:text-sw-accent" style="color: {isDark ? '#a3a3a3' : '#737373'}">Pricing</a></li>
						<li><a href="/#features" class="text-sm transition-colors hover:text-sw-accent" style="color: {isDark ? '#a3a3a3' : '#737373'}">Features</a></li>
						<li><a href="/#how-it-works" class="text-sm transition-colors hover:text-sw-accent" style="color: {isDark ? '#a3a3a3' : '#737373'}">How It Works</a></li>
					</ul>
				</div>

				<!-- Company -->
				<div>
					<h4 class="font-display font-semibold mb-4" style="color: {isDark ? '#ffffff' : '#171717'}">Company</h4>
					<ul class="space-y-2.5">
						<li><a href="/about" class="text-sm transition-colors hover:text-sw-accent" style="color: {isDark ? '#a3a3a3' : '#737373'}">About</a></li>
						<li><a href="/contact" class="text-sm transition-colors hover:text-sw-accent" style="color: {isDark ? '#a3a3a3' : '#737373'}">Contact</a></li>
					</ul>
				</div>

				<!-- Legal -->
				<div>
					<h4 class="font-display font-semibold mb-4" style="color: {isDark ? '#ffffff' : '#171717'}">Legal</h4>
					<ul class="space-y-2.5">
						<li><a href="/privacy" class="text-sm transition-colors hover:text-sw-accent" style="color: {isDark ? '#a3a3a3' : '#737373'}">Privacy Policy</a></li>
						<li><a href="/terms" class="text-sm transition-colors hover:text-sw-accent" style="color: {isDark ? '#a3a3a3' : '#737373'}">Terms of Service</a></li>
						<li><a href="/security" class="text-sm transition-colors hover:text-sw-accent" style="color: {isDark ? '#a3a3a3' : '#737373'}">Security</a></li>
					</ul>
				</div>
			</div>

			<!-- Bottom Bar -->
			<div class="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8" style="border-top: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
				<p class="text-xs" style="color: {isDark ? '#737373' : '#9ca3af'}">
					© {new Date().getFullYear()} SpentWorth. All rights reserved.
				</p>
				<p class="text-xs" style="color: {isDark ? '#737373' : '#9ca3af'}">
					Made with <i class="fa-solid fa-heart text-red-500"></i> for people who care about their financial future
				</p>
			</div>
		</div>
	</footer>
</div>

