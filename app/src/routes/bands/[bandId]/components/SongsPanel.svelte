<script lang="ts">
	import { slide } from 'svelte/transition';
	import { db } from '$lib/db';

	interface SongRow {
		id: number;
		title: string;
		starting_key: string | null;
		starting_tempo: number | null;
		instruments: string | null;
		notes: string | null;
		starred: number;
	}

	let {
		bandId,
		songs = $bindable([])
	}: {
		bandId: string;
		songs: SongRow[];
	} = $props();

	let editingSongId = $state<number | null>(null);
	let expandedNoteId = $state<number | null>(null);
	let flashSongId = $state<number | null>(null);
	let showAddSong = $state(false);
	let songFilter = $state<
		'all' | 'starred' | 'ballad' | 'midtempo' | 'uptempo' | 'major' | 'minor' | 'unknown'
	>('all');
	let newSong = $state({
		title: '',
		starting_key: '',
		starting_tempo: '' as string,
		instruments: '',
		notes: ''
	});

	// Sort: starred first (alphabetically), then unstarred (alphabetically)
	const sortedSongs = $derived(
		[...songs].sort((a, b) => {
			if (a.starred !== b.starred) return b.starred - a.starred;
			return a.title.localeCompare(b.title);
		})
	);

	function tempoBucket(tempo: number | null): 'ballad' | 'midtempo' | 'uptempo' | 'unknown' {
		if (!tempo) return 'unknown';
		if (tempo <= 80) return 'ballad';
		if (tempo <= 110) return 'midtempo';
		return 'uptempo';
	}

	function keyType(key: string | null): 'major' | 'minor' | 'unknown' {
		if (!key) return 'unknown';
		const clean = key.trim().toLowerCase();
		if (clean.endsWith('m') || clean.includes('min')) return 'minor';
		if (clean) return 'major';
		return 'unknown';
	}

	const filteredSongs = $derived(
		songFilter === 'all'
			? sortedSongs
			: sortedSongs.filter((song) => {
					if (songFilter === 'starred') return !!song.starred;
					if (songFilter === 'ballad') return tempoBucket(song.starting_tempo) === 'ballad';
					if (songFilter === 'midtempo') return tempoBucket(song.starting_tempo) === 'midtempo';
					if (songFilter === 'uptempo') return tempoBucket(song.starting_tempo) === 'uptempo';
					if (songFilter === 'major') return keyType(song.starting_key) === 'major';
					if (songFilter === 'minor') return keyType(song.starting_key) === 'minor';
					return (
						tempoBucket(song.starting_tempo) === 'unknown' &&
						keyType(song.starting_key) === 'unknown'
					);
				})
	);

	async function addSong() {
		if (!newSong.title.trim()) return;
		const tempo = newSong.starting_tempo ? parseInt(newSong.starting_tempo) : null;
		const result = await db.run(
			'INSERT INTO songs (band_id, title, starting_key, starting_tempo, instruments, notes) VALUES (?, ?, ?, ?, ?, ?)',
			[
				bandId,
				newSong.title.trim(),
				newSong.starting_key.trim() || null,
				tempo,
				newSong.instruments.trim() || null,
				newSong.notes.trim() || null
			]
		);
		const newId = result.lastInsertRowid;
		songs = [
			...songs,
			{
				id: newId,
				title: newSong.title.trim(),
				starting_key: newSong.starting_key.trim() || null,
				starting_tempo: tempo,
				instruments: newSong.instruments.trim() || null,
				notes: newSong.notes.trim() || null,
				starred: 0
			}
		];

		flashSongId = newId;
		setTimeout(() => (flashSongId = null), 600);

		newSong = { title: '', starting_key: '', starting_tempo: '', instruments: '', notes: '' };
		showAddSong = false;
	}

	async function deleteSong(songId: number) {
		await db.run('DELETE FROM songs WHERE id = ?', [songId]);
		songs = songs.filter((s) => s.id !== songId);
		if (editingSongId === songId) editingSongId = null;
	}

	async function updateSong(songId: number, field: string, value: string) {
		let dbValue: string | number | null = value || null;
		if (field === 'starting_tempo') {
			dbValue = value ? parseInt(value) : null;
		}
		await db.run(`UPDATE songs SET ${field} = ?, updated_at = datetime('now') WHERE id = ?`, [
			dbValue,
			songId
		]);
		const s = songs.find((s) => s.id === songId);
		if (s) {
			if (field === 'starting_tempo') {
				s.starting_tempo = value ? parseInt(value) : null;
			} else {
				(s as any)[field] = value || null;
			}
		}
	}

	async function toggleStar(songId: number) {
		const s = songs.find((s) => s.id === songId);
		if (!s) return;
		const newVal = s.starred ? 0 : 1;
		await db.run("UPDATE songs SET starred = ?, updated_at = datetime('now') WHERE id = ?", [
			newVal,
			songId
		]);
		s.starred = newVal;
		songs = [...songs];
	}

	function handleSongRowClick(songId: number) {
		editingSongId = editingSongId === songId ? null : songId;
	}

	function handleSongRowKeydown(e: KeyboardEvent, songId: number) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			handleSongRowClick(songId);
		}
	}

	function handleEditKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			editingSongId = null;
		}
	}
