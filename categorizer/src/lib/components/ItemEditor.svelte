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

	interface Props {
		item: CatalogItem;
		onsave: (item: CatalogItem) => Promise<void>;
	}

	let { item = $bindable(), onsave }: Props = $props();

	let saving = $state(false);
	let saved = $state(false);
	let tagsText = $state('');

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
		class="flex shrink-0 items-start justify-between border-b border-gray-200 bg-white px-6 py-3"
	>
		<div class="min-w-0">
			<div class="text-lg font-semibold text-gray-900">{item.name}</div>
			<div class="font-mono text-xs text-gray-400">{item.path}</div>
			{#if item._original_name !== item.name}
				<div class="text-xs text-amber-600">Original: {item._original_name}</div>
			{/if}
		</div>
		<button
			class="shrink-0 rounded-md px-4 py-2 text-sm font-medium text-white transition-colors
				{saved ? 'bg-green-500' : saving ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}"
			onclick={save}
			disabled={saving}
		>
			{saved ? 'Saved!' : saving ? 'Saving...' : 'Save'}
		</button>
	</div>

	<!-- Scrollable form -->
	<div class="flex-1 space-y-6 overflow-y-auto px-6 py-4">
		<!-- Variant gallery -->
		<section>
			<h3 class="mb-2 text-sm font-medium text-gray-700">Variants</h3>
			<div class="flex gap-3 overflow-x-auto pb-2">
				{#each Object.entries(item.variants) as [key, filename] (key)}
					<div class="shrink-0 text-center">
						<img
							src="/assets/{item.path}/{filename}"
							alt="{item.name} - {key}"
							class="h-20 w-20 rounded border object-contain
								{key === 'default' ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-gray-50'}"
							onerror={(e) => {
								const el = e.currentTarget as HTMLImageElement;
								el.parentElement!.style.display = 'none';
							}}
						/>
						<div class="mt-1 text-xs text-gray-400">{key}</div>
						<div class="max-w-20 truncate text-xs text-gray-300">{filename}</div>
					</div>
				{/each}
			</div>
		</section>

		<!-- Identity -->
		<section>
			<h3 class="mb-2 text-sm font-medium text-gray-700">Identity</h3>
			<div class="grid grid-cols-2 gap-4">
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
				<div>
					<label for="ed-brand" class="mb-1 block text-xs font-medium text-gray-500">Brand</label>
					<input
						id="ed-brand"
						type="text"
						placeholder="e.g., Fender, Marshall"
						class="w-full rounded border-gray-300 text-sm"
						bind:value={item.brand}
					/>
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
			<h3 class="mb-2 text-sm font-medium text-gray-700">Classification</h3>
			<div class="grid grid-cols-2 gap-4">
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
			<h3 class="mb-2 text-sm font-medium text-gray-700">Dimensions (inches)</h3>
			<div class="grid grid-cols-3 gap-4">
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
			<h3 class="mb-2 text-sm font-medium text-gray-700">Provision</h3>
			<div class="grid grid-cols-2 gap-4">
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
			<h3 class="mb-2 text-sm font-medium text-gray-700">Connectors</h3>
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
					No default inputs. Click "+ Add Input" for items that generate audio channels when placed.
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
