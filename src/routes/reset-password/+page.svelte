<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import Logo from '$lib/components/Logo.svelte';

	let { data } = $props();

	let password = $state('');
	let confirmPassword = $state('');
	let loading = $state(false);
	let error = $state<string | null>(null);
	let success = $state(false);
	let sessionReady = $state(false);

	// Password validation
	const hasMinLength = $derived(password.length >= 10);
	const hasLowercase = $derived(/[a-z]/.test(password));
	const hasUppercase = $derived(/[A-Z]/.test(password));
	const hasDigit = $derived(/[0-9]/.test(password));
	const isPasswordValid = $derived(hasMinLength && hasLowercase && hasUppercase && hasDigit);

	// Handle the recovery token from the URL
	onMount(async () => {
		if (browser) {
			// Supabase will automatically handle the recovery token from the URL hash
			// We just need to wait for the session to be ready
			const { data: sessionData, error: sessionError } = await data.supabase.auth.getSession();
			
			if (sessionError) {
				error = 'Invalid or expired reset link. Please request a new one.';
			} else if (!sessionData?.session) {
				// Check for recovery token in URL
				const hashParams = new URLSearchParams(window.location.hash.substring(1));
				const type = hashParams.get('type');
				
				if (type === 'recovery') {
					// Wait a moment for Supabase to process the recovery
					await new Promise(resolve => setTimeout(resolve, 1000));
					const { data: recheckSession } = await data.supabase.auth.getSession();
					if (recheckSession?.session) {
						sessionReady = true;
					} else {
						error = 'Invalid or expired reset link. Please request a new one.';
					}
				} else {
					error = 'Invalid reset link. Please request a new password reset.';
				}
			} else {
				sessionReady = true;
			}
		}
	});

	async function handlePasswordReset(e: Event) {
		e.preventDefault();
		loading = true;
		error = null;

		if (password !== confirmPassword) {
			error = 'Passwords do not match';
			loading = false;
			return;
		}

		if (!isPasswordValid) {
			error = 'Password does not meet all requirements';
			loading = false;
			return;
		}

		const { error: updateError } = await data.supabase.auth.updateUser({
			password: password
		});

		if (updateError) {
			error = updateError.message;
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
				<div class="w-12 h-12 rounded-xl bg-gradient-to-br from-sw-accent to-emerald-600 flex items-center justify-center text-white p-2.5 shadow-lg shadow-sw-accent/20">
					<Logo size="lg" class="text-white" />
				</div>
				<span class="font-display text-2xl font-semibold text-sw-text">SpentWorth</span>
			</a>
			<h1 class="font-display text-2xl font-bold mb-2">Set new password</h1>
			<p class="text-sw-text-dim">Enter your new password below</p>
		</div>

		<div class="card">
			{#if success}
				<div class="text-center py-4">
					<div class="w-16 h-16 mx-auto rounded-full bg-sw-accent/20 flex items-center justify-center mb-4">
						<svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 text-sw-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
						</svg>
					</div>
					<h2 class="font-display text-xl font-semibold mb-2">Password updated!</h2>
					<p class="text-sw-text-dim text-sm">
						Your password has been successfully reset.
					</p>
					<a href="/dashboard" class="btn btn-primary mt-6 inline-block">Go to Dashboard</a>
				</div>
			{:else if error && !sessionReady}
				<div class="text-center py-4">
					<div class="w-16 h-16 mx-auto rounded-full bg-sw-danger/20 flex items-center justify-center mb-4">
						<svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 text-sw-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
						</svg>
					</div>
					<h2 class="font-display text-xl font-semibold mb-2">Link expired</h2>
					<p class="text-sw-text-dim text-sm">
						{error}
					</p>
					<a href="/forgot-password" class="btn btn-primary mt-6 inline-block">Request New Link</a>
				</div>
			{:else if !sessionReady}
				<div class="text-center py-8">
					<div class="w-8 h-8 mx-auto rounded-full border-2 border-sw-accent border-t-transparent animate-spin mb-4"></div>
					<p class="text-sw-text-dim text-sm">Verifying reset link...</p>
				</div>
			{:else}
				<form onsubmit={handlePasswordReset} class="space-y-5">
					{#if error}
						<div class="p-3 rounded-lg bg-sw-danger/10 border border-sw-danger/30 text-sw-danger text-sm">
							{error}
						</div>
					{/if}

					<div>
						<label for="password" class="label">New Password</label>
						<input
							id="password"
							type="password"
							bind:value={password}
							required
							class="input"
							placeholder="••••••••"
							minlength="10"
						/>
						{#if password.length > 0}
							<div class="mt-3 space-y-1.5">
								<div class="flex items-center gap-2 text-xs">
									<span class={hasMinLength ? 'text-sw-accent' : 'text-sw-text-dim'}>
										{#if hasMinLength}✓{:else}○{/if}
									</span>
									<span class={hasMinLength ? 'text-sw-text' : 'text-sw-text-dim'}>At least 10 characters</span>
								</div>
								<div class="flex items-center gap-2 text-xs">
									<span class={hasLowercase ? 'text-sw-accent' : 'text-sw-text-dim'}>
										{#if hasLowercase}✓{:else}○{/if}
									</span>
									<span class={hasLowercase ? 'text-sw-text' : 'text-sw-text-dim'}>Lowercase letter (a-z)</span>
								</div>
								<div class="flex items-center gap-2 text-xs">
									<span class={hasUppercase ? 'text-sw-accent' : 'text-sw-text-dim'}>
										{#if hasUppercase}✓{:else}○{/if}
									</span>
									<span class={hasUppercase ? 'text-sw-text' : 'text-sw-text-dim'}>Uppercase letter (A-Z)</span>
								</div>
								<div class="flex items-center gap-2 text-xs">
									<span class={hasDigit ? 'text-sw-accent' : 'text-sw-text-dim'}>
										{#if hasDigit}✓{:else}○{/if}
									</span>
									<span class={hasDigit ? 'text-sw-text' : 'text-sw-text-dim'}>Number (0-9)</span>
								</div>
							</div>
						{:else}
							<p class="mt-2 text-xs text-sw-text-dim">
								Must be 10+ characters with lowercase, uppercase, and number
							</p>
						{/if}
					</div>

					<div>
						<label for="confirmPassword" class="label">Confirm New Password</label>
						<input
							id="confirmPassword"
							type="password"
							bind:value={confirmPassword}
							required
							class="input"
							placeholder="••••••••"
							minlength="10"
						/>
						{#if confirmPassword.length > 0 && password !== confirmPassword}
							<p class="mt-2 text-xs text-sw-danger">Passwords do not match</p>
						{/if}
					</div>

					<button type="submit" disabled={loading} class="btn btn-primary w-full py-3">
						{loading ? 'Updating...' : 'Update Password'}
					</button>
				</form>
			{/if}
		</div>
	</div>
</div>

