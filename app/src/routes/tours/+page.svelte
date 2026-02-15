<script lang="ts">
	// SPDX-License-Identifier: AGPL-3.0-only
	import { goto } from '$app/navigation';
	import { db } from '$lib/db';
	import { generateId } from '@stageplotter/shared';
	import {
		listTours,
		createTour,
		deleteTour,
		updateTourName,
		type TourWithDetails
	} from '$lib/db/repositories/tours';
	import EntityListPage from '$lib/components/EntityListPage.svelte';

	let bands = $state<{ id: string; name: string }[]>([]);
	let showBandPicker = $state(false);

	async function loadBands() {
		await db.init();
		bands = await db.query<{ id: string; name: string }>(
			'SELECT id, name FROM bands ORDER BY name'
		);
	}

	async function load(): Promise<TourWithDetails[]> {
		await db.init();
		await loadBands();
		return listTours();
	}

	async function create() {
		await db.init();
		if (bands.length === 0) {
			await loadBands();
		}
		if (bands.length === 1) {
			// Only one band, skip picker
			const id = generateId();
			await createTour(id, bands[0].id, 'Untitled Tour');
			goto(`/tours/${id}?new=1`);
		} else {
			showBandPicker = true;
		}
	}

	async function createForBand(bandId: string) {
		showBandPicker = false;
		const id = generateId();
		await createTour(id, bandId, 'Untitled Tour');
		goto(`/tours/${id}?new=1`);
	}

	async function handleDelete(id: string) {
		await db.init();
		await deleteTour(id);
	}

	async function handleRename(id: string, newName: string) {
		await db.init();
		await updateTourName(id, newName);
	}
</script>

{#if showBandPicker}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
		onclick={() => (showBandPicker = false)}
	>
		<div
			class="w-full max-w-sm rounded-xl border border-border-primary bg-surface p-6 shadow-lg"
			onclick={(e) => e.stopPropagation()}
		>
			<h2 class="mb-4 font-serif text-xl font-semibold text-text-primary">Select a Band</h2>
			<div class="space-y-2">
				{#each bands as band (band.id)}
					<button
						onclick={() => createForBand(band.id)}
						class="w-full rounded-lg border border-border-primary px-4 py-3 text-left text-sm text-text-primary transition hover:bg-surface-hover"
					>
						{band.name}
					</button>
				{/each}
			</div>
			<button
				onclick={() => (showBandPicker = false)}
				class="mt-4 w-full rounded-lg px-4 py-2 text-sm text-text-secondary hover:bg-surface-hover"
			>
				Cancel
			</button>
		</div>
	</div>
{/if}

<EntityListPage
	title="Your Tours"
	entityName="Tour"
	loadItems={load}
	onCreate={create}
	onDelete={handleDelete}
	onRename={handleRename}
>
	{#snippet cardContent(tour)}
		<a href="/tours/{tour.id}" class="flex-1">
			<h2 class="font-serif text-xl font-semibold text-text-primary group-hover:text-stone-600">
				{tour.name}
			</h2>
			<div class="mt-2 flex items-center gap-4 text-sm text-text-secondary">
				<span>{tour.band_name}</span>
				<span>{tour.gig_count} {tour.gig_count === 1 ? 'gig' : 'gigs'}</span>
				{#if tour.start_date || tour.end_date}
					<span>
						{tour.start_date || '?'} — {tour.end_date || '?'}
					</span>
				{/if}
			</div>
		</a>
	{/snippet}
</EntityListPage>
