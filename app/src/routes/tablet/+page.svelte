<script lang="ts">
	// SPDX-License-Identifier: AGPL-3.0-only
	import { goto } from '$app/navigation';

	function continueToDesktop() {
		sessionStorage.setItem('stageplotter-skip-device-redirect', '1');
		goto('/');
	}
</script>

<svelte:head>
	<title>Lost the Plot — Tablet</title>
</svelte:head>

<div class="flex min-h-[80vh] flex-col items-center justify-center px-6 text-center">
	<h1 class="text-2xl font-bold text-text-primary">Lost the Plot</h1>
	<p class="mt-4 max-w-sm text-text-secondary">
		Lost the Plot works best on a desktop or laptop browser. Tablet support with touch-friendly
		controls is on our roadmap.
	</p>
	<p class="mt-6 text-sm text-text-tertiary">
		You can try the desktop version on your tablet — it works, but the experience is optimised for
		mouse and keyboard.
	</p>
	<button
		onclick={continueToDesktop}
		class="mt-8 rounded-lg bg-stone-900 px-6 py-3 text-sm font-medium text-white hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
	>
		Continue to Desktop Version
	</button>
</div>
