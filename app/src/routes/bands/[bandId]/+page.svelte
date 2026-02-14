<script lang="ts">
	// SPDX-License-Identifier: AGPL-3.0-only
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { db } from '$lib/db';
	import { Dialog } from 'bits-ui';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import DetailPageLayout from '$lib/components/DetailPageLayout.svelte';
	import PeoplePanel from './components/PeoplePanel.svelte';
	import SongsPanel from './components/SongsPanel.svelte';
	import GigsSection from './components/GigsSection.svelte';

	let bandId = $derived($page.params.bandId as string);

	let band = $state<{ id: string; name: string } | null>(null);
	let plots = $state<
		{ id: string; name: string; revision_date: string; event_name: string | null }[]
	>([]);
	let persons = $state<
		{
			id: number;
			name: string;
			role: string | null;
			pronouns: string | null;
			phone: string | null;
			email: string | null;
			member_type: string | null;
			status: string | null;
		}[]
	>([]);
	let songs = $state<
		{
			id: number;
			title: string;
			starting_key: string | null;
			starting_tempo: number | null;
			instruments: string | null;
			notes: string | null;
			starred: number;
		}[]
	>([]);
	let gigs = $state<
		{
			id: number;
			name: string;
			venue: string | null;
			date: string | null;
			time: string | null;
			set_time: string | null;
			changeover_minutes: number | null;
			plot_id: string | null;
			notes: string | null;
		}[]
	>([]);
	let loading = $state(true);
	let editingBandName = $state(false);
	let bandNameInput = $state('');
	let showNewPlotDialog = $state(false);
	let deletePlotTarget = $state<{ id: string; name: string } | null>(null);

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
			pronouns: string | null;
			phone: string | null;
			email: string | null;
			member_type: string | null;
			status: string | null;
		}>(
			'SELECT id, name, role, pronouns, phone, email, member_type, status FROM persons WHERE band_id = ? ORDER BY name',
			[bandId]
		);

		songs = await db.query<{
			id: number;
			title: string;
			starting_key: string | null;
			starting_tempo: number | null;
			instruments: string | null;
			notes: string | null;
			starred: number;
		}>(
			'SELECT id, title, starting_key, starting_tempo, instruments, notes, COALESCE(starred, 0) as starred FROM songs WHERE band_id = ? ORDER BY title',
			[bandId]
		);

		gigs = await db.query<{
			id: number;
			name: string;
			venue: string | null;
			date: string | null;
			time: string | null;
			set_time: string | null;
			changeover_minutes: number | null;
			plot_id: string | null;
			notes: string | null;
		}>(
			'SELECT id, name, venue, date, time, set_time, changeover_minutes, plot_id, notes FROM gigs WHERE band_id = ? ORDER BY date DESC',
			[bandId]
		);

		loading = false;

		// Auto-enter edit mode for newly created bands
		if ($page.url.searchParams.has('new')) {
			editingBandName = true;
			// Clean up the URL
			goto(`/bands/${bandId}`, { replaceState: true });
		}
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

	async function createPlot(_templateName?: string) {
		showNewPlotDialog = false;
		const plotId = crypto.randomUUID().replace(/-/g, '');
		await db.run(`INSERT INTO stage_plots (id, name, band_id, metadata) VALUES (?, ?, ?, ?)`, [
			plotId,
			'Untitled Plot',
			bandId,
			JSON.stringify({ items: [], musicians: [] })
		]);
		goto(`/bands/${bandId}/plots/${plotId}?new=1`);
	}

	async function confirmDeletePlot() {
		if (!deletePlotTarget) return;
		const plotId = deletePlotTarget.id;
		deletePlotTarget = null;
		await db.run('DELETE FROM stage_plots WHERE id = ?', [plotId]);
		plots = plots.filter((p) => p.id !== plotId);
	}

	onMount(() => {
		load();
	});
</script>

<DetailPageLayout
	backHref="/bands"
	backLabel="Back to bands"
	name={band?.name || ''}
	bind:editing={editingBandName}
	bind:nameInput={bandNameInput}
	{loading}
	onsave={saveBandName}
	oncancel={() => {
		editingBandName = false;
		bandNameInput = band?.name || '';
	}}
	onedit={() => (editingBandName = true)}