</script>

<div>
	<div class="mb-2.5">
		<h2 class="font-serif text-xl font-semibold text-text-primary">Songs</h2>
	</div>

	{#if songs.length > 0}
		<div class="mb-2 flex gap-1">
			{#each [{ key: 'all', label: 'All' }, { key: 'starred', label: 'Starred' }, { key: 'ballad', label: 'Ballad' }, { key: 'midtempo', label: 'Midtempo' }, { key: 'uptempo', label: 'Uptempo' }, { key: 'major', label: 'Major' }, { key: 'minor', label: 'Minor' }, { key: 'unknown', label: 'Unknown' }] as filter}
				<button
					onclick={() => (songFilter = filter.key as typeof songFilter)}
					class="rounded-full px-3 py-1 text-xs transition {songFilter === filter.key
						? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
						: 'bg-muted text-text-secondary hover:bg-bg-tertiary'}"
				>
					{filter.label}
				</button>
			{/each}
		</div>
	{/if}

	{#if showAddSong}
		<form
			onsubmit={(e) => {
				e.preventDefault();
				addSong();
			}}
			class="mb-3 rounded-xl border border-border-primary bg-surface p-4 shadow-sm"
		>
			<div class="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
				<input
					bind:value={newSong.title}
					placeholder="Song title"
					class="rounded-lg border border-border-primary bg-surface px-3 py-2 text-sm text-text-primary focus:border-stone-500 focus:ring-2 focus:ring-stone-500"
					required
				/>
				<div class="flex gap-2">
					<input
						bind:value={newSong.starting_key}
						placeholder="Key (e.g. Am)"
						class="w-1/2 rounded-lg border border-border-primary bg-surface px-3 py-2 text-sm text-text-primary focus:border-stone-500 focus:ring-2 focus:ring-stone-500"
					/>
					<input
						bind:value={newSong.starting_tempo}
						placeholder="BPM"
						type="number"
						min="1"
						max="999"
						class="w-1/2 rounded-lg border border-border-primary bg-surface px-3 py-2 text-sm text-text-primary focus:border-stone-500 focus:ring-2 focus:ring-stone-500"
					/>
				</div>
				<input
					bind:value={newSong.instruments}
					placeholder="Special instruments/gear (comma-separated)"
					class="rounded-lg border border-border-primary bg-surface px-3 py-2 text-sm text-text-primary focus:border-stone-500 focus:ring-2 focus:ring-stone-500 sm:col-span-2"
				/>
				<textarea
					bind:value={newSong.notes}
					placeholder="Notes"
					rows="2"
					class="rounded-lg border border-border-primary bg-surface px-3 py-2 text-sm text-text-primary focus:border-stone-500 focus:ring-2 focus:ring-stone-500 sm:col-span-2"
				></textarea>
			</div>
			<div class="mt-2.5 flex gap-2">
				<button
					type="submit"
					class="rounded-lg bg-stone-900 px-4 py-2 text-sm text-white hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
				>
					Add
				</button>
				<button
					type="button"
					onclick={() => (showAddSong = false)}
					class="rounded-lg px-4 py-2 text-sm text-text-secondary hover:bg-surface-hover"
				>
					Cancel
				</button>
			</div>
		</form>
	{/if}

	{#if songs.length === 0 && !showAddSong}
		<button
			onclick={() => (showAddSong = true)}
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
			Add Song
		</button>
	{:else}
		<div class="space-y-1">
			{#each filteredSongs as song (song.id)}
				<div
					class="group rounded-xl border border-border-primary bg-surface shadow-sm transition-colors {song.starred
						? 'border-amber-200 dark:border-amber-800/40'
						: ''}"
					class:flash-green={flashSongId === song.id}
				>
					<!-- View row (always visible) -->
					<div
						class="flex items-center justify-between p-2 {editingSongId === song.id
							? ''
							: 'cursor-pointer hover:bg-surface-hover'} rounded-xl"
						role="button"
						tabindex="0"
						onclick={() => handleSongRowClick(song.id)}
						onkeydown={(e) => handleSongRowKeydown(e, song.id)}
					>
						<div class="flex flex-1 items-center gap-2">
							<button
								onclick={(e) => {
									e.stopPropagation();
									toggleStar(song.id);
								}}
								class="shrink-0 rounded p-0.5 transition hover:scale-110 {song.starred
									? 'text-amber-500'
									: 'text-text-tertiary opacity-0 group-hover:opacity-100'}"
								title={song.starred ? 'Unstar' : 'Star'}
							>
								{#if song.starred}
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="h-4 w-4"
										viewBox="0 0 20 20"
										fill="currentColor"
									>
										<path
											d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
										/>
									</svg>
								{:else}
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="h-4 w-4"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
										stroke-width="1.5"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
										/>
									</svg>
								{/if}
							</button>
							<span class="font-medium text-text-primary">{song.title}</span>
							{#if song.starting_key}
								<span
									class="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-700 dark:bg-stone-800 dark:text-stone-300"
									>{song.starting_key}</span
								>
							{/if}
							{#if song.starting_tempo}
								<span class="text-xs text-text-secondary">{song.starting_tempo} BPM</span>
							{/if}
							{#if song.instruments}
								<div class="hidden items-center gap-1 sm:flex">
									{#each song.instruments
										.split(',')
										.map((s) => s.trim())
										.filter(Boolean) as inst}
										<span class="rounded bg-muted px-1.5 py-0.5 text-xs text-text-secondary"
											>{inst}</span
										>
									{/each}
								</div>
							{/if}
						</div>
						<div class="flex items-center gap-1">
							{#if song.notes}
								<button
									onclick={(e) => {
										e.stopPropagation();
										expandedNoteId = expandedNoteId === song.id ? null : song.id;
									}}
									class="rounded p-1 text-text-tertiary hover:bg-surface-hover hover:text-text-primary"
									title="Toggle notes"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="h-4 w-4"
										viewBox="0 0 20 20"
										fill="currentColor"
									>
										<path
											fill-rule="evenodd"
											d="M18 13V5a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2zM5 7a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm1 3a1 1 0 100 2h3a1 1 0 100-2H6z"
											clip-rule="evenodd"
										/>
									</svg>
								</button>
							{/if}
							<button
								onclick={(e) => {
									e.stopPropagation();
									deleteSong(song.id);
								}}
								class="rounded p-1 text-text-tertiary opacity-0 transition group-hover:opacity-100 hover:bg-red-100 hover:text-red-600 focus:opacity-100 dark:hover:bg-red-900/30"
								title="Delete song"
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

					<!-- Notes peek (independent of edit) -->
					{#if expandedNoteId === song.id && song.notes}
						<div class="mx-2 mb-2 rounded-lg bg-muted px-3 py-2 text-sm text-text-secondary">
							{song.notes}
						</div>
					{/if}

					<!-- Edit expansion -->
					{#if editingSongId === song.id}
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div
							transition:slide={{ duration: 200 }}
							class="border-t border-border-primary px-2 pt-2 pb-2"
							onclick={(e) => e.stopPropagation()}
							onkeydown={handleEditKeydown}
						>
							<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
								<input
									value={song.title}
									onchange={(e) =>
										updateSong(song.id, 'title', (e.target as HTMLInputElement).value)}
									class="rounded-lg border border-border-primary bg-surface px-2 py-1.5 text-sm text-text-primary focus:border-stone-500 focus:ring-2 focus:ring-stone-500"
									placeholder="Title"
								/>
								<div class="flex gap-2">
									<input
										value={song.starting_key || ''}
										onchange={(e) =>
											updateSong(song.id, 'starting_key', (e.target as HTMLInputElement).value)}
										class="w-1/2 rounded-lg border border-border-primary bg-surface px-2 py-1.5 text-sm text-text-primary focus:border-stone-500 focus:ring-2 focus:ring-stone-500"
										placeholder="Key"
									/>
									<input
										value={song.starting_tempo ?? ''}
										onchange={(e) =>
											updateSong(song.id, 'starting_tempo', (e.target as HTMLInputElement).value)}
										type="number"
										class="w-1/2 rounded-lg border border-border-primary bg-surface px-2 py-1.5 text-sm text-text-primary focus:border-stone-500 focus:ring-2 focus:ring-stone-500"
										placeholder="BPM"
									/>
								</div>
								<input
									value={song.instruments || ''}
									onchange={(e) =>
										updateSong(song.id, 'instruments', (e.target as HTMLInputElement).value)}
									class="rounded-lg border border-border-primary bg-surface px-2 py-1.5 text-sm text-text-primary focus:border-stone-500 focus:ring-2 focus:ring-stone-500 sm:col-span-2"
									placeholder="Instruments/gear"
								/>
								<textarea
									value={song.notes || ''}
									onchange={(e) =>
										updateSong(song.id, 'notes', (e.target as HTMLTextAreaElement).value)}
									class="rounded-lg border border-border-primary bg-surface px-2 py-1.5 text-sm text-text-primary focus:border-stone-500 focus:ring-2 focus:ring-stone-500 sm:col-span-2"
									placeholder="Notes"
									rows="2"
								></textarea>
							</div>
							<div class="mt-2 flex justify-end">
								<button
									onclick={() => (editingSongId = null)}
									class="rounded-lg px-3 py-1.5 text-sm text-text-secondary hover:bg-surface-hover hover:text-text-primary"
								>
									Done
								</button>
							</div>
						</div>
					{/if}
				</div>
			{/each}
		</div>
		<button
			onclick={() => (showAddSong = true)}
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
			Add Song
		</button>
	{/if}
</div>
