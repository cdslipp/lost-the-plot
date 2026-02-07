<script lang="ts">
	// SPDX-License-Identifier: AGPL-3.0-only
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { db } from '$lib/db';

	let { children } = $props();

	let bandName = $state('');

	onMount(async () => {
		await db.init();
		const bandId = $page.params.bandId;
		const band = await db.queryOne<{ name: string }>('SELECT name FROM bands WHERE id = ?', [
			bandId
		]);
		if (band) {
			bandName = band.name;
		}
	});
</script>

<div class="flex h-[100dvh] flex-col py-6">
	<div class="mb-4 flex items-center gap-3">
		<a
			href="/bands"
			class="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition hover:bg-surface-hover hover:text-text-primary"
			aria-label="Back to bands"
		>
			<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
				<path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
			</svg>
		</a>
		{#if bandName}
			<span class="text-sm text-text-secondary">{bandName}</span>
		{/if}
	</div>
	{@render children()}
</div>
