<script lang="ts">
	// SPDX-License-Identifier: AGPL-3.0-only
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { db } from '$lib/db';
	import { generateId } from '@stageplotter/shared';
	import {
		listFestivals,
		createFestival as createFestivalDb,
		deleteFestival,
		updateFestivalName
	} from '$lib/db/repositories/festivals';
	import { PlusIcon } from '$lib/components/icons';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import ListPageLayout from '$lib/components/ListPageLayout.svelte';
	import type { FestivalRow } from '$lib/db/repositories/festivals';

	let festivals = $state<FestivalRow[]>([]);
	let loading = $state(true);
	let openMenuFestivalId = $state<string | null>(null);
	let editingFestivalId = $state<string | null>(null);
	let festivalNameInput = $state('');

	let deleteFestivalTarget = $state<{ id: string; name: string } | null>(null);

	async function loadFestivals() {
		await db.init();
		festivals = await listFestivals();
		loading = false;
	}

	async function createFestival() {
		await db.init();
		const id = generateId();
		await createFestivalDb(id, 'Untitled Festival');
		goto(`/festivals/${id}?new=1`);
	}

	function handleDeleteFestival(festivalId: string, festivalName: string) {
		openMenuFestivalId = null;
		deleteFestivalTarget = { id: festivalId, name: festivalName };
	}

	async function confirmDeleteFestival() {
		const target = deleteFestivalTarget;
		if (!target) return;
		deleteFestivalTarget = null;
		await db.init();
		await deleteFestival(target.id);
		await loadFestivals();
	}

	function startRenameFestival(festival: { id: string; name: string }) {
		editingFestivalId = festival.id;
		festivalNameInput = festival.name;
		openMenuFestivalId = null;
	}

	function cancelRenameFestival() {
		editingFestivalId = null;
		festivalNameInput = '';
	}

	async function saveFestivalName(festivalId: string) {
		const nextName = festivalNameInput.trim();
		if (!nextName) return;
		await db.init();
		await updateFestivalName(festivalId, nextName);
		editingFestivalId = null;
		festivalNameInput = '';
		await loadFestivals();
	}

	onMount(() => {
		loadFestivals();
	});
</script>

<svelte:window
	onclick={() => (openMenuFestivalId = null)}
	onkeydown={(event) => {
		if ((event as KeyboardEvent).key === 'Escape') {
			openMenuFestivalId = null;
			cancelRenameFestival();
		}
	}}
/>

<ListPageLayout title="Your Festivals">
	{#if loading}
		<div class="flex flex-1 items-center justify-center">
			<p class="text-text-secondary">Loading...</p>
		</div>
	{:else if festivals.length === 0}
		<div class="flex flex-1 items-center justify-center">
			<div class="rounded-xl border border-border-primary bg-surface p-8 text-center shadow-sm">
				<p class="text-lg text-text-secondary">Create your first festival to get started</p>
				<button
					onclick={createFestival}
					class="mt-4 rounded-lg bg-stone-900 px-6 py-3 text-white transition hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
				>
					Create Festival
				</button>
			</div>
		</div>
	{:else}
		<div class="festival-list-scroll flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
			{#each festivals as festival (festival.id)}
				<div
					class="group relative flex items-start justify-between gap-3 rounded-xl border border-border-primary bg-surface p-6 shadow-sm transition hover:border-stone-400 hover:shadow-md"
				>
					{#if editingFestivalId === festival.id}
						<form
							onsubmit={(event) => {
								event.preventDefault();
								saveFestivalName(festival.id);
							}}
							class="flex flex-1 items-center gap-2"
						>
							<input
								bind:value={festivalNameInput}
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
								onclick={cancelRenameFestival}
								class="rounded-lg px-3 py-1.5 text-sm text-text-secondary hover:bg-surface-hover"
							>
								Cancel
							</button>
						</form>
					{:else}
						<a href="/festivals/{festival.id}" class="flex-1">
							<h2
								class="font-serif text-xl font-semibold text-text-primary group-hover:text-stone-600"
							>
								{festival.name}
							</h2>
							{#if festival.created_at}
								<div class="mt-2 text-sm text-text-secondary">
									Created {new Date(festival.created_at).toISOString().split('T')[0]}
								</div>
							{/if}
						</a>
						<button
							onclick={(event) => {
								event.stopPropagation();
								openMenuFestivalId = openMenuFestivalId === festival.id ? null : festival.id;
							}}
							class="rounded p-1.5 text-text-tertiary opacity-0 transition group-hover:opacity-100 hover:bg-surface-hover hover:text-text-primary"
							aria-label="Open festival menu"
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
						{#if openMenuFestivalId === festival.id}
							<!-- svelte-ignore a11y_no_static_element_interactions -->
							<!-- svelte-ignore a11y_click_events_have_key_events -->
							<div
								onclick={(event) => event.stopPropagation()}
								class="absolute top-12 right-4 z-10 w-44 rounded-lg border border-border-primary bg-surface p-1 shadow-lg"
							>
								<button
									onclick={() => startRenameFestival(festival)}
									class="flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-text-primary hover:bg-surface-hover"
								>
									Rename festival
								</button>
								<button
									onclick={() => handleDeleteFestival(festival.id, festival.name)}
									class="flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
								>
									Delete festival
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
				onclick={createFestival}
				class="flex items-center gap-2 rounded-lg bg-stone-900 px-4 py-2 text-sm text-white transition hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
			>
				<PlusIcon />
				New Festival
			</button>
		</div>
	{/snippet}
</ListPageLayout>

<ConfirmDialog
	bind:open={
		() => deleteFestivalTarget !== null,
		(v) => {
			if (!v) deleteFestivalTarget = null;
		}
	}
	title="Delete Festival"
	description={deleteFestivalTarget
		? `Delete "${deleteFestivalTarget.name}"? This cannot be undone.`
		: ''}
	confirmLabel="Delete"
	variant="destructive"
	onconfirm={confirmDeleteFestival}
/>

<style>
	.festival-list-scroll {
		scrollbar-width: thin;
		scrollbar-color: rgb(168 162 158 / 0.4) transparent;
	}
	.festival-list-scroll::-webkit-scrollbar {
		width: 6px;
	}
	.festival-list-scroll::-webkit-scrollbar-track {
		background: transparent;
	}
	.festival-list-scroll::-webkit-scrollbar-thumb {
		background: rgb(168 162 158 / 0.4);
		border-radius: 3px;
	}
	.festival-list-scroll::-webkit-scrollbar-thumb:hover {
		background: rgb(168 162 158 / 0.6);
	}
	.festival-list-scroll {
		mask-image: linear-gradient(to bottom, black 0%, black calc(100% - 32px), transparent 100%);
		-webkit-mask-image: linear-gradient(
			to bottom,
			black 0%,
			black calc(100% - 32px),
			transparent 100%
		);
	}
</style>
