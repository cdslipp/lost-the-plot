<script lang="ts">
	import { db } from '$lib/db';
	import { encodeSetlist, buildSetlistShareUrl } from '@stageplotter/shared';

	interface SongRow {
		id: number;
		title: string;
		starting_key: string | null;
		starting_tempo: number | null;
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
		gigId,
		songs,
		bandName,
		gigName,
		setlists = $bindable([]),
		setlistSongs = $bindable({})
	}: {
		gigId: number;
		songs: SongRow[];
		bandName: string;
		gigName: string;
		setlists: SetlistRow[];
		setlistSongs: Record<number, SetlistSongRow[]>;
	} = $props();

	let addingSongToSetlist = $state<number | null>(null);
	let selectedSongId = $state<string>('');
	let editingNotesId = $state<number | null>(null);
	let editingSetNameId = $state<number | null>(null);
	let editingSetNameValue = $state('');
	let copyFeedback = $state(false);

	async function addSetlist() {
		const name = `Set ${setlists.length + 1}`;
		const result = await db.run('INSERT INTO setlists (gig_id, name) VALUES (?, ?)', [gigId, name]);
		const newSetlist: SetlistRow = {
			id: result.lastInsertRowid,
			gig_id: gigId,
			name
		};
		setlists = [...setlists, newSetlist];
		setlistSongs[newSetlist.id] = [];
	}

	async function renameSetlist(setlistId: number, newName: string) {
		const name = newName.trim() || `Set ${setlists.findIndex((s) => s.id === setlistId) + 1}`;
		await db.run('UPDATE setlists SET name = ? WHERE id = ?', [name, setlistId]);
		const sl = setlists.find((s) => s.id === setlistId);
		if (sl) sl.name = name;
		setlists = [...setlists];
		editingSetNameId = null;
	}

	async function deleteSetlist(setlistId: number) {
		await db.run('DELETE FROM setlists WHERE id = ?', [setlistId]);
		setlists = setlists.filter((s) => s.id !== setlistId);
		const updated = { ...setlistSongs };
		delete updated[setlistId];
		setlistSongs = updated;
	}

	async function addSongToSetlist(setlistId: number) {
		if (!selectedSongId) return;
		const songId = parseInt(selectedSongId);
		const currentSongs = setlistSongs[setlistId] || [];

		// Check if already in setlist
		if (currentSongs.some((s) => s.song_id === songId)) return;

		const position = currentSongs.length;
		const result = await db.run(
			'INSERT INTO setlist_songs (setlist_id, song_id, position) VALUES (?, ?, ?)',
			[setlistId, songId, position]
		);

		const song = songs.find((s) => s.id === songId);
		if (!song) return;

		const newEntry: SetlistSongRow = {
			id: result.lastInsertRowid,
			setlist_id: setlistId,
			song_id: songId,
			position,
			notes: null,
			title: song.title,
			starting_key: song.starting_key,
			starting_tempo: song.starting_tempo
		};

		setlistSongs = {
			...setlistSongs,
			[setlistId]: [...currentSongs, newEntry]
		};
		selectedSongId = '';
		addingSongToSetlist = null;
	}

	async function removeSongFromSetlist(setlistId: number, entryId: number) {
		await db.run('DELETE FROM setlist_songs WHERE id = ?', [entryId]);
		const currentSongs = (setlistSongs[setlistId] || []).filter((s) => s.id !== entryId);
		// Re-number positions
		for (let i = 0; i < currentSongs.length; i++) {
			if (currentSongs[i].position !== i) {
				currentSongs[i].position = i;
				await db.run('UPDATE setlist_songs SET position = ? WHERE id = ?', [i, currentSongs[i].id]);
			}
		}
		setlistSongs = { ...setlistSongs, [setlistId]: currentSongs };
	}

	async function moveSong(setlistId: number, index: number, direction: -1 | 1) {
		const current = [...(setlistSongs[setlistId] || [])];
		const newIndex = index + direction;
		if (newIndex < 0 || newIndex >= current.length) return;

		// Swap
		[current[index], current[newIndex]] = [current[newIndex], current[index]];
		current[index].position = index;
		current[newIndex].position = newIndex;

		await db.run('UPDATE setlist_songs SET position = ? WHERE id = ?', [index, current[index].id]);
		await db.run('UPDATE setlist_songs SET position = ? WHERE id = ?', [
			newIndex,
			current[newIndex].id
		]);

		setlistSongs = { ...setlistSongs, [setlistId]: current };
	}

	async function updateSongNotes(entryId: number, setlistId: number, notes: string) {
		await db.run('UPDATE setlist_songs SET notes = ? WHERE id = ?', [notes || null, entryId]);
		const current = setlistSongs[setlistId] || [];
		const entry = current.find((s) => s.id === entryId);
		if (entry) entry.notes = notes || null;
		setlistSongs = { ...setlistSongs, [setlistId]: [...current] };
		editingNotesId = null;
	}

	function availableSongs(setlistId: number): SongRow[] {
		const current = setlistSongs[setlistId] || [];
		const usedIds = new Set(current.map((s) => s.song_id));
		return songs.filter((s) => !usedIds.has(s.id));
	}

	async function shareSetlists() {
		try {
			// Gather all setlists and their songs
			const setsData = setlists.map((setlist) => {
				const songs = (setlistSongs[setlist.id] || []).map((entry) => ({
					title: entry.title,
					key: entry.starting_key || ''
				}));
				return {
					name: setlist.name,
					songs
				};
			});

			// Encode with default display preferences
			const payload = await encodeSetlist({
				sets: setsData,
				font: 0, // sans
				pageSize: 0, // letter
				showKeys: 1 // yes
			});

			const url = buildSetlistShareUrl(window.location.origin, bandName, gigName, payload);
			await navigator.clipboard.writeText(url);
			copyFeedback = true;
			setTimeout(() => (copyFeedback = false), 2000);
		} catch (err) {
			console.error('Failed to share setlists:', err);
		}
	}
