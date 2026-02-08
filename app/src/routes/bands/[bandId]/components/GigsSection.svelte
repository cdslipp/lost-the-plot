<script lang="ts">
	import { db } from '$lib/db';
	import SetlistEditor from './SetlistEditor.svelte';

	interface SongRow {
		id: number;
		title: string;
		starting_key: string | null;
		starting_tempo: number | null;
	}

	interface PlotRow {
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
	}

	interface SetlistRow {
		id: number;
		gig_id: number;
		name: string;
	}

	interface SetlistSongRow {
		id: number;
		setlist_id: number;
		song_id: number;
		position: number;
		notes: string | null;
		title: string;
		starting_key: string | null;
		starting_tempo: number | null;
	}

	let {
		bandId,
		gigs = $bindable([]),
		plots,
		songs
	}: {
		bandId: string;
		gigs: GigRow[];
		plots: PlotRow[];
		songs: SongRow[];
	} = $props();

	let expandedGigId = $state<number | null>(null);
	let editingGigId = $state<number | null>(null);
	let showAddGig = $state(false);
	let newGig = $state({
		name: '',
		venue: '',
		date: new Date().toISOString().slice(0, 10),
		time: '20:00',
		set_time: '',
		changeover_minutes: '' as string,
		plot_id: '',
		notes: ''
	});

	// Setlist data per gig
	let gigSetlists = $state<Record<number, SetlistRow[]>>({});
	let gigSetlistSongs = $state<Record<number, Record<number, SetlistSongRow[]>>>({});

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
			'INSERT INTO gigs (band_id, name, venue, date, time, set_time, changeover_minutes, plot_id, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
			[
				bandId,
				newGig.name.trim(),
				newGig.venue.trim() || null,
				newGig.date || null,
				newGig.time || null,
				newGig.set_time || null,
				changeover,
				newGig.plot_id || null,
				newGig.notes.trim() || null
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
			notes: newGig.notes.trim() || null
		};
		gigs = [...gigs, newGigRow];

		// Store the auto-created setlist
		gigSetlists[gigId] = [{ id: setlistResult.lastInsertRowid, gig_id: gigId, name: 'Set 1' }];
		gigSetlistSongs[gigId] = { [setlistResult.lastInsertRowid]: [] };

		newGig = {
			name: '',
			venue: '',
			date: new Date().toISOString().slice(0, 10),
			time: '20:00',
			set_time: '',
			changeover_minutes: '',
			plot_id: '',
			notes: ''
		};
		showAddGig = false;
	}

	async function deleteGig(gigId: number) {
		await db.run('DELETE FROM gigs WHERE id = ?', [gigId]);
		gigs = gigs.filter((g) => g.id !== gigId);
		delete gigSetlists[gigId];
		delete gigSetlistSongs[gigId];
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

	async function toggleExpand(gigId: number) {
		if (expandedGigId === gigId) {
			expandedGigId = null;
			return;
		}
		expandedGigId = gigId;

		// Load setlists if not loaded yet
		if (!gigSetlists[gigId]) {
			const sls = await db.query<SetlistRow>(
				'SELECT id, gig_id, name FROM setlists WHERE gig_id = ? ORDER BY id',
				[gigId]
			);
			gigSetlists[gigId] = sls;

			const songsBySetlist: Record<number, SetlistSongRow[]> = {};
			for (const sl of sls) {
				const slSongs = await db.query<SetlistSongRow>(
					`SELECT ss.id, ss.setlist_id, ss.song_id, ss.position, ss.notes,
					        s.title, s.starting_key, s.starting_tempo
					 FROM setlist_songs ss
					 JOIN songs s ON s.id = ss.song_id
					 WHERE ss.setlist_id = ?
					 ORDER BY ss.position`,
					[sl.id]
				);
				songsBySetlist[sl.id] = slSongs;
			}
			gigSetlistSongs[gigId] = songsBySetlist;
		}
	}

	function plotName(plotId: string | null): string | null {
		if (!plotId) return null;
		return plots.find((p) => p.id === plotId)?.name || null;
	}

	function formatDate(dateStr: string | null): string {
		if (!dateStr) return '';
		// Already in YYYY-MM-DD format from the DB
		return dateStr;
	}

	function formatTime(timeStr: string | null): string {
		if (!timeStr) return '';
		try {
			const [h, m] = timeStr.split(':').map(Number);
			const suffix = h >= 12 ? 'PM' : 'AM';
			const hour12 = h % 12 || 12;
			return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
		} catch {
			return timeStr;
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
						<input
							bind:value={newGig.time}
							type="time"
							class="w-full rounded-lg border border-border-primary bg-surface px-3 py-2 text-sm text-text-primary focus:border-stone-500 focus:ring-2 focus:ring-stone-500"
						/>
					</div>
				</div>
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label class="mb-1 block text-xs font-medium text-text-secondary">Set Time</label>
						<input
							bind:value={newGig.set_time}
							type="time"
							class="w-full rounded-lg border border-border-primary bg-surface px-3 py-2 text-sm text-text-primary focus:border-stone-500 focus:ring-2 focus:ring-stone-500"
						/>
					</div>
					<div>
						<label class="mb-1 block text-xs font-medium text-text-secondary"
							>Changeover (min)</label
						>
						<input
							bind:value={newGig.changeover_minutes}
							type="number"
							min="0"
							placeholder="e.g. 30"
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
		class="group rounded-xl border border-border-primary bg-surface shadow-sm transition {isPast
			? 'opacity-60'
			: ''}"
	>
		<div class="flex items-center justify-between p-3">
			<button onclick={() => toggleExpand(gig.id)} class="flex flex-1 items-center gap-3 text-left">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-4 w-4 text-text-tertiary transition {expandedGigId === gig.id
						? 'rotate-90'
						: ''}"
					viewBox="0 0 20 20"
					fill="currentColor"
				>
					<path
						fill-rule="evenodd"
						d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
						clip-rule="evenodd"
					/>
				</svg>
				<div>
					<div class="flex items-center gap-2">
						{#if editingGigId === gig.id}
							<!-- handled below -->
						{:else}
							<span class="font-medium text-text-primary">{gig.name}</span>
						{/if}
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
			</button>
			<div class="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
				<button
					onclick={() => (editingGigId = editingGigId === gig.id ? null : gig.id)}
					class="rounded p-1 text-text-tertiary hover:bg-surface-hover hover:text-text-primary"
					title="Edit gig"
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
					onclick={() => deleteGig(gig.id)}
					class="rounded p-1 text-text-tertiary hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30"
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
		</div>

		{#if editingGigId === gig.id}
			<div class="border-t border-border-primary p-4">
				<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
					<div>
						<label class="mb-1 block text-xs font-medium text-text-secondary">Name</label>
						<input
							value={gig.name}
							onchange={(e) => updateGig(gig.id, 'name', (e.target as HTMLInputElement).value)}
							class="w-full rounded-lg border border-border-primary bg-surface px-2 py-1.5 text-sm"
						/>
					</div>
					<div>
						<label class="mb-1 block text-xs font-medium text-text-secondary">Venue</label>
						<input
							value={gig.venue || ''}
							onchange={(e) => updateGig(gig.id, 'venue', (e.target as HTMLInputElement).value)}
							class="w-full rounded-lg border border-border-primary bg-surface px-2 py-1.5 text-sm"
						/>
					</div>
					<div class="grid grid-cols-2 gap-3">
						<div>
							<label class="mb-1 block text-xs font-medium text-text-secondary">Date</label>
							<input
								value={gig.date || ''}
								type="date"
								onchange={(e) => updateGig(gig.id, 'date', (e.target as HTMLInputElement).value)}
								class="w-full rounded-lg border border-border-primary bg-surface px-2 py-1.5 text-sm"
							/>
						</div>
						<div>
							<label class="mb-1 block text-xs font-medium text-text-secondary">Load-in</label>
							<input
								value={gig.time || ''}
								type="time"
								onchange={(e) => updateGig(gig.id, 'time', (e.target as HTMLInputElement).value)}
								class="w-full rounded-lg border border-border-primary bg-surface px-2 py-1.5 text-sm"
							/>
						</div>
					</div>
					<div class="grid grid-cols-2 gap-3">
						<div>
							<label class="mb-1 block text-xs font-medium text-text-secondary">Set Time</label>
							<input
								value={gig.set_time || ''}
								type="time"
								onchange={(e) =>
									updateGig(gig.id, 'set_time', (e.target as HTMLInputElement).value)}
								class="w-full rounded-lg border border-border-primary bg-surface px-2 py-1.5 text-sm"
							/>
						</div>
						<div>
							<label class="mb-1 block text-xs font-medium text-text-secondary"
								>Changeover (min)</label
							>
							<input
								value={gig.changeover_minutes ?? ''}
								type="number"
								min="0"
								onchange={(e) =>
									updateGig(gig.id, 'changeover_minutes', (e.target as HTMLInputElement).value)}
								class="w-full rounded-lg border border-border-primary bg-surface px-2 py-1.5 text-sm"
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
								class="w-full rounded-lg border border-border-primary bg-surface px-2 py-1.5 text-sm"
							>
								<option value="">None</option>
								{#each plots as plot}
									<option value={plot.id}>{plot.name}</option>
								{/each}
							</select>
						</div>
					{/if}
				</div>
				<div class="mt-3 flex justify-end">
					<button
						onclick={() => (editingGigId = null)}
						class="rounded-lg px-3 py-1.5 text-sm text-stone-600 hover:bg-surface-hover hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
					>
						Done
					</button>
				</div>
			</div>
		{/if}

		{#if expandedGigId === gig.id}
			<div class="border-t border-border-primary p-4">
				{#if gigSetlists[gig.id] && gigSetlistSongs[gig.id]}
					<SetlistEditor
						gigId={gig.id}
						{songs}
						bind:setlists={gigSetlists[gig.id]}
						bind:setlistSongs={gigSetlistSongs[gig.id]}
					/>
				{:else}
					<p class="text-sm text-text-tertiary">Loading setlists...</p>
				{/if}
			</div>
		{/if}
	</div>
{/snippet}
