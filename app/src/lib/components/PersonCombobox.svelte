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

	// Internal string value for the Combobox (which needs string values)
	const stringValue = $derived(value != null ? String(value) : '');

	// Derive selected person's name for display when dropdown is closed
	const selectedPersonName = $derived(
		value != null ? (persons.find((p) => p.id === value)?.name ?? '') : ''
	);

	// Show search text when open, selected person's name when closed
	const inputDisplayValue = $derived(open ? searchValue : selectedPersonName);

	const filteredPersons = $derived(
		searchValue === ''
			? persons
			: persons.filter((p) =>
					p.name.toLowerCase().includes(searchValue.toLowerCase())
				)
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
		}
	}

	function handleInput(e: Event & { currentTarget: HTMLInputElement }) {
		searchValue = e.currentTarget.value;
	}
</script>

<Combobox.Root
	type="single"
	value={stringValue}
	bind:open
	onValueChange={handleValueChange}
	onOpenChange={handleOpenChange}
>
	<div class="relative">
		<Combobox.Input
			value={inputDisplayValue}
			oninput={handleInput}
			class="w-full px-2 py-1.5 text-sm border border-border-primary rounded-lg focus:ring-2 focus:ring-stone-500 focus:border-stone-500 bg-surface text-text-primary"
			placeholder="Select person"
		/>
		<Combobox.Trigger class="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary">
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
			</svg>
		</Combobox.Trigger>
	</div>

	<Combobox.Portal>
		<Combobox.Content
			class="z-50 max-h-60 w-[var(--bits-combobox-anchor-width)] min-w-[var(--bits-combobox-anchor-width)] overflow-hidden rounded-lg border border-border-primary bg-surface shadow-lg"
			sideOffset={4}
		>
			<Combobox.Viewport class="p-1">
				{#each filteredPersons as person (person.id)}
					<Combobox.Item
						class="relative flex cursor-pointer select-none items-center rounded-md px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-muted text-text-primary hover:bg-muted"
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
									<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
								</svg>
							{/if}
						{/snippet}
					</Combobox.Item>
				{/each}

				{#if filteredPersons.length === 0}
					<div class="px-2 py-1.5 text-sm text-text-secondary">
						No people found
					</div>
				{/if}
			</Combobox.Viewport>
		</Combobox.Content>
	</Combobox.Portal>
</Combobox.Root>
