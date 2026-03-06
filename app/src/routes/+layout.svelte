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
	import { page } from '$app/state';
	import { detectDevice } from '$lib/device';
	import { onMount, setContext } from 'svelte';
	import JumpBar from '$lib/components/JumpBar.svelte';
	import EscapeBack from '$lib/components/EscapeBack.svelte';
	import OnboardingGate from '$lib/components/OnboardingGate.svelte';
	import MenuOverlay from '$lib/components/MenuOverlay.svelte';
	import BackgroundShader from '$lib/components/BackgroundShader.svelte';

	let { children } = $props();

	let jumpBarOpen = $state(false);
	let menuOpen = $state(false);

	setContext('toggleMenu', () => {
		menuOpen = !menuOpen;
	});

	function handleGlobalKeydown(e: KeyboardEvent) {
		if ((e.ctrlKey || e.metaKey) && e.key === 'j') {
			e.preventDefault();
			jumpBarOpen = true;
		}

		if ((e.key === 'm' || e.key === 'M') && !e.ctrlKey && !e.metaKey && !e.altKey) {
			if (page.url.pathname === '/') return;
			const target = e.target;
			if (target instanceof HTMLElement) {
				const tag = target.tagName;
				if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) {
					return;
				}
			}
			if (document.querySelector('[role="dialog"], [role="alertdialog"], dialog[open]')) {
				return;
			}
			e.preventDefault();
			menuOpen = !menuOpen;
		}
	}

	// Redirect mobile/tablet users on initial load (not if they clicked "Continue")
	if (browser) {
		const currentPath = page.url.pathname;
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

<svelte:window onkeydown={handleGlobalKeydown} />

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<ModeWatcher />

<!-- Homepage shader background — fixed behind everything -->
{#if page.url.pathname === '/'}
	<div class="fixed inset-0 z-0">
		<BackgroundShader />
	</div>
{/if}

<div class="relative min-h-screen font-sans text-text-primary {page.url.pathname === '/' ? 'bg-transparent' : 'bg-bg-secondary'}">
	<!-- Sideways wordmark — decorative, sits behind all content -->
	<div
		class="pointer-events-none fixed top-0 left-0 z-[1] hidden h-screen items-end select-none sm:flex"
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
		<span class="font-serif text-lg font-bold text-stone-400 dark:text-stone-500">
			Lost the Plot
		</span>
	</div>
	<div
		class="relative z-10 container mx-auto max-w-[1600px] px-4 sm:pr-6 sm:pl-32 lg:pr-8 lg:pl-36"
	>
		<OnboardingGate>
			{@render children()}
		</OnboardingGate>
	</div>
	<footer
		class="pointer-events-none fixed right-0 bottom-0 left-0 z-10 flex items-center justify-center py-1 text-xs text-text-tertiary/50 select-none"
	>
		<a
			href="https://slipp.cam"
			target="_blank"
			rel="noopener noreferrer"
			class="pointer-events-auto font-semibold text-text-secondary hover:text-text-primary"
			>Made in Kitchener, Ontario</a
		>
		<span class="mx-1.5">|</span>
		<a
			href="https://github.com/cdslipp/lost-the-plot"
			target="_blank"
			rel="noopener noreferrer"
			class="pointer-events-auto inline-flex items-center gap-1 font-semibold text-text-secondary transition hover:text-text-primary"
			><svg class="inline-block h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>GitHub</a
		>
	</footer>
</div>

<JumpBar bind:open={jumpBarOpen} />
<MenuOverlay bind:open={menuOpen} instrumentSrc={instruments[instrumentIndex]} />

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

<EscapeBack />

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
