<script lang="ts">
	import type { CatalogItem } from '$lib/types';
	import {
		ITEM_TYPES,
		CATEGORIES,
		CONNECTOR_TYPES,
		PROVISION_TYPES,
		STAND_TYPES,
		LINK_MODES,
		PERSON_SUBCATEGORIES
	} from '$lib/schema';

	type Brand = {
		name: string;
		slug: string;
		website?: string;
		status?: 'active' | 'defunct';
		notes?: string;
	};

	type EditorItem = CatalogItem & {
		brands?: string[];
		instrument_signal?: 'acoustic' | 'electric' | '';
		variant_order?: string[];
		default_outputs?: Array<{ name: string; short_name: string; type?: string; link_mode: string }>;
	};

	interface Props {
		item: EditorItem;
		onsave: (item: CatalogItem) => Promise<void>;
		brands?: Brand[];
		oncreatebrand?: (brand: Brand) => Promise<Brand | null>;
		ontoggleduplicate?: () => void;
	}

	let {
		item = $bindable(),
		onsave,
		brands = [],
		oncreatebrand,
		ontoggleduplicate
	}: Props = $props();

	const OUTPUT_TYPES = [
		'wedge',
		'iem_stereo',
		'iem_mono',
		'sidefill',
		'sub',
		'pa_speaker',
		'line_array',
		'column_speaker',
		'personal_system'
	] as const;

	let saving = $state(false);
	let saved = $state(false);
	let tagsText = $state('');
	let brandQuery = $state('');
	let showBrandMenu = $state(false);
	let showBrandModal = $state(false);
	let brandFormName = $state('');
	let brandFormWebsite = $state('');
	let brandFormStatus = $state<'active' | 'defunct'>('active');
	let brandFormNotes = $state('');
	let brandFormError = $state('');
	const showDefaultInputs = $derived(
		['instrument', 'amp', 'drumset', 'microphone'].includes(item.item_type)
	);
	const showDefaultOutputs = $derived(
		['monitor', 'speaker'].includes(item.item_type) || item.category === 'monitors'
	);
	let draggingVariant = $state<string | null>(null);
	let dropVariant = $state<string | null>(null);

	function getDefaultVariantKey(variants: Record<string, string>) {
		if (variants.default) return 'default';
		const keys = Object.keys(variants);
		return keys[0] ?? 'default';
	}

	function buildVariantOrder(variants: Record<string, string>, existing?: string[]) {
		const keys = Object.keys(variants);
		if (keys.length === 0) return [];
		const defaultKey = getDefaultVariantKey(variants);
		const order = (existing ?? []).filter((k) => keys.includes(k) && k !== defaultKey);
		const missing = keys.filter((k) => k !== defaultKey && !order.includes(k));
		const priority = ['L', 'R', 'LA', 'RA', 'LB', 'RB', 'B', 'back'];
		missing.sort((a, b) => {
			const ia = priority.indexOf(a);
			const ib = priority.indexOf(b);
			if (ia === -1 && ib === -1) return a.localeCompare(b);
			if (ia === -1) return 1;
			if (ib === -1) return -1;
			return ia - ib;
		});
		return [defaultKey, ...order, ...missing];
	}

	function handleVariantDragStart(key: string, event: DragEvent) {
		if (key === getDefaultVariantKey(item.variants)) return;
		draggingVariant = key;
		event.dataTransfer?.setData('text/plain', key);
		if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
	}

	function handleVariantDragOver(key: string, event: DragEvent) {
		if (key === getDefaultVariantKey(item.variants)) return;
		event.preventDefault();
		dropVariant = key;
	}

	function handleVariantDrop(key: string, event: DragEvent) {
		event.preventDefault();
		const dragKey = draggingVariant || event.dataTransfer?.getData('text/plain');
		if (!dragKey || dragKey === key) return;
		const order = buildVariantOrder(item.variants, item.variant_order);
		const defaultKey = order[0];
		if (dragKey === defaultKey) return;
		const withoutDrag = order.filter((k) => k !== dragKey);
		const targetKey = key === defaultKey ? withoutDrag[1] : key;
		const targetIndex = targetKey ? withoutDrag.indexOf(targetKey) : withoutDrag.length;
		const insertIndex = targetIndex >= 0 ? targetIndex : withoutDrag.length;
		withoutDrag.splice(insertIndex, 0, dragKey);
		if (withoutDrag[0] !== defaultKey) {
			withoutDrag.splice(withoutDrag.indexOf(defaultKey), 1);
			withoutDrag.unshift(defaultKey);
		}
		item.variant_order = withoutDrag;
		draggingVariant = null;
		dropVariant = null;
	}

	function handleVariantDragEnd() {
		draggingVariant = null;
		dropVariant = null;
	}

	const orderedVariants = $derived.by(() => {
		const order = buildVariantOrder(item.variants, item.variant_order);
		return order
			.map((key) => ({ key, filename: item.variants[key] }))
			.filter((entry) => Boolean(entry.filename));
	});

	$effect(() => {
		const next = buildVariantOrder(item.variants, item.variant_order);
		if (!item.variant_order || next.join('|') !== item.variant_order.join('|')) {
			item.variant_order = next;
		}
	});

	// Sync tagsText when selected item changes
	$effect(() => {
		tagsText = item.tags.join(', ');
	});

	function parseTags() {
		item.tags = tagsText
			.split(',')
			.map((t) => t.trim())
			.filter(Boolean);
	}

	$effect(() => {
		if (!item.brands) item.brands = [];
	});

	function toggleBrandSelection(brandName: string) {
		if (!item.brands) item.brands = [];
		if (item.brands.includes(brandName)) {
			item.brands = item.brands.filter((b) => b !== brandName);
		} else {
			item.brands = [...item.brands, brandName];
		}
	}

	function removeBrandSelection(brandName: string) {
		if (!item.brands) return;
		item.brands = item.brands.filter((b) => b !== brandName);
	}

	const filteredBrands = $derived.by(() => {
		const q = brandQuery.trim().toLowerCase();
		return brands.filter((b) => !q || b.name.toLowerCase().includes(q));
	});

	function openBrandModal() {
		brandFormName = brandQuery.trim();
		brandFormWebsite = '';
		brandFormNotes = '';
		brandFormStatus = 'active';
		brandFormError = '';
		showBrandModal = true;
	}

	async function createBrandFromModal() {
		if (!brandFormName.trim()) {
			brandFormError = 'Brand name is required.';
			return;
		}
		if (!oncreatebrand) return;
		const created = await oncreatebrand({
			name: brandFormName.trim(),
			slug: '',
			website: brandFormWebsite.trim() || undefined,
			status: brandFormStatus,
			notes: brandFormNotes.trim() || undefined
		});
		if (!created) {
			brandFormError = 'Failed to create brand.';
			return;
		}
		showBrandModal = false;
		brandQuery = '';
		toggleBrandSelection(created.name);
	}

	function addInput() {
		item.default_inputs = [
			...item.default_inputs,
			{
				name: '',
				short_name: '',
				stand: 'none',
				phantom_power: false,
				link_mode: 'mono'
			}
		];
	}

	function removeInput(index: number) {
		item.default_inputs = item.default_inputs.filter((_, i) => i !== index);
	}

	function addOutput() {
		item.default_outputs = [
			...(item.default_outputs ?? []),
			{
				name: '',
				short_name: '',
				type: 'wedge',
				link_mode: 'mono'
			}
		];
	}

	function removeOutput(index: number) {
		item.default_outputs = (item.default_outputs ?? []).filter(
			(_: unknown, i: number) => i !== index
		);
	}

	function addCommonModel() {
		item.common_models = [...item.common_models, { brand: '', model: '' }];
	}

	function removeCommonModel(index: number) {
		item.common_models = item.common_models.filter((_, i) => i !== index);
	}

	function toggleConnector(conn: string) {
		const typed = conn as (typeof CONNECTOR_TYPES)[number];
		if (item.connectors.includes(typed)) {
			item.connectors = item.connectors.filter((c) => c !== typed);
		} else {
			item.connectors = [...item.connectors, typed];
		}
	}

	async function save() {
		parseTags();
		saving = true;
		saved = false;
		await onsave(item);
		saving = false;
		saved = true;
		setTimeout(() => (saved = false), 1500);
	}
