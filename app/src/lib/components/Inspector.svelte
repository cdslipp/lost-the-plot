<script lang="ts">
	import { MusicianCombobox } from '$lib';
	import { displayValue, toFeet, unitLabel } from '$lib/utils/scale';

	type Item = {
		id: number;
		type?: string;
		name: string;
		channel: string;
		musician: string;
		itemData: any;
		currentVariant?: string;
		width: number;
		height: number;
		x: number;
		y: number;
	};

	type Musician = {
		id: number;
		name: string;
		instrument: string;
	};

	let {
		selectedItems = $bindable<HTMLElement[]>([]),
		items = $bindable<Item[]>([]),
		musicians = $bindable<Musician[]>([]),
		title = $bindable<string>(''),
		lastModified = $bindable<string>(''),
		showZones = $bindable(true),
		stageWidth = $bindable(24),
		stageDepth = $bindable(16),
		unit = $bindable('imperial'),
		onPlaceRiser = $bindable<
			((riserWidth: number, riserDepth: number, riserHeight: number) => void) | undefined
		>(undefined),
		onUpdateItem = $bindable<
			((itemId: number, property: string, value: string) => void) | undefined
		>(undefined),
		onAddMusician = $bindable<((name: string, instrument: string) => void) | undefined>(undefined),
		onClose = $bindable<(() => void) | undefined>(undefined),
		getItemZone = $bindable<((item: Item) => string) | undefined>(undefined),
		getItemPosition = $bindable<((item: Item) => { x: number; y: number }) | undefined>(undefined),
		updateItemPosition = $bindable<((itemId: number, x: number, y: number) => void) | undefined>(
			undefined
		)
	} = $props();

	// Get the actual item objects from the selected DOM elements
	const selectedItemsData = $derived.by(() => {
		if (!items || !selectedItems) return [];
		return selectedItems
			.map((el) => {
				const id = parseInt(el.dataset?.id || '0');
				return items.find((item) => item.id === id);
			})
			.filter(Boolean) as Item[];
	});

	// For bulk editing
	let bulkMusician = $state('');

	// Riser form state
	let showRiserForm = $state(false);
	let customRiserW = $state(4);
	let customRiserD = $state(4);
	let customRiserHeight = $state(1);
	const riserPresets = [
		{ w: 4, d: 4, label: "4'×4'" },
		{ w: 4, d: 8, label: "4'×8'" },
		{ w: 8, d: 8, label: "8'×8'" }
	];

	// Handle updating item properties
	function handleUpdateItem(itemId: number, property: string, value: string) {
		if (onUpdateItem) {
			onUpdateItem(itemId, property, value);
		}
	}

	function getItemVariants(item: Item) {
		if (!item.itemData) return null;
		if (item.itemData.variants) {
			return item.itemData.variants;
		}
		return null;
	}

	function getVariantKeys(item: Item) {
		const variants = getItemVariants(item);
		if (!variants) return ['default'];
		return Object.keys(variants);
	}

	function rotateItemLeft(item: Item) {
		const variants = getItemVariants(item);
		if (!variants) return;

		const variantKeys = Object.keys(variants);
		const currentIndex = variantKeys.indexOf(item.currentVariant || 'default');
		const newIndex = (currentIndex - 1 + variantKeys.length) % variantKeys.length;
		item.currentVariant = variantKeys[newIndex];

		// Update the image source
		const newImagePath = variants[item.currentVariant];

		// Load new image to get dimensions
		if (newImagePath) {
			const img = new Image();
			img.src = buildImagePath(item, newImagePath);
			img.onload = () => {
				item.width = img.naturalWidth;
				item.height = img.naturalHeight;
			};
		}

		// Update in main state
		if (onUpdateItem) {
			onUpdateItem(item.id, 'currentVariant', item.currentVariant);
		}
	}

	// --- Drum kit detection & mic customization ---
	const isDrumKit = $derived.by(() => {
		return selectedItemsData.length === 1 && selectedItemsData[0]?.itemData?.item_type === 'drumset';
	});

	let showDrumMicModal = $state(false);

	// Basic mic list for now – will evolve per kit type later
	const defaultDrumMics = ['Kick', 'Snare', 'Hats', 'Rack Tom', 'Floor Tom', 'Overhead L', 'Overhead R'];
	let activeDrumMics = $state<string[]>([...defaultDrumMics]);

	function toggleDrumMic(mic: string) {
		if (activeDrumMics.includes(mic)) {
			activeDrumMics = activeDrumMics.filter((m) => m !== mic);
		} else {
			activeDrumMics = [...activeDrumMics, mic];
		}
	}

	function saveDrumMicConfig() {
		// TODO: integrate with items/input list (create or remove mic input items)
		showDrumMicModal = false;
	}

	function rotateItemRight(item: Item) {
		const variants = getItemVariants(item);
		if (!variants) return;

		const variantKeys = Object.keys(variants);
		const currentIndex = variantKeys.indexOf(item.currentVariant || 'default');
		const newIndex = (currentIndex + 1) % variantKeys.length;
		item.currentVariant = variantKeys[newIndex];

		// Update the image source
		const newImagePath = variants[item.currentVariant];

		// Load new image to get dimensions
		if (newImagePath) {
			const img = new Image();
			img.src = buildImagePath(item, newImagePath);
			img.onload = () => {
				item.width = img.naturalWidth;
				item.height = img.naturalHeight;
			};
		}

		// Update in main state
		if (onUpdateItem) {
			onUpdateItem(item.id, 'currentVariant', item.currentVariant);
		}
	}

	function getCurrentImageSrc(item: Item) {
		const variants = getItemVariants(item);
		if (!variants) return item.itemData?.image || '/img/egt/FenderAmp.png';

		const variant = item.currentVariant || 'default';
		const imagePath =
			variants[variant] || variants.default || (Object.values(variants)[0] as string);

		// Handle case where imagePath might be undefined
		if (!imagePath) return item.itemData?.image || '/img/egt/FenderAmp.png';

		return buildImagePath(item, imagePath);
	}

	function buildImagePath(item: Item, imagePath: string) {
		// If item has a path property, it's from final_assets structure
		if (item.itemData?.path) {
			// For final_assets items, build path from the item's directory path
			return `/final_assets/${item.itemData.path}/${imagePath}`;
		}
		
		// For old structure items, check if path already starts with /
		return imagePath.startsWith('/') ? imagePath : '/' + imagePath;
	}

	// Handle bulk updates
	function applyBulkMusician() {
		if (bulkMusician && selectedItemsData.length > 0) {
			selectedItemsData.forEach((item) => {
				if (!item) return;

				// Mutate the item directly for immediate reactivity
				item.musician = bulkMusician;

				// Call the callback so the parent can perform any additional bookkeeping
				onUpdateItem?.(item.id, 'musician', bulkMusician);
			});

			// Clear the combobox after assignment so the user sees success feedback
			bulkMusician = '';
		}
	}
