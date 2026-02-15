<script lang="ts">
	// SPDX-License-Identifier: AGPL-3.0-only
	import '../app.css';
	const faviconEmojis = ['🎸', '🥁', '🎹', '🎷', '🎺', '🎻', '🪗', '🎤'];
	const faviconEmoji = faviconEmojis[Math.floor(Math.random() * faviconEmojis.length)];
	const favicon = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>${faviconEmoji}</text></svg>`;
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
			currentPath === '/tablet' ||
			currentPath.startsWith('/s/') ||
			sessionStorage.getItem('stageplotter-skip-device-redirect') === '1';

		if (!skipRedirect) {
			const device = detectDevice();
			if (device === 'tablet') {
				goto('/tablet', { replaceState: true });
			}
		}
	}

	const { needRefresh, offlineReady, updateServiceWorker } = browser
		? useRegisterSW({
				onRegistered(_registration: ServiceWorkerRegistration | undefined) {},
				onRegisterError(_error: Error) {}
			})
		: {
				needRefresh: { subscribe: () => () => {} },
				offlineReady: { subscribe: () => () => {} },
				updateServiceWorker: async () => {}
			};

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
	<title>Lost the Plot</title>
	<link rel="icon" href={favicon} />
</svelte:head>

<ModeWatcher />
<div class="relative min-h-screen bg-bg-secondary font-sans text-text-primary">
	<!-- Sideways wordmark — decorative, sits behind all content -->
	<div
		class="pointer-events-none fixed top-0 left-0 z-0 hidden h-screen items-end select-none sm:flex"
		aria-hidden="true"
	>
		<div class="flex flex-col items-center pb-8">
			<span
				class="font-serif text-[clamp(5rem,12vh,10rem)] leading-none font-bold whitespace-nowrap text-stone-300 dark:text-stone-700"
				style="writing-mode: vertical-lr; transform: rotate(180deg); letter-spacing: 0.05em;"
			>
				Lost the Plot
			</span>
		</div>
	</div>
	<!-- Clickable instrument — own stacking context above content -->
	<div
		class="pointer-events-none fixed top-0 left-0 z-20 hidden h-screen items-end select-none sm:flex"
	>
		<div class="flex flex-col items-center pb-8">
			<button
				class="pointer-events-auto mb-16 h-20 w-16 cursor-pointer border-none bg-transparent p-0 outline-none lg:mb-24"
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
					style:opacity={instrumentSpin ? undefined : instrumentVisible ? '0.2' : '0'}
					style:transition={instrumentSpin ? 'none' : 'opacity 300ms'}
				/>
			</button>
			<!-- Invisible spacer matching wordmark text height -->
			<span
				class="invisible font-serif text-[clamp(5rem,12vh,10rem)] leading-none font-bold whitespace-nowrap"
				style="writing-mode: vertical-lr;"
				aria-hidden="true"
			>
				Lost the Plot
			</span>
		</div>
	</div>
	<!-- Mobile top wordmark bar -->
	<div class="sticky top-0 z-20 flex items-center px-4 py-2 sm:hidden" aria-hidden="true">
		<a
			href="/"
			class="font-serif text-lg font-bold text-stone-400 no-underline dark:text-stone-500"
		>
			Lost the Plot
		</a>
	</div>
	<div
		class="relative z-10 container mx-auto max-w-[1600px] px-4 sm:pr-6 sm:pl-32 lg:pr-8 lg:pl-36"
	>
		{@render children()}
	</div>
	<footer
		class="pointer-events-none fixed right-0 bottom-0 left-0 z-10 flex items-center justify-center py-1 text-[10px] text-text-tertiary/50 select-none sm:pl-32 lg:pl-36"
	>
		<span>Made in Kitchener, Ontario</span>
		<span class="mx-1.5">|</span>
		<a
			href="https://github.com/cdslipp/lost-the-plot"
			target="_blank"
			rel="noopener noreferrer"
			class="pointer-events-auto underline decoration-text-tertiary/30 transition hover:text-text-tertiary"
			>GitHub</a
		>
	</footer>
</div>

{#if showRefresh || showOffline}
	<div
		class="fixed right-4 bottom-4 z-50 flex flex-col gap-2 rounded-lg border border-border-primary bg-surface p-4 shadow-lg"
	>
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
		<button onclick={close} class="text-xs text-text-tertiary hover:text-text-primary">Close</button
		>
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
