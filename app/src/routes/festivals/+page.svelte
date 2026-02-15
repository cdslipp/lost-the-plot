<script lang="ts">
	// SPDX-License-Identifier: AGPL-3.0-only
	import { APP_NAME } from '$lib/config';
	import { goto } from '$app/navigation';
	import { db } from '$lib/db';
	import { generateId } from '@stageplotter/shared';
	import {
		listFestivals,
		createFestival as createFestivalDb,
		deleteFestival,
		updateFestivalName
	} from '$lib/db/repositories/festivals';
	import EntityListPage from '$lib/components/EntityListPage.svelte';
	import type { FestivalRow } from '$lib/db/repositories/festivals';

	async function load(): Promise<FestivalRow[]> {
		await db.init();
		return listFestivals();
	}

	async function create() {
		await db.init();
		const id = generateId();
		await createFestivalDb(id, 'Untitled Festival');
		goto(`/festivals/${id}?new=1`);
	}

	async function handleDelete(id: string) {
		await db.init();
		await deleteFestival(id);
	}

	async function handleRename(id: string, newName: string) {
		await db.init();
		await updateFestivalName(id, newName);
	}
</script>

<svelte:head>
	<title>Festivals | {APP_NAME}</title>
</svelte:head>

<EntityListPage
	title="Your Festivals"
	entityName="Festival"
	loadItems={load}
	onCreate={create}
	onDelete={handleDelete}
	onRename={handleRename}
>
	{#snippet cardContent(festival)}
		<a href="/festivals/{festival.id}" class="flex-1">
			<h2 class="font-serif text-xl font-semibold text-text-primary group-hover:text-stone-600">
				{festival.name}
			</h2>
			{#if festival.created_at}
				<div class="mt-2 text-sm text-text-secondary">
					Created {new Date(festival.created_at).toISOString().split('T')[0]}
				</div>
			{/if}
		</a>
	{/snippet}
</EntityListPage>
