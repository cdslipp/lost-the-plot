<script lang="ts">
	import PersonCombobox from './PersonCombobox.svelte';
	import { displayValue, toFeet, unitLabel } from '$lib/utils/scale';
	import { toggleMode } from 'mode-watcher';
	import {
		getItemVariants,
		getVariantKeys,
		buildImagePath,
		getCurrentImageSrc
	} from '$lib/utils/canvasUtils';
	import { getPlotState } from '$lib/state/stagePlotState.svelte';
	import type { StagePlotItem } from '@stageplotter/shared';

	type Props = {
		selectedItems?: HTMLElement[];
		onPlaceRiser?: (riserWidth: number, riserDepth: number, riserHeight: number) => void;
	};

	let { selectedItems = $bindable<HTMLElement[]>([]), onPlaceRiser }: Props = $props();

	const ps = getPlotState();

	// Get the actual item objects from the selected DOM elements
	const selectedItemsData = $derived.by(() => {
		if (!ps.items || !selectedItems) return [];
		return selectedItems
			.map((el) => {
				const id = parseInt(el.dataset?.id || '0');
				return ps.items.find((item) => item.id === id);
			})
			.filter(Boolean) as StagePlotItem[];
	});

	// For bulk editing
	let bulkPersonId = $state<number | null>(null);

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

	function rotateItemLeft(item: StagePlotItem) {
		const variants = getItemVariants(item);
		if (!variants) return;

		const variantKeys = Object.keys(variants);
		const currentIndex = variantKeys.indexOf(item.currentVariant || 'default');
		const newIndex = (currentIndex - 1 + variantKeys.length) % variantKeys.length;
		item.currentVariant = variantKeys[newIndex];

		const newImagePath = variants[item.currentVariant];
		if (newImagePath) {
			const img = new Image();
			img.src = buildImagePath(item, newImagePath);
			img.onload = () => {
				item.position.width = img.naturalWidth;
				item.position.height = img.naturalHeight;
			};
		}
		ps.updateItemProperty(item.id, 'currentVariant', item.currentVariant);
	}

	function rotateItemRight(item: StagePlotItem) {
		const variants = getItemVariants(item);
		if (!variants) return;

		const variantKeys = Object.keys(variants);
		const currentIndex = variantKeys.indexOf(item.currentVariant || 'default');
		const newIndex = (currentIndex + 1) % variantKeys.length;
		item.currentVariant = variantKeys[newIndex];

		const newImagePath = variants[item.currentVariant];
		if (newImagePath) {
			const img = new Image();
			img.src = buildImagePath(item, newImagePath);
			img.onload = () => {
				item.position.width = img.naturalWidth;
				item.position.height = img.naturalHeight;
			};
		}
		ps.updateItemProperty(item.id, 'currentVariant', item.currentVariant);
	}

	// Handle bulk updates
	function applyBulkPerson() {
		if (bulkPersonId != null && selectedItemsData.length > 0) {
			selectedItemsData.forEach((item) => {
				if (!item) return;
				item.person_id = bulkPersonId;
				ps.updateItemProperty(item.id, 'person_id', String(bulkPersonId));
			});
			bulkPersonId = null;
		}
	}
</script>

