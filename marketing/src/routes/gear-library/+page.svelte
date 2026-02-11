<script lang="ts">
	import { APP_NAME, APP_URL, GITHUB_REPO } from '$lib/config';
	import SketchyLine from '$lib/components/SketchyLine.svelte';
	import SketchyLineShort from '$lib/components/SketchyLineShort.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import allItemsData from '../../../../app/static/final_assets/items.json';

	type Item = {
		name: string;
		path: string;
		variants: Record<string, string>;
		category: string;
		subcategory: string;
		item_type: string;
		tags: string[];
	};

	function itemImageUrl(item: Item): string {
		const defaultVariant = item.variants.default;
		return `${APP_URL}/final_assets/${item.path}/${defaultVariant}`;
	}

	const TAB_MAP: Record<string, string[]> = {
		All: [],
		Instruments: ['guitars', 'bass', 'keys', 'strings', 'winds', 'percussion', 'drums', 'amps'],
		People: ['people', 'musicians'],
		'Mics & Monitors': ['mics', 'monitors'],
		Cables: ['power', 'connectors', 'snakes'],
		Other: ['equipment', 'furniture', 'stagecraft']
	};

	const TAB_NAMES = Object.keys(TAB_MAP);
	const items: Item[] = allItemsData as Item[];

	let activeCategory = $state('All');
	let search = $state('');

	const filteredItems = $derived.by(() => {
		let result = items;

		if (activeCategory !== 'All') {
			const categories = TAB_MAP[activeCategory];
			result = result.filter((item) => categories.includes(item.category));
		}

		if (search.trim()) {
			const q = search.trim().toLowerCase();
			result = result.filter(
				(item) =>
					item.name.toLowerCase().includes(q) ||
					item.category.toLowerCase().includes(q) ||
					item.tags.some((t) => t.toLowerCase().includes(q))
			);
		}

		return result;
	});

	const groupedItems = $derived.by(() => {
		const groups: Record<string, Item[]> = {};
		for (const item of filteredItems) {
			const cat = item.category;
			if (!groups[cat]) groups[cat] = [];
			groups[cat].push(item);
		}
		return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
	});
</script>

<svelte:head>
	<title>Gear Library - {APP_NAME}</title>
</svelte:head>

