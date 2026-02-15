<script lang="ts">
	import { Combobox, Tabs, ContextMenu } from 'bits-ui';
	import { loadFinalAssets, filterItems, type ProcessedItem } from '$lib/utils/finalAssetsLoader';
	import { onMount } from 'svelte';
	import {
		CONSOLES,
		COLOR_CATEGORIES,
		type ColorCategory,
		type StagePlotItem,
		type PlotOutputItem,
		type InputChannel,
		type OutputChannel
	} from '@stageplotter/shared';

	type Props = {
		inputChannels: InputChannel[];
		outputChannels: OutputChannel[];
		itemByChannel: Map<number, StagePlotItem>;
		outputByChannel: Map<number, PlotOutputItem>;
		selectedItemIds?: number[];
		onSelectionChange?: (ids: number[], event: MouseEvent) => void;
		onAddItem?: (item: ProcessedItem, channel: number) => void;
		onRemoveItem?: (channel: number) => void;
		onOutputSelect?: (item: ProcessedItem, channel: number) => void;
		onOutputRemove?: (channel: number) => void;
		onClearPatch?: () => void;
		consoleType?: string | null;
		stereoLinks?: number[];
		onStereoLinksChange?: (links: number[]) => void;
		outputStereoLinks?: number[];
		onOutputStereoLinksChange?: (links: number[]) => void;
		columnCount?: number;
		readonly?: boolean;
		categoryColorDefaults?: Record<string, string>;
		onSetChannelGroup?: (channelNum: number, group: string | null) => void;
	};

	let {
		inputChannels,
		outputChannels,
		itemByChannel,
		outputByChannel,
		selectedItemIds = [],
		onSelectionChange,
		onAddItem,
		onRemoveItem,
		onOutputSelect,
		onOutputRemove,
		onClearPatch,
		consoleType = null,
		stereoLinks = [],
		onStereoLinksChange,
		outputStereoLinks = [],
		onOutputStereoLinksChange,
		columnCount = 6,
		readonly: readonlyMode = false,
		categoryColorDefaults = {},
		onSetChannelGroup
	}: Props = $props();

	// Derive set from prop for quick row highlight checks
	const selectedIdSetLocal = $derived(new Set(selectedItemIds));

	const NUM_COLUMNS = $derived(columnCount);

	// Dynamic calculations for inputs
	const TOTAL_INPUT_CHANNELS = $derived(inputChannels.length);
	const INPUT_ROWS_PER_COLUMN = $derived(Math.ceil(TOTAL_INPUT_CHANNELS / NUM_COLUMNS));

	// Dynamic calculations for outputs
	const TOTAL_OUTPUT_CHANNELS = $derived(outputChannels.length);
	const OUTPUT_ROWS_PER_COLUMN = $derived(Math.ceil(TOTAL_OUTPUT_CHANNELS / NUM_COLUMNS));

	// Derive console definition from selected type
	const consoleDef = $derived(consoleType ? (CONSOLES[consoleType] ?? null) : null);
	const availableColors = $derived(consoleDef?.colors ?? []);
	// O(1) color lookup by id instead of .find() per channel render
	const colorById = $derived.by(() => {
		const map = new Map<string, (typeof availableColors)[number]>();
		for (const c of availableColors) map.set(c.id, c);
		return map;
	});

	// Hardcoded fallback colors for groups when no console is set
	const GROUP_FALLBACK_COLORS: Record<string, string> = {
		vocals: '#ff0000',
		drums: '#0064ff',
		guitars: '#00c800',
		bass: '#d000d0',
		keys: '#e8e800',
		strings: '#00c8c8',
		winds: '#e0e0e0',
		percussion: '#ff8800',
		monitors: '#1a1a1a'
	};

	function getGroupColor(group: string): string {
		// Use console color if available, otherwise fallback
		const colorId = categoryColorDefaults[group];
		if (colorId && consoleDef) {
			const color = colorById.get(colorId);
			if (color) return color.hex;
		}
		return GROUP_FALLBACK_COLORS[group] ?? '#888888';
	}

	// State for loaded items
	let allAvailableItems: ProcessedItem[] = $state([]);
	let loading = $state(true);

	// Build ProcessedItem maps from channel props (for combobox display)
	const selectedInputItemsByChannel = $derived.by(() => {
		const map: Record<number, ProcessedItem | null> = {};
		for (const [chNum, item] of itemByChannel) {
			if (item.itemData) {
				map[chNum] = { ...(item.itemData as ProcessedItem), name: item.name } as ProcessedItem;
			} else {
				map[chNum] = {
					id: String(item.id),
					name: item.name,
					category: item.category ?? 'Input',
					image: '',
					type: 'input',
					keywords: []
				} as unknown as ProcessedItem;
			}
		}
		return map;
	});

	// Keep combobox search boxes in sync with canvas
	$effect(() => {
		void [...itemByChannel.values()].map((i) => i.name).join('|');
		for (const ch of inputChannelNumbers) {
			const proc = selectedInputItemsByChannel[ch] as ProcessedItem | null;
			inputSearchValues[ch] = proc ? proc.name : '';
		}
	});

	const selectedOutputItemsByChannel = $derived.by(() => {
		const map: Record<number, ProcessedItem | null> = {};
		for (const [chNum, output] of outputByChannel) {
			if (output.itemData) {
				map[chNum] = {
					...(output.itemData as ProcessedItem),
					name: output.name
				} as ProcessedItem;
			} else {
				map[chNum] = {
					id: String(output.id),
					name: output.name,
					category: 'Output',
					image: '',
					type: 'output',
					keywords: []
				} as unknown as ProcessedItem;
			}
		}
		return map;
	});

	// Search values for each combobox (separate for inputs and outputs)
	let inputSearchValues = $state<Record<number, string>>({});
	let outputSearchValues = $state<Record<number, string>>({});

	// Keep output combobox search boxes in sync with outputs prop
	$effect(() => {
		void [...outputByChannel.values()].map((o) => o.name).join('|');
		for (const ch of outputChannelNumbers) {
			const proc = selectedOutputItemsByChannel[ch] as ProcessedItem | null;
			outputSearchValues[ch] = proc ? proc.name : '';
		}
	});

	// Create channel lists based on current arrays
	const inputChannelNumbers = $derived(inputChannels.map((ch) => ch.channelNum));
	const outputChannelNumbers = $derived(outputChannels.map((ch) => ch.channelNum));

	// Generic stereo link helpers
	const stereoLinkSet = $derived(new Set(stereoLinks));
	const outputStereoLinkSet = $derived(new Set(outputStereoLinks));

	function isChLinkedTop(ch: number, linkSet: Set<number>): boolean {
		return linkSet.has(ch);
	}
	function isChLinkedBottom(ch: number, linkSet: Set<number>): boolean {
		return ch % 2 === 0 && linkSet.has(ch - 1);
	}
	function isChLinked(ch: number, linkSet: Set<number>): boolean {
		return isChLinkedTop(ch, linkSet) || isChLinkedBottom(ch, linkSet);
	}

	function toggleLink(startChannel: number, links: number[], onChange?: (links: number[]) => void) {
		const newLinks = [...links];
		const idx = newLinks.indexOf(startChannel);
		if (idx >= 0) {
			newLinks.splice(idx, 1);
		} else {
			newLinks.push(startChannel);
			newLinks.sort((a, b) => a - b);
		}
		onChange?.(newLinks);
	}

	// Get badge style for output channel (no console colors - just blue when occupied)
	function getOutputBadgeStyle(channelNum: number): string {
		if (outputByChannel.get(channelNum)) {
			return 'background-color: rgb(37, 99, 235); color: white;';
		}
		return '';
	}

	// Load items on component mount
	onMount(async () => {
		try {
			loading = true;
			const loadedItems = await loadFinalAssets();
			allAvailableItems = filterItems(loadedItems, {
				includeInputs: true,
				includeAccessories: true,
				includeSymbols: false
			});
		} catch (err) {
			console.error('Error loading final assets:', err);
		} finally {
			loading = false;
		}
	});

	// Simple memoization: cache filtered results so repeated calls with the
	// same search string (e.g. from multiple channel comboboxes that are all
	// empty) don't re-scan the entire catalog each time.
	let _filterCache: { key: string; result: ProcessedItem[] } = { key: '\0', result: [] };

	function getFilteredItems(searchValue: string) {
		if (!searchValue) return allAvailableItems;

		if (_filterCache.key === searchValue) return _filterCache.result;

		const searchLower = searchValue.toLowerCase();
		const result = allAvailableItems.filter(
			(item) =>
				item.name.toLowerCase().includes(searchLower) ||
				item.keywords.some((kw) => kw.includes(searchLower))
		);
		_filterCache = { key: searchValue, result };
		return result;
	}

	// Handle input item selection
	function handleInputItemSelect(channel: number, item: ProcessedItem | null) {
		if (item) {
			onAddItem?.(item, channel);
		} else {
			onRemoveItem?.(channel);
		}
	}

	// Handle output item selection
	function handleOutputItemSelect(channel: number, item: ProcessedItem | null) {
		if (item) {
			onOutputSelect?.(item, channel);
		} else {
			onOutputRemove?.(channel);
		}
	}

	// Get the CSS background color for an input channel number badge
	function getInputBadgeStyle(channelNum: number): string {
		const ch = inputChannels[channelNum - 1];
		if (ch?.color && consoleDef) {
			const color = colorById.get(ch.color);
			if (color) {
				// Grouped but empty → reduced opacity
				const opacity = ch.group && ch.itemId == null ? '0.5' : '1';
				return `background-color: ${color.hex}; color: ${getContrastColor(color.hex)}; opacity: ${opacity};`;
			}
		}
		if (itemByChannel.get(channelNum)) {
			return 'background-color: rgb(37, 99, 235); color: white;';
		}
		// Group color without console
		if (ch?.group) {
			const hex = getGroupColor(ch.group);
			const opacity = ch.itemId == null ? '0.5' : '1';
			return `background-color: ${hex}; color: ${getContrastColor(hex)}; opacity: ${opacity};`;
		}
		return '';
	}

	// Simple contrast color calculation
	function getContrastColor(hex: string): string {
		const r = parseInt(hex.slice(1, 3), 16);
		const g = parseInt(hex.slice(3, 5), 16);
		const b = parseInt(hex.slice(5, 7), 16);
		const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
		return luminance > 0.5 ? '#000000' : '#ffffff';
	}

	// Split input channels into columns
	const inputColumns = $derived.by(() => {
		return Array.from({ length: NUM_COLUMNS }, (_, col) =>
			inputChannelNumbers.slice(col * INPUT_ROWS_PER_COLUMN, (col + 1) * INPUT_ROWS_PER_COLUMN)
		);
	});

	// Split output channels into columns
	const outputColumns = $derived.by(() => {
		return Array.from({ length: NUM_COLUMNS }, (_, col) =>
			outputChannelNumbers.slice(col * OUTPUT_ROWS_PER_COLUMN, (col + 1) * OUTPUT_ROWS_PER_COLUMN)
		);
	});