<div class="flex h-full flex-col">
	{#if selectedItemsData.length === 0}
		<!-- Plot overview when nothing selected -->
		<div class="space-y-4">
			<!-- Quick stats -->
			<div class="grid grid-cols-2 gap-2">
				<div class="rounded-lg bg-muted/50 px-3 py-2">
					<div class="text-lg font-semibold text-text-primary">{ps.items.length}</div>
					<div class="text-[10px] text-text-tertiary">
						{ps.items.length === 1 ? 'Item' : 'Items'}
					</div>
				</div>
				<div class="rounded-lg bg-muted/50 px-3 py-2">
					<div class="text-lg font-semibold text-text-primary">{ps.plotPersons.length}</div>
					<div class="text-[10px] text-text-tertiary">
						{ps.plotPersons.length === 1 ? 'Person' : 'People'}
					</div>
				</div>
				<div class="rounded-lg bg-muted/50 px-3 py-2">
					<div class="text-lg font-semibold text-text-primary">
						{ps.items.filter((i) => i.channel).length}
					</div>
					<div class="text-[10px] text-text-tertiary">Patched</div>
				</div>
				<div class="rounded-lg bg-muted/50 px-3 py-2">
					<div class="text-lg font-semibold text-text-primary">
						{ps.items.filter((i) => !i.channel).length}
					</div>
					<div class="text-[10px] text-text-tertiary">Unpatched</div>
				</div>
			</div>

			<div class="rounded-lg border border-border-primary bg-surface px-3 py-2">
				<div class="mb-2 text-[10px] font-medium tracking-wider text-text-tertiary uppercase">
					PDF Paper
				</div>
				<div class="flex items-center justify-between">
					<span class="text-xs text-text-secondary">Page Size</span>
					<div class="flex rounded-md border border-border-primary text-xs">
						<button
							onclick={() => (ps.pdfPageFormat = 'letter')}
							class="px-2 py-0.5 transition {ps.pdfPageFormat === 'letter'
								? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
								: 'text-text-secondary hover:bg-surface-hover'}"
							style="border-radius: 0.3rem 0 0 0.3rem;"
						>
							Letter
						</button>
						<button
							onclick={() => (ps.pdfPageFormat = 'a4')}
							class="px-2 py-0.5 transition {ps.pdfPageFormat === 'a4'
								? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
								: 'text-text-secondary hover:bg-surface-hover'}"
							style="border-radius: 0 0.3rem 0.3rem 0;"
						>
							A4
						</button>
					</div>
				</div>
			</div>

			{#if ps.plotPersons.length > 0}
				<!-- People list -->
				<div>
					<h4 class="mb-1.5 text-[10px] font-medium tracking-wider text-text-tertiary uppercase">
						People
					</h4>
					<div class="space-y-1">
						{#each ps.plotPersons as p}
							<div class="flex items-center justify-between text-xs">
								<span class="truncate text-text-primary">{p.name}</span>
								<span class="ml-2 truncate text-text-tertiary">{p.role || ''}</span>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<div class="text-center text-[10px] text-text-tertiary">Select items to edit properties</div>
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
							style="width: 120px; aspect-ratio: {selectedItemsData[0].itemData?.riserWidth ??
								4}/{selectedItemsData[0].itemData?.riserDepth ?? 4};"
						>
							<div class="text-center">
								<div class="text-xs font-bold text-gray-700 dark:text-gray-200">RISER</div>
								<div class="text-[10px] text-gray-600 dark:text-gray-300">
									{selectedItemsData[0].itemData?.riserWidth}' × {selectedItemsData[0].itemData
										?.riserDepth}'
								</div>
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
							onchange={(e) => {
								const target = e.target as HTMLInputElement;
								ps.updateItemProperty(selectedItemsData[0].id, 'name', target.value);
							}}
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
								onchange={(e) => {
									const target = e.target as HTMLInputElement;
									ps.updateItemProperty(selectedItemsData[0].id, 'channel', target.value);
								}}
								class="w-full rounded-lg border border-border-primary bg-surface px-2 py-1.5 text-sm text-text-primary focus:border-stone-500 focus:ring-2 focus:ring-stone-500"
								placeholder="Channel"
							/>
						</div>
						<div>
							<label class="mb-1 block text-xs text-text-secondary">Person</label>
							<PersonCombobox
								persons={ps.plotPersons}
								value={selectedItemsData[0].person_id}
								onValueChange={(newValue) =>
									ps.updateItemProperty(
										selectedItemsData[0].id,
										'person_id',
										String(newValue ?? '')
									)}
							/>
						</div>
					{/if}
					<div>
						<label class="mb-1 block text-xs text-text-secondary">Zone</label>
						<input
							type="text"
							value={ps.getItemZone(selectedItemsData[0]) || 'Unknown'}
							readonly
							class="w-full rounded-lg border border-border-primary bg-muted/50 px-2 py-1.5 text-sm text-text-primary"
						/>
					</div>

					<!-- Position fields -->
					<div class="grid grid-cols-2 gap-3">
						<div>
							<label class="mb-1 block text-xs text-text-secondary">Position X</label>
							<input
								type="number"
								value={ps.getItemPosition(selectedItemsData[0]).x}
								onchange={(e) => {
									const target = e.target as HTMLInputElement;
									const newPosition = parseInt(target.value);
									ps.updateItemPosition(
										selectedItemsData[0].id,
										newPosition,
										ps.getItemPosition(selectedItemsData[0]).y
									);
								}}
								class="w-full rounded-lg border border-border-primary bg-surface px-2 py-1.5 text-sm text-text-primary focus:border-stone-500 focus:ring-2 focus:ring-stone-500"
							/>
						</div>
						<div>
							<label class="mb-1 block text-xs text-text-secondary">Position Y</label>
							<input
								type="number"
								value={ps.getItemPosition(selectedItemsData[0]).y}
								onchange={(e) => {
									const target = e.target as HTMLInputElement;
									const newPosition = parseInt(target.value);
									ps.updateItemPosition(
										selectedItemsData[0].id,
										ps.getItemPosition(selectedItemsData[0]).x,
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

					<!-- Riser dimensions (when a riser is selected) -->
					{#if selectedItemsData[0].type === 'riser'}
						<div>
							<label class="mb-1 block text-xs text-text-secondary"
								>Riser Size ({unitLabel(ps.unit)})</label
							>
							<div class="grid grid-cols-3 gap-2">
								<div>
									<label class="block text-[10px] text-text-tertiary">Width</label>
									<input
										type="number"
										value={displayValue(selectedItemsData[0].itemData?.riserWidth ?? 4, ps.unit)}
										onchange={(e) => {
											const target = e.target as HTMLInputElement;
											const val = parseFloat(target.value);
											if (!isNaN(val) && val > 0)
												ps.updateItemProperty(
													selectedItemsData[0].id,
													'riserWidth',
													String(toFeet(val, ps.unit))
												);
										}}
										min="1"
										step={ps.unit === 'metric' ? '0.5' : '1'}
										class="w-full rounded-lg border border-border-primary bg-surface px-2 py-1.5 text-xs text-text-primary focus:border-stone-500 focus:ring-2 focus:ring-stone-500"
									/>
								</div>
								<div>
									<label class="block text-[10px] text-text-tertiary">Depth</label>
									<input
										type="number"
										value={displayValue(selectedItemsData[0].itemData?.riserDepth ?? 4, ps.unit)}
										onchange={(e) => {
											const target = e.target as HTMLInputElement;
											const val = parseFloat(target.value);
											if (!isNaN(val) && val > 0)
												ps.updateItemProperty(
													selectedItemsData[0].id,
													'riserDepth',
													String(toFeet(val, ps.unit))
												);
										}}
										min="1"
										step={ps.unit === 'metric' ? '0.5' : '1'}
										class="w-full rounded-lg border border-border-primary bg-surface px-2 py-1.5 text-xs text-text-primary focus:border-stone-500 focus:ring-2 focus:ring-stone-500"
									/>
								</div>
								<div>
									<label class="block text-[10px] text-text-tertiary">Height</label>
									<input
										type="number"
										value={displayValue(selectedItemsData[0].itemData?.riserHeight ?? 1, ps.unit)}
										onchange={(e) => {
											const target = e.target as HTMLInputElement;
											const val = parseFloat(target.value);
											if (!isNaN(val) && val > 0)
												ps.updateItemProperty(
													selectedItemsData[0].id,
													'riserHeight',
													String(toFeet(val, ps.unit))
												);
										}}
										min="0.5"
										step="0.5"
										class="w-full rounded-lg border border-border-primary bg-surface px-2 py-1.5 text-xs text-text-primary focus:border-stone-500 focus:ring-2 focus:ring-stone-500"
									/>
								</div>
							</div>
						</div>
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
					<h4 class="mb-3 font-medium text-text-primary">Assign Person</h4>
					<div class="space-y-3">
						<PersonCombobox
							persons={ps.plotPersons}
							value={bulkPersonId}
							onValueChange={(newValue) => (bulkPersonId = newValue)}
						/>
						<button
							onclick={applyBulkPerson}
							class="w-full rounded-lg bg-stone-900 px-3 py-2 text-sm text-white transition hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
							disabled={bulkPersonId == null}
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

	<!-- Stage Settings -->
	<div class="mt-4 space-y-3 border-t border-border-primary pt-4">
		<!-- Unit toggle -->
		<div class="flex items-center justify-between">
			<span class="text-xs text-text-secondary">Units</span>
			<div class="flex rounded-md border border-border-primary text-xs">
				<button
					onclick={() => (ps.unit = 'imperial')}
					class="px-2 py-0.5 transition {ps.unit === 'imperial'
						? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
						: 'text-text-secondary hover:bg-surface-hover'}"
					style="border-radius: 0.3rem 0 0 0.3rem;"
				>
					ft
				</button>
				<button
					onclick={() => (ps.unit = 'metric')}
					class="px-2 py-0.5 transition {ps.unit === 'metric'
						? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
						: 'text-text-secondary hover:bg-surface-hover'}"
					style="border-radius: 0 0.3rem 0.3rem 0;"
				>
					m
				</button>
			</div>
		</div>

		<div>
			<label class="mb-1 block text-xs text-text-secondary">Stage Size ({unitLabel(ps.unit)})</label
			>
			<div class="flex gap-2">
				<input
					type="number"
					value={Math.round(displayValue(ps.stageWidth, ps.unit) * 100) / 100}
					onchange={(e) => {
						const target = e.target as HTMLInputElement;
						const val = parseFloat(target.value);
						if (!isNaN(val) && val > 0)
							ps.stageWidth = Math.round(toFeet(val, ps.unit) * 100) / 100;
					}}
					min="1"
					step={ps.unit === 'metric' ? '0.5' : '1'}
					placeholder="Width"
					class="w-full rounded-lg border border-border-primary bg-surface px-2 py-1.5 text-sm text-text-primary focus:border-stone-500 focus:ring-2 focus:ring-stone-500"
				/>
				<span class="self-center text-xs text-text-tertiary">x</span>
				<input
					type="number"
					value={Math.round(displayValue(ps.stageDepth, ps.unit) * 100) / 100}
					onchange={(e) => {
						const target = e.target as HTMLInputElement;
						const val = parseFloat(target.value);
						if (!isNaN(val) && val > 0)
							ps.stageDepth = Math.round(toFeet(val, ps.unit) * 100) / 100;
					}}
					min="1"
					step={ps.unit === 'metric' ? '0.5' : '1'}
					placeholder="Depth"
					class="w-full rounded-lg border border-border-primary bg-surface px-2 py-1.5 text-sm text-text-primary focus:border-stone-500 focus:ring-2 focus:ring-stone-500"
				/>
			</div>
		</div>

		<!-- Add Riser -->
		{#if showRiserForm}
			<div class="space-y-2 rounded-lg border border-border-primary p-2">
				<div class="flex items-center justify-between">
					<span class="text-xs font-medium text-text-primary">Add Riser</span>
					<button
						onclick={() => (showRiserForm = false)}
						class="text-xs text-text-tertiary hover:text-text-primary">&times;</button
					>
				</div>
				<div class="mb-1 text-xs text-text-secondary">Presets:</div>
				<div class="flex flex-wrap gap-1">
					{#each riserPresets as preset}
						<button
							onclick={() => {
								if (onPlaceRiser) onPlaceRiser(preset.w, preset.d, customRiserHeight);
								showRiserForm = false;
							}}
							class="rounded bg-muted px-2 py-1 text-xs text-text-primary transition hover:bg-surface-hover"
						>
							{preset.label}
						</button>
					{/each}
				</div>
				<div class="mt-1 text-xs text-text-secondary">Custom ({unitLabel(ps.unit)}):</div>
				<div class="flex items-end gap-1.5">
					<div class="flex-1">
						<label class="block text-[10px] text-text-tertiary">W</label>
						<input
							type="number"
							bind:value={customRiserW}
							min="1"
							step={ps.unit === 'metric' ? '0.5' : '1'}
							class="w-full rounded border border-border-primary bg-surface px-1.5 py-1 text-xs text-text-primary"
						/>
					</div>
					<div class="flex-1">
						<label class="block text-[10px] text-text-tertiary">D</label>
						<input
							type="number"
							bind:value={customRiserD}
							min="1"
							step={ps.unit === 'metric' ? '0.5' : '1'}
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
						const w = toFeet(customRiserW, ps.unit);
						const d = toFeet(customRiserD, ps.unit);
						if (onPlaceRiser && w > 0 && d > 0) onPlaceRiser(w, d, customRiserHeight);
						showRiserForm = false;
					}}
					class="w-full rounded bg-stone-900 px-2 py-1.5 text-xs text-white transition hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
				>
					Place Custom Riser
				</button>
			</div>
		{:else}
			<button
				onclick={() => (showRiserForm = true)}
				class="w-full rounded-lg border border-dashed border-border-primary px-3 py-2 text-sm text-text-secondary transition hover:border-stone-400 hover:text-text-primary"
			>
				+ Add Riser
			</button>
		{/if}

		<!-- Stage Zones toggle switch -->
		<div class="flex items-center justify-between">
			<span class="text-xs text-text-secondary">Stage Zones</span>
			<button
				onclick={() => (ps.showZones = !ps.showZones)}
				class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 {ps.showZones
					? 'bg-stone-900 dark:bg-stone-100'
					: 'bg-gray-300 dark:bg-gray-600'}"
				role="switch"
				aria-checked={ps.showZones}
			>
				<span
					class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 dark:bg-gray-900 {ps.showZones
						? 'translate-x-4'
						: 'translate-x-0.5'}"
					style="margin-top: 2px;"
				></span>
			</button>
		</div>
	</div>

	<!-- Dark mode toggle at bottom center -->
	<div class="mt-auto flex justify-center border-t border-border-primary pt-3 pb-1">
		<button
			onclick={toggleMode}
			class="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-text-tertiary transition hover:bg-surface-hover hover:text-text-secondary"
			title="Toggle dark mode"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="hidden h-3.5 w-3.5 dark:block"
				viewBox="0 0 20 20"
				fill="currentColor"
			>
				<path
					fill-rule="evenodd"
					d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
					clip-rule="evenodd"
				/>
			</svg>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="block h-3.5 w-3.5 dark:hidden"
				viewBox="0 0 20 20"
				fill="currentColor"
			>
				<path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
			</svg>
			<span class="block dark:hidden">Dark mode</span>
			<span class="hidden dark:block">Light mode</span>
		</button>
	</div>
</div>
