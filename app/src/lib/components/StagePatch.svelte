<script lang="ts">
	import { Tabs, ContextMenu } from 'bits-ui';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import {
		CONSOLES,
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
		selectedChannelNum?: number | null;
		onSelectionChange?: (ids: number[], event: MouseEvent) => void;
		onChannelSelect?: (channelNum: number, event: MouseEvent) => void;
		onChannelNameInput?: (channelNum: number, name: string) => void;
		onChannelNameCommit?: () => void;
		onRemoveItem?: (channel: number) => void;
		onOutputRemove?: (channel: number) => void;
		onClearPatch?: () => void;
		consoleType?: string | null;
		stereoLinks?: number[];
		onStereoLinksChange?: (links: number[]) => void;
		outputStereoLinks?: number[];
		onOutputStereoLinksChange?: (links: number[]) => void;
		columnCount?: number;
		readonly?: boolean;
	};

	let {
		inputChannels,
		outputChannels,
		itemByChannel,
		outputByChannel,
		selectedItemIds = [],
		selectedChannelNum = null,
		onSelectionChange,
		onChannelSelect,
		onChannelNameInput,
		onChannelNameCommit,
		onRemoveItem,
		onOutputRemove,
		onClearPatch,
		consoleType = null,
		stereoLinks = [],
		onStereoLinksChange,
		outputStereoLinks = [],
		onOutputStereoLinksChange,
		columnCount = 6,
		readonly: readonlyMode = false
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

	let showClearConfirm = $state(false);

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

	// Get the CSS background color for an input channel number badge
	function getInputBadgeStyle(channelNum: number, selected: boolean): string {
		const ch = inputChannels[channelNum - 1];
		if (ch?.color && consoleDef) {
			const color = colorById.get(ch.color);
			if (color) {
				const bg = selected ? darkenHex(color.hex, 0.35) : color.hex;
				const fg = selected ? '#ffffff' : getContrastColor(color.hex);
				return `background-color: ${bg}; color: ${fg};`;
			}
		}
		if (selected) {
			return 'background-color: rgb(15, 23, 42); color: white;';
		}
		if (itemByChannel.get(channelNum)) {
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

	function darkenHex(hex: string, amount: number): string {
		const r = Math.round(parseInt(hex.slice(1, 3), 16) * (1 - amount));
		const g = Math.round(parseInt(hex.slice(3, 5), 16) * (1 - amount));
		const b = Math.round(parseInt(hex.slice(5, 7), 16) * (1 - amount));
		return `rgb(${r}, ${g}, ${b})`;
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
	{@const lnkSet = mode === 'input' ? stereoLinkSet : outputStereoLinkSet}
	{@const lnks = mode === 'input' ? stereoLinks : outputStereoLinks}
	{@const onLnkChange = mode === 'input' ? onStereoLinksChange : onOutputStereoLinksChange}
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
						mode === 'input'
							? selectedChannelNum === channelNum ||
								(rowItem ? selectedIdSetLocal.has(rowItem.id) : false)
							: false}
					{@const badgeStyle =
						mode === 'input'
							? getInputBadgeStyle(channelNum, isRowSelected)
							: getOutputBadgeStyle(channelNum)}
					<ContextMenu.Root>
						<ContextMenu.Trigger>
							<div
								class="flex items-center border-b border-border-primary {chLinkedTop
									? 'h-10 border-b-0'
									: chLinkedBottom
										? 'h-10 border-b border-border-primary'
										: 'h-10'} {isRowSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}"
							>
								<!-- Channel number cell (click to select channel) -->
								<div
									class="flex h-full w-10 flex-shrink-0 items-center justify-center border-r border-border-primary"
								>
									<!-- svelte-ignore a11y_click_events_have_key_events -->
									<!-- svelte-ignore a11y_no_static_element_interactions -->
									<div
										class="flex h-full w-full items-center justify-center text-xs font-semibold transition-colors {linked
											? 'ring-1 ring-yellow-400/50 ring-inset'
											: ''} {!readonlyMode ? 'cursor-pointer' : ''} {isRowSelected
											? 'ring-2 ring-stone-900 ring-inset dark:ring-stone-200'
											: ''} {badgeStyle ? '' : 'bg-muted/50 text-text-secondary'}"
										style={badgeStyle}
										onclick={(e) => {
											if (readonlyMode) return;
											e.stopPropagation();
											if (mode === 'input') {
												onChannelSelect?.(channelNum, e);
											} else {
												// Output channels: select linked item on canvas if present
												const itm = itemByChannel.get(channelNum);
												if (itm) onSelectionChange?.([itm.id], e);
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

								<!-- Name cell -->
								<div class="flex-1 px-1">
									{#if mode === 'input' && !readonlyMode}
										<input
											type="text"
											value={inputChannels[channelNum - 1]?.name ?? ''}
											oninput={(e) => onChannelNameInput?.(channelNum, e.currentTarget.value)}
											onchange={() => onChannelNameCommit?.()}
											onfocus={(e) => onChannelSelect?.(channelNum, new MouseEvent('click'))}
											class="h-8 w-full rounded border-0 bg-transparent px-2 text-xs text-text-primary outline-none placeholder:text-text-secondary/50 focus:ring-1 focus:ring-stone-400/50"
											placeholder=""
										/>
									{:else}
										<div class="flex h-8 items-center truncate px-2 text-xs text-text-primary">
											{#if mode === 'input'}
												{inputChannels[channelNum - 1]?.name ?? ''}
											{:else}
												{outputByChannel.get(channelNum)?.name ?? ''}
											{/if}
										</div>
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
								{/if}
								{#if (mode === 'input' ? inputChannels[channelNum - 1]?.itemId != null : outputByChannel.get(channelNum)) && !readonlyMode}
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
							onclick={() => (showClearConfirm = true)}
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
				{@render channelGrid('input')}
			</Tabs.Content>

			<Tabs.Content value="outputs" class="mt-0">
				{@render channelGrid('output')}
			</Tabs.Content>
		</div>
	</Tabs.Root>
</div>

<ConfirmDialog
	bind:open={showClearConfirm}
	title="Clear Patch"
	description="Clear all channel assignments? Items will remain on the canvas."
	confirmLabel="Clear"
	variant="destructive"
	onconfirm={() => onClearPatch?.()}
/>
