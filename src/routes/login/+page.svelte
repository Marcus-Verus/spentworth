<script lang="ts">
	import { goto } from '$app/navigation';

	let { data } = $props();

	let email = $state('');
	let password = $state('');
	let loading = $state(false);
	let error = $state<string | null>(null);

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
</script>

<div class="min-h-screen flex items-center justify-center p-6">
	<div class="w-full max-w-md">
		<div class="text-center mb-8">
			<a href="/" class="inline-flex items-center gap-3 group mb-6">
				<div class="w-12 h-12 rounded-xl bg-gradient-to-br from-sw-accent to-emerald-600 flex items-center justify-center text-sw-bg font-bold text-2xl shadow-lg shadow-sw-accent/20">
					$
				</div>
				<span class="font-display text-2xl font-semibold text-sw-text">SpentWorth</span>
			</a>
			<h1 class="font-display text-2xl font-bold mb-2">Welcome back</h1>
			<p class="text-sw-text-dim">Sign in to continue</p>
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

				<button type="submit" disabled={loading} class="btn btn-primary w-full py-3">
					{loading ? 'Signing in...' : 'Sign In'}
				</button>
			</form>

			<div class="mt-6 text-center text-sm text-sw-text-dim">
				Don't have an account?
				<a href="/signup" class="text-sw-accent hover:underline">Sign up</a>
			</div>
		</div>
	</div>
</div>
