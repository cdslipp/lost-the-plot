<script lang="ts">
	import { Combobox, Tabs, ContextMenu } from 'bits-ui';
	import { loadFinalAssets, filterItems, type ProcessedItem } from '$lib/utils/finalAssetsLoader';
	import { onMount } from 'svelte';
	import ChannelColorPicker from './ChannelColorPicker.svelte';
	import {
		CONSOLES,
		getConsoleColor
	} from '@stageplotter/shared';

	type Item = {
		id: number;
		name: string;
		channel: string;
		person_id: number | null;
		itemData: any;
		category?: string;
	};

	type OutputItem = {
		id: number;
		name: string;
		channel: string;
		itemData: any;
		link_mode?: 'mono' | 'stereo_pair';
	};

	type ChannelMode = 8 | 16 | 24 | 32 | 48;

	type Props = {
		items: Item[];
		outputs?: OutputItem[];
		onUpdateItem?: (itemId: number, property: string, value: string) => void;
		onReorderPatch?: (fromIndex: number, toIndex: number) => void;
		onSelectItem?: (item: Item, event: MouseEvent) => void;
		onAddItem?: (item: ProcessedItem, channel: number) => void;
		onRemoveItem?: (channel: number) => void;
		onOutputSelect?: (item: ProcessedItem, channel: number) => void;
		onOutputRemove?: (channel: number) => void;
		onClearPatch?: () => void;
		consoleType?: string | null;
		channelColors?: Record<number, string>;
		onChannelColorChange?: (channel: number, colorId: string) => void;
		stereoLinks?: number[];
		onStereoLinksChange?: (links: number[]) => void;
		outputStereoLinks?: number[];
		onOutputStereoLinksChange?: (links: number[]) => void;
		categoryColorDefaults?: Record<string, string>;
		inputChannelMode?: ChannelMode;
		outputChannelMode?: ChannelMode;
		columnCount?: number;
	};

	let {
		items,
		outputs = [],
		onUpdateItem,
		onReorderPatch,
		onSelectItem,
		onAddItem,
		onRemoveItem,
		onOutputSelect,
		onOutputRemove,
		onClearPatch,
		consoleType = null,
		channelColors = {},
		onChannelColorChange,
		stereoLinks = [],
		onStereoLinksChange,
		outputStereoLinks = [],
		onOutputStereoLinksChange,
		categoryColorDefaults = {},
		inputChannelMode = 48,
		outputChannelMode = 16,
		columnCount = 6
	}: Props = $props();

	const NUM_COLUMNS = $derived(columnCount);

	// Dynamic calculations for inputs
	const TOTAL_INPUT_CHANNELS = $derived(inputChannelMode);
	const INPUT_ROWS_PER_COLUMN = $derived(Math.ceil(inputChannelMode / NUM_COLUMNS));

	// Dynamic calculations for outputs
	const TOTAL_OUTPUT_CHANNELS = $derived(outputChannelMode);
	const OUTPUT_ROWS_PER_COLUMN = $derived(Math.ceil(outputChannelMode / NUM_COLUMNS));

	// Derive console definition from selected type
	const consoleDef = $derived(consoleType ? CONSOLES[consoleType] ?? null : null);
	const availableColors = $derived(consoleDef?.colors ?? []);

	// State for loaded items
	let allAvailableItems: ProcessedItem[] = $state([]);
	let loading = $state(true);

	// Track selected items per channel for inputs and outputs separately
	// Selected items per channel are now derived from the canonical `items` prop.
	// This ensures perfect, reactive linkage with the canvas.
	// Map channel → full canvas item (stagePlot item) for quick lookup
	const canvasItemByChannel = $derived.by(() => {
		const map: Record<number, Item | null> = {};
		items.forEach((it) => {
			if (it.channel) {
				map[parseInt(it.channel as string)] = it as Item;
			}
		});
		return map;
	});

	// Map channel → ProcessedItem metadata (for combobox selection)
	const selectedInputItemsByChannel = $derived.by(() => {
		const map: Record<number, ProcessedItem | null> = {};
		items.forEach((it) => {
			if (it.channel) {
				const ch = parseInt(it.channel as string);
				if (it.itemData) {
					// Merge live name (may have been edited) into the stored metadata so combobox shows latest
					map[ch] = { ...(it.itemData as ProcessedItem), name: it.name } as ProcessedItem;
				} else {
					// Fallback to basic object when itemData missing
					map[ch] = {
						id: String(it.id),
						name: it.name,
						category: it.category ?? 'Input',
						image: '',
						type: 'input',
						keywords: []
					} as unknown as ProcessedItem;
				}
			}
		});
		return map;
	});

	// Keep combobox search boxes in sync with canvas
	$effect(() => {
		// Depend on names so we update when they change, not just on length
		items.map((i) => i.name).join('|');
		for (const ch of inputChannelNumbers) {
			const proc = selectedInputItemsByChannel[ch] as ProcessedItem | null;
			inputSearchValues[ch] = proc ? proc.name : '';
		}
	});

	const selectedOutputItemsByChannel = $derived.by(() => {
		const map: Record<number, ProcessedItem | null> = {};
		outputs.forEach((o) => {
			if (o.channel) {
				const ch = parseInt(o.channel as string);
				if (o.itemData) {
					map[ch] = { ...(o.itemData as ProcessedItem), name: o.name } as ProcessedItem;
				} else {
					map[ch] = {
						id: String(o.id),
						name: o.name,
						category: 'Output',
						image: '',
						type: 'output',
						keywords: []
					} as unknown as ProcessedItem;
				}
			}
		});
		return map;
	});

	// Search values for each combobox (separate for inputs and outputs)
	let inputSearchValues = $state<Record<number, string>>({});
	let outputSearchValues = $state<Record<number, string>>({});

	// Keep output combobox search boxes in sync with outputs prop
	$effect(() => {
		outputs.map((o) => o.name).join('|');
		for (const ch of outputChannelNumbers) {
			const proc = selectedOutputItemsByChannel[ch] as ProcessedItem | null;
			outputSearchValues[ch] = proc ? proc.name : '';
		}
	});

	// Create channel lists based on current modes
	const inputChannelNumbers = $derived.by(() => {
		return Array.from({ length: TOTAL_INPUT_CHANNELS }, (_, i) => i + 1);
	});

	const outputChannelNumbers = $derived.by(() => {
		return Array.from({ length: TOTAL_OUTPUT_CHANNELS }, (_, i) => i + 1);
	});

	// Stereo link helpers
	const stereoLinkSet = $derived(new Set(stereoLinks));

	function isLinkedTop(ch: number): boolean {
		// An odd channel that starts a link
		return stereoLinkSet.has(ch);
	}
	function isLinkedBottom(ch: number): boolean {
		// An even channel whose partner (ch-1) starts a link
		return ch % 2 === 0 && stereoLinkSet.has(ch - 1);
	}
	function isLinked(ch: number): boolean {
		return isLinkedTop(ch) || isLinkedBottom(ch);
	}

	function toggleStereoLink(startChannel: number) {
		const newLinks = [...stereoLinks];
		const idx = newLinks.indexOf(startChannel);
		if (idx >= 0) {
			newLinks.splice(idx, 1);
		} else {
			newLinks.push(startChannel);
			newLinks.sort((a, b) => a - b);
		}
		onStereoLinksChange?.(newLinks);
	}

	// Output stereo link helpers
	const outputStereoLinkSet = $derived(new Set(outputStereoLinks));

	function isOutputLinkedTop(ch: number): boolean {
		return outputStereoLinkSet.has(ch);
	}
	function isOutputLinkedBottom(ch: number): boolean {
		return ch % 2 === 0 && outputStereoLinkSet.has(ch - 1);
	}
	function isOutputLinked(ch: number): boolean {
		return isOutputLinkedTop(ch) || isOutputLinkedBottom(ch);
	}

	function toggleOutputStereoLink(startChannel: number) {
		const newLinks = [...outputStereoLinks];
		const idx = newLinks.indexOf(startChannel);
		if (idx >= 0) {
			newLinks.splice(idx, 1);
		} else {
			newLinks.push(startChannel);
			newLinks.sort((a, b) => a - b);
		}
		onOutputStereoLinksChange?.(newLinks);
	}

	// Get badge style for output channel (no console colors - just blue when occupied)
	function getOutputChannelBadgeStyle(channelNum: number): string {
		if (selectedOutputItemsByChannel[channelNum]) {
			return 'background-color: rgb(37, 99, 235); color: white;';
		}
		return '';
	}

	// Context menu state
	let contextMenuChannel = $state<number | null>(null);

	// Load items on component mount
	onMount(async () => {
		try {
			loading = true;

			// Load all items from final_assets structure
			const loadedItems = await loadFinalAssets();

			// Filter items - for now, include inputs and accessories, exclude symbols/numerals
			allAvailableItems = filterItems(loadedItems, {
				includeInputs: true,
				includeAccessories: true,
				includeSymbols: false
			});

			console.log('Loaded items for comboboxes:', allAvailableItems.length);
		} catch (err) {
			console.error('Error loading final assets:', err);
		} finally {
			loading = false;
		}
	});

	// Filter items for a specific combobox based on search
	function getFilteredItems(searchValue: string) {
		if (!searchValue) return allAvailableItems;

		const searchLower = searchValue.toLowerCase();
		return allAvailableItems.filter(
			(item) =>
				item.name.toLowerCase().includes(searchLower) ||
				item.keywords.some((kw) => kw.toLowerCase().includes(searchLower))
		);
	}

	// Handle input item selection
	function handleInputItemSelect(channel: number, item: ProcessedItem | null) {
		if (item) {
			// Add or overwrite canvas for this channel
			onAddItem?.(item, channel);
		} else {
			// Clear channel on canvas
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

	// Get the CSS background color for a channel number badge
	function getChannelBadgeStyle(channelNum: number): string {
		const colorId = channelColors[channelNum];
		if (colorId && consoleDef) {
			const color = consoleDef.colors.find((c) => c.id === colorId);
			if (color) {
				return `background-color: ${color.hex}; color: ${getContrastColor(color.hex)};`;
			}
		}
		// Fallback: occupied = blue, empty = muted
		if (selectedInputItemsByChannel[channelNum]) {
			return 'background-color: rgb(37, 99, 235); color: white;';
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
			inputChannelNumbers.slice(
				col * INPUT_ROWS_PER_COLUMN,
				(col + 1) * INPUT_ROWS_PER_COLUMN
			)
		);
	});

	// Split output channels into columns
	const outputColumns = $derived.by(() => {
		return Array.from({ length: NUM_COLUMNS }, (_, col) =>
			outputChannelNumbers.slice(
				col * OUTPUT_ROWS_PER_COLUMN,
				(col + 1) * OUTPUT_ROWS_PER_COLUMN
			)
		);
	});
</script>

<div class="h-full border border-border-primary bg-surface rounded-xl shadow-sm overflow-hidden">
	<Tabs.Root value="inputs" class="w-full">
		<!-- Tab Headers -->
		<div class="border-b border-border-primary bg-muted/30 px-4 pt-4">
			<div class="flex items-center justify-between mb-3">
				<h2 class="text-xl font-semibold text-text-primary">Patch List</h2>
				<div class="flex items-center gap-3">
					<div class="text-sm text-text-secondary">
						{TOTAL_INPUT_CHANNELS} inputs &bull; {TOTAL_OUTPUT_CHANNELS} outputs
						{#if consoleDef}
							&bull; {consoleDef.name}
						{/if}
					</div>
					{#if onClearPatch}
						<button
							onclick={() => { if (confirm('Clear all channel assignments? Items will remain on the canvas.')) onClearPatch(); }}
							class="rounded-md border border-border-primary px-2.5 py-1 text-xs text-text-secondary transition hover:bg-red-50 hover:text-red-600 hover:border-red-300 dark:hover:bg-red-900/20 dark:hover:text-red-400 dark:hover:border-red-700"
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
					class="flex-1 text-center px-4 py-3 text-sm font-medium rounded-t-lg transition-colors data-[state=active]:bg-surface data-[state=active]:text-text-primary data-[state=inactive]:text-text-secondary hover:text-text-primary"
				>
					Inputs
				</Tabs.Trigger>
				<Tabs.Trigger
					value="outputs"
					class="flex-1 text-center px-4 py-3 text-sm font-medium rounded-t-lg transition-colors data-[state=active]:bg-surface data-[state=active]:text-text-primary data-[state=inactive]:text-text-secondary hover:text-text-primary"
				>
					Outputs
				</Tabs.Trigger>
			</Tabs.List>
		</div>

		<!-- Tab Contents -->
		<div class="p-4">
			<!-- Inputs Tab -->
			<Tabs.Content value="inputs" class="mt-0">
				{#if loading}
					<div class="py-8 text-center text-text-secondary">
						<div class="flex flex-col items-center gap-2">
							<div
								class="animate-spin h-6 w-6 border-2 border-text-secondary border-t-transparent rounded-full"
							></div>
							<div>Loading items...</div>
						</div>
					</div>
				{:else}
					<!-- Excel-like grid -->
					<div
						class="grid gap-0 border border-border-primary"
						style="grid-template-columns: repeat({NUM_COLUMNS}, minmax(0, 1fr));"
					>
						{#each inputColumns as col, colIndex}
							<div class="border-r border-border-primary last:border-r-0">
								{#each col as channelNum}
									{@const linked = isLinked(channelNum)}
									{@const linkedTop = isLinkedTop(channelNum)}
									{@const linkedBottom = isLinkedBottom(channelNum)}
									<ContextMenu.Root onOpenChange={(open) => { if (open) contextMenuChannel = channelNum; }}>
										<ContextMenu.Trigger>
											<div
												class="border-b border-border-primary last:border-b-0 flex items-center {linkedTop ? 'h-10 border-b-0' : linkedBottom ? 'h-10 border-b border-border-primary' : 'h-10'}"
											>
												<!-- Channel number cell with color picker -->
												<div class="w-10 h-full flex-shrink-0 flex items-center justify-center border-r border-border-primary">
													{#if availableColors.length > 0}
														<ChannelColorPicker
															colors={availableColors}
															currentColorId={channelColors[channelNum] ?? null}
															{channelNum}
															onSelectColor={(ch, colorId) => onChannelColorChange?.(ch, colorId)}
														>
															<div
																class="w-full h-full flex items-center justify-center text-xs font-semibold cursor-pointer transition-colors {linked ? 'ring-1 ring-inset ring-yellow-400/50' : ''} {!channelColors[channelNum] && selectedInputItemsByChannel[channelNum] ? 'bg-blue-600 text-white' : !channelColors[channelNum] ? 'bg-muted/50 text-text-secondary' : ''}"
																style={getChannelBadgeStyle(channelNum)}
															>
																{#if linkedTop}
																	<span class="flex flex-col items-center leading-none">
																		<span>{channelNum}</span>
																		<svg class="w-3 h-3 opacity-60 -mb-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
																			<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
																			<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
																		</svg>
																	</span>
																{:else if linkedBottom}
																	<span class="flex flex-col items-center leading-none">
																		<svg class="w-3 h-3 opacity-60 -mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
																			<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
																			<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
																		</svg>
																		<span>{channelNum}</span>
																	</span>
																{:else}
																	{channelNum}
																{/if}
															</div>
														</ChannelColorPicker>
													{:else}
														<div
															class="w-full h-full flex items-center justify-center text-xs font-semibold cursor-pointer transition-colors {selectedInputItemsByChannel[channelNum] ? 'bg-blue-600 text-white' : 'bg-muted/50 text-text-secondary'}"
															onclick={() => {
																const itm = canvasItemByChannel[channelNum];
																itm && onSelectItem?.(itm, new MouseEvent('click'));
															}}
														>
															{channelNum}
														</div>
													{/if}
												</div>

												<!-- Combobox cell -->
												<div class="flex-1 px-1">
													<Combobox.Root
														value={selectedInputItemsByChannel[channelNum]?.id ??
															undefined}
														type="single"
														name="input-{channelNum}"
														inputValue={selectedInputItemsByChannel[channelNum]
															?.name ?? ''}
														onValueChange={(value) => {
															const selected = allAvailableItems.find(
																(item) => item.id === value
															);
															handleInputItemSelect(channelNum, selected || null);
														}}
													>
														<div class="relative">
															<Combobox.Input
																class="w-full h-8 px-2 text-xs bg-transparent border-0 outline-none placeholder:text-text-secondary/50 focus:ring-1 focus:ring-foreground/20 rounded"
																placeholder="Select item..."
																oninput={(e) => {
																	inputSearchValues[channelNum] = (
																		e.currentTarget as HTMLInputElement
																	).value;
																}}
															/>
															<Combobox.Trigger
																class="absolute right-1 top-1/2 -translate-y-1/2 w-4 h-4 opacity-50 hover:opacity-100"
															>
																<svg
																	xmlns="http://www.w3.org/2000/svg"
																	viewBox="0 0 24 24"
																	fill="none"
																	stroke="currentColor"
																	stroke-width="2"
																	class="w-full h-full"
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
																	{#each getFilteredItems(inputSearchValues[channelNum] || '') as item (item.id)}
																		<Combobox.Item
																			value={item.id}
																			label={item.name}
																			class="relative flex cursor-pointer select-none items-center rounded px-2 py-1.5 text-xs outline-none data-[highlighted]:bg-muted"
																		>
																			{#snippet children({ selected })}
																				<span class="truncate"
																					>{item.name}</span
																				>
																				{#if selected}
																					<svg
																						class="ml-auto h-3 w-3"
																						viewBox="0 0 24 24"
																						fill="none"
																						stroke="currentColor"
																						stroke-width="2"
																					>
																						<path
																							d="M20 6L9 17l-5-5"
																						/>
																					</svg>
																				{/if}
																			{/snippet}
																		</Combobox.Item>
																	{:else}
																		<div
																			class="px-2 py-1.5 text-xs text-text-secondary"
																		>
																			No items found
																		</div>
																	{/each}
																</Combobox.Viewport>
															</Combobox.Content>
														</Combobox.Portal>
													</Combobox.Root>
												</div>
											</div>
										</ContextMenu.Trigger>
										<ContextMenu.Portal>
											<ContextMenu.Content class="z-50 min-w-[180px] rounded-md border border-border-primary bg-surface p-1 shadow-lg">
												{#if channelNum % 2 === 1}
													<!-- Odd channel: can link with next -->
													{@const isCurrentlyLinked = stereoLinkSet.has(channelNum)}
													<ContextMenu.Item
														class="flex cursor-pointer items-center rounded px-2 py-1.5 text-xs outline-none hover:bg-muted"
														onSelect={() => toggleStereoLink(channelNum)}
													>
														<svg class="w-3.5 h-3.5 mr-2 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
															<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
															<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
														</svg>
														{isCurrentlyLinked ? `Unlink Ch ${channelNum}-${channelNum + 1}` : `Stereo Link Ch ${channelNum}-${channelNum + 1}`}
													</ContextMenu.Item>
												{:else}
													<!-- Even channel -->
													{@const isCurrentlyLinked = stereoLinkSet.has(channelNum - 1)}
													{#if isCurrentlyLinked}
														<ContextMenu.Item
															class="flex cursor-pointer items-center rounded px-2 py-1.5 text-xs outline-none hover:bg-muted"
															onSelect={() => toggleStereoLink(channelNum - 1)}
														>
															<svg class="w-3.5 h-3.5 mr-2 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
																<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
																<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
															</svg>
															Unlink Ch {channelNum - 1}-{channelNum}
														</ContextMenu.Item>
													{:else}
														<ContextMenu.Item
															class="flex cursor-pointer items-center rounded px-2 py-1.5 text-xs text-yellow-600 outline-none hover:bg-muted"
															onSelect={() => toggleStereoLink(channelNum)}
														>
															<svg class="w-3.5 h-3.5 mr-2 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
																<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
																<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
															</svg>
															Link Ch {channelNum}-{channelNum + 1} (not recommended)
														</ContextMenu.Item>
														<div class="px-2 py-1 text-[10px] text-yellow-600/80">
															Stereo links should start on an odd channel
														</div>
													{/if}
												{/if}
												<ContextMenu.Separator class="my-1 h-px bg-border-primary" />
												<ContextMenu.Item
													class="flex cursor-pointer items-center rounded px-2 py-1.5 text-xs outline-none hover:bg-muted"
													onSelect={() => {
														const itm = canvasItemByChannel[channelNum];
														itm && onSelectItem?.(itm, new MouseEvent('click'));
													}}
												>
													Select on Canvas
												</ContextMenu.Item>
												{#if selectedInputItemsByChannel[channelNum]}
													<ContextMenu.Item
														class="flex cursor-pointer items-center rounded px-2 py-1.5 text-xs text-red-500 outline-none hover:bg-muted"
														onSelect={() => onRemoveItem?.(channelNum)}
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
				{/if}
			</Tabs.Content>

			<!-- Outputs Tab -->
			<Tabs.Content value="outputs" class="mt-0">
				{#if loading}
					<div class="py-8 text-center text-text-secondary">
						<div class="flex flex-col items-center gap-2">
							<div
								class="animate-spin h-6 w-6 border-2 border-text-secondary border-t-transparent rounded-full"
							></div>
							<div>Loading items...</div>
						</div>
					</div>
				{:else}
					<!-- Excel-like grid for outputs -->
					<div
						class="grid gap-0 border border-border-primary"
						style="grid-template-columns: repeat({NUM_COLUMNS}, minmax(0, 1fr));"
					>
						{#each outputColumns as col, colIndex (colIndex)}
							<div class="border-r border-border-primary last:border-r-0">
								{#each col as channelNum (channelNum)}
									{@const linked = isOutputLinked(channelNum)}
									{@const linkedTop = isOutputLinkedTop(channelNum)}
									{@const linkedBottom = isOutputLinkedBottom(channelNum)}
									<ContextMenu.Root onOpenChange={(open) => { if (open) contextMenuChannel = channelNum; }}>
										<ContextMenu.Trigger>
											<div
												class="border-b border-border-primary last:border-b-0 flex items-center {linkedTop ? 'h-10 border-b-0' : linkedBottom ? 'h-10 border-b border-border-primary' : 'h-10'}"
											>
												<!-- Channel number cell -->
												<div class="w-10 h-full flex-shrink-0 flex items-center justify-center border-r border-border-primary">
													<div
														class="w-full h-full flex items-center justify-center text-xs font-semibold cursor-pointer transition-colors {linked ? 'ring-1 ring-inset ring-yellow-400/50' : ''} {!selectedOutputItemsByChannel[channelNum] ? 'bg-muted/50 text-text-secondary' : ''}"
														style={getOutputChannelBadgeStyle(channelNum)}
													>
														{#if linkedTop}
															<span class="flex flex-col items-center leading-none">
																<span>{channelNum}</span>
																<svg class="w-3 h-3 opacity-60 -mb-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
																	<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
																	<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
																</svg>
															</span>
														{:else if linkedBottom}
															<span class="flex flex-col items-center leading-none">
																<svg class="w-3 h-3 opacity-60 -mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
																	<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
																	<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
																</svg>
																<span>{channelNum}</span>
															</span>
														{:else}
															{channelNum}
														{/if}
													</div>
												</div>

												<!-- Combobox cell -->
												<div class="flex-1 px-1">
													<Combobox.Root
														value={selectedOutputItemsByChannel[channelNum]?.id ??
															undefined}
														type="single"
														name="output-{channelNum}"
														inputValue={selectedOutputItemsByChannel[channelNum]
															?.name ?? ''}
														onValueChange={(value) => {
															const selected = allAvailableItems.find(
																(item) => item.id === value
															);
															handleOutputItemSelect(
																channelNum,
																selected || null
															);
														}}
													>
														<div class="relative">
															<Combobox.Input
																class="w-full h-8 px-2 text-xs bg-transparent border-0 outline-none placeholder:text-text-secondary/50 focus:ring-1 focus:ring-foreground/20 rounded"
																placeholder="Select item..."
																oninput={(e) => {
																	outputSearchValues[channelNum] = (
																		e.currentTarget as HTMLInputElement
																	).value;
																}}
															/>
															<Combobox.Trigger
																class="absolute right-1 top-1/2 -translate-y-1/2 w-4 h-4 opacity-50 hover:opacity-100"
															>
																<svg
																	xmlns="http://www.w3.org/2000/svg"
																	viewBox="0 0 24 24"
																	fill="none"
																	stroke="currentColor"
																	stroke-width="2"
																	class="w-full h-full"
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
																	{#each getFilteredItems(outputSearchValues[channelNum] || '') as item (item.id)}
																		<Combobox.Item
																			value={item.id}
																			label={item.name}
																			class="relative flex cursor-pointer select-none items-center rounded px-2 py-1.5 text-xs outline-none data-[highlighted]:bg-muted"
																		>
																			{#snippet children({ selected })}
																				<span class="truncate"
																					>{item.name}</span
																				>
																				{#if selected}
																					<svg
																						class="ml-auto h-3 w-3"
																						viewBox="0 0 24 24"
																						fill="none"
																						stroke="currentColor"
																						stroke-width="2"
																					>
																						<path
																							d="M20 6L9 17l-5-5"
																						/>
																					</svg>
																				{/if}
																			{/snippet}
																		</Combobox.Item>
																	{:else}
																		<div
																			class="px-2 py-1.5 text-xs text-text-secondary"
																		>
																			No items found
																		</div>
																	{/each}
																</Combobox.Viewport>
															</Combobox.Content>
														</Combobox.Portal>
													</Combobox.Root>
												</div>
											</div>
										</ContextMenu.Trigger>
										<ContextMenu.Portal>
											<ContextMenu.Content class="z-50 min-w-[180px] rounded-md border border-border-primary bg-surface p-1 shadow-lg">
												{#if channelNum % 2 === 1}
													{@const isCurrentlyLinked = outputStereoLinkSet.has(channelNum)}
													<ContextMenu.Item
														class="flex cursor-pointer items-center rounded px-2 py-1.5 text-xs outline-none hover:bg-muted"
														onSelect={() => toggleOutputStereoLink(channelNum)}
													>
														<svg class="w-3.5 h-3.5 mr-2 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
															<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
															<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
														</svg>
														{isCurrentlyLinked ? `Unlink Ch ${channelNum}-${channelNum + 1}` : `Stereo Link Ch ${channelNum}-${channelNum + 1}`}
													</ContextMenu.Item>
												{:else}
													{@const isCurrentlyLinked = outputStereoLinkSet.has(channelNum - 1)}
													{#if isCurrentlyLinked}
														<ContextMenu.Item
															class="flex cursor-pointer items-center rounded px-2 py-1.5 text-xs outline-none hover:bg-muted"
															onSelect={() => toggleOutputStereoLink(channelNum - 1)}
														>
															<svg class="w-3.5 h-3.5 mr-2 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
																<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
																<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
															</svg>
															Unlink Ch {channelNum - 1}-{channelNum}
														</ContextMenu.Item>
													{:else}
														<ContextMenu.Item
															class="flex cursor-pointer items-center rounded px-2 py-1.5 text-xs text-yellow-600 outline-none hover:bg-muted"
															onSelect={() => toggleOutputStereoLink(channelNum)}
														>
															<svg class="w-3.5 h-3.5 mr-2 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
																<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
																<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
															</svg>
															Link Ch {channelNum}-{channelNum + 1} (not recommended)
														</ContextMenu.Item>
														<div class="px-2 py-1 text-[10px] text-yellow-600/80">
															Stereo links should start on an odd channel
														</div>
													{/if}
												{/if}
												{#if selectedOutputItemsByChannel[channelNum]}
													<ContextMenu.Separator class="my-1 h-px bg-border-primary" />
													<ContextMenu.Item
														class="flex cursor-pointer items-center rounded px-2 py-1.5 text-xs text-red-500 outline-none hover:bg-muted"
														onSelect={() => onOutputRemove?.(channelNum)}
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
				{/if}
			</Tabs.Content>


		</div>
	</Tabs.Root>
</div>
