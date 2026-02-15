<script lang="ts">
	// SPDX-License-Identifier: AGPL-3.0-only
	import { db } from '$lib/db';
	import { generateId } from '@stageplotter/shared';
	import {
		listGearItems,
		createGearItem as createGearItemDb,
		deleteGearItem,
		duplicateGearItem,
		updateGearItemName,
		type GearItemRow
	} from '$lib/db/repositories/gear';
	import EntityListPage from '$lib/components/EntityListPage.svelte';

	async function load(): Promise<GearItemRow[]> {
		await db.init();
		return listGearItems();
	}

	async function create() {
		await db.init();
		const id = generateId();
		await createGearItemDb(id, 'Untitled Item');
	}

	async function handleDelete(id: string) {
		await db.init();
		await deleteGearItem(id);
	}

	async function handleRename(id: string, newName: string) {
		await db.init();
		await updateGearItemName(id, newName);
	}

	async function handleDuplicate(itemId: string, closeMenu: () => void) {
		closeMenu();
		await db.init();
		const newId = generateId();
		await duplicateGearItem(itemId, newId);
		// Trigger reload by re-rendering — EntityListPage handles this via load
		window.location.reload();
	}

	function formatCategory(category: string): string {
		return category.charAt(0).toUpperCase() + category.slice(1);
	}
</script>

<EntityListPage
	title="Your Gear"
	entityName="Gear Item"
	loadItems={load}
	onCreate={create}
	onDelete={handleDelete}
	onRename={handleRename}
>
	{#snippet cardContent(item)}
		<div class="flex-1">
			<h2 class="font-serif text-xl font-semibold text-text-primary group-hover:text-stone-600">
				{item.name}
			</h2>
			<div class="mt-2 flex items-center gap-2">
				<span
					class="inline-block rounded-full bg-stone-200 px-2.5 py-0.5 text-xs font-medium text-stone-700 dark:bg-stone-700 dark:text-stone-300"
				>
					{formatCategory(item.category)}
				</span>
				{#if item.notes}
					<span class="truncate text-sm text-text-secondary">{item.notes}</span>
				{/if}
			</div>
		</div>
	{/snippet}

	{#snippet menuItems(item, closeMenu)}
		<button
			onclick={() => handleDuplicate(item.id, closeMenu)}
			class="flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-text-primary hover:bg-surface-hover"
		>
			Duplicate item
		</button>
	{/snippet}
</EntityListPage>