<div class="relative z-10">
	<section class="px-6 pt-16 pb-8 text-center sm:pt-24">
		<div class="mx-auto max-w-2xl">
			<p
				class="font-sans text-xs font-medium tracking-[0.2em] text-stone-400 uppercase dark:text-stone-500"
			>
				Open database
			</p>
			<h1 class="mt-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">Gear Library</h1>
			<p class="mt-4 text-lg text-stone-500 dark:text-stone-400">
				An open, community-driven database of stage gear -- instruments, amps, microphones,
				monitors, and everything else that goes on a stage plot. Think GDTF, but for stage plotting.
			</p>
			<p class="mt-4 font-sans text-sm text-stone-400 dark:text-stone-500">
				We are indebted to
				<span class="font-semibold">Stage Plot Pro</span>, which is no longer in production. Many of
				the gear images in this library originated from that project. If anyone with a stake in
				Stage Plot Pro wishes to discuss the use of these images, please
				<a
					href={`${GITHUB_REPO}/issues/new`}
					target="_blank"
					rel="noopener noreferrer"
					class="underline hover:text-stone-600 dark:hover:text-stone-300">reach out to us</a
				>.
			</p>
		</div>
	</section>

	<SketchyLine />

	<!-- Full catalog -->
	<section class="px-6 py-16">
		<div class="mx-auto max-w-4xl">
			<h2 class="text-center text-2xl font-bold tracking-tight">Full Catalog</h2>
			<SketchyLineShort />

			<p class="mt-4 text-center font-sans text-sm text-stone-400 dark:text-stone-500">
				{items.length} items across {Object.keys(TAB_MAP).length - 1} categories
			</p>

			<!-- Search + category filter -->
			<div class="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div class="flex flex-wrap gap-2">
					{#each TAB_NAMES as tab (tab)}
						<button
							onclick={() => (activeCategory = tab)}
							class="rounded-full px-3 py-1 font-sans text-sm transition {activeCategory === tab
								? 'bg-stone-800 text-white dark:bg-stone-200 dark:text-stone-900'
								: 'bg-stone-100 text-stone-500 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-400 dark:hover:bg-stone-700'}"
						>
							{tab}
						</button>
					{/each}
				</div>
				<input
					type="text"
					placeholder="Search items..."
					bind:value={search}
					class="w-full rounded-lg border border-stone-200 bg-white px-4 py-2 font-sans text-sm text-stone-700 placeholder-stone-400 outline-none focus:border-stone-400 sm:w-64 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:placeholder-stone-500 dark:focus:border-stone-500"
				/>
			</div>

			<!-- Results -->
			<div class="mt-8">
				{#if filteredItems.length === 0}
					<p class="py-12 text-center font-sans text-sm text-stone-400 dark:text-stone-500">
						No items match your search.
					</p>
				{:else}
					{#each groupedItems as [category, categoryItems] (category)}
						<div class="mb-8">
							<h3
								class="mb-3 font-sans text-xs font-medium tracking-[0.15em] text-stone-400 uppercase dark:text-stone-500"
							>
								{category} ({categoryItems.length})
							</h3>
							<div class="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
								{#each categoryItems as item (item.name)}
									<div
										class="flex flex-col items-center gap-1.5 rounded-lg bg-stone-100 p-2 dark:bg-stone-800"
									>
										<img
											src={itemImageUrl(item)}
											alt={item.name}
											class="h-10 w-10 object-contain"
											loading="lazy"
										/>
										<span class="text-center font-sans text-xs text-stone-600 dark:text-stone-300">
											{item.name}
										</span>
									</div>
								{/each}
							</div>
						</div>
					{/each}
				{/if}
			</div>
		</div>
	</section>

	<SketchyLine />

	<!-- What it is -->
	<section class="px-6 py-16">
		<div class="mx-auto grid max-w-3xl gap-10 sm:grid-cols-2">
			<div>
				<h3 class="font-bold">Open format</h3>
				<p class="mt-2 font-sans text-base text-stone-500 dark:text-stone-400">
					Every item is a simple JSON definition with PNG renders at multiple angles. Easy to
					extend, easy to contribute to.
				</p>
			</div>
			<div>
				<h3 class="font-bold">Multi-angle views</h3>
				<p class="mt-2 font-sans text-base text-stone-500 dark:text-stone-400">
					Front, back, left, right, and angled views for each item. Your stage plot shows gear from
					the right perspective.
				</p>
			</div>
			<div>
				<h3 class="font-bold">Custom items</h3>
				<p class="mt-2 font-sans text-base text-stone-500 dark:text-stone-400">
					Custom items can't be added at this time. Stage plots are
					<a href="/how-it-works" class="underline hover:text-stone-700 dark:hover:text-stone-200"
						>shared entirely via URL</a
					>, so both sender and receiver need access to the same catalog of items. Want something
					added?
					<a
						href={`${GITHUB_REPO}/issues/new`}
						target="_blank"
						rel="noopener noreferrer"
						class="underline hover:text-stone-700 dark:hover:text-stone-200">File an issue</a
					>
					or
					<a
						href={GITHUB_REPO}
						target="_blank"
						rel="noopener noreferrer"
						class="underline hover:text-stone-700 dark:hover:text-stone-200">submit a PR</a
					>.
				</p>
			</div>
			<div>
				<h3 class="font-bold">Categorized and searchable</h3>
				<p class="mt-2 font-sans text-base text-stone-500 dark:text-stone-400">
					Instruments, amps, mics, drums, percussion, winds, stagecraft, and more. Find what you
					need fast.
				</p>
			</div>
		</div>
	</section>

	<Footer />
</div>
