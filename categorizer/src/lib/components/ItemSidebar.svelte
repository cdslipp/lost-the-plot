<script lang="ts">
	import type { CatalogItem } from '$lib/types';
	import type { SvelteSet } from 'svelte/reactivity';
	import { ITEM_TYPES, CATEGORIES } from '$lib/schema';

	interface Props {
		items: CatalogItem[];
		selectedPath: string;
		multiSelected: SvelteSet<string>;
		onselect: (path: string) => void;
		ontoggleselect: (path: string) => void;
		onselectall: () => void;
		onclearselection: () => void;
	}

	let {
		items,
		selectedPath,
		multiSelected,
		onselect,
		ontoggleselect,
		onselectall,
		onclearselection
	}: Props = $props();

	let search = $state('');
	let typeFilter = $state('all');
	let categoryFilter = $state('all');
	let statusFilter = $state('all');

	let filteredItems = $derived.by(() => {
		let result = items;

		if (search) {
			const q = search.toLowerCase();
			result = result.filter(
				(i) =>
					i.name.toLowerCase().includes(q) ||
					i.slug.toLowerCase().includes(q) ||
					i.path.toLowerCase().includes(q) ||
					i._original_name.toLowerCase().includes(q) ||
					i.tags.some((t) => t.toLowerCase().includes(q))
			);
		}

		if (typeFilter !== 'all') {
			result = result.filter((i) => i.item_type === typeFilter);
		}

		if (categoryFilter !== 'all') {
			result = result.filter((i) => i.category === categoryFilter);
		}

		if (statusFilter === 'enriched') {
			result = result.filter((i) => i._enriched);
		} else if (statusFilter === 'pending') {
			result = result.filter((i) => !i._enriched);
		}

		return result;
	});

	let enrichedCount = $derived(items.filter((i) => i._enriched).length);

	export function getFilteredItems() {
		return filteredItems;
	}
</script>

<div class="flex h-full w-80 shrink-0 flex-col border-r border-gray-200 bg-white">
	<!-- Search and filters -->
	<div class="space-y-2 border-b border-gray-100 p-3">
		<input
			type="text"
			placeholder="Search name, path, tags..."
			class="w-full rounded-md border-gray-300 text-sm"
			bind:value={search}
		/>
		<div class="flex gap-2">
			<select class="flex-1 rounded border-gray-300 text-xs" bind:value={typeFilter}>
				<option value="all">All types</option>
				{#each ITEM_TYPES as type (type)}
					<option value={type}>{type}</option>
				{/each}
			</select>
			<select class="flex-1 rounded border-gray-300 text-xs" bind:value={categoryFilter}>
				<option value="all">All categories</option>
				{#each CATEGORIES as cat (cat)}
					<option value={cat}>{cat}</option>
				{/each}
			</select>
		</div>
		<select class="w-full rounded border-gray-300 text-xs" bind:value={statusFilter}>
			<option value="all">All ({items.length})</option>
			<option value="enriched">Enriched ({enrichedCount})</option>
			<option value="pending">Pending ({items.length - enrichedCount})</option>
		</select>

		<!-- Progress bar -->
		<div class="h-1.5 overflow-hidden rounded-full bg-gray-100">
			<div
				class="h-full bg-green-500 transition-all"
				style="width: {items.length ? (enrichedCount / items.length) * 100 : 0}%"
			></div>
		</div>
		<div class="text-center text-xs text-gray-500">
			{enrichedCount}/{items.length} enriched ({items.length
				? Math.round((enrichedCount / items.length) * 100)
				: 0}%)
		</div>

		<!-- Multi-select controls -->
		{#if multiSelected.size > 0}
			<div class="flex items-center gap-2 rounded bg-blue-50 px-2 py-1 text-xs text-blue-700">
				<span class="font-medium">{multiSelected.size} selected</span>
				<button class="underline" onclick={onclearselection}>Clear</button>
			</div>
		{:else}
			<div class="flex items-center gap-2 text-xs text-gray-400">
				<span>Hold <kbd class="rounded bg-gray-100 px-1">Shift</kbd>+click to multi-select</span>
				{#if filteredItems.length > 0 && filteredItems.length <= 50}
					<button class="underline" onclick={onselectall}>Select all</button>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Item list -->
	<div class="flex-1 overflow-y-auto">
		{#each filteredItems as item (item.path)}
			{@const isMultiSelected = multiSelected.has(item.path)}
			<button
				class="flex w-full items-center gap-2 border-b border-gray-50 px-3 py-2 text-left text-sm transition-colors hover:bg-gray-50
					{item.path === selectedPath ? 'border-l-2 border-l-blue-500 bg-blue-50' : ''}
					{isMultiSelected ? 'bg-indigo-50' : ''}"
				onclick={(e) => {
					if (e.shiftKey) {
						ontoggleselect(item.path);
					} else {
						onselect(item.path);
					}
				}}
			>
				{#if multiSelected.size > 0}
					<input
						type="checkbox"
						checked={isMultiSelected}
						class="rounded border-gray-300 text-indigo-600"
						onclick={(e) => {
							e.stopPropagation();
							ontoggleselect(item.path);
						}}
					/>
				{/if}
				<img
					src="/assets/{item.path}/{item.variants.default || Object.values(item.variants)[0]}"
					alt={item.name}
					class="h-8 w-8 shrink-0 object-contain"
					onerror={(e) => {
						(e.currentTarget as HTMLImageElement).style.display = 'none';
					}}
				/>
				<div class="min-w-0 flex-1">
					<div class="truncate font-medium {item._enriched ? 'text-gray-900' : 'text-gray-500'}">
						{item.name}
					</div>
					<div class="truncate text-xs text-gray-400">
						{item.path}
					</div>
				</div>
				{#if item._enriched}
					<span class="h-2 w-2 shrink-0 rounded-full bg-green-500"></span>
				{/if}
			</button>
		{/each}
	</div>

	<div class="border-t border-gray-100 p-2 text-center text-xs text-gray-400">
		{filteredItems.length} items shown
	</div>
</div>
