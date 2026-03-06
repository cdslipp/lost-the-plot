<script lang="ts">
	// SPDX-License-Identifier: AGPL-3.0-only
	import { onMount } from 'svelte';
	import { APP_NAME } from '$lib/config';
	import { loadFinalAssets, type ProcessedItem } from '$lib/utils/finalAssetsLoader';

	let catalogItems = $state<ProcessedItem[]>([]);
	let loading = $state(true);
	let searchQuery = $state('');
	let categoryFilter = $state('all');
	let typeFilter = $state('all');
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

	function formatLabel(s: string): string {
		return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
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
				class="flex-1 rounded-lg border border-border-primary bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-border-secondary focus:outline-none"
			/>
			<select
				bind:value={categoryFilter}
				class="rounded-lg border border-border-primary bg-surface px-3 py-2 text-sm text-text-primary focus:border-border-secondary focus:outline-none"
			>
				<option value="all">All Categories</option>
				{#each categories as cat (cat)}
					<option value={cat}>{formatLabel(cat)}</option>
				{/each}
			</select>
			<select
				bind:value={typeFilter}
				class="rounded-lg border border-border-primary bg-surface px-3 py-2 text-sm text-text-primary focus:border-border-secondary focus:outline-none"
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
		<div class="gear-scroll flex-1 overflow-y-auto">
			<div class="grid grid-cols-2 gap-3 pb-4 md:grid-cols-3 lg:grid-cols-4">
				{#each filteredItems as item (item.id)}
										<div
											class="group relative flex flex-col overflow-hidden rounded-xl border border-border-primary bg-surface transition hover:shadow-md"
										>
											<!-- Thumbnail -->
											<div class="flex h-32 items-center justify-center p-3">
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
														class="inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-text-secondary"
													>
														{formatLabel(item.category)}
													</span>
													<span class="text-[10px] text-text-tertiary">
														{formatLabel(item.type)}
													</span>
												</div>
											</div>
						</div>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.gear-scroll {
		scrollbar-width: thin;
		scrollbar-color: #a8a29e transparent;
	}
	.gear-scroll::-webkit-scrollbar {
		width: 6px;
	}
	.gear-scroll::-webkit-scrollbar-track {
		background: transparent;
	}
	.gear-scroll::-webkit-scrollbar-thumb {
		background-color: #a8a29e;
		border-radius: 3px;
	}
</style>
