<script lang="ts">
	import { tick } from 'svelte';
	import { slide } from 'svelte/transition';
	import type { MemberType, MemberStatus } from '@stageplotter/shared';
	import {
		createPerson,
		updatePersonField,
		deletePerson as deletePersonDb
	} from '$lib/db/repositories/persons';

	interface PersonRow {
		id: number;
		name: string;
		role: string | null;
		pronouns: string | null;
		phone: string | null;
		email: string | null;
		member_type: string | null;
		status: string | null;
	}

	let {
		bandId,
		persons = $bindable([])
	}: {
		bandId: string;
		persons: PersonRow[];
	} = $props();

	let editingPersonId = $state<number | null>(null);
	let addRowExpansion = $state<0 | 1 | 2>(0);
	let flashPersonId = $state<number | null>(null);

	let newPerson = $state({
		name: '',
		role: '',
		pronouns: '',
		phone: '',
		email: '',
		member_type: 'performer' as MemberType,
		status: 'permanent' as MemberStatus
	});

	let nameInputEl = $state<HTMLInputElement | null>(null);
	let memberTypeSelectEl = $state<HTMLSelectElement | null>(null);
	let phoneInputEl = $state<HTMLInputElement | null>(null);

	let filterType = $state<'all' | MemberType>('all');
	const filteredPersons = $derived(
		filterType === 'all'
			? persons
			: persons.filter((p) => (p.member_type || 'performer') === filterType)
	);

	function resetNewPerson() {
		newPerson = {
			name: '',
			role: '',
			pronouns: '',
			phone: '',
			email: '',
			member_type: 'performer',
			status: 'permanent'
		};
		addRowExpansion = 0;
	}

	async function addPerson() {
		if (!newPerson.name.trim()) return;

		const id = await createPerson(bandId, newPerson.name.trim(), {
			role: newPerson.role.trim() || null,
			pronouns: newPerson.pronouns.trim() || null,
			phone: newPerson.phone.trim() || null,
			email: newPerson.email.trim() || null,
			member_type: newPerson.member_type,
			status: newPerson.status
		});

		persons = [
			...persons,
			{
				id,
				name: newPerson.name.trim(),
				role: newPerson.role.trim() || null,
				pronouns: newPerson.pronouns.trim() || null,
				phone: newPerson.phone.trim() || null,
				email: newPerson.email.trim() || null,
				member_type: newPerson.member_type,
				status: newPerson.status
			}
		];

		flashPersonId = id;
		setTimeout(() => (flashPersonId = null), 600);

		resetNewPerson();
		await tick();
		nameInputEl?.focus();
	}

	async function removePerson(personId: number) {
		await deletePersonDb(personId);
		persons = persons.filter((p) => p.id !== personId);
		if (editingPersonId === personId) editingPersonId = null;
	}

	async function updatePerson(personId: number, field: string, value: string) {
		await updatePersonField(personId, field, value || null);
		const p = persons.find((p) => p.id === personId);
		if (p) (p as any)[field] = value || null;
	}

	function handleAddRowKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			resetNewPerson();
			(e.target as HTMLElement)?.blur();
		}
	}

	function handleRoleKeydown(e: KeyboardEvent) {
		if (e.key === 'Tab' && !e.shiftKey && addRowExpansion === 0) {
			e.preventDefault();
			addRowExpansion = 1;
			tick().then(() => memberTypeSelectEl?.focus());
		}
	}

	function handleStatusKeydown(e: KeyboardEvent) {
		if (e.key === 'Tab' && !e.shiftKey && addRowExpansion === 1) {
			e.preventDefault();
			addRowExpansion = 2;
			tick().then(() => phoneInputEl?.focus());
		}
	}

	function handleEditKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			editingPersonId = null;
		} else if (e.key === 'Enter' && (e.target as HTMLElement)?.tagName !== 'SELECT') {
			(e.target as HTMLElement)?.blur();
			editingPersonId = null;
		}
	}

	function handlePersonRowClick(personId: number) {
		editingPersonId = editingPersonId === personId ? null : personId;
	}

	function handlePersonRowKeydown(e: KeyboardEvent, personId: number) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			handlePersonRowClick(personId);
		}
	}
</script>

