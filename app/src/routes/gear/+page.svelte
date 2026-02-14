<script lang="ts">
	// SPDX-License-Identifier: AGPL-3.0-only
	import { onMount } from 'svelte';
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
	import { PlusIcon } from '$lib/components/icons';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import ListPageLayout from '$lib/components/ListPageLayout.svelte';

	let items = $state<GearItemRow[]>([]);
	let loading = $state(true);
	let openMenuItemId = $state<string | null>(null);
	let editingItemId = $state<string | null>(null);
	let itemNameInput = $state('');

	let deleteItemTarget = $state<{ id: string; name: string } | null>(null);

	async function loadItems() {
		await db.init();
		items = await listGearItems();
		loading = false;
	}

	async function createItem() {
		await db.init();
		const id = generateId();
		await createGearItemDb(id, 'Untitled Item');
		await loadItems();
	}

	function handleDeleteItem(itemId: string, itemName: string) {
		openMenuItemId = null;
		deleteItemTarget = { id: itemId, name: itemName };
	}

	async function confirmDeleteItem() {
		const target = deleteItemTarget;
		if (!target) return;
		deleteItemTarget = null;
		await db.init();
		await deleteGearItem(target.id);
		await loadItems();
	}

	function startRenameItem(item: { id: string; name: string }) {
		editingItemId = item.id;
		itemNameInput = item.name;
		openMenuItemId = null;
	}

	function cancelRenameItem() {
		editingItemId = null;
		itemNameInput = '';
	}

	async function saveItemName(itemId: string) {
		const nextName = itemNameInput.trim();
		if (!nextName) return;
		await db.init();
		await updateGearItemName(itemId, nextName);
		editingItemId = null;
		itemNameInput = '';
		await loadItems();
	}

	async function handleDuplicateItem(itemId: string) {
		openMenuItemId = null;
		await db.init();
		const newId = generateId();
		await duplicateGearItem(itemId, newId);
		await loadItems();
	}

	function formatCategory(category: string): string {
		return category.charAt(0).toUpperCase() + category.slice(1);
	}

	onMount(() => {
		loadItems();
	});
</script>

<svelte:window
	onclick={() => (openMenuItemId = null)}
	onkeydown={(event) => {
		if ((event as KeyboardEvent).key === 'Escape') {
			openMenuItemId = null;
			cancelRenameItem();
		}
	}}
/>

<ListPageLayout title="Your Gear">
	{#if loading}
		<div class="flex flex-1 items-center justify-center">
			<p class="text-text-secondary">Loading...</p>
		</div>
	{:else if items.length === 0}
		<div class="flex flex-1 items-center justify-center">
			<div class="rounded-xl border border-border-primary bg-surface p-8 text-center shadow-sm">
				<p class="text-lg text-text-secondary">Add your first gear item to get started</p>
				<button
					onclick={createItem}
					class="mt-4 rounded-lg bg-stone-900 px-6 py-3 text-white transition hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
				>
					Add Gear Item
				</button>
			</div>
		</div>
	{:else}
		<div class="gear-list-scroll flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
			{#each items as item (item.id)}
				<div
					class="group relative flex items-start justify-between gap-3 rounded-xl border border-border-primary bg-surface p-6 shadow-sm transition hover:border-stone-400 hover:shadow-md"
				>
					{#if editingItemId === item.id}
						<form
							onsubmit={(event) => {
								event.preventDefault();
								saveItemName(item.id);
							}}
							class="flex flex-1 items-center gap-2"
						>
							<input
								bind:value={itemNameInput}
								class="w-full border-b border-dashed border-border-secondary bg-transparent px-1 py-1 font-serif text-xl font-semibold text-text-primary focus:border-stone-500 focus:outline-none"
								autofocus
							/>
							<button
								type="submit"
								class="rounded-lg bg-stone-900 px-3 py-1.5 text-sm text-white hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
							>
								Save
							</button>
							<button
								type="button"
								onclick={cancelRenameItem}
								class="rounded-lg px-3 py-1.5 text-sm text-text-secondary hover:bg-surface-hover"
							>
								Cancel
							</button>
						</form>
					{:else}
						<div class="flex-1">
							<h2
								class="font-serif text-xl font-semibold text-text-primary group-hover:text-stone-600"
							>
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
						<button
							onclick={(event) => {
								event.stopPropagation();
								openMenuItemId = openMenuItemId === item.id ? null : item.id;
							}}
							class="rounded p-1.5 text-text-tertiary opacity-0 transition group-hover:opacity-100 hover:bg-surface-hover hover:text-text-primary"
							aria-label="Open gear item menu"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-5 w-5"
								viewBox="0 0 20 20"
								fill="currentColor"
							>
								<path
									d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z"
								/>
							</svg>
						</button>
						{#if openMenuItemId === item.id}
							<!-- svelte-ignore a11y_no_static_element_interactions -->
							<!-- svelte-ignore a11y_click_events_have_key_events -->
							<div
								onclick={(event) => event.stopPropagation()}
								class="absolute top-12 right-4 z-10 w-44 rounded-lg border border-border-primary bg-surface p-1 shadow-lg"
							>
								<button
									onclick={() => startRenameItem(item)}
									class="flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-text-primary hover:bg-surface-hover"
								>
									Rename item
								</button>
								<button
									onclick={() => handleDuplicateItem(item.id)}
									class="flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-text-primary hover:bg-surface-hover"
								>
									Duplicate item
								</button>
								<button
									onclick={() => handleDeleteItem(item.id, item.name)}
									class="flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
								>
									Delete item
								</button>
							</div>
						{/if}
					{/if}
				</div>
			{/each}
		</div>
	{/if}

	{#snippet footer()}
		<div class="mt-auto flex items-center justify-end pt-4">
			<button
				onclick={createItem}
				class="flex items-center gap-2 rounded-lg bg-stone-900 px-4 py-2 text-sm text-white transition hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
			>
				<PlusIcon />
				New Gear Item
			</button>
		</div>
	{/snippet}
</ListPageLayout>

<ConfirmDialog
	bind:open={
		() => deleteItemTarget !== null,
		(v) => {
			if (!v) deleteItemTarget = null;
		}
	}
	title="Delete Gear Item"
	description={deleteItemTarget ? `Delete "${deleteItemTarget.name}"? This cannot be undone.` : ''}
	confirmLabel="Delete"
	variant="destructive"
	onconfirm={confirmDeleteItem}
/>

<style>
	.gear-list-scroll {
		scrollbar-width: thin;
		scrollbar-color: rgb(168 162 158 / 0.4) transparent;
	}
	.gear-list-scroll::-webkit-scrollbar {
		width: 6px;
	}
	.gear-list-scroll::-webkit-scrollbar-track {
		background: transparent;
	}
	.gear-list-scroll::-webkit-scrollbar-thumb {
		background: rgb(168 162 158 / 0.4);
		border-radius: 3px;
	}
	.gear-list-scroll::-webkit-scrollbar-thumb:hover {
		background: rgb(168 162 158 / 0.6);
	}
	.gear-list-scroll {
		mask-image: linear-gradient(to bottom, black 0%, black calc(100% - 32px), transparent 100%);
		-webkit-mask-image: linear-gradient(
			to bottom,
			black 0%,
			black calc(100% - 32px),
			transparent 100%
		);
	}
</style>
