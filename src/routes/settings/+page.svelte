<script lang="ts">
	import { onMount } from 'svelte';
	import Header from '$lib/components/Header.svelte';
	import { initTheme, getTheme, setTheme, toggleTheme } from '$lib/stores/theme';
	import type { SubscriptionInfo } from '../api/stripe/subscription/+server';

	let { data } = $props();

	let defaultTicker = $state('SPY');
	let customTicker = $state<string | null>(null);
	let useCustomTicker = $state(false);
	let investDelayTradingDays = $state(1);
	let allowFallbackForAllTickers = $state(false);
	let fallbackAnnualReturn = $state(0.07);
	let monthlyIncome = $state<number | null>(null);
	let loading = $state(true);
	let saving = $state(false);
	let saved = $state(false);
	let isDark = $state(false);
	
	// Subscription state
	let subscription = $state<SubscriptionInfo | null>(null);
	let loadingPortal = $state(false);
	
	// Account deletion state
	let showDeleteModal = $state(false);
	let deleteConfirmText = $state('');
	let deleting = $state(false);
	let deleteError = $state<string | null>(null);
	
	// MFA state
	let mfaEnabled = $state(false);
	let mfaFactors = $state<Array<{ id: string; friendlyName: string; createdAt: string }>>([]);
	let mfaLoading = $state(true);
	let mfaEnrolling = $state(false);
	let mfaQrCode = $state<string | null>(null);
	let mfaSecret = $state<string | null>(null);
	let mfaFactorId = $state<string | null>(null);
	let mfaVerifyCode = $state('');
	let mfaVerifying = $state(false);
	let mfaError = $state<string | null>(null);
	let mfaSuccess = $state<string | null>(null);
	let showDisableMfaModal = $state(false);
	let disablingMfa = $state(false);
	
	// Notification preferences
	let notifPrefs = $state<{
		dailyBriefEnabled: boolean;
		dailyBriefTime: string;
		dailyBriefTimezone: string;
		uploadReminderEnabled: boolean;
		uploadReminderEmail: boolean;
		reviewInboxEnabled: boolean;
		reviewInboxDailyGoal: number;
		weeklyPulseEnabled: boolean;
		weeklyPulseDay: number;
		showUploadNudges: boolean;
		showAchievementBadges: boolean;
	}>({
		dailyBriefEnabled: false,
		dailyBriefTime: '09:00',
		dailyBriefTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York',
		uploadReminderEnabled: true,
		uploadReminderEmail: false,
		reviewInboxEnabled: true,
		reviewInboxDailyGoal: 5,
		weeklyPulseEnabled: true,
		weeklyPulseDay: 1,
		showUploadNudges: true,
		showAchievementBadges: true
	});
	let notifSaving = $state(false);
	let notifSaved = $state(false);
	
	// Common timezones for selection
	const timezones = [
		{ value: 'America/New_York', label: 'Eastern Time (ET)' },
		{ value: 'America/Chicago', label: 'Central Time (CT)' },
		{ value: 'America/Denver', label: 'Mountain Time (MT)' },
		{ value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
		{ value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
		{ value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
		{ value: 'Europe/London', label: 'London (GMT/BST)' },
		{ value: 'Europe/Paris', label: 'Paris (CET)' },
		{ value: 'Europe/Berlin', label: 'Berlin (CET)' },
		{ value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
		{ value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
		{ value: 'Asia/Singapore', label: 'Singapore (SGT)' },
		{ value: 'Asia/Dubai', label: 'Dubai (GST)' },
		{ value: 'Australia/Sydney', label: 'Sydney (AEST)' },
		{ value: 'Australia/Melbourne', label: 'Melbourne (AEST)' },
		{ value: 'Pacific/Auckland', label: 'Auckland (NZST)' }
	];
	
	// Pro tier check based on subscription
	let isPro = $derived(
		subscription?.plan === 'pro' && 
		['active', 'trialing'].includes(subscription?.status || '')
	);

	// Display fallback as percentage (e.g., 7 for 7%)
	let fallbackPercentage = $derived(Math.round(fallbackAnnualReturn * 100));

	onMount(async () => {
		initTheme();
		isDark = getTheme() === 'dark';
		
		// Fetch subscription status
		try {
			const subRes = await fetch('/api/stripe/subscription');
			if (subRes.ok) {
				subscription = await subRes.json();
			}
		} catch (err) {
			console.error('Failed to fetch subscription:', err);
		}
		
		// If not Pro and dark mode is on, reset to light
		if (!isPro && isDark) {
			setTheme('light');
			isDark = false;
		}

		const res = await fetch('/api/settings');
		const json = await res.json();

		if (json.ok) {
			defaultTicker = json.data.defaultTicker;
			customTicker = json.data.customTicker;
			useCustomTicker = !!json.data.customTicker;
			investDelayTradingDays = json.data.investDelayTradingDays;
			allowFallbackForAllTickers = json.data.allowFallbackForAllTickers;
			fallbackAnnualReturn = json.data.fallbackAnnualReturn ?? 0.07;
			monthlyIncome = json.data.monthlyIncome;
		}
		loading = false;
		
		// Load MFA status and notification prefs
		await Promise.all([loadMfaStatus(), loadNotificationPrefs()]);
	});

	async function loadNotificationPrefs() {
		try {
			const res = await fetch('/api/notifications/prefs');
			const json = await res.json();
			if (json.ok && json.data) {
				notifPrefs = {
					dailyBriefEnabled: json.data.dailyBriefEnabled,
					dailyBriefTime: json.data.dailyBriefTime?.slice(0, 5) || '09:30',
					dailyBriefTimezone: json.data.dailyBriefTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York',
					uploadReminderEnabled: json.data.uploadReminderEnabled,
					uploadReminderEmail: json.data.uploadReminderEmail,
					reviewInboxEnabled: json.data.reviewInboxEnabled,
					reviewInboxDailyGoal: json.data.reviewInboxDailyGoal,
					weeklyPulseEnabled: json.data.weeklyPulseEnabled,
					weeklyPulseDay: json.data.weeklyPulseDay,
					showUploadNudges: json.data.showUploadNudges,
					showAchievementBadges: json.data.showAchievementBadges
				};
			}
		} catch (e) {
			console.error('Failed to load notification prefs:', e);
		}
	}

	async function saveNotificationPrefs() {
		notifSaving = true;
		notifSaved = false;
		
		try {
			await fetch('/api/notifications/prefs', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					dailyBriefEnabled: notifPrefs.dailyBriefEnabled,
					dailyBriefTime: notifPrefs.dailyBriefTime + ':00',
					dailyBriefTimezone: notifPrefs.dailyBriefTimezone,
					uploadReminderEnabled: notifPrefs.uploadReminderEnabled,
					uploadReminderEmail: notifPrefs.uploadReminderEmail,
					reviewInboxEnabled: notifPrefs.reviewInboxEnabled,
					reviewInboxDailyGoal: notifPrefs.reviewInboxDailyGoal,
					weeklyPulseEnabled: notifPrefs.weeklyPulseEnabled,
					weeklyPulseDay: notifPrefs.weeklyPulseDay,
					showUploadNudges: notifPrefs.showUploadNudges,
					showAchievementBadges: notifPrefs.showAchievementBadges
				})
			});
			notifSaved = true;
			setTimeout(() => notifSaved = false, 2000);
		} catch (e) {
			console.error('Failed to save notification prefs:', e);
		}
		
		notifSaving = false;
	}

	function handleFallbackChange(e: Event) {
		const target = e.target as HTMLInputElement;
		const val = parseFloat(target.value);
		if (!isNaN(val) && val >= 0 && val <= 50) {
			fallbackAnnualReturn = val / 100;
		}
	}
	
	function handleThemeToggle() {
		if (!isPro) return;
		toggleTheme();
		isDark = getTheme() === 'dark';
	}

	async function saveSettings() {
		saving = true;
		saved = false;

		await fetch('/api/settings', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				defaultTicker,
				customTicker: useCustomTicker ? customTicker : null,
				investDelayTradingDays,
				allowFallbackForAllTickers,
				fallbackAnnualReturn,
				monthlyIncome
			})
		});

		saving = false;
		saved = true;
		setTimeout(() => saved = false, 2000);
	}

	async function openBillingPortal() {
		loadingPortal = true;
		try {
			const res = await fetch('/api/stripe/portal', { method: 'POST' });
			if (res.ok) {
				const { url } = await res.json();
				window.location.href = url;
			} else {
				console.error('Failed to open billing portal');
			}
		} catch (err) {
			console.error('Portal error:', err);
		}
		loadingPortal = false;
	}

	// Calculate potential savings growth using configured annual return over 10 years
	function calculateFutureValue(monthlySavings: number): number {
		const rate = 1 + fallbackAnnualReturn;
		let total = 0;
		for (let month = 0; month < 120; month++) {
			total = (total + monthlySavings) * Math.pow(rate, 1/12);
		}
		return Math.round(total);
	}

	function formatDate(dateStr: string | null): string {
		if (!dateStr) return '';
		return new Date(dateStr).toLocaleDateString('en-US', {
			month: 'long',
			day: 'numeric',
			year: 'numeric'
		});
	}

	function getStatusBadge(status: string) {
		switch (status) {
			case 'active':
				return { text: 'Active', class: 'bg-green-500/20 text-green-600 border-green-500/30' };
			case 'trialing':
				return { text: 'Trial', class: 'bg-blue-500/20 text-blue-600 border-blue-500/30' };
			case 'past_due':
				return { text: 'Past Due', class: 'bg-red-500/20 text-red-600 border-red-500/30' };
			case 'canceled':
				return { text: 'Canceled', class: 'bg-gray-500/20 text-gray-600 border-gray-500/30' };
			default:
				return { text: 'Free', class: 'bg-gray-500/20 text-gray-600 border-gray-500/30' };
		}
	}

	async function deleteAccount() {
		if (deleteConfirmText !== 'DELETE') return;
		
		deleting = true;
		deleteError = null;

		try {
			const res = await fetch('/api/account/delete', { method: 'DELETE' });
			
			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.message || 'Failed to delete account');
			}

			// Clear local storage and redirect to home
			localStorage.clear();
			window.location.href = '/?deleted=true';
		} catch (err) {
			deleteError = err instanceof Error ? err.message : 'Something went wrong';
			deleting = false;
		}
	}

	// MFA Functions
	async function loadMfaStatus() {
		try {
			const res = await fetch('/api/mfa/status');
			if (res.ok) {
				const data = await res.json();
				mfaEnabled = data.enabled;
				mfaFactors = data.factors || [];
			}
		} catch (err) {
			console.error('Failed to load MFA status:', err);
		}
		mfaLoading = false;
	}

	async function startMfaEnrollment() {
		mfaEnrolling = true;
		mfaError = null;
		mfaSuccess = null;

		try {
			const res = await fetch('/api/mfa/enroll', { method: 'POST' });
			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || 'Failed to start enrollment');
			}

			mfaQrCode = data.qrCode;
			mfaSecret = data.secret;
			mfaFactorId = data.factorId;
		} catch (err) {
			mfaError = err instanceof Error ? err.message : 'Failed to start MFA enrollment';
		}
		mfaEnrolling = false;
	}

	async function verifyMfaCode() {
		if (mfaVerifyCode.length !== 6) {
			mfaError = 'Please enter a 6-digit code';
			return;
		}

		mfaVerifying = true;
		mfaError = null;

		try {
			const res = await fetch('/api/mfa/verify', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					factorId: mfaFactorId,
					code: mfaVerifyCode
				})
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || 'Verification failed');
			}

			// Success - reset enrollment state and refresh status
			mfaSuccess = 'Two-factor authentication enabled successfully!';
			mfaQrCode = null;
			mfaSecret = null;
			mfaFactorId = null;
			mfaVerifyCode = '';
			await loadMfaStatus();
		} catch (err) {
			mfaError = err instanceof Error ? err.message : 'Verification failed';
		}
		mfaVerifying = false;
	}

	function cancelMfaEnrollment() {
		mfaQrCode = null;
		mfaSecret = null;
		mfaFactorId = null;
		mfaVerifyCode = '';
		mfaError = null;
	}

	async function disableMfa(factorId: string) {
		disablingMfa = true;
		mfaError = null;

		try {
			const res = await fetch('/api/mfa/unenroll', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ factorId })
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || 'Failed to disable MFA');
			}

			mfaSuccess = 'Two-factor authentication disabled.';
			showDisableMfaModal = false;
			await loadMfaStatus();
		} catch (err) {
			mfaError = err instanceof Error ? err.message : 'Failed to disable MFA';
		}
		disablingMfa = false;
	}
