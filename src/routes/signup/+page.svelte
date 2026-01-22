<script lang="ts">
	import { goto } from '$app/navigation';
	import Logo from '$lib/components/Logo.svelte';

	let { data } = $props();

	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let loading = $state(false);
	let error = $state<string | null>(null);
	let success = $state(false);

	async function handleSignup(e: Event) {
		e.preventDefault();
		loading = true;
		error = null;

		if (password !== confirmPassword) {
			error = 'Passwords do not match';
			loading = false;
			return;
		}

		if (password.length < 6) {
			error = 'Password must be at least 6 characters';
			loading = false;
			return;
		}

		const { error: authError } = await data.supabase.auth.signUp({
			email,
			password
		});

		if (authError) {
			error = authError.message;
			loading = false;
		} else {
			success = true;
		}
	}

	async function handleGoogleSignup() {
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
			<h1 class="font-display text-2xl font-bold mb-2">Create your account</h1>
			<p class="text-sw-text-dim">Start tracking your opportunity cost</p>
		</div>

		<div class="card">
			{#if success}
				<div class="text-center py-4">
					<div class="w-16 h-16 mx-auto rounded-full bg-sw-accent/20 flex items-center justify-center mb-4">
						<svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 text-sw-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
						</svg>
					</div>
					<h2 class="font-display text-xl font-semibold mb-2">Check your email</h2>
					<p class="text-sw-text-dim text-sm">
						We sent a confirmation link to <strong>{email}</strong>
					</p>
					<a href="/login" class="btn btn-secondary mt-6 inline-block">Back to Login</a>
				</div>
			{:else}
				<form onsubmit={handleSignup} class="space-y-5">
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
						<label for="password" class="label">Password</label>
						<input
							id="password"
							type="password"
							bind:value={password}
							required
							class="input"
							placeholder="••••••••"
						/>
					</div>

					<div>
						<label for="confirmPassword" class="label">Confirm Password</label>
						<input
							id="confirmPassword"
							type="password"
							bind:value={confirmPassword}
							required
							class="input"
							placeholder="••••••••"
						/>
					</div>

				<button type="submit" disabled={loading} class="btn btn-primary w-full py-3">
					{loading ? 'Creating account...' : 'Create Account'}
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
					onclick={handleGoogleSignup}
					disabled={loading}
					class="btn btn-secondary w-full mt-4 flex items-center justify-center gap-2"
				>
					<svg class="w-5 h-5" viewBox="0 0 24 24">
						<path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
						<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
						<path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
						<path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
					</svg>
					Sign up with Google
				</button>
			</div>

			<div class="mt-6 text-center text-sm text-sw-text-dim">
				Already have an account?
				<a href="/login" class="text-sw-accent hover:underline">Sign in</a>
			</div>
			{/if}
		</div>
	</div>
</div>
