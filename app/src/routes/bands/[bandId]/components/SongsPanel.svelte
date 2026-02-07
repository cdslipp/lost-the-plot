<script lang="ts">
	import { db } from '$lib/db';

	interface SongRow {
		id: number;
		title: string;
		starting_key: string | null;
		starting_tempo: number | null;
		instruments: string | null;
		notes: string | null;
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
	let showAddSong = $state(false);
	let newSong = $state({
		title: '',
		starting_key: '',
		starting_tempo: '' as string,
		instruments: '',
		notes: ''
	});

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
		songs = [
			...songs,
			{
				id: result.lastInsertRowid,
				title: newSong.title.trim(),
				starting_key: newSong.starting_key.trim() || null,
				starting_tempo: tempo,
				instruments: newSong.instruments.trim() || null,
				notes: newSong.notes.trim() || null
			}
		];
		newSong = { title: '', starting_key: '', starting_tempo: '', instruments: '', notes: '' };
		showAddSong = false;
	}

	async function deleteSong(songId: number) {
		await db.run('DELETE FROM songs WHERE id = ?', [songId]);
		songs = songs.filter((s) => s.id !== songId);
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
</script>

<div>
	<div class="mb-4 flex items-center justify-between">
		<h2 class="font-serif text-xl font-semibold text-text-primary">Songs</h2>
		<button
			onclick={() => (showAddSong = !showAddSong)}
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
			Add Song
		</button>
	</div>

	{#if showAddSong}
		<form
			onsubmit={(e) => {
				e.preventDefault();
				addSong();
			}}
			class="mb-4 rounded-xl border border-border-primary bg-surface p-4 shadow-sm"
		>
			<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
			<div class="mt-3 flex gap-2">
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
		<div
			class="rounded-xl border border-dashed border-border-primary bg-surface p-8 text-center"
		>
			<p class="text-text-secondary">No songs yet</p>
			<button
				onclick={() => (showAddSong = true)}
				class="mt-3 text-sm text-stone-600 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
			>
				Add your first song
			</button>
		</div>
	{:else}
		<div class="space-y-2">
			{#each songs as song (song.id)}
				<div
					class="group rounded-xl border border-border-primary bg-surface p-3 shadow-sm"
				>
					{#if editingSongId === song.id}
						<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
							<input
								value={song.title}
								onchange={(e) =>
									updateSong(
										song.id,
										'title',
										(e.target as HTMLInputElement).value
									)}
								class="rounded border border-border-primary bg-surface px-2 py-1 text-sm"
								placeholder="Title"
							/>
							<div class="flex gap-2">
								<input
									value={song.starting_key || ''}
									onchange={(e) =>
										updateSong(
											song.id,
											'starting_key',
											(e.target as HTMLInputElement).value
										)}
									class="w-1/2 rounded border border-border-primary bg-surface px-2 py-1 text-sm"
									placeholder="Key"
								/>
								<input
									value={song.starting_tempo ?? ''}
									onchange={(e) =>
										updateSong(
											song.id,
											'starting_tempo',
											(e.target as HTMLInputElement).value
										)}
									type="number"
									class="w-1/2 rounded border border-border-primary bg-surface px-2 py-1 text-sm"
									placeholder="BPM"
								/>
							</div>
							<input
								value={song.instruments || ''}
								onchange={(e) =>
									updateSong(
										song.id,
										'instruments',
										(e.target as HTMLInputElement).value
									)}
								class="rounded border border-border-primary bg-surface px-2 py-1 text-sm sm:col-span-2"
								placeholder="Instruments/gear"
							/>
							<textarea
								value={song.notes || ''}
								onchange={(e) =>
									updateSong(
										song.id,
										'notes',
										(e.target as HTMLTextAreaElement).value
									)}
								class="rounded border border-border-primary bg-surface px-2 py-1 text-sm sm:col-span-2"
								placeholder="Notes"
								rows="2"
							></textarea>
						</div>
						<div class="mt-2 flex justify-end">
							<button
								onclick={() => (editingSongId = null)}
								class="text-sm text-stone-600 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
							>
								Done
							</button>
						</div>
					{:else}
						<div class="flex items-center justify-between">
							<div class="flex flex-1 items-center gap-2">
								<span class="font-medium text-text-primary">{song.title}</span>
								{#if song.starting_key}
									<span
										class="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-700 dark:bg-stone-800 dark:text-stone-300"
										>{song.starting_key}</span
									>
								{/if}
								{#if song.starting_tempo}
									<span class="text-xs text-text-secondary"
										>{song.starting_tempo} BPM</span
									>
								{/if}
								{#if song.instruments}
									<div class="hidden items-center gap-1 sm:flex">
										{#each song.instruments.split(',').map((s) => s.trim()).filter(Boolean) as inst}
											<span
												class="rounded bg-muted px-1.5 py-0.5 text-xs text-text-secondary"
												>{inst}</span
											>
										{/each}
									</div>
								{/if}
							</div>
							<div class="flex items-center gap-1">
								{#if song.notes}
									<button
										onclick={() =>
											(expandedNoteId =
												expandedNoteId === song.id ? null : song.id)}
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
								<div class="opacity-0 transition group-hover:opacity-100">
									<button
										onclick={() => (editingSongId = song.id)}
										class="rounded p-1 text-text-tertiary hover:bg-surface-hover hover:text-text-primary"
										title="Edit song"
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
										onclick={() => deleteSong(song.id)}
										class="rounded p-1 text-text-tertiary hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30"
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
						</div>
						{#if expandedNoteId === song.id && song.notes}
							<div
								class="mt-2 rounded-lg bg-muted px-3 py-2 text-sm text-text-secondary"
							>
								{song.notes}
							</div>
						{/if}
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>
