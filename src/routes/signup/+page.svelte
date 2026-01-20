<script lang="ts">
	import { goto } from '$app/navigation';

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

				<div class="mt-6 text-center text-sm text-sw-text-dim">
					Already have an account?
					<a href="/login" class="text-sw-accent hover:underline">Sign in</a>
				</div>
			{/if}
		</div>
	</div>
</div>
