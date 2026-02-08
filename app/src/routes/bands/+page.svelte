<script lang="ts">
	// SPDX-License-Identifier: AGPL-3.0-only
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { db } from '$lib/db';

	let bands = $state<{ id: string; name: string; created_at: string; plot_count: number }[]>([]);
	let loading = $state(true);

	async function loadBands() {
		await db.init();
		const rows = await db.query<{
			id: string;
			name: string;
			created_at: string;
			plot_count: number;
		}>(`
			SELECT b.id, b.name, b.created_at,
				(SELECT COUNT(*) FROM stage_plots WHERE band_id = b.id) as plot_count
			FROM bands b
			ORDER BY b.updated_at DESC
		`);
		bands = rows;
		loading = false;
	}

	async function createBand() {
		await db.init();
		const id = crypto.randomUUID().replace(/-/g, '');
		await db.run('INSERT INTO bands (id, name) VALUES (?, ?)', [id, 'Untitled Band']);
		goto(`/bands/${id}`);
	}

	onMount(() => {
		loadBands();
	});
</script>

<div class="flex h-[100dvh] max-w-md mx-auto flex-col gap-6 py-6">
	<div class="flex items-center justify-between">
		<h1 class="font-serif text-3xl font-bold text-text-primary">Your Bands</h1>
		<button
			onclick={createBand}
			class="flex items-center gap-2 rounded-lg bg-stone-900 px-4 py-2 text-sm text-white transition hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
		>
			<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
				<path fill-rule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clip-rule="evenodd" />
			</svg>
			New Band
		</button>
	</div>

	{#if loading}
		<div class="flex flex-1 items-center justify-center">
			<p class="text-text-secondary">Loading...</p>
		</div>
	{:else if bands.length === 0}
		<div class="flex flex-1 flex-col items-center justify-center gap-4">
			<p class="text-lg text-text-secondary">Create your first band to get started</p>
			<button
				onclick={createBand}
				class="rounded-lg bg-stone-900 px-6 py-3 text-white transition hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
			>
				Create Band
			</button>
		</div>
	{:else}
		<div class="flex flex-col gap-3">
			{#each bands as band (band.id)}
				<a
					href="/bands/{band.id}"
					class="group rounded-xl border border-border-primary bg-surface p-6 shadow-sm transition hover:border-stone-400 hover:shadow-md"
				>
					<h2 class="font-serif text-xl font-semibold text-text-primary group-hover:text-stone-600">{band.name}</h2>
					<div class="mt-2 flex items-center gap-4 text-sm text-text-secondary">
						<span>{band.plot_count} {band.plot_count === 1 ? 'plot' : 'plots'}</span>
						{#if band.created_at}
							<span>Created {new Date(band.created_at).toLocaleDateString()}</span>
						{/if}
					</div>
				</a>
			{/each}
		</div>
	{/if}
</div>
