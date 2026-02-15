<script lang="ts">
	// SPDX-License-Identifier: AGPL-3.0-only
	import { goto } from '$app/navigation';
	import { APP_NAME } from '$lib/config';

	type Props = {
		deviceType: 'mobile' | 'tablet';
	};

	const { deviceType }: Props = $props();

	const config = $derived(
		deviceType === 'mobile'
			? {
					title: `${APP_NAME} — Mobile`,
					description:
						'Lost the Plot is designed for larger screens. The stage plot editor needs a desktop or laptop browser for the best experience.',
					hint: 'A mobile companion app for viewing and sharing stage plots is coming soon.',
					buttonLabel: 'Continue to Desktop Version Anyway'
				}
			: {
					title: `${APP_NAME} — Tablet`,
					description:
						'Lost the Plot works best on a desktop or laptop browser. Tablet support with touch-friendly controls is on our roadmap.',
					hint: 'You can try the desktop version on your tablet — it works, but the experience is optimised for mouse and keyboard.',
					buttonLabel: 'Continue to Desktop Version'
				}
	);

	function continueToDesktop() {
		sessionStorage.setItem('stageplotter-skip-device-redirect', '1');
		goto('/');
	}
</script>

<svelte:head>
	<title>{config.title}</title>
</svelte:head>

<div class="flex min-h-[80vh] flex-col items-center justify-center px-6 text-center">
	<h1 class="text-2xl font-bold text-text-primary">Lost the Plot</h1>
	<p class="mt-4 max-w-sm text-text-secondary">
		{config.description}
	</p>
	<p class="mt-6 text-sm text-text-tertiary">
		{config.hint}
	</p>
	<button
		onclick={continueToDesktop}
		class="mt-8 rounded-lg bg-stone-900 px-6 py-3 text-sm font-medium text-white hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
	>
		{config.buttonLabel}
	</button>
</div>