<div>
	<div class="mb-2.5">
		<h2 class="font-serif text-xl font-semibold text-text-primary">People</h2>
	</div>

	<!-- Filter buttons -->
	{#if persons.length > 0}
		<div class="mb-2 flex gap-1">
			{#each [{ key: 'all', label: 'All' }, { key: 'performer', label: 'Performers' }, { key: 'crew', label: 'Crew' }, { key: 'management', label: 'Management' }] as filter (filter.key)}
				<button
					onclick={() => (filterType = filter.key as typeof filterType)}
					class="rounded-full px-3 py-1 text-xs transition {filterType === filter.key
						? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
						: 'bg-muted text-text-secondary hover:bg-bg-tertiary'}"
				>
					{filter.label}
				</button>
			{/each}
		</div>
	{/if}

	<div class="space-y-1">
		<!-- Person rows -->
		{#each filteredPersons as person (person.id)}
			<div
				class="group rounded-xl border border-border-primary bg-surface shadow-sm transition-colors"
				class:flash-green={flashPersonId === person.id}
			>
				<!-- View row (always visible) -->
				<div
					class="flex items-center justify-between p-2 {editingPersonId === person.id
						? ''
						: 'cursor-pointer hover:bg-surface-hover'} rounded-xl"
					role="button"
					tabindex="0"
					onclick={() => handlePersonRowClick(person.id)}
					onkeydown={(e) => handlePersonRowKeydown(e, person.id)}
				>
					<div class="flex flex-1 items-center gap-4">
						<div class="flex items-center gap-2">
							<span class="font-medium text-text-primary">{person.name}</span>
							{#if person.pronouns}
								<span class="text-xs text-text-tertiary">({person.pronouns})</span>
							{/if}
							{#if person.role}
								<span class="text-sm text-text-secondary">{person.role}</span>
							{/if}
							{#if person.member_type && person.member_type !== 'performer'}
								<span class="rounded-full bg-muted px-2 py-0.5 text-xs text-text-secondary"
									>{person.member_type}</span
								>
							{/if}
							{#if person.status && person.status !== 'permanent'}
								<span class="rounded-full bg-muted px-2 py-0.5 text-xs text-text-secondary"
									>{person.status}</span
								>
							{/if}
						</div>
						<div class="hidden text-sm text-text-tertiary sm:flex sm:gap-4">
							{#if person.phone}
								<span>{person.phone}</span>
							{/if}
							{#if person.email}
								<span>{person.email}</span>
							{/if}
						</div>
					</div>
					<button
						onclick={(e) => {
							e.stopPropagation();
							removePerson(person.id);
						}}
						class="rounded p-1 text-text-tertiary opacity-0 transition group-hover:opacity-100 hover:bg-red-100 hover:text-red-600 focus:opacity-100 dark:hover:bg-red-900/30"
						title="Delete person"
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

				<!-- Edit expansion -->
				{#if editingPersonId === person.id}
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div
						transition:slide={{ duration: 200 }}
						class="border-t border-border-primary px-2 pt-2 pb-2"
						onclick={(e) => e.stopPropagation()}
						onkeydown={handleEditKeydown}
					>
						<div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
							<input
								value={person.name}
								onchange={(e) =>
									updatePerson(person.id, 'name', (e.target as HTMLInputElement).value)}
								class="rounded-lg border border-border-primary bg-surface px-2 py-1.5 text-sm text-text-primary focus:border-stone-500 focus:ring-2 focus:ring-stone-500"
								placeholder="Name"
							/>
							<input
								value={person.role || ''}
								onchange={(e) =>
									updatePerson(person.id, 'role', (e.target as HTMLInputElement).value)}
								class="rounded-lg border border-border-primary bg-surface px-2 py-1.5 text-sm text-text-primary focus:border-stone-500 focus:ring-2 focus:ring-stone-500"
								placeholder="Role"
							/>
							<input
								value={person.pronouns || ''}
								onchange={(e) =>
									updatePerson(person.id, 'pronouns', (e.target as HTMLInputElement).value)}
								class="rounded-lg border border-border-primary bg-surface px-2 py-1.5 text-sm text-text-primary focus:border-stone-500 focus:ring-2 focus:ring-stone-500"
								placeholder="Pronouns"
							/>
							<select
								value={person.member_type || 'performer'}
								onchange={(e) =>
									updatePerson(person.id, 'member_type', (e.target as HTMLSelectElement).value)}
								class="rounded-lg border border-border-primary bg-surface px-2 py-1.5 text-sm text-text-primary focus:border-stone-500 focus:ring-2 focus:ring-stone-500"
							>
								<option value="performer">Performer</option>
								<option value="crew">Crew</option>
								<option value="management">Management</option>
								<option value="other">Other</option>
							</select>
							<select
								value={person.status || 'permanent'}
								onchange={(e) =>
									updatePerson(person.id, 'status', (e.target as HTMLSelectElement).value)}
								class="rounded-lg border border-border-primary bg-surface px-2 py-1.5 text-sm text-text-primary focus:border-stone-500 focus:ring-2 focus:ring-stone-500"
							>
								<option value="permanent">Permanent</option>
								<option value="occasional">Occasional</option>
								<option value="temporary">Temporary</option>
								<option value="inactive">Inactive</option>
							</select>
							<div></div>
							<input
								value={person.phone || ''}
								onchange={(e) =>
									updatePerson(person.id, 'phone', (e.target as HTMLInputElement).value)}
								class="rounded-lg border border-border-primary bg-surface px-2 py-1.5 text-sm text-text-primary focus:border-stone-500 focus:ring-2 focus:ring-stone-500"
								placeholder="Phone"
								type="tel"
							/>
							<input
								value={person.email || ''}
								onchange={(e) =>
									updatePerson(person.id, 'email', (e.target as HTMLInputElement).value)}
								class="rounded-lg border border-border-primary bg-surface px-2 py-1.5 text-sm text-text-primary focus:border-stone-500 focus:ring-2 focus:ring-stone-500"
								placeholder="Email"
								type="email"
							/>
						</div>
						<div class="mt-2 flex justify-end">
							<button
								onclick={() => (editingPersonId = null)}
								class="rounded-lg px-3 py-1.5 text-sm text-text-secondary hover:bg-surface-hover hover:text-text-primary"
							>
								Done
							</button>
						</div>
					</div>
				{/if}
			</div>
		{/each}

		<!-- Always-visible inline add row -->
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<form
			onsubmit={(e) => {
				e.preventDefault();
				addPerson();
			}}
			class="rounded-xl border border-dashed border-border-primary bg-surface shadow-sm"
			onkeydown={handleAddRowKeydown}
		>
			<button type="submit" class="hidden"></button>
			<!-- Row 1: Name + Role -->
			<div class="flex items-center gap-2 p-2">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-4 w-4 shrink-0 text-text-tertiary"
					viewBox="0 0 20 20"
					fill="currentColor"
				>
					<path
						fill-rule="evenodd"
						d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
						clip-rule="evenodd"
					/>
				</svg>
				<input
					bind:this={nameInputEl}
					bind:value={newPerson.name}
					placeholder="Name"
					class="min-w-0 flex-1 rounded-lg border border-border-primary bg-surface px-2 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-stone-500 focus:ring-2 focus:ring-stone-500"
				/>
				<input
					bind:value={newPerson.role}
					placeholder="Role (e.g. Guitar, FOH)"
					class="min-w-0 flex-1 rounded-lg border border-border-primary bg-surface px-2 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-stone-500 focus:ring-2 focus:ring-stone-500"
					onkeydown={handleRoleKeydown}
				/>
				{#if newPerson.name.trim()}
					<span class="shrink-0 text-xs text-text-tertiary">&#x21B5; to add</span>
				{/if}
			</div>

			<!-- Expansion level 1: Member Type + Status -->
			{#if addRowExpansion >= 1}
				<div
					transition:slide={{ duration: 200 }}
					class="border-t border-dashed border-border-primary px-2 pt-2 pb-2"
				>
					<div class="grid grid-cols-2 gap-2 pl-6">
						<select
							bind:this={memberTypeSelectEl}
							bind:value={newPerson.member_type}
							class="rounded-lg border border-border-primary bg-surface px-2 py-1.5 text-sm text-text-primary focus:border-stone-500 focus:ring-2 focus:ring-stone-500"
						>
							<option value="performer">Performer</option>
							<option value="crew">Crew</option>
							<option value="management">Management</option>
							<option value="other">Other</option>
						</select>
						<select
							bind:value={newPerson.status}
							class="rounded-lg border border-border-primary bg-surface px-2 py-1.5 text-sm text-text-primary focus:border-stone-500 focus:ring-2 focus:ring-stone-500"
							onkeydown={handleStatusKeydown}
						>
							<option value="permanent">Permanent</option>
							<option value="occasional">Occasional</option>
							<option value="temporary">Temporary</option>
							<option value="inactive">Inactive</option>
						</select>
					</div>
				</div>
			{/if}

			<!-- Expansion level 2: Phone + Email + Pronouns -->
			{#if addRowExpansion >= 2}
				<div
					transition:slide={{ duration: 200 }}
					class="border-t border-dashed border-border-primary px-2 pt-2 pb-2"
				>
					<div class="grid grid-cols-1 gap-2 pl-6 sm:grid-cols-3">
						<input
							bind:this={phoneInputEl}
							bind:value={newPerson.phone}
							placeholder="Phone"
							type="tel"
							class="rounded-lg border border-border-primary bg-surface px-2 py-1.5 text-sm text-text-primary focus:border-stone-500 focus:ring-2 focus:ring-stone-500"
						/>
						<input
							bind:value={newPerson.email}
							placeholder="Email"
							type="email"
							class="rounded-lg border border-border-primary bg-surface px-2 py-1.5 text-sm text-text-primary focus:border-stone-500 focus:ring-2 focus:ring-stone-500"
						/>
						<input
							bind:value={newPerson.pronouns}
							placeholder="Pronouns"
							class="rounded-lg border border-border-primary bg-surface px-2 py-1.5 text-sm text-text-primary focus:border-stone-500 focus:ring-2 focus:ring-stone-500"
						/>
					</div>
				</div>
			{/if}
		</form>
	</div>
</div>
