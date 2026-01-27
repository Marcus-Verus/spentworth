<script lang="ts">
	import Logo from '$lib/components/Logo.svelte';
	import SEO from '$lib/components/SEO.svelte';

	let { data } = $props();

	let email = $state('');
	let loading = $state(false);
	let error = $state<string | null>(null);
	let success = $state(false);

	async function handleResetRequest(e: Event) {
		e.preventDefault();
		loading = true;
		error = null;

		const origin = typeof window !== 'undefined' ? window.location.origin : '';
		const { error: authError } = await data.supabase.auth.resetPasswordForEmail(email, {
			redirectTo: `${origin}/reset-password`
		});

		if (authError) {
			error = authError.message;
			loading = false;
		} else {
			success = true;
		}
	}
</script>

<SEO 
	title="Reset Password — SpentWorth Account Recovery"
	description="Forgot your SpentWorth password? Enter your email to receive a secure password reset link. We'll have you back tracking spending in no time."
	keywords="SpentWorth password reset, forgot password, account recovery"
	canonical="/forgot-password"
	noindex={true}
/>

<div class="min-h-screen flex items-center justify-center p-6">
	<div class="w-full max-w-md">
		<div class="text-center mb-8">
			<a href="/" class="inline-flex items-center gap-3 group mb-6">
				<div class="w-12 h-12 rounded-xl bg-gradient-to-br from-sw-accent to-emerald-600 flex items-center justify-center text-white p-2.5 shadow-lg shadow-sw-accent/20">
					<Logo size="lg" class="text-white" />
				</div>
				<span class="font-display text-2xl font-semibold text-sw-text">SpentWorth</span>
			</a>
			<h1 class="font-display text-2xl font-bold mb-2">Reset your password</h1>
			<p class="text-sw-text-dim">We'll send you a link to reset your password</p>
		</div>

		<div class="card">
			{#if success}
				<div class="text-center py-4">
					<div class="w-16 h-16 mx-auto rounded-full bg-sw-accent/20 flex items-center justify-center mb-4">
						<svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 text-sw-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
						</svg>
					</div>
					<h2 class="font-display text-xl font-semibold mb-2">Check your email</h2>
					<p class="text-sw-text-dim text-sm">
						We sent a password reset link to <strong>{email}</strong>
					</p>
					<p class="text-sw-text-dim text-xs mt-2">
						If you don't see it, check your spam folder.
					</p>
					<a href="/login" class="btn btn-secondary mt-6 inline-block">Back to Login</a>
				</div>
			{:else}
				<form onsubmit={handleResetRequest} class="space-y-5">
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

					<button type="submit" disabled={loading} class="btn btn-primary w-full py-3">
						{loading ? 'Sending...' : 'Send Reset Link'}
					</button>
				</form>

				<div class="mt-6 text-center text-sm text-sw-text-dim">
					Remember your password?
					<a href="/login" class="text-sw-accent hover:underline">Sign in</a>
				</div>
			{/if}
		</div>
	</div>
</div>

