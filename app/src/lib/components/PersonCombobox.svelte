<script lang="ts">
	import { Combobox } from 'bits-ui';

	interface Props {
		persons: Array<{ id: number; name: string; role?: string | null }>;
		value?: number | null;
		onValueChange?: (value: number | null) => void;
	}

	let { persons, value = null, onValueChange }: Props = $props();

	let searchValue = $state('');
	let open = $state(false);
	let isSearching = $state(false);

	// Internal string value for the Combobox (which needs string values)
	const stringValue = $derived(value != null ? String(value) : '');

	// Derive selected person's name for display when dropdown is closed
	const selectedPersonName = $derived(
		value != null ? (persons.find((p) => p.id === value)?.name ?? '') : ''
	);

	// Show search text only after user starts typing; otherwise show selected name
	const inputDisplayValue = $derived(open && isSearching ? searchValue : selectedPersonName);

	// Show all persons until user starts typing, then filter
	const filteredPersons = $derived(
		!isSearching || searchValue === ''
			? persons
			: persons.filter((p) => p.name.toLowerCase().includes(searchValue.toLowerCase()))
	);

	function handleValueChange(newValue: string) {
		if (newValue === '') {
			onValueChange?.(null);
		} else {
			onValueChange?.(parseInt(newValue));
		}
	}

	function handleOpenChange(newOpen: boolean) {
		open = newOpen;
		if (!newOpen) {
			searchValue = '';
			isSearching = false;
		}
	}

	function handleInput(e: Event & { currentTarget: HTMLInputElement }) {
		isSearching = true;
		searchValue = e.currentTarget.value;
	}

	function handleClear() {
		onValueChange?.(null);
		searchValue = '';
		isSearching = false;
	}
</script>

<Combobox.Root
	type="single"
	value={stringValue}
	inputValue={inputDisplayValue}
	bind:open
	onValueChange={handleValueChange}
	onOpenChange={handleOpenChange}
>
	<div class="relative">
		<Combobox.Input
			oninput={handleInput}
			class="w-full rounded-lg border border-border-primary bg-surface px-2 py-1.5 pr-12 text-sm text-text-primary focus:border-stone-500 focus:ring-2 focus:ring-stone-500"
			placeholder="Select person"
		/>
		<div class="absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-1">
			{#if value != null}
				<button
					type="button"
					onclick={handleClear}
					class="flex h-4 w-4 items-center justify-center rounded-full text-text-tertiary transition hover:bg-muted hover:text-text-primary"
					title="Clear"
				>
					<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			{/if}
			<Combobox.Trigger class="text-text-secondary hover:text-text-primary">
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M19 9l-7 7-7-7"
					/>
				</svg>
			</Combobox.Trigger>
		</div>
	</div>

	<Combobox.Portal>
		<Combobox.Content
			class="z-50 max-h-60 w-[var(--bits-combobox-anchor-width)] min-w-[var(--bits-combobox-anchor-width)] overflow-hidden rounded-lg border border-border-primary bg-surface shadow-lg"
			sideOffset={4}
		>
			<Combobox.Viewport class="p-1">
				{#each filteredPersons as person (person.id)}
					<Combobox.Item
						class="relative flex cursor-pointer items-center rounded-md px-2 py-1.5 text-sm text-text-primary outline-none select-none hover:bg-muted data-[highlighted]:bg-muted"
						value={String(person.id)}
						label={person.name}
					>
						{#snippet children({ selected })}
							<div class="flex-1">
								<div class="font-medium">{person.name}</div>
								{#if person.role}
									<div class="text-xs text-text-secondary">{person.role}</div>
								{/if}
							</div>
							{#if selected}
								<svg class="ml-2 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
									<path
										fill-rule="evenodd"
										d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
										clip-rule="evenodd"
									/>
								</svg>
							{/if}
						{/snippet}
					</Combobox.Item>
				{/each}

				{#if filteredPersons.length === 0}
					<div class="px-2 py-1.5 text-sm text-text-secondary">No people found</div>
				{/if}
			</Combobox.Viewport>
		</Combobox.Content>
	</Combobox.Portal>
</Combobox.Root>
