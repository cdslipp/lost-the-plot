<script lang="ts">
	// SPDX-License-Identifier: AGPL-3.0-only
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { db } from '$lib/db';
	import type { MemberType, MemberStatus } from '@stageplotter/shared';

	let bandId = $derived($page.params.bandId);

	let band = $state<{ id: string; name: string } | null>(null);
	let plots = $state<
		{ id: string; name: string; revision_date: string; event_name: string | null }[]
	>([]);
	let persons = $state<
		{
			id: number;
			name: string;
			role: string | null;
			phone: string | null;
			email: string | null;
			member_type: string | null;
			status: string | null;
		}[]
	>([]);
	let loading = $state(true);
	let editingBandName = $state(false);
	let bandNameInput = $state('');

	// Person editing state
	let editingPersonId = $state<number | null>(null);
	let newPerson = $state({
		name: '',
		role: '',
		phone: '',
		email: '',
		member_type: 'performer' as MemberType,
		status: 'permanent' as MemberStatus
	});
	let showAddPerson = $state(false);

	// Filter state
	let filterType = $state<'all' | MemberType>('all');
	const filteredPersons = $derived(
		filterType === 'all'
			? persons
			: persons.filter((p) => (p.member_type || 'performer') === filterType)
	);

	async function load() {
		await db.init();

		const row = await db.queryOne<{ id: string; name: string }>(
			'SELECT id, name FROM bands WHERE id = ?',
			[bandId]
		);
		if (!row) {
			goto('/bands', { replaceState: true });
			return;
		}
		band = row;
		bandNameInput = row.name;

		plots = await db.query<{
			id: string;
			name: string;
			revision_date: string;
			event_name: string | null;
		}>(
			'SELECT id, name, revision_date, event_name FROM stage_plots WHERE band_id = ? ORDER BY updated_at DESC',
			[bandId]
		);

		persons = await db.query<{
			id: number;
			name: string;
			role: string | null;
			phone: string | null;
			email: string | null;
			member_type: string | null;
			status: string | null;
		}>(
			'SELECT id, name, role, phone, email, member_type, status FROM persons WHERE band_id = ? ORDER BY name',
			[bandId]
		);

		loading = false;
	}

	async function saveBandName() {
		if (!bandNameInput.trim()) return;
		await db.run("UPDATE bands SET name = ?, updated_at = datetime('now') WHERE id = ?", [
			bandNameInput.trim(),
			bandId
		]);
		if (band) band.name = bandNameInput.trim();
		editingBandName = false;
	}

	async function createPlot() {
		const plotId = crypto.randomUUID().replace(/-/g, '');
		await db.run(
			`INSERT INTO stage_plots (id, name, band_id, metadata) VALUES (?, ?, ?, ?)`,
			[plotId, 'Untitled Plot', bandId, JSON.stringify({ items: [], musicians: [] })]
		);
		goto(`/bands/${bandId}/plots/${plotId}`);
	}

	async function deletePlot(plotId: string) {
		await db.run('DELETE FROM stage_plots WHERE id = ?', [plotId]);
		plots = plots.filter((p) => p.id !== plotId);
	}

	async function addPerson() {
		if (!newPerson.name.trim()) return;
		const result = await db.run(
			'INSERT INTO persons (band_id, name, role, phone, email, member_type, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
			[
				bandId,
				newPerson.name.trim(),
				newPerson.role.trim() || null,
				newPerson.phone.trim() || null,
				newPerson.email.trim() || null,
				newPerson.member_type,
				newPerson.status
			]
		);
		persons = [
			...persons,
			{
				id: result.lastInsertRowid,
				name: newPerson.name.trim(),
				role: newPerson.role.trim() || null,
				phone: newPerson.phone.trim() || null,
				email: newPerson.email.trim() || null,
				member_type: newPerson.member_type,
				status: newPerson.status
			}
		];
		newPerson = {
			name: '',
			role: '',
			phone: '',
			email: '',
			member_type: 'performer',
			status: 'permanent'
		};
		showAddPerson = false;
	}

	async function deletePerson(personId: number) {
		await db.run('DELETE FROM persons WHERE id = ?', [personId]);
		persons = persons.filter((p) => p.id !== personId);
	}

	async function updatePerson(personId: number, field: string, value: string) {
		await db.run(`UPDATE persons SET ${field} = ? WHERE id = ?`, [value || null, personId]);
		const p = persons.find((p) => p.id === personId);
		if (p) (p as any)[field] = value || null;
	}

	onMount(() => {
		load();
	});
