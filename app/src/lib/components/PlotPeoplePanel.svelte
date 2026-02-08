<script lang="ts">
	import PersonSilhouettePicker from './PersonSilhouettePicker.svelte';
	import type { ProcessedItem } from '$lib/utils/finalAssetsLoader';

	type Props = {
		bandPersons: { id: number; name: string; role: string | null; member_type: string | null }[];
		plotPersonIds: Set<number>;
		items: { id: number; name: string; person_id: number | null; itemData?: any }[];
		onAddPersonToPlot: (personId: number, silhouetteItem: ProcessedItem) => void;
		onCreatePerson: (name: string) => Promise<number>;
		onRemovePersonFromPlot: (personId: number) => void;
	};

	let {
		bandPersons,
		plotPersonIds,
		items,
		onAddPersonToPlot,
		onCreatePerson,
		onRemovePersonFromPlot
	}: Props = $props();

	let showNewPersonInput = $state(false);
	let newPersonName = $state('');
	let pickerOpen = $state(false);
	let pickerPersonId = $state<number | null>(null);
	let pickerPersonName = $state('');

	// People on the plot
	const onPlot = $derived(
		bandPersons.filter((p) => plotPersonIds.has(p.id))
	);

	// People in the band but not yet on the plot
	const offPlot = $derived(
		bandPersons.filter((p) => !plotPersonIds.has(p.id))
	);

	// Items assigned to a given person
	function getPersonItems(personId: number) {
		return items.filter((i) => i.person_id === personId);
	}

	function handleAddClick(person: { id: number; name: string }) {
		pickerPersonId = person.id;
		pickerPersonName = person.name;
		pickerOpen = true;
	}

	function handlePickerSelect(item: ProcessedItem) {
		if (pickerPersonId != null) {
			onAddPersonToPlot(pickerPersonId, item);
		}
		pickerOpen = false;
		pickerPersonId = null;
	}

	async function handleCreatePerson() {
		const name = newPersonName.trim();
		if (!name) return;
		const personId = await onCreatePerson(name);
		newPersonName = '';
		showNewPersonInput = false;
		// Open silhouette picker for the new person
		pickerPersonId = personId;
		pickerPersonName = name;
		pickerOpen = true;
	}
</script>

<div class="flex h-full w-full min-h-0 flex-col gap-4">
	<h2 class="font-serif text-lg font-semibold text-text-primary">People</h2>

	<!-- People on the plot -->
	<div class="min-h-0 flex-1 space-y-1 overflow-auto pr-1">
		{#if onPlot.length === 0}
			<p class="py-2 text-center text-sm text-text-secondary">No people on this plot yet</p>
		{:else}
			{#each onPlot as person (person.id)}
				{@const assignedItems = getPersonItems(person.id)}
				<div class="rounded-lg bg-muted p-2">
					<div class="flex items-center justify-between">
						<div class="min-w-0">
							<div class="truncate text-sm font-medium text-text-primary">{person.name}</div>
							{#if person.role}
								<div class="truncate text-xs text-text-tertiary">{person.role}</div>
							{/if}
						</div>
						<button
							onclick={() => onRemovePersonFromPlot(person.id)}
							class="text-red-500 hover:text-red-700"
							title="Remove from plot"
						>
							<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
								<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
							</svg>
						</button>
					</div>
					{#if assignedItems.length > 0}
						<div class="mt-1.5 space-y-0.5 border-t border-border-primary pt-1.5">
							{#each assignedItems as item (item.id)}
								<div class="truncate text-xs text-text-secondary">{item.name}</div>
							{/each}
						</div>
					{/if}
				</div>
			{/each}
		{/if}
	</div>

	<!-- Band people not on plot -->
	{#if offPlot.length > 0}
		<div class="border-t border-border-primary pt-3">
			<h3 class="mb-2 text-[10px] font-medium uppercase tracking-wider text-text-tertiary">Band Members</h3>
			<div class="space-y-1">
				{#each offPlot as person (person.id)}
					<div class="flex items-center justify-between rounded-lg p-1.5 hover:bg-muted">
						<div class="min-w-0">
							<span class="text-sm text-text-primary">{person.name}</span>
							{#if person.role}
								<span class="ml-1 text-xs text-text-tertiary">{person.role}</span>
							{/if}
						</div>
						<button
							onclick={() => handleAddClick(person)}
							class="flex h-6 w-6 items-center justify-center rounded-full bg-green-600 text-white transition hover:bg-green-700"
							title="Add to plot"
						>
							<svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
								<path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
							</svg>
						</button>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Add new person -->
	<div class="border-t border-border-primary pt-3">
		{#if showNewPersonInput}
			<div class="space-y-2">
				<input
					type="text"
					bind:value={newPersonName}
					class="w-full rounded-lg border border-border-primary bg-surface px-3 py-2 text-sm text-text-primary focus:border-stone-500 focus:ring-2 focus:ring-stone-500"
					placeholder="Person name"
					onkeydown={(e) => {
						if (e.key === 'Enter') handleCreatePerson();
						if (e.key === 'Escape') { showNewPersonInput = false; newPersonName = ''; }
					}}
				/>
				<div class="flex gap-2">
					<button
						onclick={handleCreatePerson}
						disabled={!newPersonName.trim()}
						class="flex-1 rounded-lg bg-green-600 px-3 py-2 text-sm text-white transition hover:bg-green-700 disabled:opacity-50"
					>
						Add Person
					</button>
					<button
						onclick={() => { showNewPersonInput = false; newPersonName = ''; }}
						class="rounded-lg border border-border-primary px-3 py-2 text-sm text-text-primary transition hover:bg-surface-hover"
					>
						Cancel
					</button>
				</div>
			</div>
		{:else}
			<button
				onclick={() => (showNewPersonInput = true)}
				class="w-full rounded-lg border border-dashed border-border-primary px-3 py-2 text-sm text-text-secondary transition hover:border-stone-400 hover:text-text-primary"
			>
				+ Add Person
			</button>
		{/if}
	</div>
</div>

<PersonSilhouettePicker
	bind:open={pickerOpen}
	personName={pickerPersonName}
	onSelect={handlePickerSelect}
	onClose={() => { pickerOpen = false; pickerPersonId = null; }}
/>
