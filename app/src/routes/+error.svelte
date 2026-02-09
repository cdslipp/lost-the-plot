<script lang="ts">
	// SPDX-License-Identifier: AGPL-3.0-only
	import { page } from '$app/state';

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

	const instrument = instruments[Math.floor(Math.random() * instruments.length)];
</script>

<div class="flex min-h-[80vh] flex-col items-center justify-center px-6 text-center">
	<img
		src={instrument}
		alt=""
		class="mb-8 h-28 opacity-15 sm:h-36"
		style="transform: rotate(-12deg)"
	/>
	<h1 class="font-serif text-7xl font-bold tracking-tight text-text-primary sm:text-9xl">
		Whoops!
	</h1>
	<p class="mt-2 text-lg text-text-tertiary tabular-nums">{page.status}</p>
	<p class="mt-4 text-lg text-text-secondary">
		{#if page.status === 404}
			This page wandered offstage.
		{:else}
			Something went wrong.
		{/if}
	</p>
	<a
		href="/"
		class="mt-8 inline-flex items-center rounded-lg bg-stone-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
	>
		Back to my bands
	</a>
</div>
