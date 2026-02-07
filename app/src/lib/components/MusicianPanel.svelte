<script lang="ts">
	// SPDX-License-Identifier: AGPL-3.0-only

	let {
		musicians,
		onAdd,
		onDelete,
		bandPersons = [],
		onImportFromBand
	}: {
		musicians: { id: number; name: string; instrument: string }[];
		onAdd: (name: string, instrument: string) => void;
		onDelete: (id: number) => void;
		bandPersons?: {
			id: number;
			name: string;
			role: string | null;
			member_type: string | null;
		}[];
		onImportFromBand?: (persons: { name: string; role: string | null }[]) => void;
	} = $props();

	let newName = $state('');
	let showImport = $state(false);
	let selectedForImport = $state<Set<number>>(new Set());

	const availablePersons = $derived(
		bandPersons.filter((p) => !musicians.some((m) => m.name === p.name))
	);

	function toggleImportSelection(id: number) {
		const next = new Set(selectedForImport);
		if (next.has(id)) {
			next.delete(id);
		} else {
			next.add(id);
		}
		selectedForImport = next;
	}

	function handleImport() {
		if (!onImportFromBand || selectedForImport.size === 0) return;
		const toImport = bandPersons
			.filter((p) => selectedForImport.has(p.id))
			.map((p) => ({ name: p.name, role: p.role }));
		onImportFromBand(toImport);
		selectedForImport = new Set();
		showImport = false;
	}
</script>

<div class="hidden w-full flex-col gap-6 lg:flex lg:w-64">
	<div class="h-fit rounded-xl border border-border-primary bg-surface p-4 shadow-sm">
		<h2 class="mb-4 font-serif text-lg font-semibold text-text-primary">Musicians</h2>
		<div class="mb-4 border-b border-border-primary pb-4">
			<div class="space-y-2">
				<input
					type="text"
					bind:value={newName}
					class="w-full rounded-lg border border-border-primary bg-surface px-3 py-2 text-sm text-text-primary focus:border-stone-500 focus:ring-2 focus:ring-stone-500"
					placeholder="Musician name"
					onkeydown={(e) => {
						if (e.key === 'Enter' && newName.trim()) {
							onAdd(newName.trim(), '');
							newName = '';
						}
					}}
				/>
				<button
					onclick={() => {
						if (newName.trim()) {
							onAdd(newName.trim(), '');
							newName = '';
						}
					}}
					class="w-full rounded-lg bg-green-600 px-3 py-2 text-sm text-white transition hover:bg-green-700"
				>
					Add Musician
				</button>
				{#if bandPersons.length > 0 && onImportFromBand}
					<button
						onclick={() => {
							showImport = !showImport;
							selectedForImport = new Set();
						}}
						class="w-full rounded-lg border border-border-primary px-3 py-2 text-sm text-text-primary transition hover:bg-surface-hover"
					>
						{showImport ? 'Cancel Import' : 'Import from Band'}
					</button>
				{/if}
			</div>
		</div>

		{#if showImport}
			<div class="mb-4 border-b border-border-primary pb-4">
				{#if availablePersons.length === 0}
					<p class="py-2 text-center text-xs text-text-secondary">
						All band members already in plot
					</p>
				{:else}
					<div class="space-y-1">
						{#each availablePersons as person (person.id)}
							<label
								class="flex cursor-pointer items-center gap-2 rounded-lg p-1.5 text-sm hover:bg-muted"
							>
								<input
									type="checkbox"
									checked={selectedForImport.has(person.id)}
									onchange={() => toggleImportSelection(person.id)}
									class="rounded border-border-secondary"
								/>
								<span class="text-text-primary">{person.name}</span>
								{#if person.role}
									<span class="text-xs text-text-tertiary">{person.role}</span>
								{/if}
							</label>
						{/each}
					</div>
					<button
						onclick={handleImport}
						disabled={selectedForImport.size === 0}
						class="mt-2 w-full rounded-lg bg-stone-900 px-3 py-2 text-sm text-white transition hover:bg-stone-800 disabled:opacity-50 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
					>
						Import Selected ({selectedForImport.size})
					</button>
				{/if}
			</div>
		{/if}

		<div class="space-y-2 pr-1">
			{#if musicians.length === 0}
				<p class="py-4 text-center text-sm text-text-secondary">No musicians added yet</p>
			{:else}
				{#each musicians as musician (musician.id)}
					<div class="flex items-center justify-between rounded-lg bg-muted p-2">
						<div class="min-w-0">
							<div class="truncate text-sm font-medium text-text-primary">
								{musician.name}
							</div>
						</div>
						<button
							onclick={() => onDelete(musician.id)}
							class="text-red-500 hover:text-red-700"
							title="Remove musician"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-4 w-4"
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
				{/each}
			{/if}
		</div>
	</div>
</div>
