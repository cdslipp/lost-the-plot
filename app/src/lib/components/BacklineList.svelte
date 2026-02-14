<script lang="ts">
	import { generateId } from '@stageplotter/shared';
	import {
		listBacklineItems,
		createBacklineItem,
		updateBacklineItem,
		deleteBacklineItem,
		type FestivalBandBacklineRow,
		type BacklineCategory,
		type BacklineProvision
	} from '$lib/db/repositories/festivalBandBackline';

	type Props = {
		festivalBandId: string;
	};

	let { festivalBandId }: Props = $props();

	let items = $state<FestivalBandBacklineRow[]>([]);

	const categories: { value: BacklineCategory; label: string }[] = [
		{ value: 'amps', label: 'Amps' },
		{ value: 'drums', label: 'Drums' },
		{ value: 'keys', label: 'Keys' },
		{ value: 'monitors', label: 'Monitors' },
		{ value: 'mics', label: 'Mics' },
		{ value: 'di', label: 'DI' },
		{ value: 'other', label: 'Other' }
	];

	const provisions: { value: BacklineProvision; label: string }[] = [
		{ value: 'venue', label: 'Venue' },
		{ value: 'band', label: 'Band' },
		{ value: 'rental', label: 'Rental' },
		{ value: 'tbd', label: 'TBD' }
	];

	async function load() {
		items = await listBacklineItems(festivalBandId);
	}

	async function handleAdd() {
		const id = generateId();
		await createBacklineItem(id, festivalBandId);
		await load();
	}

	async function handleFieldBlur(itemId: string, field: string, value: string) {
		await updateBacklineItem(itemId, { [field]: value || '' });
		await load();
	}

	async function handleSelectChange(itemId: string, field: string, value: string) {
		await updateBacklineItem(itemId, { [field]: value });
		await load();
	}

	async function handleDelete(itemId: string) {
		await deleteBacklineItem(itemId);
		await load();
	}

	$effect(() => {
		if (festivalBandId) load();
	});
</script>

<div class="flex flex-col gap-1.5">
	<span class="mb-0.5 block text-xs text-text-secondary">Backline</span>

	{#each items as item (item.id)}
		<div
			class="rounded-md border border-border-primary bg-stone-50 px-2 py-1.5 dark:bg-stone-800/50"
		>
			<!-- Row 1: category + description + delete -->
			<div class="flex items-center gap-1.5">
				<select
					value={item.category}
					onchange={(e) =>
						handleSelectChange(item.id, 'category', (e.target as HTMLSelectElement).value)}
					class="w-24 rounded border border-border-primary bg-transparent px-1 py-0.5 text-xs text-text-primary focus:border-stone-500 focus:outline-none"
				>
					{#each categories as cat (cat.value)}
						<option value={cat.value}>{cat.label}</option>
					{/each}
				</select>
				<input
					type="text"
					value={item.description}
					placeholder="Description"
					onblur={(e) =>
						handleFieldBlur(item.id, 'description', (e.target as HTMLInputElement).value)}
					class="min-w-0 flex-1 rounded border border-border-primary bg-transparent px-1 py-0.5 text-xs text-text-primary focus:border-stone-500 focus:outline-none"
				/>
				<button
					aria-label="Delete backline item"
					onclick={() => handleDelete(item.id)}
					class="flex-shrink-0 text-red-500 hover:text-red-700"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-3.5 w-3.5"
						viewBox="0 0 20 20"
						fill="currentColor"
					>
						<path
							fill-rule="evenodd"
							d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
							clip-rule="evenodd"
						/>
					</svg>
				</button>
			</div>
			<!-- Row 2: provision + notes -->
			<div class="mt-1 flex items-center gap-1.5">
				<select
					value={item.provision}
					onchange={(e) =>
						handleSelectChange(item.id, 'provision', (e.target as HTMLSelectElement).value)}
					class="w-24 rounded border border-border-primary bg-transparent px-1 py-0.5 text-xs text-text-primary focus:border-stone-500 focus:outline-none"
				>
					{#each provisions as prov (prov.value)}
						<option value={prov.value}>{prov.label}</option>
					{/each}
				</select>
				<input
					type="text"
					value={item.notes ?? ''}
					placeholder="Notes"
					onblur={(e) => handleFieldBlur(item.id, 'notes', (e.target as HTMLInputElement).value)}
					class="min-w-0 flex-1 rounded border border-border-primary bg-transparent px-1 py-0.5 text-xs text-text-primary focus:border-stone-500 focus:outline-none"
				/>
			</div>
		</div>
	{/each}

	<button
		onclick={handleAdd}
		class="flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-border-primary px-2 py-1 text-xs text-text-secondary transition hover:border-stone-400 hover:text-text-primary"
	>
		<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
			<path
				fill-rule="evenodd"
				d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
				clip-rule="evenodd"
			/>
		</svg>
		Add backline item
	</button>
</div>