</script>

{#if loading}
	<div class="flex flex-1 items-center justify-center">
		<p class="text-text-secondary">Loading...</p>
	</div>
{:else if band}
	<div class="flex flex-col gap-8">
		<!-- Band Name -->
		<div class="flex items-center gap-3">
			<a
				href="/bands"
				class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border-primary text-text-secondary transition hover:bg-surface-hover hover:text-text-primary"
				aria-label="Back to bands"
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
					<path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
				</svg>
			</a>
			{#if editingBandName}
				<form
					onsubmit={(e) => {
						e.preventDefault();
						saveBandName();
					}}
					class="flex flex-1 items-center gap-2"
				>
					<input
						bind:value={bandNameInput}
						class="w-full border-b-2 border-dashed border-border-secondary bg-transparent px-2 py-1 font-serif text-3xl font-bold text-text-primary focus:border-stone-500 focus:outline-none"
						autofocus
					/>
					<button
						type="submit"
						class="rounded-lg bg-stone-900 px-3 py-1.5 text-sm text-white hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
					>
						Save
					</button>
					<button
						type="button"
						onclick={() => {
							editingBandName = false;
							bandNameInput = band?.name || '';
						}}
						class="rounded-lg px-3 py-1.5 text-sm text-text-secondary hover:bg-surface-hover"
					>
						Cancel
					</button>
				</form>
			{:else}
				<button
					onclick={() => (editingBandName = true)}
					class="text-left font-serif text-3xl font-bold text-text-primary transition hover:text-stone-600"
				>
					{band.name}
				</button>
			{/if}
		</div>

		<!-- Plots Section -->
		<div>
			<div class="mb-4 flex items-center justify-between">
				<h2 class="font-serif text-xl font-semibold text-text-primary">Stage Plots</h2>
				<button
					onclick={createPlot}
					class="flex items-center gap-2 rounded-lg bg-stone-900 px-3 py-2 text-sm text-white transition hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-4 w-4"
						viewBox="0 0 20 20"
						fill="currentColor"
					>
						<path
							fill-rule="evenodd"
							d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
							clip-rule="evenodd"
						/>
					</svg>
					New Plot
				</button>
			</div>

			{#if plots.length === 0}
				<div
					class="rounded-xl border border-dashed border-border-primary bg-surface p-8 text-center"
				>
					<p class="text-text-secondary">No stage plots yet</p>
					<button
						onclick={createPlot}
						class="mt-3 text-sm text-stone-600 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
					>
						Create your first plot
					</button>
				</div>
			{:else}
				<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
					{#each plots as plot (plot.id)}
						<div
							class="group relative rounded-xl border border-border-primary bg-surface p-4 shadow-sm transition hover:border-stone-400"
						>
							<a href="/bands/{bandId}/plots/{plot.id}" class="block">
								<h3 class="font-medium text-text-primary group-hover:text-stone-600">
									{plot.name}
								</h3>
								<div class="mt-1 text-xs text-text-secondary">
									{#if plot.event_name}
										<span>{plot.event_name}</span>
										<span class="mx-1">&middot;</span>
									{/if}
									<span
										>Modified {new Date(
											plot.revision_date
										).toLocaleDateString()}</span
									>
								</div>
							</a>
							<button
								onclick={() => deletePlot(plot.id)}
								class="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-text-tertiary opacity-0 transition hover:bg-red-100 hover:text-red-600 group-hover:opacity-100 dark:hover:bg-red-900/30"
								title="Delete plot"
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
					{/each}
				</div>
			{/if}
		</div>

		<!-- People Section -->
		<div>
			<div class="mb-4 flex items-center justify-between">
				<h2 class="font-serif text-xl font-semibold text-text-primary">People</h2>
				<button
					onclick={() => (showAddPerson = !showAddPerson)}
					class="flex items-center gap-2 rounded-lg border border-border-primary px-3 py-2 text-sm text-text-primary transition hover:bg-surface-hover"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-4 w-4"
						viewBox="0 0 20 20"
						fill="currentColor"
					>
						<path
							fill-rule="evenodd"
							d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
							clip-rule="evenodd"
						/>
					</svg>
					Add Person
				</button>
			</div>

			{#if showAddPerson}
				<form
					onsubmit={(e) => {
						e.preventDefault();
						addPerson();
					}}
					class="mb-4 rounded-xl border border-border-primary bg-surface p-4 shadow-sm"
				>
					<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
						<input
							bind:value={newPerson.name}
							placeholder="Name"
							class="rounded-lg border border-border-primary bg-surface px-3 py-2 text-sm text-text-primary focus:border-stone-500 focus:ring-2 focus:ring-stone-500"
							required
						/>
						<input
							bind:value={newPerson.role}
							placeholder="Role (e.g. Guitar, FOH)"
							class="rounded-lg border border-border-primary bg-surface px-3 py-2 text-sm text-text-primary focus:border-stone-500 focus:ring-2 focus:ring-stone-500"
						/>
						<select
							bind:value={newPerson.member_type}
							class="rounded-lg border border-border-primary bg-surface px-3 py-2 text-sm text-text-primary focus:border-stone-500 focus:ring-2 focus:ring-stone-500"
						>
							<option value="performer">Performer</option>
							<option value="crew">Crew</option>
							<option value="management">Management</option>
							<option value="other">Other</option>
						</select>
						<select
							bind:value={newPerson.status}
							class="rounded-lg border border-border-primary bg-surface px-3 py-2 text-sm text-text-primary focus:border-stone-500 focus:ring-2 focus:ring-stone-500"
						>
							<option value="permanent">Permanent</option>
							<option value="occasional">Occasional</option>
							<option value="temporary">Temporary</option>
							<option value="inactive">Inactive</option>
						</select>
						<input
							bind:value={newPerson.phone}
							placeholder="Phone"
							type="tel"
							class="rounded-lg border border-border-primary bg-surface px-3 py-2 text-sm text-text-primary focus:border-stone-500 focus:ring-2 focus:ring-stone-500"
						/>
						<input
							bind:value={newPerson.email}
							placeholder="Email"
							type="email"
							class="rounded-lg border border-border-primary bg-surface px-3 py-2 text-sm text-text-primary focus:border-stone-500 focus:ring-2 focus:ring-stone-500"
						/>
					</div>
					<div class="mt-3 flex gap-2">
						<button
							type="submit"
							class="rounded-lg bg-stone-900 px-4 py-2 text-sm text-white hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
						>
							Add
						</button>
						<button
							type="button"
							onclick={() => (showAddPerson = false)}
							class="rounded-lg px-4 py-2 text-sm text-text-secondary hover:bg-surface-hover"
						>
							Cancel
						</button>
					</div>
				</form>
			{/if}

			<!-- Filter buttons -->
			{#if persons.length > 0}
				<div class="mb-3 flex gap-1">
					{#each [{ key: 'all', label: 'All' }, { key: 'performer', label: 'Performers' }, { key: 'crew', label: 'Crew' }, { key: 'management', label: 'Management' }] as filter}
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

			{#if persons.length === 0 && !showAddPerson}
				<div
					class="rounded-xl border border-dashed border-border-primary bg-surface p-8 text-center"
				>
					<p class="text-text-secondary">No people added yet</p>
					<button
						onclick={() => (showAddPerson = true)}
						class="mt-3 text-sm text-stone-600 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
					>
						Add your first band member
					</button>
				</div>
			{:else}
				<div class="space-y-2">
					{#each filteredPersons as person (person.id)}
						<div
							class="group flex items-center justify-between rounded-xl border border-border-primary bg-surface p-3 shadow-sm"
						>
							{#if editingPersonId === person.id}
								<div class="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-6">
									<input
										value={person.name}
										onchange={(e) =>
											updatePerson(
												person.id,
												'name',
												(e.target as HTMLInputElement).value
											)}
										class="rounded border border-border-primary bg-surface px-2 py-1 text-sm"
										placeholder="Name"
									/>
									<input
										value={person.role || ''}
										onchange={(e) =>
											updatePerson(
												person.id,
												'role',
												(e.target as HTMLInputElement).value
											)}
										class="rounded border border-border-primary bg-surface px-2 py-1 text-sm"
										placeholder="Role"
									/>
									<select
										value={person.member_type || 'performer'}
										onchange={(e) =>
											updatePerson(
												person.id,
												'member_type',
												(e.target as HTMLSelectElement).value
											)}
										class="rounded border border-border-primary bg-surface px-2 py-1 text-sm"
									>
										<option value="performer">Performer</option>
										<option value="crew">Crew</option>
										<option value="management">Management</option>
										<option value="other">Other</option>
									</select>
									<select
										value={person.status || 'permanent'}
										onchange={(e) =>
											updatePerson(
												person.id,
												'status',
												(e.target as HTMLSelectElement).value
											)}
										class="rounded border border-border-primary bg-surface px-2 py-1 text-sm"
									>
										<option value="permanent">Permanent</option>
										<option value="occasional">Occasional</option>
										<option value="temporary">Temporary</option>
										<option value="inactive">Inactive</option>
									</select>
									<input
										value={person.phone || ''}
										onchange={(e) =>
											updatePerson(
												person.id,
												'phone',
												(e.target as HTMLInputElement).value
											)}
										class="rounded border border-border-primary bg-surface px-2 py-1 text-sm"
										placeholder="Phone"
									/>
									<input
										value={person.email || ''}
										onchange={(e) =>
											updatePerson(
												person.id,
												'email',
												(e.target as HTMLInputElement).value
											)}
										class="rounded border border-border-primary bg-surface px-2 py-1 text-sm"
										placeholder="Email"
									/>
								</div>
								<button
									onclick={() => (editingPersonId = null)}
									class="ml-2 text-sm text-stone-600 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
								>
									Done
								</button>
							{:else}
								<div class="flex flex-1 items-center gap-4">
									<div class="flex items-center gap-2">
										<span class="font-medium text-text-primary"
											>{person.name}</span
										>
										{#if person.role}
											<span class="text-sm text-text-secondary"
												>{person.role}</span
											>
										{/if}
										{#if person.member_type && person.member_type !== 'performer'}
											<span
												class="rounded-full bg-muted px-2 py-0.5 text-xs text-text-secondary"
												>{person.member_type}</span
											>
										{/if}
										{#if person.status && person.status !== 'permanent'}
											<span
												class="rounded-full bg-muted px-2 py-0.5 text-xs text-text-secondary"
												>{person.status}</span
											>
										{/if}
									</div>
									<div
										class="hidden text-sm text-text-tertiary sm:flex sm:gap-4"
									>
										{#if person.phone}
											<span>{person.phone}</span>
										{/if}
										{#if person.email}
											<span>{person.email}</span>
										{/if}
									</div>
								</div>
								<div
									class="flex items-center gap-1 opacity-0 transition group-hover:opacity-100"
								>
									<button
										onclick={() => (editingPersonId = person.id)}
										class="rounded p-1 text-text-tertiary hover:bg-surface-hover hover:text-text-primary"
										title="Edit person"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											class="h-4 w-4"
											viewBox="0 0 20 20"
											fill="currentColor"
										>
											<path
												d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"
											/>
										</svg>
									</button>
									<button
										onclick={() => deletePerson(person.id)}
										class="rounded p-1 text-text-tertiary hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30"
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
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
{/if}
