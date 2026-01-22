<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import Logo from '$lib/components/Logo.svelte';

	let { data } = $props();

	let email = $state('');
	let password = $state('');
	let loading = $state(false);
	let error = $state<string | null>(null);

	// Set initial error from props (if any)
	$effect(() => {
		if (data.error) {
			error = data.error;
		}
	});

	// Handle OAuth callback - check if already logged in (code was exchanged by layout)
	onMount(async () => {
		// If session exists (from layout), redirect to dashboard
		if (data.session) {
			goto('/dashboard');
			return;
		}
		
		// If there's an OAuth code and no session, try to exchange it
		if (browser && data.code) {
			loading = true;
			
			// Double-check session in case it was just set
			const { data: sessionData } = await data.supabase.auth.getSession();
			
			if (sessionData?.session) {
				goto('/dashboard');
				return;
			}
			
			// No session, try to exchange the code
			try {
				const { error: exchangeError } = await data.supabase.auth.exchangeCodeForSession(data.code);
				
				if (exchangeError) {
					// If it's a "code already used" type error but we have a session now, just redirect
					const { data: recheckSession } = await data.supabase.auth.getSession();
					if (recheckSession?.session) {
						goto('/dashboard');
						return;
					}
					
					console.error('OAuth exchange error:', exchangeError);
					error = exchangeError.message || 'Failed to complete sign in';
					loading = false;
					window.history.replaceState({}, '', '/login');
				} else {
					goto('/dashboard');
				}
			} catch (e) {
				console.error('OAuth callback error:', e);
				error = 'An unexpected error occurred during sign in';
				loading = false;
				window.history.replaceState({}, '', '/login');
			}
		}
	});

	async function handleLogin(e: Event) {
		e.preventDefault();
		loading = true;
		error = null;

		const { error: authError } = await data.supabase.auth.signInWithPassword({
			email,
			password
		});

		if (authError) {
			error = authError.message;
			loading = false;
		} else {
			goto('/dashboard');
		}
	}

	async function handleGoogleLogin() {
		loading = true;
		error = null;

		const origin = typeof window !== 'undefined' ? window.location.origin : '';
		const { error: authError } = await data.supabase.auth.signInWithOAuth({
			provider: 'google',
			options: {
				redirectTo: `${origin}/login`
			}
		});

		if (authError) {
			error = authError.message;
			loading = false;
		}
	}
</script>

<div class="min-h-screen flex items-center justify-center p-6">
	<div class="w-full max-w-md">
		<div class="text-center mb-8">
			<a href="/" class="inline-flex items-center gap-3 group mb-6">
				<div class="w-12 h-12 rounded-xl bg-gradient-to-br from-sw-accent to-emerald-600 flex items-center justify-center text-white p-2.5 shadow-lg shadow-sw-accent/20">
					<Logo size="lg" class="text-white" />
				</div>
				<span class="font-display text-2xl font-semibold text-sw-text">SpentWorth</span>
			</a>
			<h1 class="font-display text-2xl font-bold mb-2">Welcome back</h1>
			<p class="text-sw-text-dim">{data.code ? 'Completing sign in...' : 'Sign in to continue'}</p>
		</div>

		<div class="card">
			<form onsubmit={handleLogin} class="space-y-5">
				{#if error}
					<div class="p-3 rounded-lg bg-sw-danger/10 border border-sw-danger/30 text-sw-danger text-sm">
						{error}
					</div>
				{/if}

				<div>
					<label for="email" class="label">Email</label>
					<input
						id="email"
						type="email"
						bind:value={email}
						required
						class="input"
						placeholder="you@example.com"
					/>
				</div>

				<div>
					<div class="flex items-center justify-between mb-1">
						<label for="password" class="label mb-0">Password</label>
						<a href="/forgot-password" class="text-xs text-sw-accent hover:underline">Forgot password?</a>
					</div>
					<input
						id="password"
						type="password"
						bind:value={password}
						required
						class="input"
						placeholder="••••••••"
					/>
				</div>

				<button type="submit" disabled={loading} class="btn btn-primary w-full py-3">
					{loading ? 'Signing in...' : 'Sign In'}
				</button>
			</form>

			<div class="mt-6">
				<div class="relative">
					<div class="absolute inset-0 flex items-center">
						<div class="w-full border-t" style="border-color: var(--sw-border)"></div>
					</div>
					<div class="relative flex justify-center text-sm">
						<span class="px-2" style="background: var(--sw-surface); color: var(--sw-text-dim)">Or continue with</span>
					</div>
				</div>

				<button
					type="button"
					onclick={handleGoogleLogin}
					disabled={loading}
					class="btn btn-secondary w-full mt-4 flex items-center justify-center gap-2"
				>
					<svg class="w-5 h-5" viewBox="0 0 24 24">
						<path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
						<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
						<path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
						<path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
					</svg>
					Sign in with Google
				</button>
			</div>

			<div class="mt-6 text-center text-sm text-sw-text-dim">
				Don't have an account?
				<a href="/signup" class="text-sw-accent hover:underline">Sign up</a>
			</div>
		</div>
	</div>
</div>
