<script lang="ts">
	// SPDX-License-Identifier: AGPL-3.0-only
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { ModeWatcher } from 'mode-watcher';
	import { useRegisterSW } from 'virtual:pwa-register/svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { detectDevice } from '$lib/device';

	let { children } = $props();

	// Redirect mobile/tablet users on initial load (not if they clicked "Continue")
	if (browser) {
		const currentPath = $page.url.pathname;
		const skipRedirect =
			currentPath === '/mobile' ||
			currentPath === '/tablet' ||
			sessionStorage.getItem('stageplotter-skip-device-redirect') === '1';

		if (!skipRedirect) {
			const device = detectDevice();
			if (device === 'mobile') {
				goto('/mobile', { replaceState: true });
			} else if (device === 'tablet') {
				goto('/tablet', { replaceState: true });
			}
		}
	}

	const { needRefresh, offlineReady, updateServiceWorker } = browser
		? useRegisterSW({
				onRegistered(registration: ServiceWorkerRegistration | undefined) {
					console.log('SW registered:', registration);
				},
				onRegisterError(error: Error) {
					console.error('SW registration error:', error);
				}
			})
		: { needRefresh: { subscribe: () => () => {} }, offlineReady: { subscribe: () => () => {} }, updateServiceWorker: async () => {} };

	let showRefresh = $state(false);
	let showOffline = $state(false);

	$effect(() => {
		const unsubRefresh = needRefresh.subscribe((value: boolean) => {
			showRefresh = value;
		});
		const unsubOffline = offlineReady.subscribe((value: boolean) => {
			showOffline = value;
		});
		return () => {
			unsubRefresh();
			unsubOffline();
		};
	});

	function close() {
		showRefresh = false;
		showOffline = false;
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<ModeWatcher />
<div class="min-h-screen bg-bg-secondary font-sans text-text-primary">
	<div class="container mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
		{@render children()}
	</div>
</div>

{#if showRefresh || showOffline}
	<div class="fixed bottom-4 right-4 z-50 flex flex-col gap-2 rounded-lg bg-surface p-4 shadow-lg border border-border-primary">
		{#if showOffline}
			<p class="text-sm text-text-secondary">App ready to work offline</p>
		{/if}
		{#if showRefresh}
			<p class="text-sm text-text-secondary">New content available, click to update</p>
			<button
				onclick={() => updateServiceWorker(true)}
				class="rounded bg-stone-900 px-4 py-2 text-sm text-white hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
			>
				Reload
			</button>
		{/if}
		<button onclick={close} class="text-xs text-text-tertiary hover:text-text-primary">Close</button>
	</div>
{/if}
