<script lang="ts">
	// SPDX-License-Identifier: AGPL-3.0-only
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { ModeWatcher } from 'mode-watcher';
	import { useRegisterSW } from 'virtual:pwa-register/svelte';
	import { browser } from '$app/environment';
	import { goto, afterNavigate } from '$app/navigation';
	import { page } from '$app/stores';
	import { detectDevice } from '$lib/device';
	import { onMount } from 'svelte';

	let { children } = $props();

	// Redirect mobile/tablet users on initial load (not if they clicked "Continue")
	if (browser) {
		const currentPath = $page.url.pathname;
		const skipRedirect =
			currentPath === '/mobile' ||
			currentPath === '/tablet' ||
			currentPath.startsWith('/s/') ||
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

	// Cycling hero instrument animation
	const instruments = [
		'/final_assets/guitars/electric/electricguitar/electricguitar.png',
		'/final_assets/guitars/acoustic/acousticguitar/acousticguitar.png',
		'/final_assets/guitars/bass/p_bass/P_Bass.png',
		'/final_assets/guitars/banjo/banjo/banjo.png',
		'/final_assets/keys/keytar/keytar/keytar.png',
		'/final_assets/keys/nordstage88/NordStage88.png',
		'/final_assets/winds/trumpet/trumpet/trumpet.png',
		'/final_assets/winds/altosax/altosax.png',
		'/final_assets/strings/violin/violin/Violin.png',
		'/final_assets/keys/mellotron/Mellotron.png'
	];

	let instrumentIndex = $state(0);
	let instrumentVisible = $state(true);
	let instrumentSpin = $state(false);
	let clicking = false;

	onMount(() => {
		instrumentIndex = Math.floor(Math.random() * instruments.length);
	});

	afterNavigate(() => {
		// Fade out, swap, fade in
		instrumentVisible = false;
		setTimeout(() => {
			instrumentIndex = (instrumentIndex + 1) % instruments.length;
			instrumentVisible = true;
		}, 300);
	});

	function handleInstrumentClick() {
		if (clicking) return;
		clicking = true;
		instrumentSpin = true;
		// Halfway through the spin, swap the instrument
		setTimeout(() => {
			instrumentIndex = (instrumentIndex + 1) % instruments.length;
		}, 200);
		// End the spin
		setTimeout(() => {
			instrumentSpin = false;
			clicking = false;
		}, 500);
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<ModeWatcher />
<div class="relative min-h-screen bg-bg-secondary font-sans text-text-primary">
	<!-- Sideways wordmark — decorative, sits behind all content -->
	<div
		class="pointer-events-none fixed left-0 top-0 z-0 flex h-screen items-end select-none"
		aria-hidden="true"
	>
		<div class="flex flex-col items-center pb-8">
			<span
				class="whitespace-nowrap font-serif text-[clamp(5rem,12vh,10rem)] font-bold leading-none text-stone-300 dark:text-stone-700"
				style="writing-mode: vertical-lr; transform: rotate(180deg); letter-spacing: 0.05em;"
			>
				Lost the Plot
			</span>
		</div>
	</div>
	<!-- Clickable instrument — own stacking context above content -->
	<div
		class="pointer-events-none fixed left-0 top-0 z-20 flex h-screen items-end select-none"
	>
		<div class="flex flex-col items-center pb-8">
			<button
				class="pointer-events-auto mb-16 h-20 w-16 cursor-pointer border-none bg-transparent p-0 outline-none"
				style="transform: rotate(-8deg);"
				onclick={handleInstrumentClick}
				aria-label="Change instrument"
			>
				<img
					src={instruments[instrumentIndex]}
					alt=""
					class="h-full w-full object-contain"
					class:instrument-spin={instrumentSpin}
					class:instrument-idle={!instrumentSpin}
					style:opacity={instrumentSpin ? undefined : (instrumentVisible ? '0.2' : '0')}
					style:transition={instrumentSpin ? 'none' : 'opacity 300ms'}
				/>
			</button>
			<!-- Invisible spacer matching wordmark text height -->
			<span
				class="invisible whitespace-nowrap font-serif text-[clamp(5rem,12vh,10rem)] font-bold leading-none"
				style="writing-mode: vertical-lr;"
				aria-hidden="true"
			>
				Lost the Plot
			</span>
		</div>
	</div>
	<div class="relative z-10 container mx-auto max-w-[1600px] pl-28 pr-4 sm:pl-32 sm:pr-6 lg:pl-36 lg:pr-8">
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

<style>
	.instrument-spin {
		animation: spin-swap 500ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
	}

	@keyframes spin-swap {
		0% {
			transform: scale(1) rotate(0deg);
			opacity: 0.2;
		}
		40% {
			transform: scale(0.3) rotate(360deg);
			opacity: 0;
		}
		60% {
			transform: scale(0.3) rotate(360deg);
			opacity: 0;
		}
		100% {
			transform: scale(1) rotate(720deg);
			opacity: 0.2;
		}
	}
</style>
