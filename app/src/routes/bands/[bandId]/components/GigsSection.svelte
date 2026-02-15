<script lang="ts">
	import { slide } from 'svelte/transition';
	import { db } from '$lib/db';
	import { formatTimeMs, timeStringToMs, msToTimeString } from '$lib/utils/time';
	import TimeInput from '$lib/components/TimeInput.svelte';
	import { preferences } from '$lib/state/preferences.svelte';

	interface PlotRow {
		id: string;
		name: string;
	}

	interface TourRow {
		id: string;
		name: string;
	}

	interface GigRow {
		id: number;
		name: string;
		venue: string | null;
		date: string | null;
		time: string | null;
		set_time: string | null;
		changeover_minutes: number | null;
		plot_id: string | null;
		notes: string | null;
		venue_id: number | null;
		tour_id: string | null;
	}

	let {
		bandId,
		gigs = $bindable([]),
		plots,
		tours = []
	}: {
		bandId: string;
		gigs: GigRow[];
		plots: PlotRow[];
		tours: TourRow[];
	} = $props();

	let editingGigId = $state<number | null>(null);
	let flashGigId = $state<number | null>(null);
	let showAddGig = $state(false);
	let newGig = $state({
		name: '',
		venue: '',
		date: new Date().toISOString().slice(0, 10),
		time: '20:00',
		set_time: '',
		changeover_minutes: '' as string,
		plot_id: '',
		notes: '',
		tour_id: ''
	});

	const now = new Date().toISOString().slice(0, 10);
	const sortedGigs = $derived(() => {
		const upcoming = gigs
			.filter((g) => !g.date || g.date >= now)
			.sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'));
		const past = gigs
			.filter((g) => g.date && g.date < now)
			.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
		return { upcoming, past };
	});

	async function addGig() {
		if (!newGig.name.trim()) return;
		const changeover = newGig.changeover_minutes ? parseInt(newGig.changeover_minutes) : null;
		const result = await db.run(
			'INSERT INTO gigs (band_id, name, venue, date, time, set_time, changeover_minutes, plot_id, notes, tour_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
			[
				bandId,
				newGig.name.trim(),
				newGig.venue.trim() || null,
				newGig.date || null,
				newGig.time || null,
				newGig.set_time || null,
				changeover,
				newGig.plot_id || null,
				newGig.notes.trim() || null,
				newGig.tour_id || null
			]
		);
		const gigId = result.lastInsertRowid;

		// Auto-create "Set 1"
		const setlistResult = await db.run("INSERT INTO setlists (gig_id, name) VALUES (?, 'Set 1')", [
			gigId
		]);

		const newGigRow: GigRow = {
			id: gigId,
			name: newGig.name.trim(),
			venue: newGig.venue.trim() || null,
			date: newGig.date || null,
			time: newGig.time || null,
			set_time: newGig.set_time || null,
			changeover_minutes: changeover,
			plot_id: newGig.plot_id || null,
			notes: newGig.notes.trim() || null,
			venue_id: null,
			tour_id: newGig.tour_id || null
		};
		gigs = [...gigs, newGigRow];

		flashGigId = gigId;
		setTimeout(() => (flashGigId = null), 600);

		newGig = {
			name: '',
			venue: '',
			date: new Date().toISOString().slice(0, 10),
			time: '20:00',
			set_time: '',
			changeover_minutes: '',
			plot_id: '',
			notes: '',
			tour_id: ''
		};
		showAddGig = false;
	}

	async function deleteGig(gigId: number) {
		await db.run('DELETE FROM gigs WHERE id = ?', [gigId]);
		gigs = gigs.filter((g) => g.id !== gigId);
		if (editingGigId === gigId) editingGigId = null;
	}

	async function updateGig(gigId: number, field: string, value: string) {
		let dbValue: string | number | null = value || null;
		if (field === 'changeover_minutes') {
			dbValue = value ? parseInt(value) : null;
		}
		await db.run(`UPDATE gigs SET ${field} = ?, updated_at = datetime('now') WHERE id = ?`, [
			dbValue,
			gigId
		]);
		const g = gigs.find((g) => g.id === gigId);
		if (g) {
			if (field === 'changeover_minutes') {
				g.changeover_minutes = value ? parseInt(value) : null;
			} else {
				(g as any)[field] = value || null;
			}
		}
	}

	function plotName(plotId: string | null): string | null {
		if (!plotId) return null;
		return plots.find((p) => p.id === plotId)?.name || null;
	}

	function formatDate(dateStr: string | null): string {
		if (!dateStr) return '';
		return dateStr;
	}

	function formatTime(timeStr: string | null): string {
		return formatTimeMs(timeStringToMs(timeStr), preferences.use24h);
	}

	function handleGigRowClick(gigId: number) {
		editingGigId = editingGigId === gigId ? null : gigId;
	}

	function handleGigRowKeydown(e: KeyboardEvent, gigId: number) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			handleGigRowClick(gigId);
		}
	}

	function handleEditKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			editingGigId = null;
		}
	}