>
	{#if band}
		<!-- Plots Section -->
		<div>
			<div class="mb-2.5">
				<h2 class="font-serif text-xl font-semibold text-text-primary">Stage Plots</h2>
			</div>

			{#if plots.length === 0}
				<button
					onclick={() => (showNewPlotDialog = true)}
					class="group flex w-full items-center justify-center gap-3 rounded-xl border border-dashed border-border-primary bg-surface px-6 py-8 text-text-secondary transition hover:border-stone-400 hover:bg-surface-hover hover:text-text-primary"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-5 w-5"
						viewBox="0 0 20 20"
						fill="currentColor"
					>
						<path
							fill-rule="evenodd"
							d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
							clip-rule="evenodd"
						/>
					</svg>
					<span class="text-sm font-medium">Create your first stage plot</span>
				</button>
			{:else}
				<div class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
					{#each plots as plot (plot.id)}
						<div
							class="group relative rounded-xl border border-border-primary bg-surface p-2.5 shadow-sm transition hover:border-stone-400"
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
									<span>Modified {plot.revision_date}</span>
								</div>
							</a>
							<button
								onclick={() => (deletePlotTarget = { id: plot.id, name: plot.name })}
								class="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full text-text-tertiary opacity-0 transition group-hover:opacity-100 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30"
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
					<button
						onclick={() => (showNewPlotDialog = true)}
						class="group flex min-h-[76px] flex-col items-start justify-center rounded-xl border border-dashed border-border-primary bg-surface px-3 py-2.5 text-left text-sm text-text-tertiary transition hover:border-stone-400 hover:text-text-secondary"
					>
						<span class="flex items-center gap-2 text-text-secondary">
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
						</span>
						<span class="mt-1 text-xs text-text-tertiary">Create a new stage plot</span>
					</button>
				</div>
			{/if}
		</div>

		<hr class="border-border-primary" />

		<!-- Two-Column Grid: People + Songs -->
		<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
			<PeoplePanel {bandId} bind:persons />
			<SongsPanel {bandId} bind:songs />
		</div>

		<hr class="border-border-primary" />

		<!-- Gigs Section -->
		<GigsSection
			{bandId}
			bind:gigs
			plots={plots.map((p) => ({ id: p.id, name: p.name }))}
		/>

		<Dialog.Root bind:open={showNewPlotDialog}>
			<Dialog.Portal>
				<Dialog.Overlay class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
				<Dialog.Content
					class="fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border-primary bg-surface p-6 shadow-xl"
				>
					<Dialog.Title class="font-serif text-xl font-semibold text-text-primary">
						New Stage Plot
					</Dialog.Title>
					<Dialog.Description class="mt-1 text-sm text-text-secondary">
						Choose a starting point for your new stage plot.
					</Dialog.Description>

					<div class="mt-5 grid gap-2">
						<button
							onclick={() => createPlot()}
							class="flex items-center gap-3 rounded-xl border border-border-primary bg-surface px-4 py-3 text-left transition hover:border-stone-400 hover:bg-surface-hover"
						>
							<div
								class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="h-5 w-5"
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<path
										fill-rule="evenodd"
										d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
										clip-rule="evenodd"
									/>
								</svg>
							</div>
							<div>
								<div class="font-medium text-text-primary">Blank Plot</div>
								<div class="text-xs text-text-secondary">Start from scratch</div>
							</div>
						</button>

						<!-- Template options will go here -->
					</div>

					<Dialog.Close
						class="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full text-text-secondary transition hover:bg-surface-hover hover:text-text-primary"
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
					</Dialog.Close>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>

		<ConfirmDialog
			bind:open={
				() => deletePlotTarget !== null,
				(v) => {
					if (!v) deletePlotTarget = null;
				}
			}
			title="Delete Plot"
			description={deletePlotTarget
				? `Delete "${deletePlotTarget.name}"? This cannot be undone.`
				: ''}
			confirmLabel="Delete"
			variant="destructive"
			onconfirm={confirmDeletePlot}
		/>
	{/if}
</DetailPageLayout>