</script>

<div class="space-y-3">
	{#each setlists as setlist (setlist.id)}
		{@const items = setlistSongs[setlist.id] || []}
		<div class="rounded-lg border border-border-primary bg-surface p-3">
			<div class="mb-2 flex items-center justify-between">
				{#if editingSetNameId === setlist.id}
					<form
						onsubmit={(e) => {
							e.preventDefault();
							renameSetlist(setlist.id, editingSetNameValue);
						}}
						class="flex items-center gap-1"
					>
						<input
							bind:value={editingSetNameValue}
							class="w-32 rounded border border-border-primary bg-surface px-2 py-0.5 text-sm font-semibold text-text-primary focus:border-stone-500 focus:outline-none"
							onkeydown={(e) => {
								if (e.key === 'Escape') editingSetNameId = null;
							}}
							autofocus
						/>
						<button
							type="submit"
							class="rounded px-1.5 py-0.5 text-xs text-stone-600 hover:bg-surface-hover"
						>
							Save
						</button>
					</form>
				{:else}
					<button
						onclick={() => {
							editingSetNameId = setlist.id;
							editingSetNameValue = setlist.name;
						}}
						class="group/setname flex items-center gap-1 text-sm font-semibold text-text-primary hover:text-stone-600"
						title="Click to rename"
					>
						<span
							class="border-b border-dashed border-transparent group-hover/setname:border-stone-400"
							>{setlist.name}</span
						>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-3.5 w-3.5 text-text-tertiary opacity-0 transition group-hover/setname:opacity-100"
							viewBox="0 0 20 20"
							fill="currentColor"
						>
							<path
								d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"
							/>
						</svg>
					</button>
				{/if}
				<div class="flex items-center gap-1">
					{#if availableSongs(setlist.id).length > 0}
						<button
							onclick={() => {
								addingSongToSetlist = addingSongToSetlist === setlist.id ? null : setlist.id;
								selectedSongId = '';
							}}
							class="rounded px-2 py-1 text-xs text-stone-600 hover:bg-surface-hover dark:text-stone-400"
						>
							+ Add Song
						</button>
					{/if}
					{#if setlists.length > 1}
						<button
							onclick={() => deleteSetlist(setlist.id)}
							class="rounded p-1 text-text-tertiary hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30"
							title="Delete setlist"
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
					{/if}
				</div>
			</div>

			{#if addingSongToSetlist === setlist.id}
				<div class="mb-2 flex gap-2">
					<select
						bind:value={selectedSongId}
						class="flex-1 rounded border border-border-primary bg-surface px-2 py-1 text-sm text-text-primary"
					>
						<option value="">Select a song...</option>
						{#each availableSongs(setlist.id) as song}
							<option value={String(song.id)}>{song.title}</option>
						{/each}
					</select>
					<button
						onclick={() => addSongToSetlist(setlist.id)}
						disabled={!selectedSongId}
						class="rounded bg-stone-900 px-3 py-1 text-xs text-white hover:bg-stone-800 disabled:opacity-40 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
					>
						Add
					</button>
				</div>
			{/if}

			{#if items.length === 0}
				<p class="py-2 text-center text-xs text-text-tertiary">No songs in this set</p>
			{:else}
				<div class="space-y-1">
					{#each items as entry, i (entry.id)}
						<div class="group flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted">
							<span class="w-5 text-right text-xs font-medium text-text-tertiary">{i + 1}.</span>
							<span class="flex-1 text-sm text-text-primary">{entry.title}</span>
							{#if entry.starting_key}
								<span
									class="rounded-full bg-stone-100 px-1.5 py-0.5 text-xs text-stone-700 dark:bg-stone-800 dark:text-stone-300"
									>{entry.starting_key}</span
								>
							{/if}
							{#if entry.starting_tempo}
								<span class="text-xs text-text-tertiary">{entry.starting_tempo}</span>
							{/if}
							{#if editingNotesId === entry.id}
								<input
									value={entry.notes || ''}
									onchange={(e) =>
										updateSongNotes(entry.id, setlist.id, (e.target as HTMLInputElement).value)}
									onkeydown={(e) => {
										if (e.key === 'Escape') editingNotesId = null;
									}}
									class="w-32 rounded border border-border-primary bg-surface px-1 py-0.5 text-xs"
									placeholder="Performance notes..."
									autofocus
								/>
							{:else if entry.notes}
								<button
									onclick={() => (editingNotesId = entry.id)}
									class="max-w-24 truncate text-xs text-text-tertiary italic hover:text-text-secondary"
									title={entry.notes}
								>
									{entry.notes}
								</button>
							{:else}
								<button
									onclick={() => (editingNotesId = entry.id)}
									class="text-xs text-text-tertiary opacity-0 group-hover:opacity-100 hover:text-text-secondary"
								>
									note
								</button>
							{/if}
							<div class="flex items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
								<button
									onclick={() => moveSong(setlist.id, i, -1)}
									disabled={i === 0}
									class="rounded p-0.5 text-text-tertiary hover:text-text-primary disabled:opacity-30"
									title="Move up"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="h-3.5 w-3.5"
										viewBox="0 0 20 20"
										fill="currentColor"
									>
										<path
											fill-rule="evenodd"
											d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
											clip-rule="evenodd"
										/>
									</svg>
								</button>
								<button
									onclick={() => moveSong(setlist.id, i, 1)}
									disabled={i === items.length - 1}
									class="rounded p-0.5 text-text-tertiary hover:text-text-primary disabled:opacity-30"
									title="Move down"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="h-3.5 w-3.5"
										viewBox="0 0 20 20"
										fill="currentColor"
									>
										<path
											fill-rule="evenodd"
											d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
											clip-rule="evenodd"
										/>
									</svg>
								</button>
								<button
									onclick={() => removeSongFromSetlist(setlist.id, entry.id)}
									class="rounded p-0.5 text-text-tertiary hover:text-red-600"
									title="Remove from setlist"
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
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/each}

	<button
		onclick={addSetlist}
		class="w-full rounded-lg border border-dashed border-border-primary py-2 text-xs text-text-secondary hover:bg-surface-hover"
	>
		+ Add Another Set
	</button>

	{#if setlists.length > 0}
		<button
			onclick={shareSetlists}
			class="w-full rounded-lg bg-stone-900 py-2 text-xs font-medium text-white hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
		>
			{copyFeedback ? '✓ Copied to Clipboard!' : 'Share Setlists'}
		</button>
	{/if}
</div>
