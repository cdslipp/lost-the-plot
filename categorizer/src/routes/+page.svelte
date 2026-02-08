<script lang="ts">
	import type { CatalogItem } from '$lib/types';
	import { ITEM_TYPES, CATEGORIES, PROVISION_TYPES } from '$lib/schema';
	import { SvelteSet } from 'svelte/reactivity';
	import ItemSidebar from '$lib/components/ItemSidebar.svelte';
	import ItemEditor from '$lib/components/ItemEditor.svelte';

	type Brand = {
		name: string;
		slug: string;
		website?: string;
		status?: 'active' | 'defunct';
		notes?: string;
	};

	let { data }: { data: { items: CatalogItem[]; brands: Brand[] } } = $props();
	// $state wraps items with deep reactivity so bind:value works in the editor.
	// This intentionally captures the initial load — we manage mutations locally.
	let items: CatalogItem[] = $state(data.items);
	let brands: Brand[] = $state(data.brands ?? []);
	let selectedPath = $state('');
	let multiSelected = new SvelteSet<string>();
	let sidebar: ItemSidebar | undefined = $state();
	let duplicateItem = $state<CatalogItem | null>(null);
	let showDuplicateModal = $state(false);
	let duplicateName = $state('');
	let duplicatePath = $state('');
	let duplicateError = $state('');

	// Batch edit state
	let showBatchPanel = $state(false);
	let batchCategory = $state('');
	let batchItemType = $state('');
	let batchProvision = $state('');
	let batchIsBackline: boolean | null = $state(null);
	let batchSaving = $state(false);

	let selectedItem = $derived(items.find((i) => i.path === selectedPath));

	function selectItem(path: string) {
		selectedPath = path;
		showBatchPanel = false;
	}

	function toggleMultiSelect(path: string) {
		if (multiSelected.has(path)) {
			multiSelected.delete(path);
		} else {
			multiSelected.add(path);
		}
		if (multiSelected.size > 0) showBatchPanel = true;
	}

	function selectAllVisible() {
		if (!sidebar) return;
		const filtered = sidebar.getFilteredItems();
		multiSelected.clear();
		for (const item of filtered) {
			multiSelected.add(item.path);
		}
		showBatchPanel = true;
	}

	function clearSelection() {
		multiSelected.clear();
		showBatchPanel = false;
	}

	async function saveItem(item: CatalogItem) {
		const res = await fetch('/api/save', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(item)
		});
		if (!res.ok) {
			console.error('Save failed:', await res.text());
		} else {
			item._enriched = true;
		}
	}

	function slugifyPath(path: string): string {
		return path
			.replace(/\//g, '-')
			.replace(/[^a-z0-9-]/gi, '-')
			.replace(/-+/g, '-')
			.toLowerCase();
	}

	async function createBrand(brand: Brand) {
		const res = await fetch('/api/brands', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(brand)
		});
		if (!res.ok) {
			console.error('Brand save failed:', await res.text());
			return null;
		}
		const data = await res.json();
		return data.brand as Brand;
	}

	async function handleCreateBrand(brand: Brand) {
		const created = await createBrand(brand);
		if (!created) return null;
		brands = [...brands, created].sort((a, b) => a.name.localeCompare(b.name));
		return created;
	}

	function openDuplicateModal(item: CatalogItem) {
		duplicateItem = item;
		duplicateName = `${item.name} Copy`;
		duplicatePath = `${item.path}-copy`;
		duplicateError = '';
		showDuplicateModal = true;
	}

	function closeDuplicateModal() {
		showDuplicateModal = false;
		duplicateItem = null;
		duplicateError = '';
	}

	async function confirmDuplicate() {
		if (!duplicateItem) return;
		const trimmedPath = duplicatePath.trim();
		if (!trimmedPath) {
			duplicateError = 'Path is required.';
			return;
		}
		if (items.some((i) => i.path === trimmedPath)) {
			duplicateError = 'That path already exists.';
			return;
		}
		const cloned = structuredClone(duplicateItem);
		const newItem: CatalogItem = {
			...cloned,
			name: duplicateName.trim() || duplicateItem.name,
			path: trimmedPath,
			slug: slugifyPath(trimmedPath),
			_enriched: true,
			_original_name: duplicateName.trim() || duplicateItem.name
		};
		const res = await fetch('/api/create', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(newItem)
		});
		if (!res.ok) {
			duplicateError = await res.text();
			return;
		}
		items = [...items, newItem];
		selectedPath = newItem.path;
		showDuplicateModal = false;
	}

	async function batchUpdate() {
		if (multiSelected.size === 0) return;

		const fields: Record<string, unknown> = {};
		if (batchCategory) fields.category = batchCategory;
		if (batchItemType) fields.item_type = batchItemType;
		if (batchProvision) fields.provision_default = batchProvision;
		if (batchIsBackline !== null) fields.is_backline = batchIsBackline;

		if (Object.keys(fields).length === 0) return;

		batchSaving = true;
		const res = await fetch('/api/batch', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ paths: [...multiSelected], fields })
		});

		if (res.ok) {
			for (const item of items) {
				if (multiSelected.has(item.path)) {
					Object.assign(item, fields);
				}
			}
			clearSelection();
			resetBatchFields();
		}
		batchSaving = false;
	}

	function resetBatchFields() {
		batchCategory = '';
		batchItemType = '';
		batchProvision = '';
		batchIsBackline = null;
	}

	async function saveAndAdvance() {
		if (!selectedItem) return;
		await saveItem(selectedItem);
		navigateList(1);
	}

	function handleKeydown(e: KeyboardEvent) {
		// Cmd+Enter: save current item and advance to next
		if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
			e.preventDefault();
			saveAndAdvance();
			return;
		}

		// Cmd+S: save current item
		if ((e.metaKey || e.ctrlKey) && e.key === 's') {
			e.preventDefault();
			if (selectedItem) saveItem(selectedItem);
			return;
		}

		const tag = (e.target as HTMLElement)?.tagName;
		if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

		if (e.key === 'j' || e.key === 'ArrowDown') {
			e.preventDefault();
			navigateList(1);
		} else if (e.key === 'k' || e.key === 'ArrowUp') {
			e.preventDefault();
			navigateList(-1);
		} else if (e.key === 'Escape') {
			clearSelection();
			selectedPath = '';
		}
	}

	function navigateList(delta: number) {
		if (!sidebar) return;
		const filtered = sidebar.getFilteredItems();
		if (filtered.length === 0) return;

		const currentIdx = filtered.findIndex((i) => i.path === selectedPath);
		let nextIdx: number;

		if (currentIdx === -1) {
			nextIdx = delta > 0 ? 0 : filtered.length - 1;
		} else {
			nextIdx = Math.max(0, Math.min(filtered.length - 1, currentIdx + delta));
		}

		selectedPath = filtered[nextIdx].path;
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="flex h-full">
	<!-- Sidebar -->
	<ItemSidebar
		bind:this={sidebar}
		{items}
		{selectedPath}
		{multiSelected}
		onselect={selectItem}
		ontoggleselect={toggleMultiSelect}
		onselectall={selectAllVisible}
		onclearselection={clearSelection}
	/>

	<!-- Main content area -->
	<div class="flex-1 overflow-hidden">
		{#if showBatchPanel && multiSelected.size > 0}
			<!-- Batch edit panel -->
			<div class="flex h-full flex-col bg-white">
				<div class="border-b border-gray-200 px-6 py-3">
					<h2 class="text-lg font-semibold text-gray-900">
						Batch Edit ({multiSelected.size} items)
					</h2>
					<p class="text-sm text-gray-500">
						Set fields below and apply to all selected items. Only non-empty fields will be updated.
					</p>
				</div>
				<div class="flex-1 space-y-4 overflow-y-auto px-6 py-4">
					<div class="grid max-w-lg grid-cols-2 gap-4">
						<div>
							<label for="batch_type" class="mb-1 block text-xs font-medium text-gray-500"
								>Item Type</label
							>
							<select
								id="batch_type"
								class="w-full rounded border-gray-300 text-sm"
								bind:value={batchItemType}
							>
								<option value="">-- Don't change --</option>
								{#each ITEM_TYPES as type (type)}
									<option value={type}>{type}</option>
								{/each}
							</select>
						</div>
						<div>
							<label for="batch_cat" class="mb-1 block text-xs font-medium text-gray-500"
								>Category</label
							>
							<select
								id="batch_cat"
								class="w-full rounded border-gray-300 text-sm"
								bind:value={batchCategory}
							>
								<option value="">-- Don't change --</option>
								{#each CATEGORIES as cat (cat)}
									<option value={cat}>{cat}</option>
								{/each}
							</select>
						</div>
						<div>
							<label for="batch_prov" class="mb-1 block text-xs font-medium text-gray-500"
								>Provision</label
							>
							<select
								id="batch_prov"
								class="w-full rounded border-gray-300 text-sm"
								bind:value={batchProvision}
							>
								<option value="">-- Don't change --</option>
								{#each PROVISION_TYPES as prov (prov)}
									<option value={prov}>{prov.replace(/_/g, ' ')}</option>
								{/each}
							</select>
						</div>
						<div class="flex items-end gap-4">
							<label for="batch_backline" class="flex items-center gap-2">
								<input
									id="batch_backline"
									type="checkbox"
									class="rounded border-gray-300 text-blue-600"
									checked={batchIsBackline === true}
									onchange={(e) =>
										(batchIsBackline = (e.target as HTMLInputElement).checked ? true : null)}
								/>
								<span class="text-sm text-gray-700">Set as backline</span>
							</label>
						</div>
					</div>

					<div class="flex gap-2">
						<button
							class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
							onclick={batchUpdate}
							disabled={batchSaving}
						>
							{batchSaving ? 'Applying...' : 'Apply to Selected'}
						</button>
						<button
							class="rounded-md bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-200"
							onclick={clearSelection}
						>
							Cancel
						</button>
					</div>

					<!-- Preview selected items -->
					<div class="mt-4">
						<h3 class="mb-2 text-sm font-medium text-gray-700">Selected Items:</h3>
						<div class="max-h-96 overflow-y-auto rounded border border-gray-200">
							{#each items.filter((i) => multiSelected.has(i.path)) as item (item.path)}
								<div class="flex items-center gap-2 border-b border-gray-50 px-3 py-1.5 text-sm">
									<img
										src="/assets/{item.path}/{item.variants.default ||
											Object.values(item.variants)[0]}"
										alt={item.name}
										class="h-6 w-6 object-contain"
										onerror={(e) => {
											(e.currentTarget as HTMLImageElement).style.display = 'none';
										}}
									/>
									<span class="truncate">{item.name}</span>
									<span class="font-mono text-xs text-gray-400">{item.path}</span>
								</div>
							{/each}
						</div>
					</div>
				</div>
			</div>
		{:else if selectedItem}
			<!-- Single item editor -->
			<ItemEditor
				bind:item={selectedItem}
				onsave={saveItem}
				{brands}
				oncreatebrand={handleCreateBrand}
				ontoggleduplicate={() => openDuplicateModal(selectedItem!)}
			/>
		{:else}
			<!-- Empty state -->
			<div class="flex h-full items-center justify-center bg-white">
				<div class="text-center">
					<div class="mb-2 text-4xl text-gray-300">&#127928;</div>
					<h2 class="text-lg font-medium text-gray-500">Select an item to edit</h2>
					<p class="mt-1 text-sm text-gray-400">
						Browse the catalog on the left, or use <kbd
							class="rounded bg-gray-100 px-1.5 py-0.5 text-xs">j</kbd
						>/<kbd class="rounded bg-gray-100 px-1.5 py-0.5 text-xs">k</kbd> to navigate
					</p>
				</div>
			</div>
		{/if}
	</div>

	{#if showDuplicateModal}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
			<div class="w-full max-w-lg rounded-lg bg-white p-6 shadow-lg">
				<h3 class="text-lg font-semibold text-gray-900">Duplicate Item</h3>
				<p class="mt-1 text-sm text-gray-500">
					Create a new catalog item from the current one. Update the asset folder to match the new
					path.
				</p>
				<div class="mt-4 space-y-4">
					<div>
						<label class="mb-1 block text-xs font-medium text-gray-500">Name</label>
						<input
							type="text"
							class="w-full rounded border-gray-300 text-sm"
							bind:value={duplicateName}
						/>
					</div>
					<div>
						<label class="mb-1 block text-xs font-medium text-gray-500">Path</label>
						<input
							type="text"
							class="w-full rounded border-gray-300 font-mono text-sm"
							bind:value={duplicatePath}
						/>
						<p class="mt-1 text-xs text-gray-400">Example: percussion/vibraphone</p>
					</div>
					{#if duplicateError}
						<div class="text-sm text-red-500">{duplicateError}</div>
					{/if}
				</div>
				<div class="mt-6 flex items-center justify-end gap-2">
					<button
						class="rounded border border-gray-200 px-4 py-2 text-sm"
						onclick={closeDuplicateModal}
					>
						Cancel
					</button>
					<button
						class="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
						onclick={confirmDuplicate}
					>
						Create Duplicate
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