</script>

{#snippet linkSvg(classes: string)}
	<svg class={classes} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
		<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
		<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
	</svg>
{/snippet}

{#snippet channelGrid(mode: 'input' | 'output')}
	{@const columns = mode === 'input' ? inputColumns : outputColumns}
	{@const itemMap = mode === 'input' ? selectedInputItemsByChannel : selectedOutputItemsByChannel}
	{@const lnkSet = mode === 'input' ? stereoLinkSet : outputStereoLinkSet}
	{@const lnks = mode === 'input' ? stereoLinks : outputStereoLinks}
	{@const onLnkChange = mode === 'input' ? onStereoLinksChange : onOutputStereoLinksChange}
	{@const getBadgeStyle = mode === 'input' ? getInputBadgeStyle : getOutputBadgeStyle}
	{@const handleSelect = mode === 'input' ? handleInputItemSelect : handleOutputItemSelect}
	{@const onClearCh = mode === 'input' ? onRemoveItem : onOutputRemove}

	<div
		class="grid gap-0 border border-border-primary"
		style="grid-template-columns: repeat({NUM_COLUMNS}, minmax(0, 1fr));"
	>
		{#each columns as col, colIndex (colIndex)}
			<div class="border-r border-border-primary last:border-r-0">
				{#each col as channelNum (channelNum)}
					{@const linked = isChLinked(channelNum, lnkSet)}
					{@const chLinkedTop = isChLinkedTop(channelNum, lnkSet)}
					{@const chLinkedBottom = isChLinkedBottom(channelNum, lnkSet)}
					{@const rowItem = mode === 'input' ? itemByChannel.get(channelNum) : null}
					{@const isRowSelected =
						mode === 'input' && rowItem ? selectedIdSetLocal.has(rowItem.id) : false}
					<ContextMenu.Root>
						<ContextMenu.Trigger>
							<div
								class="flex items-center border-b border-border-primary last:border-b-0 {chLinkedTop
									? 'h-10 border-b-0'
									: chLinkedBottom
										? 'h-10 border-b border-border-primary'
										: 'h-10'} {isRowSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}"
							>
								<!-- Channel number cell -->
								<div
									class="flex h-full w-10 flex-shrink-0 items-center justify-center border-r border-border-primary"
								>
									<!-- svelte-ignore a11y_click_events_have_key_events -->
									<!-- svelte-ignore a11y_no_static_element_interactions -->
									<div
										class="flex h-full w-full items-center justify-center text-xs font-semibold transition-colors {linked
											? 'ring-1 ring-yellow-400/50 ring-inset'
											: ''} {!readonlyMode ? 'cursor-pointer' : ''} {getBadgeStyle(channelNum)
											? ''
											: 'bg-muted/50 text-text-secondary'}"
										style={getBadgeStyle(channelNum)}
										onclick={(e) => {
											if (readonlyMode) return;
											e.stopPropagation();
											const itm = itemByChannel.get(channelNum);
											if (itm) {
												onSelectionChange?.([itm.id], e);
											}
										}}
									>
										{#if chLinkedTop}
											<span class="flex flex-col items-center leading-none">
												<span>{channelNum}</span>
												{@render linkSvg('-mb-0.5 h-3 w-3 opacity-60')}
											</span>
										{:else if chLinkedBottom}
											<span class="flex flex-col items-center leading-none">
												{@render linkSvg('-mt-0.5 h-3 w-3 opacity-60')}
												<span>{channelNum}</span>
											</span>
										{:else}
											{channelNum}
										{/if}
									</div>
								</div>

								<!-- Combobox cell -->
								<div class="flex-1 px-1">
									{#if readonlyMode}
										<div class="flex h-8 items-center truncate px-2 text-xs text-text-primary">
											{itemMap[channelNum]?.name ?? ''}
										</div>
									{:else}
										<Combobox.Root
											value={itemMap[channelNum]?.id ?? undefined}
											type="single"
											name="{mode}-{channelNum}"
											inputValue={itemMap[channelNum]?.name ?? ''}
											onValueChange={(value) => {
												const selected = allAvailableItems.find((item) => item.id === value);
												handleSelect(channelNum, selected || null);
											}}
										>
											<div class="relative">
												<Combobox.Input
													class="focus:ring-foreground/20 h-8 w-full rounded border-0 bg-transparent px-2 text-xs outline-none placeholder:text-text-secondary/50 focus:ring-1"
													placeholder="Select item..."
													oninput={(e) => {
														const val = (e.currentTarget as HTMLInputElement).value;
														if (mode === 'input') inputSearchValues[channelNum] = val;
														else outputSearchValues[channelNum] = val;
													}}
												/>
												<Combobox.Trigger
													class="absolute top-1/2 right-1 h-4 w-4 -translate-y-1/2 opacity-50 hover:opacity-100"
												>
													<svg
														xmlns="http://www.w3.org/2000/svg"
														viewBox="0 0 24 24"
														fill="none"
														stroke="currentColor"
														stroke-width="2"
														class="h-full w-full"
													>
														<path d="M6 9l6 6 6-6" />
													</svg>
												</Combobox.Trigger>
											</div>

											<Combobox.Portal>
												<Combobox.Content
													class="z-50 max-h-60 w-[var(--bits-combobox-anchor-width)] min-w-[200px] overflow-hidden rounded-md border border-border-primary bg-surface shadow-lg"
													sideOffset={4}
												>
													<Combobox.Viewport class="p-1">
														{#each getFilteredItems((mode === 'input' ? inputSearchValues[channelNum] : outputSearchValues[channelNum]) || '') as item (item.id)}
															<Combobox.Item
																value={item.id}
																label={item.name}
																class="relative flex cursor-pointer items-center rounded px-2 py-1.5 text-xs outline-none select-none data-[highlighted]:bg-muted"
															>
																{#snippet children({ selected })}
																	<span class="truncate">{item.name}</span>
																	{#if selected}
																		<svg
																			class="ml-auto h-3 w-3"
																			viewBox="0 0 24 24"
																			fill="none"
																			stroke="currentColor"
																			stroke-width="2"
																		>
																			<path d="M20 6L9 17l-5-5" />
																		</svg>
																	{/if}
																{/snippet}
															</Combobox.Item>
														{:else}
															<div class="px-2 py-1.5 text-xs text-text-secondary">
																No items found
															</div>
														{/each}
													</Combobox.Viewport>
												</Combobox.Content>
											</Combobox.Portal>
										</Combobox.Root>
									{/if}
								</div>
							</div>
						</ContextMenu.Trigger>
						<ContextMenu.Portal>
							<ContextMenu.Content
								class="z-50 min-w-[180px] rounded-md border border-border-primary bg-surface p-1 shadow-lg"
							>
								{#if !readonlyMode}
									{#if channelNum % 2 === 1}
										{@const isCurrentlyLinked = lnkSet.has(channelNum)}
										<ContextMenu.Item
											class="flex cursor-pointer items-center rounded px-2 py-1.5 text-xs outline-none hover:bg-muted"
											onSelect={() => toggleLink(channelNum, lnks, onLnkChange)}
										>
											{@render linkSvg('mr-2 h-3.5 w-3.5 opacity-70')}
											{isCurrentlyLinked
												? `Unlink Ch ${channelNum}-${channelNum + 1}`
												: `Stereo Link Ch ${channelNum}-${channelNum + 1}`}
										</ContextMenu.Item>
									{:else}
										{@const isCurrentlyLinked = lnkSet.has(channelNum - 1)}
										{#if isCurrentlyLinked}
											<ContextMenu.Item
												class="flex cursor-pointer items-center rounded px-2 py-1.5 text-xs outline-none hover:bg-muted"
												onSelect={() => toggleLink(channelNum - 1, lnks, onLnkChange)}
											>
												{@render linkSvg('mr-2 h-3.5 w-3.5 opacity-70')}
												Unlink Ch {channelNum - 1}-{channelNum}
											</ContextMenu.Item>
										{:else}
											<ContextMenu.Item
												class="flex cursor-pointer items-center rounded px-2 py-1.5 text-xs text-yellow-600 outline-none hover:bg-muted"
												onSelect={() => toggleLink(channelNum, lnks, onLnkChange)}
											>
												{@render linkSvg('mr-2 h-3.5 w-3.5 opacity-70')}
												Link Ch {channelNum}-{channelNum + 1} (not recommended)
											</ContextMenu.Item>
											<div class="px-2 py-1 text-[10px] text-yellow-600/80">
												Stereo links should start on an odd channel
											</div>
										{/if}
									{/if}
									<ContextMenu.Separator class="my-1 h-px bg-border-primary" />
								{/if}
								{#if mode === 'input'}
									<ContextMenu.Item
										class="flex cursor-pointer items-center rounded px-2 py-1.5 text-xs outline-none hover:bg-muted"
										onSelect={() => {
											const itm = itemByChannel.get(channelNum);
											if (itm) onSelectionChange?.([itm.id], new MouseEvent('click'));
										}}
									>
										Select on Canvas
									</ContextMenu.Item>
									{#if onSetChannelGroup && !readonlyMode}
										<ContextMenu.Sub>
											<ContextMenu.SubTrigger
												class="flex cursor-pointer items-center rounded px-2 py-1.5 text-xs outline-none hover:bg-muted"
											>
												Set Group...
												<svg
													class="ml-auto h-3 w-3"
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													stroke-width="2"
												>
													<path d="M9 18l6-6-6-6" />
												</svg>
											</ContextMenu.SubTrigger>
											<ContextMenu.SubContent
												class="z-50 min-w-[160px] rounded-md border border-border-primary bg-surface p-1 shadow-lg"
											>
												{#each COLOR_CATEGORIES as cat (cat)}
													{@const hex = getGroupColor(cat)}
													{@const isActive = inputChannels[channelNum - 1]?.group === cat}
													<ContextMenu.Item
														class="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs outline-none hover:bg-muted {isActive
															? 'font-semibold'
															: ''}"
														onSelect={() => onSetChannelGroup(channelNum, isActive ? null : cat)}
													>
														<span
															class="h-3 w-3 flex-shrink-0 rounded-full"
															style="background-color: {hex};"
														></span>
														<span class="capitalize">{cat}</span>
													</ContextMenu.Item>
												{/each}
												{#if inputChannels[channelNum - 1]?.group}
													<ContextMenu.Separator class="my-1 h-px bg-border-primary" />
													<ContextMenu.Item
														class="flex cursor-pointer items-center rounded px-2 py-1.5 text-xs text-text-secondary outline-none hover:bg-muted"
														onSelect={() => onSetChannelGroup(channelNum, null)}
													>
														Remove Group
													</ContextMenu.Item>
												{/if}
											</ContextMenu.SubContent>
										</ContextMenu.Sub>
									{/if}
								{/if}
								{#if itemMap[channelNum] && !readonlyMode}
									<ContextMenu.Item
										class="flex cursor-pointer items-center rounded px-2 py-1.5 text-xs text-red-500 outline-none hover:bg-muted"
										onSelect={() => onClearCh?.(channelNum)}
									>
										Clear Channel
									</ContextMenu.Item>
								{/if}
							</ContextMenu.Content>
						</ContextMenu.Portal>
					</ContextMenu.Root>
				{/each}
			</div>
		{/each}
	</div>
{/snippet}

<div
	data-patch-list
	class="h-full overflow-hidden rounded-xl border border-border-primary bg-surface shadow-sm"
>
	<Tabs.Root value="inputs" class="w-full">
		<!-- Tab Headers -->
		<div class="border-b border-border-primary bg-muted/30 px-4 pt-4">
			<div class="mb-3 flex items-center justify-between">
				<h2 class="text-xl font-semibold text-text-primary">Patch List</h2>
				<div class="flex items-center gap-3">
					<div class="text-sm text-text-secondary">
						{TOTAL_INPUT_CHANNELS} inputs &bull; {TOTAL_OUTPUT_CHANNELS} outputs
						{#if consoleDef}
							&bull; {consoleDef.name}
						{/if}
					</div>
					{#if onClearPatch && !readonlyMode}
						<button
							onclick={() => {
								if (confirm('Clear all channel assignments? Items will remain on the canvas.'))
									onClearPatch();
							}}
							class="rounded-md border border-border-primary px-2.5 py-1 text-xs text-text-secondary transition hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:hover:border-red-700 dark:hover:bg-red-900/20 dark:hover:text-red-400"
							title="Clear all channel assignments"
						>
							Clear Patch
						</button>
					{/if}
				</div>
			</div>

			<Tabs.List class="flex gap-1">
				<Tabs.Trigger
					value="inputs"
					class="flex-1 rounded-t-lg px-4 py-3 text-center text-sm font-medium transition-colors hover:text-text-primary data-[state=active]:bg-surface data-[state=active]:text-text-primary data-[state=inactive]:text-text-secondary"
				>
					Inputs
				</Tabs.Trigger>
				<Tabs.Trigger
					value="outputs"
					class="flex-1 rounded-t-lg px-4 py-3 text-center text-sm font-medium transition-colors hover:text-text-primary data-[state=active]:bg-surface data-[state=active]:text-text-primary data-[state=inactive]:text-text-secondary"
				>
					Outputs
				</Tabs.Trigger>
			</Tabs.List>
		</div>

		<!-- Tab Contents -->
		<div class="p-4">
			<Tabs.Content value="inputs" class="mt-0">
				{#if loading}
					<div class="py-8 text-center text-text-secondary">
						<div class="flex flex-col items-center gap-2">
							<div
								class="h-6 w-6 animate-spin rounded-full border-2 border-text-secondary border-t-transparent"
							></div>
							<div>Loading items...</div>
						</div>
					</div>
				{:else}
					{@render channelGrid('input')}
				{/if}
			</Tabs.Content>

			<Tabs.Content value="outputs" class="mt-0">
				{#if loading}
					<div class="py-8 text-center text-text-secondary">
						<div class="flex flex-col items-center gap-2">
							<div
								class="h-6 w-6 animate-spin rounded-full border-2 border-text-secondary border-t-transparent"
							></div>
							<div>Loading items...</div>
						</div>
					</div>
				{:else}
					{@render channelGrid('output')}
				{/if}
			</Tabs.Content>
		</div>
	</Tabs.Root>
</div>
