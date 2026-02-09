<script lang="ts">
	// SPDX-License-Identifier: AGPL-3.0-only
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { db } from '$lib/db';
	import { Dialog } from 'bits-ui';
	import { BAND_TEMPLATES, applyTemplate, type BandTemplate } from '$lib/data/bandTemplates';
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

	let showNewPlotDialog = $state(false);

	async function createPlot(template?: BandTemplate) {
		const plotId = crypto.randomUUID().replace(/-/g, '');
		const canvasWidth = 1100;
		const canvasHeight = 850;

		let metadata: { items: any[]; musicians: any[] };

		if (template) {
			const result = applyTemplate(template, canvasWidth, canvasHeight, []);
			metadata = { items: result.items, musicians: [] };
		} else {
			metadata = { items: [], musicians: [] };
		}

		await db.run(`INSERT INTO stage_plots (id, name, band_id, metadata) VALUES (?, ?, ?, ?)`, [
			plotId,
			template ? template.name : 'Untitled Plot',
			bandId,
			JSON.stringify(metadata)
		]);

		showNewPlotDialog = false;
		goto(`/bands/${bandId}/plots/${plotId}`);
	}

	function openNewPlotDialog() {
		showNewPlotDialog = true;
	}

	async function deletePlot(plotId: string) {
		await db.run('DELETE FROM stage_plots WHERE id = ?', [plotId]);
		plots = plots.filter((p) => p.id !== plotId);
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
	<div class="flex flex-col gap-6">
		<!-- Band Name -->
		<div class="flex items-center gap-3">
			<a
				href="/bands"
				class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border-primary text-text-secondary transition hover:bg-surface-hover hover:text-text-primary"
				aria-label="Back to bands"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-5 w-5"
					viewBox="0 0 20 20"
					fill="currentColor"
				>
					<path
						fill-rule="evenodd"
						d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
						clip-rule="evenodd"
					/>
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
					class="group/name flex items-center gap-2 text-left font-serif text-3xl font-bold text-text-primary transition hover:text-stone-600"
				>
					<span class="border-b border-dashed border-transparent group-hover/name:border-stone-400"
						>{band.name}</span
					>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-5 w-5 text-text-tertiary opacity-0 transition group-hover/name:opacity-100"
						viewBox="0 0 20 20"
						fill="currentColor"
					>
						<path
							d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"
						/>
					</svg>
				</button>
			{/if}
		</div>

		<hr class="border-border-primary" />

		<!-- Plots Section -->
		<div>
			<div class="mb-2.5">
				<h2 class="font-serif text-xl font-semibold text-text-primary">Stage Plots</h2>
			</div>

			{#if plots.length === 0}
				<div
					class="rounded-xl border border-dashed border-border-primary bg-surface p-6 text-center"
				>
					<p class="text-text-secondary">No stage plots yet</p>
					<button
						onclick={openNewPlotDialog}
						class="mt-3 text-sm text-stone-600 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
					>
						Create your first plot
					</button>
				</div>
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
								onclick={() => deletePlot(plot.id)}
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
						onclick={openNewPlotDialog}
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
			songs={songs.map((s) => ({
				id: s.id,
				title: s.title,
				starting_key: s.starting_key,
				starting_tempo: s.starting_tempo
			}))}
		/>
	</div>
{/if}

<!-- New Plot Template Dialog -->
<Dialog.Root bind:open={showNewPlotDialog}>
	<Dialog.Portal>
		<Dialog.Overlay
			class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
			onclick={() => (showNewPlotDialog = false)}
		/>
		<Dialog.Content
			class="fixed top-1/2 left-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border-primary bg-surface p-6 shadow-xl"
		>
			<Dialog.Title class="mb-1 font-serif text-xl font-semibold text-text-primary"
				>New Stage Plot</Dialog.Title
			>
			<Dialog.Description class="mb-5 text-sm text-text-secondary"
				>Start from scratch or choose a template</Dialog.Description
			>

			<div class="grid grid-cols-1 gap-3">
				<!-- Blank plot option -->
				<button
					onclick={() => createPlot()}
					class="group flex items-center gap-4 rounded-lg border border-border-primary p-4 text-left transition hover:border-stone-400 hover:bg-muted/50"
				>
					<div
						class="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted text-text-tertiary"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-6 w-6"
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
						<div class="text-xs text-text-secondary">Start with an empty stage</div>
					</div>
				</button>

				<!-- Template options -->
				{#each BAND_TEMPLATES as template (template.id)}
					<button
						onclick={() => createPlot(template)}
						class="group flex items-center gap-4 rounded-lg border border-border-primary p-4 text-left transition hover:border-stone-400 hover:bg-muted/50"
					>
						<div
							class="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300"
						>
							<span class="text-lg font-bold">{template.persons.length}</span>
						</div>
						<div>
							<div class="font-medium text-text-primary">{template.name}</div>
							<div class="text-xs text-text-secondary">{template.description}</div>
						</div>
					</button>
				{/each}
			</div>

			<button
				onclick={() => (showNewPlotDialog = false)}
				class="mt-4 w-full rounded-lg px-3 py-2 text-sm text-text-secondary transition hover:bg-surface-hover"
			>
				Cancel
			</button>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
