<script lang="ts">
	import { Command } from 'bits-ui';
	import { loadFinalAssets, filterItems, type ProcessedItem } from '$lib/utils/finalAssetsLoader';

	type Item = ProcessedItem;

	type Props = {
		open?: boolean;
		onselect?: (item: Item) => void;
		onclose?: () => void;
	};

	let { open = $bindable(false), onselect, onclose }: Props = $props();

	let allItems = $state<Item[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let searchValue = $state('');
	let activeTab = $state('Instruments');

	const TAB_MAP: Record<string, string[]> = {
		Instruments: ['guitars', 'bass', 'keys', 'strings', 'winds', 'percussion', 'drums', 'amps'],
		People: ['people', 'musicians'],
		'Mics & Monitors': ['mics', 'monitors'],
		Cables: ['power', 'connectors', 'snakes'],
		Other: ['equipment', 'furniture', 'stagecraft'],
		All: []
	};

	const TAB_NAMES = Object.keys(TAB_MAP);
	const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);
	const modKey = isMac ? '⌘' : 'Ctrl+';

	// Load items when the component is initialized
	$effect(() => {
		async function load() {
			try {
				loading = true;
				error = null;
				const loadedItems = await loadFinalAssets();
				allItems = loadedItems;
			} catch (err) {
				console.error('Error loading final assets:', err);
				error = err instanceof Error ? err.message : 'Failed to load items';
			} finally {
				loading = false;
			}
		}
		load();
	});

	const items = $derived(
		filterItems(allItems, {
			includeInputs: true,
			includeAccessories: true,
			includeSymbols: false
		})
	);

	const filteredItems = $derived.by(() => {
		if (activeTab === 'All') return items;
		const categories = TAB_MAP[activeTab];
		if (!categories) return items;
		return items.filter((item) => categories.includes(item.category));
	});

	const tabCounts = $derived.by(() => {
		const counts: Record<string, number> = {};
		for (const tab of TAB_NAMES) {
			if (tab === 'All') {
				counts[tab] = items.length;
			} else {
				const categories = TAB_MAP[tab];
				counts[tab] = items.filter((item) => categories.includes(item.category)).length;
			}
		}
		return counts;
	});

	const groupedItems = $derived.by(() => {
		const groups = filteredItems.reduce(
			(acc, item) => {
				if (!acc[item.category]) {
					acc[item.category] = [];
				}
				acc[item.category].push(item);
				return acc;
			},
			{} as Record<string, Item[]>
		);

		return Object.entries(groups).map(([category, items]) => ({
			name: category,
			items
		}));
	});

	function fuzzyFilter(value: string, search: string, keywords?: string[]): number {
		if (!search.trim()) return 1;
		const searchLower = search.toLowerCase().replace(/\s+/g, '');
		const target = (keywords ? `${value} ${keywords.join(' ')}` : value).toLowerCase();
		// Subsequence match: all search chars must appear in order
		let j = 0;
		for (let i = 0; i < target.length && j < searchLower.length; i++) {
			if (target[i] === searchLower[j]) j++;
		}
		if (j < searchLower.length) return 0;
		// Tighter matches (shorter value relative to search) score higher
		return searchLower.length / target.length;
	}

	function handleSelect(item: Item) {
		onselect?.(item);
		open = false;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (!open) return;
		if (e.key === 'Escape') {
			open = false;
			onclose?.();
			return;
		}
		if (e.key === 'Tab') {
			e.preventDefault();
			const dir = e.shiftKey ? -1 : 1;
			const idx = TAB_NAMES.indexOf(activeTab);
			activeTab = TAB_NAMES[(idx + dir + TAB_NAMES.length) % TAB_NAMES.length];
			return;
		}
		if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= String(TAB_NAMES.length)) {
			e.preventDefault();
			activeTab = TAB_NAMES[parseInt(e.key) - 1];
		}
	}

	function handleBackdropClick() {
		open = false;
		onclose?.();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<div class="fixed inset-0 z-50 flex items-center justify-center">
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="absolute inset-0 bg-black/50 backdrop-blur-sm"
			onclick={handleBackdropClick}
			onkeydown={(e) => e.key === 'Enter' && handleBackdropClick()}
		></div>
		<div class="relative mx-4 max-h-[80vh] w-[min(800px,95vw)]">
			<Command.Root
				class="flex flex-col overflow-hidden rounded-xl border border-border-primary bg-surface shadow-2xl"
				shouldFilter={true}
				filter={fuzzyFilter}
				loop={true}
				columns={6}
			>
				<div class="border-b border-border-primary">
					<div class="flex overflow-x-auto">
						{#each TAB_NAMES as tab, i (tab)}
							<button
								type="button"
								class="flex-shrink-0 border-b-2 px-3 py-1.5 text-xs font-medium transition-colors {activeTab ===
								tab
									? 'border-stone-900 bg-stone-100 text-stone-900 dark:border-stone-100 dark:bg-stone-800 dark:text-stone-100'
									: 'border-transparent text-stone-500 hover:bg-stone-50 hover:text-stone-700 dark:text-stone-400 dark:hover:bg-stone-800/50 dark:hover:text-stone-300'}"
								onclick={() => (activeTab = tab)}
							>
								{tab}
								<span class="ml-1 text-[10px] opacity-50">[{modKey}{i + 1}]</span>
							</button>
						{/each}
					</div>
					<div class="mt-2 px-4 pb-3">
						<Command.Input
							bind:value={searchValue}
							class="w-full bg-transparent text-lg outline-none placeholder:text-text-secondary"
							placeholder="Search for stage items..."
							autofocus
						/>
					</div>
				</div>

				<Command.List class="flex-1 overflow-hidden">
					<Command.Viewport class="h-[60vh] overflow-y-auto p-2">
						{#if loading}
							<div class="py-8 text-center text-text-secondary">
								<div class="flex flex-col items-center gap-2">
									<div
										class="h-6 w-6 animate-spin rounded-full border-2 border-text-secondary border-t-transparent"
									></div>
									<div>Loading items...</div>
								</div>
							</div>
						{:else if error}
							<div class="py-8 text-center text-text-secondary">
								<div class="flex flex-col items-center gap-2">
									<div class="text-red-500">⚠</div>
									<div>Error loading items: {error}</div>
									<button
										class="text-xs text-blue-500 hover:underline"
										onclick={() => window.location.reload()}
									>
										Retry
									</button>
								</div>
							</div>
						{:else}
							<Command.Empty class="py-8 text-center text-text-secondary">
								No items found. Try a different search term.
							</Command.Empty>

							{#each groupedItems as group (group.name)}
								<Command.Group>
									<Command.GroupHeading
										class="px-2 py-2 text-xs font-semibold tracking-wider text-text-secondary uppercase"
									>
										{group.name}
									</Command.GroupHeading>
									<Command.GroupItems class="grid grid-cols-6 gap-2 px-2">
										{#each group.items as item (item.id)}
											<Command.Item
												value={`${item.name} ${item.id} ${item.keywords.join(' ')}`}
												class="flex cursor-pointer flex-col items-center gap-2 rounded-lg px-2 py-3 transition-colors hover:bg-muted data-[selected]:bg-muted"
												onSelect={() => handleSelect(item)}
											>
												<div
													class="flex flex-shrink-0 items-center justify-center"
													style="min-height: 32px; min-width: 32px;"
												>
													<img
														src={item.image}
														alt={item.name}
														style="max-width: 60px; max-height: 40px;"
														loading="lazy"
														onerror={() => {}}
													/>
												</div>
												<div class="min-w-0 flex-1 text-center">
													<div class="line-clamp-2 text-xs font-medium text-text-primary">
														{item.name}
													</div>
													{#if item.type === 'input'}
														<div class="text-xs font-semibold text-green-600">INPUT</div>
													{/if}
												</div>
											</Command.Item>
										{/each}
									</Command.GroupItems>
								</Command.Group>
							{/each}
						{/if}
					</Command.Viewport>
				</Command.List>

				<div class="border-t border-border-primary bg-muted/30 px-4 py-2">
					<div class="flex items-center justify-between text-xs text-text-secondary">
						<div class="flex items-center gap-4">
							<span>↑↓ Navigate</span>
							<span>↵ Select</span>
							<span>Tab Switch tab</span>
							<span>ESC Close</span>
						</div>
						<div>{filteredItems.length} items available</div>
					</div>
				</div>
			</Command.Root>
		</div>
	</div>
{/if}