</script>

<div class="flex h-full flex-col">
	{#if selectedItemsData.length === 0}
		<!-- Document Properties -->
		<div class="flex flex-1 flex-col">
			<h3 class="mb-4 font-serif font-semibold text-text-primary">Document Properties</h3>
			<div class="space-y-4">
				<div>
					<label class="mb-1 block text-xs text-text-secondary">Title</label>
					<input
						type="text"
						bind:value={title}
						class="w-full rounded-lg border border-border-primary bg-surface px-2 py-1.5 text-sm text-text-primary focus:border-stone-500 focus:ring-2 focus:ring-stone-500"
						placeholder="Band Name"
					/>
				</div>
				<div>
					<label class="mb-1 block text-xs text-text-secondary">Revision Date</label>
					<input
						type="date"
						value={new Date(lastModified).toISOString().split('T')[0]}
						onchange={(e) => { const target = e.target as HTMLInputElement; lastModified = new Date(target.value).toLocaleDateString(); }}
						class="w-full rounded-lg border border-border-primary bg-surface px-2 py-1.5 text-sm text-text-primary focus:border-stone-500 focus:ring-2 focus:ring-stone-500"
					/>
				</div>
				<div>
					<label class="mb-1 block text-xs text-text-secondary">Technical Contact</label>
					<input
						type="text"
						class="w-full rounded-lg border border-border-primary bg-surface px-2 py-1.5 text-sm text-text-primary focus:border-stone-500 focus:ring-2 focus:ring-stone-500"
						placeholder="Name and phone/email"
					/>
			</div>
			</div>
					</div>
				<div class="mt-6 text-center text-xs text-text-secondary">
					<p>Select items on the stage plot to view and edit their properties.</p>
				</div>
	{:else if selectedItemsData.length === 1}
		<!-- Single item inspector -->
		<div class="flex flex-1 flex-col">
			<h3 class="mb-4 font-serif font-semibold text-text-primary">Edit Item</h3>
			<div class="flex-1 space-y-4">
				<div class="flex justify-center">
					{#if selectedItemsData[0].type === 'riser'}
						<div
							class="flex items-center justify-center rounded border-2 border-gray-500 bg-gray-400/50 dark:border-gray-400 dark:bg-gray-600/50"
							style="width: 120px; aspect-ratio: {selectedItemsData[0].itemData?.riserWidth ?? 4}/{selectedItemsData[0].itemData?.riserDepth ?? 4};"
						>
							<div class="text-center">
								<div class="text-xs font-bold text-gray-700 dark:text-gray-200">RISER</div>
								<div class="text-[10px] text-gray-600 dark:text-gray-300">{selectedItemsData[0].itemData?.riserWidth}' × {selectedItemsData[0].itemData?.riserDepth}'</div>
							</div>
						</div>
					{:else}
						<img
							src={getCurrentImageSrc(selectedItemsData[0])}
							alt={selectedItemsData[0].itemData?.name || selectedItemsData[0].name || 'Stage Item'}
							class="max-h-32 max-w-full object-contain"
						/>
					{/if}
				</div>

				<div class="space-y-3">
					<div>
						<label class="mb-1 block text-xs text-text-secondary">Name</label>
						<input
							type="text"
							bind:value={selectedItemsData[0].name}
							onchange={(e) => { const target = e.target as HTMLInputElement; onUpdateItem?.(selectedItemsData[0].id, 'name', target.value); }}
							class="w-full rounded-lg border border-border-primary bg-surface px-2 py-1.5 text-sm text-text-primary focus:border-stone-500 focus:ring-2 focus:ring-stone-500"
							placeholder="Item name"
						/>
					</div>
					{#if selectedItemsData[0].type !== 'riser'}
					<div>
						<label class="mb-1 block text-xs text-text-secondary">Channel</label>
						<input
							type="text"
							bind:value={selectedItemsData[0].channel}
							onchange={(e) => { const target = e.target as HTMLInputElement; onUpdateItem?.(selectedItemsData[0].id, 'channel', target.value); }}
							class="w-full rounded-lg border border-border-primary bg-surface px-2 py-1.5 text-sm text-text-primary focus:border-stone-500 focus:ring-2 focus:ring-stone-500"
							placeholder="Channel"
						/>
					</div>
					<div>
						<label class="mb-1 block text-xs text-text-secondary">Musician</label>
						<MusicianCombobox
							{musicians}
							value={selectedItemsData[0].musician}
							onValueChange={(newValue) =>
								onUpdateItem?.(selectedItemsData[0].id, 'musician', newValue)}
							{onAddMusician}
						/>
					</div>
					{/if}
					<div>
						<label class="mb-1 block text-xs text-text-secondary">Zone</label>
						<input
							type="text"
							value={getItemZone?.(selectedItemsData[0]) || 'Unknown'}
							readonly
							class="w-full rounded-lg border border-border-primary bg-muted/50 px-2 py-1.5 text-sm text-text-primary"
						/>
					</div>

					<!-- Position fields -->
					{#if getItemPosition && updateItemPosition}
						<div class="grid grid-cols-2 gap-3">
							<div>
								<label class="mb-1 block text-xs text-text-secondary">Position X</label>
								<input
									type="number"
									value={getItemPosition(selectedItemsData[0]).x}
									onchange={(e) => {
										const target = e.target as HTMLInputElement;
										const newPosition = parseInt(target.value);
										updateItemPosition(
											selectedItemsData[0].id,
											newPosition,
											getItemPosition(selectedItemsData[0]).y
										);
									}}
									class="w-full rounded-lg border border-border-primary bg-surface px-2 py-1.5 text-sm text-text-primary focus:border-stone-500 focus:ring-2 focus:ring-stone-500"
								/>
							</div>
							<div>
								<label class="mb-1 block text-xs text-text-secondary">Position Y</label>
								<input
									type="number"
									value={getItemPosition(selectedItemsData[0]).y}
									onchange={(e) => {
													const target = e.target as HTMLInputElement;
													const newPosition = parseInt(target.value);
													updateItemPosition(
														selectedItemsData[0].id,
														getItemPosition(selectedItemsData[0]).x,
														newPosition
													);
												}}
									class="w-full rounded-lg border border-border-primary bg-surface px-2 py-1.5 text-sm text-text-primary focus:border-stone-500 focus:ring-2 focus:ring-stone-500"
								/>
							</div>
						</div>
						<div class="mt-1 text-xs text-text-secondary">
							<p>X: Stage left (-) to right (+) | Y: Downstage (0) to upstage (+)</p>
						</div>
					{/if}

					<!-- Riser dimensions (when a riser is selected) -->
					{#if selectedItemsData[0].type === 'riser'}
						<div>
							<label class="mb-1 block text-xs text-text-secondary">Riser Size ({unitLabel(unit)})</label>
							<div class="grid grid-cols-3 gap-2">
								<div>
									<label class="block text-[10px] text-text-tertiary">Width</label>
									<input
										type="number"
										value={displayValue(selectedItemsData[0].itemData?.riserWidth ?? 4, unit)}
										onchange={(e) => {
											const target = e.target as HTMLInputElement;
											const val = parseFloat(target.value);
											if (!isNaN(val) && val > 0) onUpdateItem?.(selectedItemsData[0].id, 'riserWidth', String(toFeet(val, unit)));
										}}
										min="1"
										step={unit === 'metric' ? '0.5' : '1'}
										class="w-full rounded-lg border border-border-primary bg-surface px-2 py-1.5 text-xs text-text-primary focus:border-stone-500 focus:ring-2 focus:ring-stone-500"
									/>
								</div>
								<div>
									<label class="block text-[10px] text-text-tertiary">Depth</label>
									<input
										type="number"
										value={displayValue(selectedItemsData[0].itemData?.riserDepth ?? 4, unit)}
										onchange={(e) => {
											const target = e.target as HTMLInputElement;
											const val = parseFloat(target.value);
											if (!isNaN(val) && val > 0) onUpdateItem?.(selectedItemsData[0].id, 'riserDepth', String(toFeet(val, unit)));
										}}
										min="1"
										step={unit === 'metric' ? '0.5' : '1'}
										class="w-full rounded-lg border border-border-primary bg-surface px-2 py-1.5 text-xs text-text-primary focus:border-stone-500 focus:ring-2 focus:ring-stone-500"
									/>
								</div>
								<div>
									<label class="block text-[10px] text-text-tertiary">Height</label>
									<input
										type="number"
										value={displayValue(selectedItemsData[0].itemData?.riserHeight ?? 1, unit)}
										onchange={(e) => {
											const target = e.target as HTMLInputElement;
											const val = parseFloat(target.value);
											if (!isNaN(val) && val > 0) onUpdateItem?.(selectedItemsData[0].id, 'riserHeight', String(toFeet(val, unit)));
										}}
										min="0.5"
										step="0.5"
										class="w-full rounded-lg border border-border-primary bg-surface px-2 py-1.5 text-xs text-text-primary focus:border-stone-500 focus:ring-2 focus:ring-stone-500"
									/>
								</div>
							</div>
						</div>
					{/if}

					<!-- Rotate buttons -->
					{#if getVariantKeys(selectedItemsData[0]).length > 1}
						<div>
							<label class="mb-1 block text-xs text-text-secondary">Rotation</label>
							<div class="flex gap-2">
								<button
									onclick={() => rotateItemLeft(selectedItemsData[0])}
									class="flex flex-1 items-center justify-center gap-2 rounded-lg bg-stone-900 px-3 py-2 text-sm text-white transition-colors hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
									title="Rotate Left"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="h-4 w-4"
										viewBox="0 0 20 20"
										fill="currentColor"
									>
										<path
											fill-rule="evenodd"
											d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
											clip-rule="evenodd"
											transform="scale(-1, 1) translate(-20, 0)"
										/>
									</svg>
									Left
								</button>
								<button
									onclick={() => rotateItemRight(selectedItemsData[0])}
									class="flex flex-1 items-center justify-center gap-2 rounded-lg bg-stone-900 px-3 py-2 text-sm text-white transition-colors hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
									title="Rotate Right"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="h-4 w-4"
										viewBox="0 0 20 20"
										fill="currentColor"
									>
										<path
											fill-rule="evenodd"
											d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 010-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
											clip-rule="evenodd"
										/>
									</svg>
									Right
								</button>
							</div>
							<div class="mt-1 text-xs text-text-secondary">
								Current: {selectedItemsData[0].currentVariant || 'default'} ({getVariantKeys(
									selectedItemsData[0]
								).indexOf(selectedItemsData[0].currentVariant || 'default') + 1} of {getVariantKeys(
									selectedItemsData[0]
								).length})
							</div>
						</div>
					{/if}

				{#if isDrumKit}
					<button
						onclick={() => (showDrumMicModal = true)}
						class="w-full rounded-lg bg-green-600 px-3 py-2 text-sm text-white transition hover:bg-green-700 mt-4"
					>
						Customize Micing
					</button>
				{/if}
				</div>
			</div>
		</div>
	{:else}
		<!-- Multiple items inspector (bulk editing) -->
		<div class="flex flex-1 flex-col">
			<h3 class="mb-4 font-serif font-semibold text-text-primary">
				Bulk Edit ({selectedItemsData.length} items selected)
			</h3>

			<div class="flex-1 space-y-4">
				<div class="rounded-lg bg-muted/50 p-4">
					<h4 class="mb-3 font-medium text-text-primary">Assign Musician</h4>
					<div class="space-y-3">
						<MusicianCombobox
							{musicians}
							value={bulkMusician}
							onValueChange={(newValue) => (bulkMusician = newValue)}
							{onAddMusician}
						/>
						<button
							onclick={applyBulkMusician}
							class="w-full rounded-lg bg-stone-900 px-3 py-2 text-sm text-white transition hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
							disabled={!bulkMusician}
						>
							Apply to All Selected Items
						</button>
					</div>
				</div>

				<div class="text-xs text-text-secondary">
					<p class="mb-1">Selected items:</p>
					<ul class="list-disc space-y-1 pl-5">
						{#each selectedItemsData as item}
							<li>{item.itemData?.name || item.name || 'Unnamed item'}</li>
						{/each}
					</ul>
				</div>
			</div>
		</div>
	{/if}

	<!-- Stage Settings (bottom of panel) -->
	<div class="mt-auto border-t border-border-primary pt-4 space-y-3">
		<!-- Unit toggle -->
		<div class="flex items-center justify-between">
			<span class="text-xs text-text-secondary">Units</span>
			<div class="flex rounded-md border border-border-primary text-xs">
				<button
					onclick={() => (unit = 'imperial')}
					class="px-2 py-0.5 transition {unit === 'imperial' ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900' : 'text-text-secondary hover:bg-surface-hover'}"
					style="border-radius: 0.3rem 0 0 0.3rem;"
				>
					ft
				</button>
				<button
					onclick={() => (unit = 'metric')}
					class="px-2 py-0.5 transition {unit === 'metric' ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900' : 'text-text-secondary hover:bg-surface-hover'}"
					style="border-radius: 0 0.3rem 0.3rem 0;"
				>
					m
				</button>
			</div>
		</div>

		<div>
			<label class="mb-1 block text-xs text-text-secondary">Stage Size ({unitLabel(unit)})</label>
			<div class="flex gap-2">
				<input
					type="number"
					value={Math.round(displayValue(stageWidth, unit) * 100) / 100}
					onchange={(e) => {
						const target = e.target as HTMLInputElement;
						const val = parseFloat(target.value);
						if (!isNaN(val) && val > 0) stageWidth = Math.round(toFeet(val, unit) * 100) / 100;
					}}
					min="1"
					step={unit === 'metric' ? '0.5' : '1'}
					placeholder="Width"
					class="w-full rounded-lg border border-border-primary bg-surface px-2 py-1.5 text-sm text-text-primary focus:border-stone-500 focus:ring-2 focus:ring-stone-500"
				/>
				<span class="self-center text-xs text-text-tertiary">x</span>
				<input
					type="number"
					value={Math.round(displayValue(stageDepth, unit) * 100) / 100}
					onchange={(e) => {
						const target = e.target as HTMLInputElement;
						const val = parseFloat(target.value);
						if (!isNaN(val) && val > 0) stageDepth = Math.round(toFeet(val, unit) * 100) / 100;
					}}
					min="1"
					step={unit === 'metric' ? '0.5' : '1'}
					placeholder="Depth"
					class="w-full rounded-lg border border-border-primary bg-surface px-2 py-1.5 text-sm text-text-primary focus:border-stone-500 focus:ring-2 focus:ring-stone-500"
				/>
			</div>
		</div>

		<!-- Add Riser -->
		{#if showRiserForm}
			<div class="rounded-lg border border-border-primary p-2 space-y-2">
				<div class="flex items-center justify-between">
					<span class="text-xs font-medium text-text-primary">Add Riser</span>
					<button onclick={() => (showRiserForm = false)} class="text-xs text-text-tertiary hover:text-text-primary">&times;</button>
				</div>
				<div class="text-xs text-text-secondary mb-1">Presets:</div>
				<div class="flex flex-wrap gap-1">
					{#each riserPresets as preset}
						<button
							onclick={() => {
								if (onPlaceRiser) onPlaceRiser(preset.w, preset.d, customRiserHeight);
								showRiserForm = false;
							}}
							class="rounded bg-muted px-2 py-1 text-xs text-text-primary hover:bg-surface-hover transition"
						>
							{preset.label}
						</button>
					{/each}
				</div>
				<div class="text-xs text-text-secondary mt-1">Custom ({unitLabel(unit)}):</div>
				<div class="flex gap-1.5 items-end">
					<div class="flex-1">
						<label class="block text-[10px] text-text-tertiary">W</label>
						<input
							type="number"
							bind:value={customRiserW}
							min="1"
							step={unit === 'metric' ? '0.5' : '1'}
							class="w-full rounded border border-border-primary bg-surface px-1.5 py-1 text-xs text-text-primary"
						/>
					</div>
					<div class="flex-1">
						<label class="block text-[10px] text-text-tertiary">D</label>
						<input
							type="number"
							bind:value={customRiserD}
							min="1"
							step={unit === 'metric' ? '0.5' : '1'}
							class="w-full rounded border border-border-primary bg-surface px-1.5 py-1 text-xs text-text-primary"
						/>
					</div>
					<div class="flex-1">
						<label class="block text-[10px] text-text-tertiary">H</label>
						<input
							type="number"
							bind:value={customRiserHeight}
							min="0.5"
							step="0.5"
							class="w-full rounded border border-border-primary bg-surface px-1.5 py-1 text-xs text-text-primary"
						/>
					</div>
				</div>
				<button
					onclick={() => {
						const w = toFeet(customRiserW, unit);
						const d = toFeet(customRiserD, unit);
						if (onPlaceRiser && w > 0 && d > 0) onPlaceRiser(w, d, customRiserHeight);
						showRiserForm = false;
					}}
					class="w-full rounded bg-stone-900 px-2 py-1.5 text-xs text-white hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200 transition"
				>
					Place Custom Riser
				</button>
			</div>
		{:else}
			<button
				onclick={() => (showRiserForm = true)}
				class="w-full rounded-lg border border-dashed border-border-primary px-3 py-2 text-sm text-text-secondary hover:border-stone-400 hover:text-text-primary transition"
			>
				+ Add Riser
			</button>
		{/if}

		<!-- Stage Zones toggle switch -->
		<div class="flex items-center justify-between">
			<span class="text-xs text-text-secondary">Stage Zones</span>
			<button
				onclick={() => (showZones = !showZones)}
				class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 {showZones ? 'bg-stone-900 dark:bg-stone-100' : 'bg-gray-300 dark:bg-gray-600'}"
				role="switch"
				aria-checked={showZones}
			>
				<span
					class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 dark:bg-gray-900 {showZones ? 'translate-x-4' : 'translate-x-0.5'}"
					style="margin-top: 2px;"
				></span>
			</button>
		</div>
	</div>
</div>

{#if showDrumMicModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center">
		<div class="absolute inset-0 bg-black/50 backdrop-blur-sm" onclick={() => (showDrumMicModal = false)}></div>
		<div class="relative w-[min(400px,90vw)] rounded-xl bg-surface p-6 shadow-lg">
			<h2 class="mb-4 text-lg font-semibold">Customize Drum Micing</h2>
			<div class="max-h-60 space-y-3 overflow-y-auto">
				{#each defaultDrumMics as mic}
					<label class="flex items-center gap-2 text-sm">
						<input type="checkbox" checked={activeDrumMics.includes(mic)} onchange={() => toggleDrumMic(mic)} />
						{mic}
					</label>
				{/each}
			</div>
			<div class="mt-6 flex justify-end gap-2">
				<button class="rounded-lg bg-muted px-3 py-2 text-sm" onclick={() => (showDrumMicModal = false)}>Cancel</button>
				<button class="rounded-lg bg-stone-900 px-3 py-2 text-sm text-white hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200" onclick={saveDrumMicConfig}>Save</button>
			</div>
		</div>
	</div>
{/if}
