<script lang="ts">
	// SPDX-License-Identifier: AGPL-3.0-only
	import { onMount } from 'svelte';
	import { APP_NAME } from '$lib/config';
	import { db } from '$lib/db';
	import { generateId } from '@stageplotter/shared';
	import { createGearItem, type GearCategory } from '$lib/db/repositories/gear';
	import { loadFinalAssets, type ProcessedItem } from '$lib/utils/finalAssetsLoader';

	let catalogItems = $state<ProcessedItem[]>([]);
	let loading = $state(true);
	let searchQuery = $state('');
	let categoryFilter = $state('all');
	let typeFilter = $state('all');
	let duplicatingId = $state<string | null>(null);

	const categories = $derived.by(() => {
		const cats = new Set(catalogItems.map((i) => i.category));
		return Array.from(cats).sort();
	});

	const types = $derived.by(() => {
		const ts = new Set(catalogItems.map((i) => i.type));
		return Array.from(ts).sort();
	});

	const filteredItems = $derived.by(() => {
		const q = searchQuery.toLowerCase().trim();
		return catalogItems.filter((item) => {
			if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
			if (typeFilter !== 'all' && item.type !== typeFilter) return false;
			if (q) {
				const searchable = [item.name, item.category, item.type, item.path, ...item.keywords]
					.join(' ')
					.toLowerCase();
				if (!searchable.includes(q)) return false;
			}
			return true;
		});
	});

	const categoryMap: Record<string, GearCategory> = {
		guitars: 'guitars',
		bass: 'bass',
		keys: 'keys',
		strings: 'strings',
		winds: 'winds',
		percussion: 'percussion',
		drums: 'drums',
		amps: 'amps',
		mics: 'mics',
		monitors: 'monitors',
		equipment: 'equipment'
	};

	function toGearCategory(cat: string): GearCategory {
		return categoryMap[cat] ?? 'other';
	}

	function formatLabel(s: string): string {
		return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
	}

	async function duplicateToGear(item: ProcessedItem) {
		duplicatingId = item.id;
		try {
			await db.init();
			const id = generateId();
			await createGearItem(id, item.name, toGearCategory(item.category), {
				catalog_item_id: item.id,
				image_path: item.image
			});
		} finally {
			duplicatingId = null;
		}
	}

	onMount(async () => {
		try {
			catalogItems = await loadFinalAssets();
		} finally {
			loading = false;
		}
	});
</script>

<svelte:head>
	<title>Gear Catalog | {APP_NAME}</title>
</svelte:head>

<div class="mx-auto flex h-[calc(100dvh-1.25rem)] max-w-5xl flex-col gap-4 px-4 py-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<h1 class="font-serif text-3xl font-bold text-text-primary">Gear Catalog</h1>
		<a href="/" class="text-sm text-text-tertiary transition hover:text-text-primary">Home</a>
	</div>

	<!-- Search & Filters -->
	<div class="flex flex-col gap-3 sm:flex-row sm:items-center">
		<input
			type="search"
			placeholder="Search gear..."
			bind:value={searchQuery}
			class="bg-surface-primary flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-stone-500 focus:outline-none dark:border-stone-600"
		/>
		<select
			bind:value={categoryFilter}
			class="bg-surface-primary rounded-lg border border-stone-300 px-3 py-2 text-sm text-text-primary focus:border-stone-500 focus:outline-none dark:border-stone-600"
		>
			<option value="all">All Categories</option>
			{#each categories as cat (cat)}
				<option value={cat}>{formatLabel(cat)}</option>
			{/each}
		</select>
		<select
			bind:value={typeFilter}
			class="bg-surface-primary rounded-lg border border-stone-300 px-3 py-2 text-sm text-text-primary focus:border-stone-500 focus:outline-none dark:border-stone-600"
		>
			<option value="all">All Types</option>
			{#each types as t (t)}
				<option value={t}>{formatLabel(t)}</option>
			{/each}
		</select>
	</div>

	<!-- Results count -->
	<p class="text-xs text-text-tertiary">
		{filteredItems.length} of {catalogItems.length} items
	</p>

	<!-- Grid -->
	{#if loading}
		<div class="flex flex-1 items-center justify-center">
			<p class="text-text-tertiary">Loading catalog...</p>
		</div>
	{:else if filteredItems.length === 0}
		<div class="flex flex-1 items-center justify-center">
			<p class="text-text-tertiary">No items match your filters.</p>
		</div>
	{:else}
		<div class="custom-scrollbar flex-1 overflow-y-auto">
			<div class="grid grid-cols-2 gap-3 pb-4 md:grid-cols-3 lg:grid-cols-4">
				{#each filteredItems as item (item.id)}
					<div
						class="group bg-surface-primary relative flex flex-col overflow-hidden rounded-xl border border-stone-200 transition hover:shadow-md dark:border-stone-700"
					>
						<!-- Thumbnail -->
						<div class="flex h-32 items-center justify-center bg-stone-100 p-3 dark:bg-stone-800">
							<img
								src={item.image}
								alt={item.name}
								class="max-h-full max-w-full object-contain"
								loading="lazy"
							/>
						</div>

						<!-- Info -->
						<div class="flex flex-1 flex-col gap-1 p-3">
							<h2 class="font-serif text-sm leading-tight font-semibold text-text-primary">
								{item.name}
							</h2>
							<div class="flex flex-wrap items-center gap-1.5">
								<span
									class="inline-block rounded-full bg-stone-200 px-2 py-0.5 text-[10px] font-medium text-stone-700 dark:bg-stone-700 dark:text-stone-300"
								>
									{formatLabel(item.category)}
								</span>
								<span class="text-[10px] text-text-tertiary">
									{formatLabel(item.type)}
								</span>
							</div>
						</div>

						<!-- Duplicate button (visible on hover / always on mobile) -->
						<button
							onclick={() => duplicateToGear(item)}
							disabled={duplicatingId === item.id}
							class="absolute top-2 right-2 rounded-lg bg-stone-800/80 px-2 py-1 text-[10px] font-medium text-white opacity-0 transition group-hover:opacity-100 hover:bg-stone-900 disabled:opacity-50 max-sm:opacity-70 sm:opacity-0 dark:bg-stone-200/80 dark:text-stone-900 dark:hover:bg-stone-100"
						>
							{duplicatingId === item.id ? 'Adding...' : '+ My Gear'}
						</button>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
