<script lang="ts" generics="T extends { id: string; name: string }">
	// SPDX-License-Identifier: AGPL-3.0-only
	import { onMount } from 'svelte';
	import type { Snippet } from 'svelte';
	import { PlusIcon } from '$lib/components/icons';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import ListPageLayout from '$lib/components/ListPageLayout.svelte';

	type Props = {
		title: string;
		entityName: string;
		loadItems: () => Promise<T[]>;
		onCreate: () => void | Promise<void>;
		onDelete: (id: string) => Promise<void>;
		onRename: (id: string, newName: string) => Promise<void>;
		deleteDescription?: (item: T) => string;
		cardContent: Snippet<[T]>;
		menuItems?: Snippet<[T, () => void]>;
		footer?: Snippet;
	};

	let {
		title,
		entityName,
		loadItems,
		onCreate,
		onDelete,
		onRename,
		deleteDescription,
		cardContent,
		menuItems,
		footer
	}: Props = $props();

	let items = $state<T[]>([]);
	let loading = $state(true);
	let openMenuId = $state<string | null>(null);
	let editingId = $state<string | null>(null);
	let nameInput = $state('');
	let deleteTarget = $state<{ id: string; name: string } | null>(null);

	async function load() {
		items = await loadItems();
		loading = false;
	}

	function handleDelete(id: string, name: string) {
		openMenuId = null;
		deleteTarget = { id, name };
	}

	async function confirmDelete() {
		if (!deleteTarget) return;
		const id = deleteTarget.id;
		deleteTarget = null;
		await onDelete(id);
		await load();
	}

	function startRename(item: { id: string; name: string }) {
		editingId = item.id;
		nameInput = item.name;
		openMenuId = null;
	}

	function cancelRename() {
		editingId = null;
		nameInput = '';
	}

	async function saveRename(id: string) {
		const nextName = nameInput.trim();
		if (!nextName) return;
		await onRename(id, nextName);
		editingId = null;
		nameInput = '';
		await load();
	}

	function closeMenu() {
		openMenuId = null;
	}

	onMount(() => {
		load();
	});
</script>

<svelte:window
	onclick={() => (openMenuId = null)}
	onkeydown={(event) => {
		if ((event as KeyboardEvent).key === 'Escape') {
			openMenuId = null;
			cancelRename();
		}
	}}
/>

<ListPageLayout {title}>
	{#if loading}
		<div class="flex flex-1 items-center justify-center">
			<p class="text-text-secondary">Loading...</p>
		</div>
	{:else if items.length === 0}
		<div class="flex flex-1 items-center justify-center">
			<div class="rounded-xl border border-border-primary bg-surface p-8 text-center shadow-sm">
				<p class="text-lg text-text-secondary">
					{entityName === 'Gear Item'
						? `Add your first gear item to get started`
						: `Create your first ${entityName.toLowerCase()} to get started`}
				</p>
				<button
					onclick={onCreate}
					class="mt-4 rounded-lg bg-stone-900 px-6 py-3 text-white transition hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
				>
					{entityName === 'Gear Item' ? 'Add Gear Item' : `Create ${entityName}`}
				</button>
			</div>
		</div>
	{:else}
		<div class="entity-list-scroll flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
			{#each items as item (item.id)}
				<div
					class="group relative flex items-start justify-between gap-3 rounded-xl border border-border-primary bg-surface p-6 shadow-sm transition hover:border-stone-400 hover:shadow-md"
				>
					{#if editingId === item.id}
						<form
							onsubmit={(event) => {
								event.preventDefault();
								saveRename(item.id);
							}}
							class="flex flex-1 items-center gap-2"
						>
							<input
								bind:value={nameInput}
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
								onclick={cancelRename}
								class="rounded-lg px-3 py-1.5 text-sm text-text-secondary hover:bg-surface-hover"
							>
								Cancel
							</button>
						</form>
					{:else}
						{@render cardContent(item)}
						<button
							onclick={(event) => {
								event.stopPropagation();
								openMenuId = openMenuId === item.id ? null : item.id;
							}}
							class="rounded p-1.5 text-text-tertiary opacity-0 transition group-hover:opacity-100 hover:bg-surface-hover hover:text-text-primary"
							aria-label="Open {entityName.toLowerCase()} menu"
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
						{#if openMenuId === item.id}
							<!-- svelte-ignore a11y_no_static_element_interactions -->
							<!-- svelte-ignore a11y_click_events_have_key_events -->
							<div
								onclick={(event) => event.stopPropagation()}
								class="absolute top-12 right-4 z-10 w-44 rounded-lg border border-border-primary bg-surface p-1 shadow-lg"
							>
								{#if menuItems}
									{@render menuItems(item, closeMenu)}
								{/if}
								<button
									onclick={() => startRename(item)}
									class="flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-text-primary hover:bg-surface-hover"
								>
									Rename {entityName.toLowerCase()}
								</button>
								<button
									onclick={() => handleDelete(item.id, item.name)}
									class="flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
								>
									Delete {entityName.toLowerCase()}
								</button>
							</div>
						{/if}
					{/if}
				</div>
			{/each}
		</div>
	{/if}

	{#if footer}
		{@render footer()}
	{:else}
		{#snippet defaultFooter()}
			<div class="mt-auto flex items-center justify-end pt-4">
				<button
					onclick={onCreate}
					class="flex items-center gap-2 rounded-lg bg-stone-900 px-4 py-2 text-sm text-white transition hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
				>
					<PlusIcon />
					New {entityName}
				</button>
			</div>
		{/snippet}
		{@render defaultFooter()}
	{/if}
</ListPageLayout>

<ConfirmDialog
	bind:open={
		() => deleteTarget !== null,
		(v) => {
			if (!v) deleteTarget = null;
		}
	}
	title="Delete {entityName}"
	description={deleteTarget
		? deleteDescription
			? deleteDescription(/** @type {T} */ { id: deleteTarget.id, name: deleteTarget.name } as T)
			: `Delete "${deleteTarget.name}"? This cannot be undone.`
		: ''}
	confirmLabel="Delete"
	variant="destructive"
	onconfirm={confirmDelete}
/>

<style>
	.entity-list-scroll {
		scrollbar-width: thin;
		scrollbar-color: rgb(168 162 158 / 0.4) transparent;
	}
	.entity-list-scroll::-webkit-scrollbar {
		width: 6px;
	}
	.entity-list-scroll::-webkit-scrollbar-track {
		background: transparent;
	}
	.entity-list-scroll::-webkit-scrollbar-thumb {
		background: rgb(168 162 158 / 0.4);
		border-radius: 3px;
	}
	.entity-list-scroll::-webkit-scrollbar-thumb:hover {
		background: rgb(168 162 158 / 0.6);
	}
	.entity-list-scroll {
		mask-image: linear-gradient(to bottom, black 0%, black calc(100% - 32px), transparent 100%);
		-webkit-mask-image: linear-gradient(
			to bottom,
			black 0%,
			black calc(100% - 32px),
			transparent 100%
		);
	}
</style>