</script>

<div class="min-h-screen">
	<Header />

	<main class="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
		<h1 class="font-display text-2xl sm:text-3xl font-bold mb-6 sm:mb-8" style="color: {isDark ? '#ffffff' : '#171717'}">Settings</h1>

		{#if loading}
			<div class="flex items-center justify-center py-16">
				<div class="w-8 h-8 rounded-full border-2 border-sw-accent border-t-transparent animate-spin"></div>
			</div>
		{:else}
			<div class="space-y-8">
				<!-- Subscription Status -->
				<div class="rounded-2xl p-6" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}; box-shadow: {isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.06)'}">
					<div class="flex items-center justify-between mb-4">
						<h2 class="font-display text-lg font-semibold" style="color: {isDark ? '#ffffff' : '#171717'}">
							<i class="fa-solid fa-credit-card text-sw-accent mr-2"></i>Subscription
						</h2>
						{#if subscription}
							{@const badge = getStatusBadge(subscription.status)}
							<span class="px-2.5 py-1 text-xs font-semibold rounded-full border {badge.class}">
								{badge.text}
							</span>
						{/if}
					</div>
					
					{#if subscription && isPro}
						<div class="space-y-4">
							<div class="flex items-center justify-between">
								<div>
									<p class="font-semibold" style="color: {isDark ? '#ffffff' : '#171717'}">
										SpentWorth Pro
										{#if subscription.interval}
											<span class="text-sm font-normal" style="color: {isDark ? '#a3a3a3' : '#737373'}">
												({subscription.interval === 'yearly' ? 'Annual' : 'Monthly'})
											</span>
										{/if}
									</p>
									{#if subscription.status === 'trialing' && subscription.trialEnd}
										<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">
											Trial ends {formatDate(subscription.trialEnd)}
										</p>
									{:else if subscription.currentPeriodEnd}
										<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">
											{subscription.cancelAtPeriodEnd ? 'Cancels' : 'Renews'} {formatDate(subscription.currentPeriodEnd)}
										</p>
									{/if}
								</div>
								<button
									onclick={openBillingPortal}
									disabled={loadingPortal}
									class="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
									style="background: {isDark ? '#2a2a2a' : '#f5f0e8'}; color: {isDark ? '#ffffff' : '#171717'}"
								>
									{#if loadingPortal}
										<i class="fa-solid fa-spinner fa-spin mr-1"></i>
									{/if}
									Manage Billing
								</button>
							</div>
							
							{#if subscription.cancelAtPeriodEnd}
								<div class="rounded-xl p-4" style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2)">
									<p class="text-sm" style="color: {isDark ? '#fca5a5' : '#dc2626'}">
										<i class="fa-solid fa-exclamation-triangle mr-2"></i>
										Your subscription will end on {formatDate(subscription.currentPeriodEnd)}. 
										<button onclick={openBillingPortal} class="underline font-medium">Reactivate</button>
									</p>
								</div>
							{/if}
						</div>
					{:else}
						<div class="space-y-4">
							<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">
								You're on the free plan. Upgrade to Pro for unlimited imports, deep analytics, and more.
							</p>
							<div class="flex items-center gap-3">
								<a 
									href="/pricing" 
									class="px-4 py-2 rounded-lg text-sm font-semibold transition-colors bg-sw-accent text-white hover:bg-sw-accent/90"
								>
									<i class="fa-solid fa-crown mr-1.5"></i>
									Upgrade to Pro
								</a>
								{#if subscription?.hasStripeCustomer}
									<button
										onclick={openBillingPortal}
										disabled={loadingPortal}
										class="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
										style="background: {isDark ? '#2a2a2a' : '#f5f0e8'}; color: {isDark ? '#ffffff' : '#171717'}"
									>
										View Billing History
									</button>
								{/if}
							</div>
						</div>
					{/if}
				</div>

				<!-- Security / MFA Settings -->
				<div class="rounded-2xl p-6" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}; box-shadow: {isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.06)'}">
					<div class="flex items-center justify-between mb-4">
						<h2 class="font-display text-lg font-semibold" style="color: {isDark ? '#ffffff' : '#171717'}">
							<i class="fa-solid fa-shield-halved text-sw-accent mr-2"></i>Security
						</h2>
						{#if mfaEnabled}
							<span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-green-500/20 text-green-600 border border-green-500/30">
								<i class="fa-solid fa-check mr-1"></i>MFA Enabled
							</span>
						{/if}
					</div>

					{#if mfaLoading}
						<div class="flex items-center gap-2 py-4">
							<div class="w-5 h-5 rounded-full border-2 border-sw-accent border-t-transparent animate-spin"></div>
							<span class="text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">Loading security settings...</span>
						</div>
					{:else}
						<div class="space-y-4">
							{#if mfaSuccess}
								<div class="p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-600 text-sm">
									<i class="fa-solid fa-check-circle mr-2"></i>{mfaSuccess}
								</div>
							{/if}

							{#if mfaError}
								<div class="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-sm">
									<i class="fa-solid fa-exclamation-circle mr-2"></i>{mfaError}
								</div>
							{/if}

							<!-- MFA Status and Actions -->
							{#if mfaEnabled}
								<!-- MFA is enabled - show status -->
								<div class="space-y-3">
									<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">
										Your account is protected with two-factor authentication using an authenticator app.
									</p>
									
									{#each mfaFactors as factor}
										<div class="flex items-center justify-between p-3 rounded-lg" style="background: {isDark ? '#0a0a0a' : '#f9f9f9'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
											<div class="flex items-center gap-3">
												<div class="w-10 h-10 rounded-lg flex items-center justify-center" style="background: {isDark ? '#1a1a1a' : '#ffffff'}">
													<i class="fa-solid fa-mobile-screen text-sw-accent"></i>
												</div>
												<div>
													<p class="font-medium text-sm" style="color: {isDark ? '#ffffff' : '#171717'}">{factor.friendlyName || 'Authenticator App'}</p>
													<p class="text-xs" style="color: {isDark ? '#a3a3a3' : '#737373'}">
														Added {new Date(factor.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
													</p>
												</div>
											</div>
											<button
												onclick={() => showDisableMfaModal = true}
												class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors text-red-500 hover:bg-red-500/10"
											>
												Remove
											</button>
										</div>
									{/each}
								</div>
							{:else if mfaQrCode}
								<!-- Enrollment in progress - show QR code -->
								<div class="space-y-4">
									<div class="rounded-xl p-4" style="background: {isDark ? '#0a0a0a' : '#f5f0e8'}; border: 1px solid {isDark ? '#2a2a2a' : '#d4cfc5'}">
										<h3 class="font-semibold mb-3" style="color: {isDark ? '#ffffff' : '#171717'}">
											<i class="fa-solid fa-qrcode mr-2 text-sw-accent"></i>Step 1: Scan QR Code
										</h3>
										<p class="text-sm mb-4" style="color: {isDark ? '#a3a3a3' : '#737373'}">
											Open your authenticator app (Google Authenticator, Authy, 1Password, etc.) and scan this QR code:
										</p>
										<div class="flex justify-center p-4 rounded-lg" style="background: white">
											<img src={mfaQrCode} alt="MFA QR Code" class="w-48 h-48" />
										</div>
										
										<details class="mt-4">
											<summary class="text-sm cursor-pointer" style="color: {isDark ? '#a3a3a3' : '#737373'}">
												Can't scan? Enter code manually
											</summary>
											<div class="mt-2 p-3 rounded-lg font-mono text-sm break-all" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; color: {isDark ? '#ffffff' : '#171717'}">
												{mfaSecret}
											</div>
										</details>
									</div>

									<div class="rounded-xl p-4" style="background: {isDark ? '#0a0a0a' : '#f5f0e8'}; border: 1px solid {isDark ? '#2a2a2a' : '#d4cfc5'}">
										<h3 class="font-semibold mb-3" style="color: {isDark ? '#ffffff' : '#171717'}">
											<i class="fa-solid fa-keyboard mr-2 text-sw-accent"></i>Step 2: Enter Verification Code
										</h3>
										<p class="text-sm mb-4" style="color: {isDark ? '#a3a3a3' : '#737373'}">
											Enter the 6-digit code from your authenticator app to complete setup:
										</p>
										<div class="flex items-center gap-3">
											<input
												type="text"
												bind:value={mfaVerifyCode}
												placeholder="000000"
												maxlength="6"
												pattern="[0-9]*"
												inputmode="numeric"
												class="w-32 px-4 py-2 rounded-lg text-center font-mono text-lg tracking-widest"
												style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#d4cfc5'}; color: {isDark ? '#ffffff' : '#171717'}"
											/>
											<button
												onclick={verifyMfaCode}
												disabled={mfaVerifying || mfaVerifyCode.length !== 6}
												class="btn btn-primary disabled:opacity-50"
											>
												{#if mfaVerifying}
													<i class="fa-solid fa-spinner fa-spin mr-1"></i>
												{/if}
												Verify
											</button>
										</div>
									</div>

									<button
										onclick={cancelMfaEnrollment}
										class="text-sm font-medium transition-colors"
										style="color: {isDark ? '#a3a3a3' : '#737373'}"
									>
										<i class="fa-solid fa-arrow-left mr-1"></i>Cancel setup
									</button>
								</div>
							{:else}
								<!-- MFA not enabled - show enable button -->
								<div class="space-y-4">
									<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">
										Add an extra layer of security to your account by enabling two-factor authentication with an authenticator app like Google Authenticator, Authy, or 1Password.
									</p>
									
									<div class="rounded-xl p-4" style="background: rgba(56,142,60,0.08); border: 1px solid rgba(56,142,60,0.2)">
										<div class="flex items-start gap-3">
											<div class="w-8 h-8 rounded-lg bg-sw-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
												<i class="fa-solid fa-lock text-sw-accent text-sm"></i>
											</div>
											<div>
												<p class="font-medium text-sm mb-1" style="color: {isDark ? '#ffffff' : '#171717'}">Why enable MFA?</p>
												<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">
													Even if someone gets your password, they can't access your account without your phone.
												</p>
											</div>
										</div>
									</div>

									<button
										onclick={startMfaEnrollment}
										disabled={mfaEnrolling}
										class="px-4 py-2 rounded-lg text-sm font-semibold transition-colors bg-sw-accent text-white hover:bg-sw-accent/90 disabled:opacity-50"
									>
										{#if mfaEnrolling}
											<i class="fa-solid fa-spinner fa-spin mr-1.5"></i>
											Setting up...
										{:else}
											<i class="fa-solid fa-shield-halved mr-1.5"></i>
											Enable Two-Factor Authentication
										{/if}
									</button>
								</div>
							{/if}
						</div>
					{/if}
				</div>

				<!-- Notification Settings -->
				<div id="notifications" class="rounded-2xl p-6" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}; box-shadow: {isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.06)'}">
					<h2 class="font-display text-lg font-semibold mb-4" style="color: {isDark ? '#ffffff' : '#171717'}">
						<i class="fa-solid fa-bell text-sw-accent mr-2"></i>Notifications & Engagement
					</h2>
					
					<div class="space-y-6">
						<!-- Daily Brief -->
						<div class="space-y-3">
							<div class="flex items-center justify-between">
								<div>
									<p class="font-medium" style="color: {isDark ? '#ffffff' : '#171717'}">Daily Brief Email</p>
									<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">
										Get a morning summary of your spending pace and insights
									</p>
								</div>
								<button
									onclick={() => notifPrefs.dailyBriefEnabled = !notifPrefs.dailyBriefEnabled}
									class="relative w-12 h-7 rounded-full transition-all cursor-pointer"
									style="background: {notifPrefs.dailyBriefEnabled ? '#0d9488' : (isDark ? '#2a2a2a' : '#e5e5e5')}"
								>
									<span 
										class="absolute top-0.5 w-6 h-6 rounded-full transition-all bg-white shadow-md"
										style="left: {notifPrefs.dailyBriefEnabled ? '1.375rem' : '0.125rem'}"
									></span>
								</button>
							</div>
							{#if notifPrefs.dailyBriefEnabled}
								<div class="flex flex-wrap items-center gap-3 pl-4">
									<div class="flex items-center gap-2">
										<label class="text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">Send at:</label>
										<select
											bind:value={notifPrefs.dailyBriefTime}
											class="px-3 py-1.5 rounded-lg text-sm"
											style="background: {isDark ? '#0a0a0a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#d4cfc5'}; color: {isDark ? '#ffffff' : '#171717'}"
										>
											<option value="06:00">6:00 AM</option>
											<option value="07:00">7:00 AM</option>
											<option value="08:00">8:00 AM</option>
											<option value="09:00">9:00 AM</option>
											<option value="10:00">10:00 AM</option>
											<option value="11:00">11:00 AM</option>
											<option value="12:00">12:00 PM</option>
											<option value="18:00">6:00 PM</option>
											<option value="19:00">7:00 PM</option>
											<option value="20:00">8:00 PM</option>
											<option value="21:00">9:00 PM</option>
										</select>
									</div>
									<div class="flex items-center gap-2">
										<label class="text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">in</label>
										<select
											bind:value={notifPrefs.dailyBriefTimezone}
											class="px-3 py-1.5 rounded-lg text-sm"
											style="background: {isDark ? '#0a0a0a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#d4cfc5'}; color: {isDark ? '#ffffff' : '#171717'}"
										>
											{#each timezones as tz}
												<option value={tz.value}>{tz.label}</option>
											{/each}
										</select>
									</div>
								</div>
							{/if}
						</div>

						<div style="border-top: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}"></div>

						<!-- Weekly Pulse -->
						<div class="space-y-3">
							<div class="flex items-center justify-between">
								<div>
									<p class="font-medium" style="color: {isDark ? '#ffffff' : '#171717'}">Weekly Pulse Email</p>
									<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">
										Weekly summary with trends and opportunity cost insights
									</p>
								</div>
								<button
									onclick={() => notifPrefs.weeklyPulseEnabled = !notifPrefs.weeklyPulseEnabled}
									class="relative w-12 h-7 rounded-full transition-all cursor-pointer"
									style="background: {notifPrefs.weeklyPulseEnabled ? '#0d9488' : (isDark ? '#2a2a2a' : '#e5e5e5')}"
								>
									<span 
										class="absolute top-0.5 w-6 h-6 rounded-full transition-all bg-white shadow-md"
										style="left: {notifPrefs.weeklyPulseEnabled ? '1.375rem' : '0.125rem'}"
									></span>
								</button>
							</div>
							{#if notifPrefs.weeklyPulseEnabled}
								<div class="flex items-center gap-3 pl-4">
									<label class="text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">Send on:</label>
									<select
										bind:value={notifPrefs.weeklyPulseDay}
										class="px-3 py-1.5 rounded-lg text-sm"
										style="background: {isDark ? '#0a0a0a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#d4cfc5'}; color: {isDark ? '#ffffff' : '#171717'}"
									>
										<option value={0}>Sunday</option>
										<option value={1}>Monday</option>
										<option value={2}>Tuesday</option>
										<option value={3}>Wednesday</option>
										<option value={4}>Thursday</option>
										<option value={5}>Friday</option>
										<option value={6}>Saturday</option>
									</select>
								</div>
							{/if}
						</div>

						<div style="border-top: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}"></div>

						<!-- Upload Reminders -->
						<div class="flex items-center justify-between">
							<div>
								<p class="font-medium" style="color: {isDark ? '#ffffff' : '#171717'}">Upload Reminders</p>
								<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">
									Show nudges when it's time to upload fresh data
								</p>
							</div>
							<button
								onclick={() => notifPrefs.showUploadNudges = !notifPrefs.showUploadNudges}
								class="relative w-12 h-7 rounded-full transition-all cursor-pointer"
								style="background: {notifPrefs.showUploadNudges ? '#0d9488' : (isDark ? '#2a2a2a' : '#e5e5e5')}"
							>
								<span 
									class="absolute top-0.5 w-6 h-6 rounded-full transition-all bg-white shadow-md"
									style="left: {notifPrefs.showUploadNudges ? '1.375rem' : '0.125rem'}"
								></span>
							</button>
						</div>

						<!-- Review Inbox -->
						<div class="space-y-3">
							<div class="flex items-center justify-between">
								<div>
									<p class="font-medium" style="color: {isDark ? '#ffffff' : '#171717'}">Review Inbox</p>
									<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">
										Daily items to categorize and improve your data
									</p>
								</div>
								<button
									onclick={() => notifPrefs.reviewInboxEnabled = !notifPrefs.reviewInboxEnabled}
									class="relative w-12 h-7 rounded-full transition-all cursor-pointer"
									style="background: {notifPrefs.reviewInboxEnabled ? '#0d9488' : (isDark ? '#2a2a2a' : '#e5e5e5')}"
								>
									<span 
										class="absolute top-0.5 w-6 h-6 rounded-full transition-all bg-white shadow-md"
										style="left: {notifPrefs.reviewInboxEnabled ? '1.375rem' : '0.125rem'}"
									></span>
								</button>
							</div>
							{#if notifPrefs.reviewInboxEnabled}
								<div class="flex items-center gap-3 pl-4">
									<label class="text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">Daily goal:</label>
									<select
										bind:value={notifPrefs.reviewInboxDailyGoal}
										class="px-3 py-1.5 rounded-lg text-sm"
										style="background: {isDark ? '#0a0a0a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#d4cfc5'}; color: {isDark ? '#ffffff' : '#171717'}"
									>
										<option value={3}>3 items</option>
										<option value={5}>5 items</option>
										<option value={10}>10 items</option>
										<option value={15}>15 items</option>
									</select>
								</div>
							{/if}
						</div>

						<div style="border-top: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}"></div>

						<!-- Achievement Badges -->
						<div class="flex items-center justify-between">
							<div>
								<p class="font-medium" style="color: {isDark ? '#ffffff' : '#171717'}">Achievement Badges</p>
								<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">
									Show streaks and progress celebrations
								</p>
							</div>
							<button
								onclick={() => notifPrefs.showAchievementBadges = !notifPrefs.showAchievementBadges}
								class="relative w-12 h-7 rounded-full transition-all cursor-pointer"
								style="background: {notifPrefs.showAchievementBadges ? '#0d9488' : (isDark ? '#2a2a2a' : '#e5e5e5')}"
							>
								<span 
									class="absolute top-0.5 w-6 h-6 rounded-full transition-all bg-white shadow-md"
									style="left: {notifPrefs.showAchievementBadges ? '1.375rem' : '0.125rem'}"
								></span>
							</button>
						</div>

						<!-- Save Button -->
						<div class="flex items-center gap-4 pt-2">
							<button
								onclick={saveNotificationPrefs}
								disabled={notifSaving}
								class="px-4 py-2 rounded-lg text-sm font-semibold transition-colors bg-sw-accent text-white hover:bg-sw-accent/90 disabled:opacity-50"
							>
								{notifSaving ? 'Saving...' : 'Save Notification Settings'}
							</button>
							{#if notifSaved}
								<span class="text-sw-accent text-sm animate-fade-in">Saved!</span>
							{/if}
						</div>
					</div>
				</div>

				<!-- Income Settings -->
				<div class="rounded-2xl p-6" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}; box-shadow: {isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.06)'}">
					<h2 class="font-display text-lg font-semibold mb-4" style="color: {isDark ? '#ffffff' : '#171717'}">
						<i class="fa-solid fa-wallet text-sw-accent mr-2"></i>Monthly Income
					</h2>
					
					<div class="space-y-4">
						<div>
							<label for="income" class="block text-sm font-medium mb-2" style="color: {isDark ? '#ffffff' : '#171717'}">Your monthly take-home pay</label>
							<div class="flex items-center gap-2 max-w-xs">
								<span class="text-lg" style="color: {isDark ? '#a3a3a3' : '#737373'}">$</span>
								<input
									id="income"
									type="number"
									bind:value={monthlyIncome}
									placeholder="5000"
									class="flex-1 px-3 py-2 rounded-lg text-sm"
									style="background: {isDark ? '#0a0a0a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#d4cfc5'}; color: {isDark ? '#ffffff' : '#171717'}"
								/>
							</div>
							<p class="text-sm mt-2" style="color: {isDark ? '#a3a3a3' : '#737373'}">
								Optional. Used to calculate your savings rate and show what your savings could grow into.
							</p>
						</div>

						{#if monthlyIncome && monthlyIncome > 0}
							<div class="rounded-xl p-4" style="background: rgba(56,142,60,0.1); border: 1px solid rgba(56,142,60,0.2)">
								<p class="text-sm" style="color: {isDark ? '#ffffff' : '#171717'}">
									<i class="fa-solid fa-chart-line text-sw-accent mr-2"></i>
									If you save <span class="font-semibold">20%</span> of your income (${Math.round(monthlyIncome * 0.2).toLocaleString()}/month) at <span class="font-semibold">{fallbackPercentage}%</span> annual return, 
									that could grow to <span class="font-semibold text-sw-accent">${calculateFutureValue(monthlyIncome * 0.2).toLocaleString()}</span> in 10 years.
								</p>
							</div>
						{/if}
					</div>
				</div>

				<!-- Investment Settings -->
				<div class="rounded-2xl p-6" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}; box-shadow: {isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.06)'}">
					<h2 class="font-display text-lg font-semibold mb-4" style="color: {isDark ? '#ffffff' : '#171717'}">
						<i class="fa-solid fa-chart-line text-sw-accent mr-2"></i>Investment Settings
					</h2>
					
					<div class="space-y-6">
						<!-- Ticker Selection -->
						<div>
							<label for="ticker" class="block text-sm font-medium mb-2" style="color: {isDark ? '#ffffff' : '#171717'}">Benchmark Ticker</label>
							
							<!-- Toggle between preset and custom -->
							<div class="flex items-center gap-4 mb-3">
								<label class="flex items-center gap-2 cursor-pointer">
									<input
										type="radio"
										name="tickerMode"
										checked={!useCustomTicker}
										onchange={() => useCustomTicker = false}
										class="w-4 h-4 accent-sw-accent"
									/>
									<span class="text-sm" style="color: {isDark ? '#ffffff' : '#171717'}">Preset</span>
								</label>
								<label class="flex items-center gap-2 cursor-pointer">
									<input
										type="radio"
										name="tickerMode"
										checked={useCustomTicker}
										onchange={() => useCustomTicker = true}
										class="w-4 h-4 accent-sw-accent"
									/>
									<span class="text-sm" style="color: {isDark ? '#ffffff' : '#171717'}">Custom Ticker</span>
								</label>
							</div>

							{#if useCustomTicker}
								<div class="max-w-xs">
									<input
										id="customTicker"
										type="text"
										bind:value={customTicker}
										placeholder="e.g., AAPL, MSFT, VXUS"
										maxlength="5"
										class="w-full px-3 py-2 rounded-lg text-sm uppercase"
										style="background: {isDark ? '#0a0a0a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#d4cfc5'}; color: {isDark ? '#ffffff' : '#171717'}"
									/>
									<p class="text-sm mt-1" style="color: {isDark ? '#a3a3a3' : '#737373'}">
										Enter any stock or ETF ticker symbol (powered by Alpha Vantage Premium)
									</p>
								</div>
							{:else}
								<select
									id="ticker"
									bind:value={defaultTicker}
									class="max-w-xs px-3 py-2 rounded-lg text-sm w-full"
									style="background: {isDark ? '#0a0a0a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#d4cfc5'}; color: {isDark ? '#ffffff' : '#171717'}"
								>
									<option value="SPY">SPY (S&P 500)</option>
									<option value="VTI">VTI (Total Market)</option>
									<option value="VOO">VOO (S&P 500)</option>
									<option value="QQQ">QQQ (Nasdaq 100)</option>
								</select>
								<p class="text-sm mt-1" style="color: {isDark ? '#a3a3a3' : '#737373'}">Popular index funds for opportunity cost calculations</p>
							{/if}
						</div>

						<div>
							<label for="delay" class="block text-sm font-medium mb-2" style="color: {isDark ? '#ffffff' : '#171717'}">Investment Delay (Trading Days)</label>
							<select
								id="delay"
								bind:value={investDelayTradingDays}
								class="max-w-xs px-3 py-2 rounded-lg text-sm w-full"
								style="background: {isDark ? '#0a0a0a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#d4cfc5'}; color: {isDark ? '#ffffff' : '#171717'}"
							>
								<option value={0}>Same day (0 days)</option>
								<option value={1}>Next trading day (1 day)</option>
								<option value={3}>3 trading days</option>
								<option value={7}>7 trading days</option>
							</select>
							<p class="text-sm mt-1" style="color: {isDark ? '#a3a3a3' : '#737373'}">Simulates when you'd realistically invest after a purchase</p>
						</div>

						<!-- Fallback Settings -->
						<div class="space-y-4 pt-4" style="border-top: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}">
							<h3 class="text-sm font-semibold" style="color: {isDark ? '#ffffff' : '#171717'}">Fallback Calculation</h3>
							
							<div>
								<label class="flex items-center gap-3 cursor-pointer">
									<input
										type="checkbox"
										bind:checked={allowFallbackForAllTickers}
										class="w-5 h-5 rounded focus:ring-sw-accent focus:ring-2 accent-sw-accent"
										style="background: {isDark ? '#0a0a0a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#d4cfc5'}"
									/>
									<span style="color: {isDark ? '#ffffff' : '#171717'}">Use fallback when price data unavailable</span>
								</label>
								<p class="text-sm mt-1 ml-8" style="color: {isDark ? '#a3a3a3' : '#737373'}">
									Some tickers may not have enough history. Enable this to still calculate opportunity cost.
								</p>
							</div>

							<div>
								<label for="fallbackRate" class="block text-sm font-medium mb-2" style="color: {isDark ? '#ffffff' : '#171717'}">Fallback Annual Return</label>
								<div class="flex items-center gap-2 max-w-xs">
									<input
										id="fallbackRate"
										type="number"
										min="0"
										max="50"
										step="0.5"
										value={fallbackPercentage}
										onchange={handleFallbackChange}
										class="w-20 px-3 py-2 rounded-lg text-sm text-center"
										style="background: {isDark ? '#0a0a0a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#d4cfc5'}; color: {isDark ? '#ffffff' : '#171717'}"
									/>
									<span style="color: {isDark ? '#a3a3a3' : '#737373'}">%</span>
								</div>
								<p class="text-sm mt-1" style="color: {isDark ? '#a3a3a3' : '#737373'}">
									Annual return rate used when historical prices aren't available (default: 7%)
								</p>
							</div>
						</div>
					</div>
				</div>

				<!-- Appearance Settings (Pro Feature) -->
				<div class="rounded-2xl p-6 relative overflow-hidden" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}; box-shadow: {isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.06)'}">
					<div class="flex items-center justify-between mb-4">
						<h2 class="font-display text-lg font-semibold" style="color: {isDark ? '#ffffff' : '#171717'}">
							<i class="fa-solid fa-palette text-sw-accent mr-2"></i>Appearance
						</h2>
						{#if !isPro}
							<span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-600 border border-amber-500/30">
								<i class="fa-solid fa-crown mr-1"></i>Pro
							</span>
						{/if}
					</div>
					
					<div class="space-y-4">
						<div class="flex items-center justify-between">
							<div>
								<p class="font-medium mb-1" style="color: {isDark ? '#ffffff' : '#171717'}">Dark Mode</p>
								<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">
									{isPro ? 'Switch between light and dark themes' : 'Upgrade to Pro to unlock dark mode'}
								</p>
							</div>
							<button
								onclick={handleThemeToggle}
								disabled={!isPro}
								class="relative w-14 h-8 rounded-full transition-all duration-300 {isPro ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}"
								style="background: {isDark ? 'linear-gradient(135deg, #0d9488, #4CAF50)' : (isDark ? '#2a2a2a' : '#e5e5e5')}"
							>
								<span 
									class="absolute top-1 w-6 h-6 rounded-full transition-all duration-300 flex items-center justify-center shadow-md"
									style="left: {isDark ? '1.75rem' : '0.25rem'}; background: {isDark ? '#0a0a0a' : '#ffffff'}"
								>
									{#if isDark}
										<i class="fa-solid fa-moon text-xs text-green-400"></i>
									{:else}
										<i class="fa-solid fa-sun text-xs" style="color: {isDark ? '#a3a3a3' : '#f59e0b'}"></i>
									{/if}
								</span>
							</button>
						</div>
						
						{#if !isPro}
							<a 
								href="/pricing" 
								class="block mt-4 p-4 rounded-xl text-center transition-all hover:scale-[1.01]"
								style="background: linear-gradient(135deg, rgba(245,158,11,0.1), rgba(249,115,22,0.1)); border: 1px solid rgba(245,158,11,0.2)"
							>
								<p class="text-sm font-medium" style="color: {isDark ? '#fbbf24' : '#d97706'}">
									<i class="fa-solid fa-arrow-up-right-from-square mr-1.5"></i>
									Upgrade to Pro for dark mode and more
								</p>
							</a>
						{/if}
					</div>
				</div>

				<!-- Method explanation -->
				<div class="rounded-2xl p-6" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}; box-shadow: {isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.06)'}">
					<h2 class="font-display text-lg font-semibold mb-4" style="color: {isDark ? '#ffffff' : '#171717'}">
						<i class="fa-solid fa-calculator text-sw-accent mr-2"></i>How We Calculate
					</h2>
					<div class="space-y-4 text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">
						<p>
							<strong style="color: {isDark ? '#ffffff' : '#171717'}">Real-Time Price Data:</strong> We use Alpha Vantage Premium API to fetch adjusted close prices, which account for dividends and stock splits for accurate total return calculations.
						</p>
						<p>
							<strong style="color: {isDark ? '#ffffff' : '#171717'}">Custom Tickers:</strong> You can use any stock or ETF ticker symbol. For newer tickers or IPOs with limited price history, we fall back to your configured annual return rate (default {fallbackPercentage}%) to estimate opportunity cost.
						</p>
						<p>
							<strong style="color: {isDark ? '#ffffff' : '#171717'}">Investment Delay:</strong> To simulate realistic investing, we assume you'd invest on the next trading day after a purchase (configurable above).
						</p>
						<p>
							<strong style="color: {isDark ? '#ffffff' : '#171717'}">Excluded by Default:</strong> Transfers, credit card payments, ATM withdrawals, and refunds are excluded to avoid double-counting your spending.
						</p>
					</div>
				</div>

				<div class="flex items-center gap-4">
					<button
						onclick={saveSettings}
						disabled={saving}
						class="btn btn-primary"
					>
						{saving ? 'Saving...' : 'Save Settings'}
					</button>
					{#if saved}
						<span class="text-sw-accent text-sm animate-fade-in">Settings saved!</span>
					{/if}
				</div>

				<!-- Data Export -->
				<div class="rounded-2xl p-6" style="background: {isDark ? '#1a1a1a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#e5e5e5'}; box-shadow: {isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.06)'}">
					<h2 class="font-display text-lg font-semibold mb-4" style="color: {isDark ? '#ffffff' : '#171717'}">
						<i class="fa-solid fa-download text-sw-accent mr-2"></i>Export Your Data
					</h2>
					
					<div class="space-y-4">
						<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">
							Download a copy of all your SpentWorth data including transactions, budgets, goals, rules, and settings.
						</p>
						
						<div class="flex flex-wrap items-center gap-3">
							<a 
								href="/api/account/export?format=json" 
								download
								class="px-4 py-2 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2"
								style="background: {isDark ? '#2a2a2a' : '#f5f0e8'}; color: {isDark ? '#ffffff' : '#171717'}"
							>
								<i class="fa-solid fa-file-code"></i>
								Export All Data (JSON)
							</a>
							<a 
								href="/api/account/export?format=csv" 
								download
								class="px-4 py-2 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2"
								style="background: {isDark ? '#2a2a2a' : '#f5f0e8'}; color: {isDark ? '#ffffff' : '#171717'}"
							>
								<i class="fa-solid fa-file-csv"></i>
								Export Transactions (CSV)
							</a>
						</div>
						
						<p class="text-xs" style="color: {isDark ? '#737373' : '#a3a3a3'}">
							JSON includes all data (transactions, budgets, goals, rules, settings). CSV includes transactions only.
						</p>
					</div>
				</div>

				<!-- Danger Zone -->
				<div class="rounded-2xl p-6 mt-8" style="background: {isDark ? 'rgba(239,68,68,0.05)' : 'rgba(239,68,68,0.03)'}; border: 1px solid rgba(239,68,68,0.2)">
					<h2 class="font-display text-lg font-semibold mb-4 text-red-600">
						<i class="fa-solid fa-triangle-exclamation mr-2"></i>Danger Zone
					</h2>
					
					<div class="space-y-4">
						<div>
							<p class="font-medium mb-1" style="color: {isDark ? '#ffffff' : '#171717'}">Delete Account</p>
							<p class="text-sm mb-4" style="color: {isDark ? '#a3a3a3' : '#737373'}">
								Permanently delete your account and all associated data. This action cannot be undone.
								{#if isPro}
									Your Pro subscription will also be canceled.
								{/if}
							</p>
							<button
								onclick={() => showDeleteModal = true}
								class="px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-red-600 hover:bg-red-700 text-white"
							>
								<i class="fa-solid fa-trash mr-1.5"></i>
								Delete My Account
							</button>
						</div>
					</div>
				</div>
			</div>
		{/if}
	</main>

	<!-- Disable MFA Modal -->
	{#if showDisableMfaModal}
		<div class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(0,0,0,0.5)">
			<div 
				class="w-full max-w-md rounded-2xl p-6"
				style="background: {isDark ? '#1a1a1a' : '#ffffff'}"
			>
				<div class="flex items-center gap-3 mb-4">
					<div class="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
						<i class="fa-solid fa-shield-halved text-amber-600"></i>
					</div>
					<h3 class="font-display text-xl font-semibold" style="color: {isDark ? '#ffffff' : '#171717'}">
						Disable Two-Factor Authentication
					</h3>
				</div>

				<div class="space-y-4">
					<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">
						Are you sure you want to disable two-factor authentication? Your account will be less secure.
					</p>

					<div class="rounded-xl p-4" style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.2)">
						<p class="text-sm font-medium" style="color: {isDark ? '#fbbf24' : '#d97706'}">
							<i class="fa-solid fa-exclamation-triangle mr-2"></i>
							This will remove the extra security layer from your account.
						</p>
					</div>

					<div class="flex gap-3 pt-2">
						<button
							onclick={() => showDisableMfaModal = false}
							disabled={disablingMfa}
							class="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
							style="background: {isDark ? '#2a2a2a' : '#f5f0e8'}; color: {isDark ? '#ffffff' : '#171717'}"
						>
							Keep MFA Enabled
						</button>
						<button
							onclick={() => mfaFactors[0] && disableMfa(mfaFactors[0].id)}
							disabled={disablingMfa}
							class="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
						>
							{#if disablingMfa}
								<i class="fa-solid fa-spinner fa-spin mr-1"></i>
								Disabling...
							{:else}
								Disable MFA
							{/if}
						</button>
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Delete Account Modal -->
	{#if showDeleteModal}
		<div class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(0,0,0,0.5)">
			<div 
				class="w-full max-w-md rounded-2xl p-6"
				style="background: {isDark ? '#1a1a1a' : '#ffffff'}"
			>
				<div class="flex items-center gap-3 mb-4">
					<div class="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
						<i class="fa-solid fa-triangle-exclamation text-red-600"></i>
					</div>
					<h3 class="font-display text-xl font-semibold" style="color: {isDark ? '#ffffff' : '#171717'}">
						Delete Account
					</h3>
				</div>

				<div class="space-y-4">
					<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">
						This will permanently delete:
					</p>
					<ul class="text-sm space-y-1" style="color: {isDark ? '#a3a3a3' : '#737373'}">
						<li><i class="fa-solid fa-xmark text-red-500 mr-2"></i>All your transactions and imports</li>
						<li><i class="fa-solid fa-xmark text-red-500 mr-2"></i>Your budgets, goals, and rules</li>
						<li><i class="fa-solid fa-xmark text-red-500 mr-2"></i>Your account and all settings</li>
						{#if isPro}
							<li><i class="fa-solid fa-xmark text-red-500 mr-2"></i>Your Pro subscription (will be canceled)</li>
						{/if}
					</ul>

					<div class="rounded-xl p-4" style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2)">
						<p class="text-sm font-medium text-red-600 mb-2">
							This action cannot be undone.
						</p>
						<p class="text-sm" style="color: {isDark ? '#a3a3a3' : '#737373'}">
							Type <span class="font-mono font-bold text-red-600">DELETE</span> to confirm:
						</p>
						<input
							type="text"
							bind:value={deleteConfirmText}
							placeholder="DELETE"
							class="mt-2 w-full px-3 py-2 rounded-lg text-sm font-mono"
							style="background: {isDark ? '#0a0a0a' : '#ffffff'}; border: 1px solid {isDark ? '#2a2a2a' : '#d4cfc5'}; color: {isDark ? '#ffffff' : '#171717'}"
						/>
					</div>

					{#if deleteError}
						<p class="text-sm text-red-500">{deleteError}</p>
					{/if}

					<div class="flex gap-3 pt-2">
						<button
							onclick={() => { showDeleteModal = false; deleteConfirmText = ''; deleteError = null; }}
							disabled={deleting}
							class="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
							style="background: {isDark ? '#2a2a2a' : '#f5f0e8'}; color: {isDark ? '#ffffff' : '#171717'}"
						>
							Cancel
						</button>
						<button
							onclick={deleteAccount}
							disabled={deleteConfirmText !== 'DELETE' || deleting}
							class="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-red-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-700"
						>
							{#if deleting}
								<i class="fa-solid fa-spinner fa-spin mr-1"></i>
								Deleting...
							{:else}
								Delete Forever
							{/if}
						</button>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