</script>

<div class="flex h-full flex-col">
	<!-- Sticky header with item identity and save -->
	<div
		class="flex shrink-0 items-start justify-between border-b border-gray-200 bg-white px-4 py-2"
	>
		<div class="min-w-0">
			<div class="text-base font-semibold text-gray-900">{item.name}</div>
			<div class="font-mono text-xs text-gray-400">{item.path}</div>
			{#if item._original_name !== item.name}
				<div class="text-xs text-amber-600">Original: {item._original_name}</div>
			{/if}
		</div>
		<div class="flex items-center gap-2">
			{#if ontoggleduplicate}
				<button
					class="rounded-md border border-gray-200 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-100"
					onclick={ontoggleduplicate}
				>
					Duplicate
				</button>
			{/if}
			<button
				class="shrink-0 rounded-md px-3 py-1.5 text-xs font-medium text-white transition-colors
					{saved ? 'bg-green-500' : saving ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}"
				onclick={save}
				disabled={saving}
			>
				{saved ? 'Saved!' : saving ? 'Saving...' : 'Save'}
			</button>
		</div>
	</div>

	<!-- Scrollable form -->
	<div class="flex-1 space-y-4 overflow-y-auto px-4 py-3">
		<!-- Variant gallery -->
		<section>
			<div class="mb-1.5 flex items-center justify-between">
				<h3 class="text-sm font-medium text-gray-700">Variants</h3>
				<span class="text-[11px] text-gray-400">Drag to reorder (default locked)</span>
			</div>
			<div class="flex gap-2 overflow-x-auto pb-1">
				{#each orderedVariants as variant (variant.key)}
					<div
						class="shrink-0 text-center"
						draggable={variant.key !== getDefaultVariantKey(item.variants)}
						ondragstart={(event) => handleVariantDragStart(variant.key, event)}
						ondragover={(event) => handleVariantDragOver(variant.key, event)}
						ondrop={(event) => handleVariantDrop(variant.key, event)}
						ondragend={handleVariantDragEnd}
					>
						<img
							src="/assets/{item.path}/{variant.filename}"
							alt="{item.name} - {variant.key}"
							class="h-16 w-16 rounded border object-contain
								{variant.key === getDefaultVariantKey(item.variants)
								? 'border-blue-300 bg-blue-50'
								: dropVariant === variant.key
									? 'border-blue-300 bg-blue-50'
									: 'border-gray-200 bg-gray-50'}
								{variant.key !== getDefaultVariantKey(item.variants) ? 'cursor-grab active:cursor-grabbing' : ''}"
							onerror={(e) => {
								const el = e.currentTarget as HTMLImageElement;
								el.parentElement!.style.display = 'none';
							}}
						/>
						<div class="mt-1 text-[11px] text-gray-500">
							{variant.key}{variant.key === getDefaultVariantKey(item.variants) ? ' (default)' : ''}
						</div>
						<div class="max-w-16 truncate text-[10px] text-gray-300">
							{variant.filename}
						</div>
					</div>
				{/each}
			</div>
		</section>

		<!-- Identity -->
		<section>
			<h3 class="mb-1.5 text-sm font-medium text-gray-700">Identity</h3>
			<div class="grid grid-cols-2 gap-3">
				<div>
					<label for="ed-name" class="mb-1 block text-xs font-medium text-gray-500">Name</label>
					<input
						id="ed-name"
						type="text"
						class="w-full rounded border-gray-300 text-sm"
						bind:value={item.name}
					/>
				</div>
				<div>
					<label for="ed-slug" class="mb-1 block text-xs font-medium text-gray-500">Slug</label>
					<input
						id="ed-slug"
						type="text"
						class="w-full rounded border-gray-300 font-mono text-sm"
						bind:value={item.slug}
					/>
				</div>
				<div>
					<label class="mb-1 block text-xs font-medium text-gray-500">Brands</label>
					<div class="relative">
						<div class="mb-1.5 flex flex-wrap gap-1">
							{#each item.brands ?? [] as brand (brand)}
								<span
									class="flex items-center gap-1 rounded-full bg-gray-100 px-1.5 py-0 text-[11px] text-gray-700"
								>
									{brand}
									<button
										class="text-gray-400 hover:text-gray-600"
										onclick={() => removeBrandSelection(brand)}
									>
										&times;
									</button>
								</span>
							{/each}
							{#if (item.brands ?? []).length === 0}
								<span class="text-[11px] text-gray-400">No brands selected</span>
							{/if}
						</div>
						<input
							type="text"
							placeholder="Search or add a brand"
							class="w-full rounded border-gray-300 text-sm"
							bind:value={brandQuery}
							onfocus={() => (showBrandMenu = true)}
							onblur={() => setTimeout(() => (showBrandMenu = false), 150)}
						/>
						{#if showBrandMenu}
							<div
								class="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded border border-gray-200 bg-white shadow-sm"
							>
								{#if filteredBrands.length > 0}
									{#each filteredBrands as brand (brand.slug)}
										<button
											class="flex w-full items-center justify-between px-2.5 py-1.5 text-left text-xs hover:bg-gray-50"
											onclick={() => toggleBrandSelection(brand.name)}
										>
											<span>{brand.name}</span>
											{#if item.brands?.includes(brand.name)}
												<span class="text-[10px] text-green-600">Selected</span>
											{/if}
										</button>
									{/each}
								{:else}
									<div class="px-2.5 py-2 text-xs text-gray-400">No matching brands</div>
								{/if}
								<button
									class="w-full border-t border-gray-200 px-2.5 py-2 text-left text-xs text-blue-600 hover:bg-blue-50"
									onclick={openBrandModal}
								>
									+ Create brand
								</button>
							</div>
						{/if}
					</div>
				</div>
				<div>
					<label for="ed-model" class="mb-1 block text-xs font-medium text-gray-500">Model</label>
					<input
						id="ed-model"
						type="text"
						placeholder="e.g., Deluxe Reverb, JCM800"
						class="w-full rounded border-gray-300 text-sm"
						bind:value={item.model}
					/>
				</div>
				<div>
					<label for="ed-auto-number" class="mb-1 block text-xs font-medium text-gray-500"
						>Auto-number Prefix</label
					>
					<input
						id="ed-auto-number"
						type="text"
						placeholder="e.g., Gtr, Keys, Vox"
						class="w-full rounded border-gray-300 text-sm"
						bind:value={item.auto_number_prefix}
					/>
				</div>
				{#if item.item_type === 'instrument'}
					<div>
						<label class="mb-1 block text-xs font-medium text-gray-500">Signal Type</label>
						<select
							class="w-full rounded border-gray-300 text-sm"
							bind:value={item.instrument_signal}
						>
							<option value="">-- Not set --</option>
							{#each ['acoustic', 'electric'] as mode (mode)}
								<option value={mode}>{mode}</option>
							{/each}
						</select>
					</div>
				{/if}
				<div class="col-span-2">
					<div class="text-xs text-gray-400">
						Original: <span class="font-mono">{item._original_name}</span>
						&middot; Path: <span class="font-mono">{item.path}</span>
					</div>
				</div>
			</div>
		</section>

		<!-- Classification -->
		<section>
			<h3 class="mb-1.5 text-sm font-medium text-gray-700">Classification</h3>
			<div class="grid grid-cols-2 gap-3">
				<div>
					<label for="ed-item_type" class="mb-1 block text-xs font-medium text-gray-500"
						>Item Type</label
					>
					<select
						id="ed-item_type"
						class="w-full rounded border-gray-300 text-sm"
						bind:value={item.item_type}
					>
						{#each ITEM_TYPES as type (type)}
							<option value={type}>{type}</option>
						{/each}
					</select>
				</div>
				<div>
					<label for="ed-category" class="mb-1 block text-xs font-medium text-gray-500"
						>Category</label
					>
					<select
						id="ed-category"
						class="w-full rounded border-gray-300 text-sm"
						bind:value={item.category}
					>
						{#each CATEGORIES as cat (cat)}
							<option value={cat}>{cat}</option>
						{/each}
					</select>
				</div>
				<div>
					<label for="ed-subcategory" class="mb-1 block text-xs font-medium text-gray-500"
						>Subcategory</label
					>
					<input
						id="ed-subcategory"
						type="text"
						placeholder="e.g., electric, bass, cymbals"
						class="w-full rounded border-gray-300 text-sm"
						bind:value={item.subcategory}
					/>
				</div>
				<div>
					<label for="ed-tags" class="mb-1 block text-xs font-medium text-gray-500"
						>Tags (comma-separated)</label
					>
					<input
						id="ed-tags"
						type="text"
						placeholder="amp, tube, combo"
						class="w-full rounded border-gray-300 text-sm"
						bind:value={tagsText}
						onblur={parseTags}
					/>
				</div>
				{#if item.item_type === 'person'}
					<div>
						<label for="ed-person-sub" class="mb-1 block text-xs font-medium text-gray-500"
							>Person Subcategory</label
						>
						<select
							id="ed-person-sub"
							class="w-full rounded border-gray-300 text-sm"
							bind:value={item.person_subcategory}
						>
							{#each PERSON_SUBCATEGORIES as sub (sub)}
								<option value={sub}>{sub || '(none)'}</option>
							{/each}
						</select>
					</div>
				{/if}
			</div>
		</section>

		<!-- Dimensions -->
		<section>
			<h3 class="mb-1.5 text-sm font-medium text-gray-700">Dimensions (inches)</h3>
			<div class="grid grid-cols-3 gap-3">
				<div>
					<label for="ed-dim_w" class="mb-1 block text-xs font-medium text-gray-500">Width</label>
					<input
						id="ed-dim_w"
						type="number"
						step="0.5"
						min="0"
						class="w-full rounded border-gray-300 text-sm"
						bind:value={item.dimensions.width_in}
					/>
				</div>
				<div>
					<label for="ed-dim_d" class="mb-1 block text-xs font-medium text-gray-500">Depth</label>
					<input
						id="ed-dim_d"
						type="number"
						step="0.5"
						min="0"
						class="w-full rounded border-gray-300 text-sm"
						bind:value={item.dimensions.depth_in}
					/>
				</div>
				<div>
					<label for="ed-dim_h" class="mb-1 block text-xs font-medium text-gray-500">Height</label>
					<input
						id="ed-dim_h"
						type="number"
						step="0.5"
						min="0"
						class="w-full rounded border-gray-300 text-sm"
						bind:value={item.dimensions.height_in}
					/>
				</div>
			</div>
		</section>

		<!-- Provision & Backline -->
		<section>
			<h3 class="mb-1.5 text-sm font-medium text-gray-700">Provision</h3>
			<div class="grid grid-cols-2 gap-3">
				<div>
					<label for="ed-provision" class="mb-1 block text-xs font-medium text-gray-500"
						>Default Provision</label
					>
					<select
						id="ed-provision"
						class="w-full rounded border-gray-300 text-sm"
						bind:value={item.provision_default}
					>
						<option value="">Not set</option>
						{#each PROVISION_TYPES as prov (prov)}
							<option value={prov}>{prov.replace(/_/g, ' ')}</option>
						{/each}
					</select>
				</div>
				<div class="flex items-end">
					<label for="ed-backline" class="flex items-center gap-2">
						<input
							id="ed-backline"
							type="checkbox"
							class="rounded border-gray-300 text-blue-600"
							bind:checked={item.is_backline}
						/>
						<span class="text-sm text-gray-700">Is Backline</span>
					</label>
				</div>
			</div>
		</section>

		<!-- Connectors -->
		<section>
			<h3 class="mb-1.5 text-sm font-medium text-gray-700">Connectors</h3>
			<div class="flex flex-wrap gap-2">
				{#each CONNECTOR_TYPES as conn (conn)}
					<label
						class="flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors
							{item.connectors.includes(conn)
							? 'border-blue-300 bg-blue-50 text-blue-700'
							: 'border-gray-200 text-gray-500 hover:border-gray-300'}"
					>
						<input
							type="checkbox"
							class="sr-only"
							checked={item.connectors.includes(conn)}
							onchange={() => toggleConnector(conn)}
						/>
						{conn}
					</label>
				{/each}
			</div>
		</section>

		<!-- Power -->
		<section>
			<label for="ed-power" class="mb-2 block text-sm font-medium text-gray-700">Power</label>
			<input
				id="ed-power"
				type="text"
				placeholder="e.g., 120V AC, 9V DC, phantom"
				class="w-full rounded border-gray-300 text-sm"
				bind:value={item.power_requirements}
			/>
		</section>

		{#if showDefaultInputs}
			<!-- Default Inputs -->
			<section>
				<div class="mb-2 flex items-center justify-between">
					<h3 class="text-sm font-medium text-gray-700">Default Inputs</h3>
					<button
						class="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600 hover:bg-gray-200"
						onclick={addInput}
					>
						+ Add Input
					</button>
				</div>

				{#if item.default_inputs.length === 0}
					<div
						class="rounded border border-dashed border-gray-200 p-4 text-center text-sm text-gray-400"
					>
						No default inputs. Click "+ Add Input" for items that generate audio channels when
						placed.
					</div>
				{:else}
					<table class="w-full text-xs">
						<thead>
							<tr class="border-b border-gray-200 text-left text-gray-500">
								<th class="px-2 py-1 font-medium">#</th>
								<th class="px-2 py-1 font-medium">Name</th>
								<th class="px-2 py-1 font-medium">Short</th>
								<th class="px-2 py-1 font-medium">Stand</th>
								<th class="px-2 py-1 font-medium">Link</th>
								<th class="px-2 py-1 font-medium">48V</th>
								<th class="px-2 py-1 font-medium"></th>
							</tr>
						</thead>
						<tbody>
							{#each item.default_inputs as input, i (i)}
								<tr class="border-b border-gray-100">
									<td class="px-2 py-1 text-gray-400">{i + 1}</td>
									<td class="px-2 py-1">
										<input
											type="text"
											placeholder="Kick In"
											class="w-full min-w-20 rounded border-gray-300 px-1 py-0.5 text-xs"
											bind:value={input.name}
										/>
									</td>
									<td class="px-2 py-1">
										<input
											type="text"
											placeholder="KikIn"
											class="w-full min-w-16 rounded border-gray-300 px-1 py-0.5 text-xs"
											bind:value={input.short_name}
										/>
									</td>
									<td class="px-2 py-1">
										<select
											class="rounded border-gray-300 px-1 py-0.5 text-xs"
											bind:value={input.stand}
										>
											{#each STAND_TYPES as stand (stand)}
												<option value={stand}>{stand.replace(/_/g, ' ')}</option>
											{/each}
										</select>
									</td>
									<td class="px-2 py-1">
										<select
											class="rounded border-gray-300 px-1 py-0.5 text-xs"
											bind:value={input.link_mode}
										>
											{#each LINK_MODES as mode (mode)}
												<option value={mode}>{mode.replace(/_/g, ' ')}</option>
											{/each}
										</select>
									</td>
									<td class="px-2 py-1 text-center">
										<input
											type="checkbox"
											class="rounded border-gray-300 text-blue-600"
											bind:checked={input.phantom_power}
										/>
									</td>
									<td class="px-2 py-1">
										<button class="text-red-400 hover:text-red-600" onclick={() => removeInput(i)}>
											&times;
										</button>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				{/if}
			</section>
		{/if}

		{#if showDefaultOutputs}
			<!-- Default Outputs -->
			<section>
				<div class="mb-2 flex items-center justify-between">
					<h3 class="text-sm font-medium text-gray-700">Default Outputs</h3>
					<button
						class="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600 hover:bg-gray-200"
						onclick={addOutput}
					>
						+ Add Output
					</button>
				</div>

				{#if (item.default_outputs ?? []).length === 0}
					<div
						class="rounded border border-dashed border-gray-200 p-4 text-center text-sm text-gray-400"
					>
						No default outputs. Use this for monitors and output devices.
					</div>
				{:else}
					<table class="w-full text-xs">
						<thead>
							<tr class="border-b border-gray-200 text-left text-gray-500">
								<th class="px-2 py-1 font-medium">#</th>
								<th class="px-2 py-1 font-medium">Name</th>
								<th class="px-2 py-1 font-medium">Short</th>
								<th class="px-2 py-1 font-medium">Type</th>
								<th class="px-2 py-1 font-medium">Link</th>
								<th class="px-2 py-1 font-medium"></th>
							</tr>
						</thead>
						<tbody>
							{#each item.default_outputs ?? [] as output, i (i)}
								<tr class="border-b border-gray-100">
									<td class="px-2 py-1 text-gray-400">{i + 1}</td>
									<td class="px-2 py-1">
										<input
											type="text"
											placeholder="IEM"
											class="w-full min-w-20 rounded border-gray-300 px-1 py-0.5 text-xs"
											bind:value={output.name}
										/>
									</td>
									<td class="px-2 py-1">
										<input
											type="text"
											placeholder="IEM"
											class="w-full min-w-16 rounded border-gray-300 px-1 py-0.5 text-xs"
											bind:value={output.short_name}
										/>
									</td>
									<td class="px-2 py-1">
										<select
											class="rounded border-gray-300 px-1 py-0.5 text-xs"
											bind:value={output.type}
										>
											{#each OUTPUT_TYPES as type (type)}
												<option value={type}>{type.replace(/_/g, ' ')}</option>
											{/each}
										</select>
									</td>
									<td class="px-2 py-1">
										<select
											class="rounded border-gray-300 px-1 py-0.5 text-xs"
											bind:value={output.link_mode}
										>
											{#each LINK_MODES as mode (mode)}
												<option value={mode}>{mode.replace(/_/g, ' ')}</option>
											{/each}
										</select>
									</td>
									<td class="px-2 py-1">
										<button class="text-red-400 hover:text-red-600" onclick={() => removeOutput(i)}>
											&times;
										</button>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				{/if}
			</section>
		{/if}

		<!-- Common Models -->
		<section>
			<div class="mb-2 flex items-center justify-between">
				<h3 class="text-sm font-medium text-gray-700">Common Models</h3>
				<button
					class="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600 hover:bg-gray-200"
					onclick={addCommonModel}
				>
					+ Add Model
				</button>
			</div>

			{#if item.common_models.length === 0}
				<div
					class="rounded border border-dashed border-gray-200 p-4 text-center text-sm text-gray-400"
				>
					No common models. For generic items, add real-world products this might represent.
				</div>
			{/if}

			<div class="space-y-2">
				{#each item.common_models as cm, i (i)}
					<div class="flex items-center gap-2">
						<input
							type="text"
							placeholder="Brand"
							class="w-1/3 rounded border-gray-300 text-sm"
							bind:value={cm.brand}
						/>
						<input
							type="text"
							placeholder="Model"
							class="flex-1 rounded border-gray-300 text-sm"
							bind:value={cm.model}
						/>
						<button
							class="text-xs text-red-500 hover:text-red-700"
							onclick={() => removeCommonModel(i)}
						>
							Remove
						</button>
					</div>
				{/each}
			</div>
		</section>

		<!-- Notes -->
		<section>
			<label for="ed-notes" class="mb-2 block text-sm font-medium text-gray-700">Notes</label>
			<textarea
				id="ed-notes"
				rows="3"
				placeholder="Dev notes about this item..."
				class="w-full rounded border-gray-300 text-sm"
				bind:value={item.notes}
			></textarea>
		</section>

		<!-- Bottom padding for scroll comfort -->
		<div class="h-8"></div>
	</div>
</div>

{#if showBrandModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
		<div class="w-full max-w-lg rounded-lg bg-white p-6 shadow-lg">
			<h3 class="text-lg font-semibold text-gray-900">Create Brand</h3>
			<p class="mt-1 text-sm text-gray-500">Add a new brand to the registry.</p>
			<div class="mt-4 space-y-4">
				<div>
					<label class="mb-1 block text-xs font-medium text-gray-500">Name</label>
					<input
						type="text"
						class="w-full rounded border-gray-300 text-sm"
						bind:value={brandFormName}
					/>
				</div>
				<div>
					<label class="mb-1 block text-xs font-medium text-gray-500">Website</label>
					<input
						type="text"
						class="w-full rounded border-gray-300 text-sm"
						placeholder="https://example.com"
						bind:value={brandFormWebsite}
					/>
				</div>
				<div>
					<label class="mb-1 block text-xs font-medium text-gray-500">Status</label>
					<select class="w-full rounded border-gray-300 text-sm" bind:value={brandFormStatus}>
						<option value="active">active</option>
						<option value="defunct">defunct</option>
					</select>
				</div>
				<div>
					<label class="mb-1 block text-xs font-medium text-gray-500">Notes</label>
					<textarea
						rows="3"
						class="w-full rounded border-gray-300 text-sm"
						bind:value={brandFormNotes}
					></textarea>
				</div>
				{#if brandFormError}
					<div class="text-sm text-red-500">{brandFormError}</div>
				{/if}
			</div>
			<div class="mt-6 flex items-center justify-end gap-2">
				<button
					class="rounded border border-gray-200 px-4 py-2 text-sm"
					onclick={() => (showBrandModal = false)}
				>
					Cancel
				</button>
				<button
					class="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
					onclick={createBrandFromModal}
				>
					Create Brand
				</button>
			</div>
		</div>
	</div>
{/if}