</script>

<div>
	<div class="mb-2.5">
		<h2 class="font-serif text-xl font-semibold text-text-primary">Gigs</h2>
	</div>

	{#if showAddGig}
		<form
			onsubmit={(e) => {
				e.preventDefault();
				addGig();
			}}
			class="mb-3 rounded-xl border border-border-primary bg-surface p-4 shadow-sm"
		>
			<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
				<div>
					<label class="mb-1 block text-xs font-medium text-text-secondary">Gig Name</label>
					<input
						bind:value={newGig.name}
						placeholder="e.g. New Years Eve"
						class="w-full rounded-lg border border-border-primary bg-surface px-3 py-2 text-sm text-text-primary focus:border-stone-500 focus:ring-2 focus:ring-stone-500"
						required
					/>
				</div>
				<div>
					<label class="mb-1 block text-xs font-medium text-text-secondary">Venue</label>
					<input
						bind:value={newGig.venue}
						placeholder="e.g. The Horseshoe Tavern"
						class="w-full rounded-lg border border-border-primary bg-surface px-3 py-2 text-sm text-text-primary focus:border-stone-500 focus:ring-2 focus:ring-stone-500"
					/>
				</div>
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label class="mb-1 block text-xs font-medium text-text-secondary">Date</label>
						<input
							bind:value={newGig.date}
							type="date"
							class="w-full rounded-lg border border-border-primary bg-surface px-3 py-2 text-sm text-text-primary focus:border-stone-500 focus:ring-2 focus:ring-stone-500"
						/>
					</div>
					<div>
						<label class="mb-1 block text-xs font-medium text-text-secondary">Load-in</label>
						<TimeInput
							time={timeStringToMs(newGig.time)}
							onsubmit={(ms) => (newGig.time = msToTimeString(ms))}
							placeholder="Load-in"
							use24h={preferences.use24h}
							class="w-full rounded-lg border border-border-primary bg-surface px-3 py-2 text-sm text-text-primary focus:border-stone-500 focus:ring-2 focus:ring-stone-500"
						/>
					</div>
				</div>
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label class="mb-1 block text-xs font-medium text-text-secondary">Set Time</label>
						<TimeInput
							time={timeStringToMs(newGig.set_time)}
							onsubmit={(ms) => (newGig.set_time = msToTimeString(ms))}
							placeholder="Set Time"
							use24h={preferences.use24h}
							class="w-full rounded-lg border border-border-primary bg-surface px-3 py-2 text-sm text-text-primary focus:border-stone-500 focus:ring-2 focus:ring-stone-500"
						/>
					</div>
					<div>
						<label class="mb-1 block text-xs font-medium text-text-secondary"
							>Changeover (min)</label
						>
						<TimeInput
							time={newGig.changeover_minutes ? parseInt(newGig.changeover_minutes) * 60000 : null}
							onsubmit={(ms) => (newGig.changeover_minutes = String(Math.round(ms / 60000)))}
							placeholder="Duration"
							isDuration={true}
							use24h={preferences.use24h}
							class="w-full rounded-lg border border-border-primary bg-surface px-3 py-2 text-sm text-text-primary focus:border-stone-500 focus:ring-2 focus:ring-stone-500"
						/>
					</div>
				</div>
				{#if plots.length > 0}
					<div>
						<label class="mb-1 block text-xs font-medium text-text-secondary">Stage Plot</label>
						<select
							bind:value={newGig.plot_id}
							class="w-full rounded-lg border border-border-primary bg-surface px-3 py-2 text-sm text-text-primary focus:border-stone-500 focus:ring-2 focus:ring-stone-500"
						>
							<option value="">None</option>
							{#each plots as plot}
								<option value={plot.id}>{plot.name}</option>
							{/each}
						</select>
					</div>
				{/if}
				{#if tours.length > 0}
					<div>
						<label class="mb-1 block text-xs font-medium text-text-secondary">Tour</label>
						<select
							bind:value={newGig.tour_id}
							class="w-full rounded-lg border border-border-primary bg-surface px-3 py-2 text-sm text-text-primary focus:border-stone-500 focus:ring-2 focus:ring-stone-500"
						>
							<option value="">None</option>
							{#each tours as tour}
								<option value={tour.id}>{tour.name}</option>
							{/each}
						</select>
					</div>
				{/if}
				<div class="sm:col-span-2">
					<label class="mb-1 block text-xs font-medium text-text-secondary">Notes</label>
					<textarea
						bind:value={newGig.notes}
						placeholder="Contact info, load-in details, etc."
						rows="2"
						class="w-full rounded-lg border border-border-primary bg-surface px-3 py-2 text-sm text-text-primary focus:border-stone-500 focus:ring-2 focus:ring-stone-500"
					></textarea>
				</div>
			</div>
			<div class="mt-3 flex gap-2">
				<button
					type="submit"
					class="rounded-lg bg-stone-900 px-4 py-2 text-sm text-white hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
				>
					Add Gig
				</button>
				<button
					type="button"
					onclick={() => (showAddGig = false)}
					class="rounded-lg px-4 py-2 text-sm text-text-secondary hover:bg-surface-hover"
				>
					Cancel
				</button>
			</div>
		</form>
	{/if}

	{#if gigs.length === 0 && !showAddGig}
		<button
			onclick={() => (showAddGig = true)}
			class="flex w-full items-center gap-2 rounded-xl border border-dashed border-border-primary bg-surface px-3 py-2.5 text-sm text-text-secondary transition hover:border-stone-400 hover:text-text-primary"
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
			Add Gig
		</button>
	{:else}
		{@const sorted = sortedGigs()}
		{#if sorted.upcoming.length > 0}
			<div class="space-y-1">
				{#each sorted.upcoming as gig (gig.id)}
					{@render gigCard(gig, false)}
				{/each}
			</div>
		{/if}

		{#if sorted.past.length > 0}
			{#if sorted.upcoming.length > 0}
				<div class="my-2.5 flex items-center gap-3">
					<div class="h-px flex-1 bg-border-primary"></div>
					<span class="text-xs text-text-tertiary">Past</span>
					<div class="h-px flex-1 bg-border-primary"></div>
				</div>
			{/if}
			<div class="space-y-1">
				{#each sorted.past as gig (gig.id)}
					{@render gigCard(gig, true)}
				{/each}
			</div>
		{/if}
		<button
			onclick={() => (showAddGig = true)}
			class="mt-1.5 flex w-full items-center gap-2 rounded-xl border border-dashed border-border-primary bg-surface px-3 py-2 text-sm text-text-secondary transition hover:border-stone-400 hover:text-text-primary"
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
			Add Gig
		</button>
	{/if}
</div>

{#snippet gigCard(gig: GigRow, isPast: boolean)}
	<div
		class="group rounded-xl border border-border-primary bg-surface shadow-sm transition-colors {isPast
			? 'opacity-60'
			: ''}"
		class:flash-green={flashGigId === gig.id}
	>
		<!-- View row (always visible, click to edit) -->
		<div
			class="flex items-center justify-between p-3 {editingGigId === gig.id
				? ''
				: 'cursor-pointer hover:bg-surface-hover'} rounded-xl"
			role="button"
			tabindex="0"
			onclick={() => handleGigRowClick(gig.id)}
			onkeydown={(e) => handleGigRowKeydown(e, gig.id)}
		>
			<div class="flex flex-1 items-center gap-3">
				<div>
					<div class="flex items-center gap-2">
						<span class="font-medium text-text-primary">{gig.name}</span>
						{#if gig.plot_id}
							{@const pName = plotName(gig.plot_id)}
							{#if pName}
								<a
									href="/bands/{bandId}/plots/{gig.plot_id}"
									class="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-400 dark:hover:bg-stone-700"
									onclick={(e) => e.stopPropagation()}
								>
									{pName}
								</a>
							{/if}
						{/if}
						<a
							href="/bands/{bandId}/setlists/{gig.id}"
							class="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:hover:bg-blue-800"
							onclick={(e) => e.stopPropagation()}
							title="Edit setlists"
						>
							Setlists
						</a>
					</div>
					<div class="mt-0.5 flex items-center gap-2 text-xs text-text-secondary">
						{#if gig.date}
							<span>{formatDate(gig.date)}</span>
						{/if}
						{#if gig.time}
							<span>Load-in {formatTime(gig.time)}</span>
						{/if}
						{#if gig.set_time}
							<span>Set {formatTime(gig.set_time)}</span>
						{/if}
						{#if gig.changeover_minutes}
							<span
								class="rounded-full bg-stone-100 px-1.5 py-0.5 text-xs text-stone-600 dark:bg-stone-800 dark:text-stone-400"
								>{gig.changeover_minutes} min changeover</span
							>
						{/if}
						{#if gig.venue}
							<span class="text-text-tertiary">{gig.venue}</span>
						{/if}
					</div>
				</div>
			</div>
			<button
				onclick={(e) => {
					e.stopPropagation();
					deleteGig(gig.id);
				}}
				class="rounded p-1 text-text-tertiary opacity-0 transition group-hover:opacity-100 hover:bg-red-100 hover:text-red-600 focus:opacity-100 dark:hover:bg-red-900/30"
				title="Delete gig"
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
		{#if editingGigId === gig.id}
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				transition:slide={{ duration: 200 }}
				class="border-t border-border-primary px-4 pt-2 pb-2"
				onclick={(e) => e.stopPropagation()}
				onkeydown={handleEditKeydown}
			>
				<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
					<div>
						<label class="mb-1 block text-xs font-medium text-text-secondary">Name</label>
						<input
							value={gig.name}
							onchange={(e) => updateGig(gig.id, 'name', (e.target as HTMLInputElement).value)}
							class="w-full rounded-lg border border-border-primary bg-surface px-2 py-1.5 text-sm text-text-primary focus:border-stone-500 focus:ring-2 focus:ring-stone-500"
						/>
					</div>
					<div>
						<label class="mb-1 block text-xs font-medium text-text-secondary">Venue</label>
						<input
							value={gig.venue || ''}
							onchange={(e) => updateGig(gig.id, 'venue', (e.target as HTMLInputElement).value)}
							class="w-full rounded-lg border border-border-primary bg-surface px-2 py-1.5 text-sm text-text-primary focus:border-stone-500 focus:ring-2 focus:ring-stone-500"
						/>
					</div>
					<div class="grid grid-cols-2 gap-3">
						<div>
							<label class="mb-1 block text-xs font-medium text-text-secondary">Date</label>
							<input
								value={gig.date || ''}
								type="date"
								onchange={(e) => updateGig(gig.id, 'date', (e.target as HTMLInputElement).value)}
								class="w-full rounded-lg border border-border-primary bg-surface px-2 py-1.5 text-sm text-text-primary focus:border-stone-500 focus:ring-2 focus:ring-stone-500"
							/>
						</div>
						<div>
							<label class="mb-1 block text-xs font-medium text-text-secondary">Load-in</label>
							<TimeInput
								time={timeStringToMs(gig.time)}
								onsubmit={(ms) => updateGig(gig.id, 'time', msToTimeString(ms))}
								placeholder="Load-in"
								use24h={preferences.use24h}
								class="w-full rounded-lg border border-border-primary bg-surface px-2 py-1.5 text-sm text-text-primary focus:border-stone-500 focus:ring-2 focus:ring-stone-500"
							/>
						</div>
					</div>
					<div class="grid grid-cols-2 gap-3">
						<div>
							<label class="mb-1 block text-xs font-medium text-text-secondary">Set Time</label>
							<TimeInput
								time={timeStringToMs(gig.set_time)}
								onsubmit={(ms) => updateGig(gig.id, 'set_time', msToTimeString(ms))}
								placeholder="Set Time"
								use24h={preferences.use24h}
								class="w-full rounded-lg border border-border-primary bg-surface px-2 py-1.5 text-sm text-text-primary focus:border-stone-500 focus:ring-2 focus:ring-stone-500"
							/>
						</div>
						<div>
							<label class="mb-1 block text-xs font-medium text-text-secondary"
								>Changeover (min)</label
							>
							<TimeInput
								time={gig.changeover_minutes ? gig.changeover_minutes * 60000 : null}
								onsubmit={(ms) =>
									updateGig(gig.id, 'changeover_minutes', String(Math.round(ms / 60000)))}
								placeholder="Duration"
								isDuration={true}
								use24h={preferences.use24h}
								class="w-full rounded-lg border border-border-primary bg-surface px-2 py-1.5 text-sm text-text-primary focus:border-stone-500 focus:ring-2 focus:ring-stone-500"
							/>
						</div>
					</div>
					{#if plots.length > 0}
						<div>
							<label class="mb-1 block text-xs font-medium text-text-secondary">Stage Plot</label>
							<select
								value={gig.plot_id || ''}
								onchange={(e) =>
									updateGig(gig.id, 'plot_id', (e.target as HTMLSelectElement).value)}
								class="w-full rounded-lg border border-border-primary bg-surface px-2 py-1.5 text-sm text-text-primary focus:border-stone-500 focus:ring-2 focus:ring-stone-500"
							>
								<option value="">None</option>
								{#each plots as plot}
									<option value={plot.id}>{plot.name}</option>
								{/each}
							</select>
						</div>
					{/if}
					{#if tours.length > 0}
						<div>
							<label class="mb-1 block text-xs font-medium text-text-secondary">Tour</label>
							<select
								value={gig.tour_id || ''}
								onchange={(e) =>
									updateGig(gig.id, 'tour_id', (e.target as HTMLSelectElement).value)}
								class="w-full rounded-lg border border-border-primary bg-surface px-2 py-1.5 text-sm text-text-primary focus:border-stone-500 focus:ring-2 focus:ring-stone-500"
							>
								<option value="">None</option>
								{#each tours as tour}
									<option value={tour.id}>{tour.name}</option>
								{/each}
							</select>
						</div>
					{/if}
				</div>
				<div class="mt-3 flex justify-end">
					<button
						onclick={() => (editingGigId = null)}
						class="rounded-lg px-3 py-1.5 text-sm text-text-secondary hover:bg-surface-hover hover:text-text-primary"
					>
						Done
					</button>
				</div>
			</div>
		{/if}
	</div>
{/snippet}
