// SPDX-License-Identifier: AGPL-3.0-only
//
// Svelte 5 class-based state management for the setlist editor.
// Instantiated per-page, provided via setContext / getContext.

import { db } from '$lib/db';
import {
	getSetlistsByGigId,
	getSetlistSongsWithSongInfoBySetlistIds,
	createSetlist,
	renameSetlist as renameSetlistDb,
	deleteSetlist as deleteSetlistDb,
	addSongToSetlist as addSongToSetlistDb,
	removeSetlistSong,
	updateSetlistSongPosition,
	type SetlistRow,
	type SetlistSongRow
} from '$lib/db/repositories/setlists';
import {
	getSongsByBandId,
	createSong,
	updateSongField,
	type SongRow
} from '$lib/db/repositories/songs';
import { getGigsByBandId, updateGigField, type GigRow } from '$lib/db/repositories/gigs';
import { getBandById } from '$lib/db/repositories/bands';
import { encodeSetlist, buildSetlistShareUrl } from '@stageplotter/shared';
import { getContext, setContext } from 'svelte';

const CONTEXT_KEY = 'setlistEditorState';

export function setSetlistState(state: SetlistEditorState) {
	setContext(CONTEXT_KEY, state);
}

export function getSetlistState(): SetlistEditorState {
	return getContext<SetlistEditorState>(CONTEXT_KEY);
}

export class SetlistEditorState {
	bandId: string;
	gigId: number;

	// Data
	bandName = $state('');
	gigName = $state('');
	setlists = $state<SetlistRow[]>([]);
	setlistSongs = $state<Record<number, SetlistSongRow[]>>({});
	songs = $state<SongRow[]>([]);

	// Display preferences
	font = $state(0); // 0=sans, 1=serif, 2=marker
	pageSize = $state(0); // 0=letter, 1=A4
	showKeys = $state(true);
	showNumbers = $state(true);

	// Active setlist for command palette targeting
	activeSetlistId = $state<number | null>(null);

	// Selected song for inspector panel
	selectedSongId = $state<number | null>(null);

	// Write management
	private writeTimer: ReturnType<typeof setTimeout> | null = null;

	constructor(bandId: string, gigId: number) {
		this.bandId = bandId;
		this.gigId = gigId;

		// Load display prefs from localStorage
		if (typeof window !== 'undefined') {
			const saved = localStorage.getItem('stageplotter-setlist-prefs');
			if (saved) {
				try {
					const prefs = JSON.parse(saved);
					if (typeof prefs.font === 'number') this.font = prefs.font;
					if (typeof prefs.pageSize === 'number') this.pageSize = prefs.pageSize;
					if (typeof prefs.showKeys === 'boolean') this.showKeys = prefs.showKeys;
					if (typeof prefs.showNumbers === 'boolean') this.showNumbers = prefs.showNumbers;
				} catch {
					// ignore
				}
			}
		}

		// Persist display prefs
		$effect(() => {
			const prefs = {
				font: this.font,
				pageSize: this.pageSize,
				showKeys: this.showKeys,
				showNumbers: this.showNumbers
			};
			if (typeof window !== 'undefined') {
				localStorage.setItem('stageplotter-setlist-prefs', JSON.stringify(prefs));
			}
		});
	}

	async load(): Promise<boolean> {
		await db.init();

		const [band, gigs, setlists, songs] = await Promise.all([
			getBandById(this.bandId),
			getGigsByBandId(this.bandId),
			getSetlistsByGigId(this.gigId),
			getSongsByBandId(this.bandId)
		]);

		if (!band) return false;
		const gig = gigs.find((g) => g.id === this.gigId);
		if (!gig) return false;

		this.bandName = band.name;
		this.gigName = gig.name;
		this.setlists = setlists;
		this.songs = songs;

		// Load songs for all setlists
		const setlistIds = setlists.map((s) => s.id);
		const allSongs = await getSetlistSongsWithSongInfoBySetlistIds(setlistIds);
		const songsBySetlist: Record<number, SetlistSongRow[]> = {};
		for (const sl of setlists) {
			songsBySetlist[sl.id] = [];
		}
		for (const row of allSongs) {
			if (songsBySetlist[row.setlist_id]) {
				songsBySetlist[row.setlist_id].push(row);
			}
		}
		this.setlistSongs = songsBySetlist;

		// Default active setlist to first one
		if (setlists.length > 0) {
			this.activeSetlistId = setlists[0].id;
		}

		return true;
	}

	async updateGigName(name: string) {
		this.gigName = name;
		await updateGigField(this.gigId, 'name', name);
	}

	// --- Setlist management ---

	async addSetlist(): Promise<SetlistRow> {
		const name = `Set ${this.setlists.length + 1}`;
		const id = await createSetlist(this.gigId, name);
		const newSetlist: SetlistRow = { id, gig_id: this.gigId, name };
		this.setlists = [...this.setlists, newSetlist];
		this.setlistSongs[newSetlist.id] = [];
		this.activeSetlistId = newSetlist.id;
		return newSetlist;
	}

	async renameSetlist(setlistId: number, newName: string) {
		const name = newName.trim() || `Set ${this.setlists.findIndex((s) => s.id === setlistId) + 1}`;
		await renameSetlistDb(setlistId, name);
		const sl = this.setlists.find((s) => s.id === setlistId);
		if (sl) sl.name = name;
		this.setlists = [...this.setlists];
	}

	async deleteSetlist(setlistId: number) {
		await deleteSetlistDb(setlistId);
		this.setlists = this.setlists.filter((s) => s.id !== setlistId);
		const updated = { ...this.setlistSongs };
		delete updated[setlistId];
		this.setlistSongs = updated;
		if (this.activeSetlistId === setlistId) {
			this.activeSetlistId = this.setlists.length > 0 ? this.setlists[0].id : null;
		}
	}

	// --- Song management ---

	async addSongToSetlist(setlistId: number, songId: number) {
		const currentSongs = this.setlistSongs[setlistId] || [];
		if (currentSongs.some((s) => s.song_id === songId)) return;

		const position = currentSongs.length;
		const entryId = await addSongToSetlistDb(setlistId, songId, position);

		const song = this.songs.find((s) => s.id === songId);
		if (!song) return;

		const newEntry: SetlistSongRow = {
			id: entryId,
			setlist_id: setlistId,
			song_id: songId,
			position,
			notes: null,
			title: song.title,
			starting_key: song.starting_key,
			starting_tempo: song.starting_tempo
		};

		this.setlistSongs = {
			...this.setlistSongs,
			[setlistId]: [...currentSongs, newEntry]
		};
	}

	async createSongAndAdd(setlistId: number, title: string): Promise<number> {
		const songId = await createSong(this.bandId, title);
		const newSong: SongRow = {
			id: songId,
			title,
			starting_key: null,
			starting_tempo: null,
			starred: 0
		};
		this.songs = [...this.songs, newSong].sort((a, b) => a.title.localeCompare(b.title));
		await this.addSongToSetlist(setlistId, songId);
		return songId;
	}

	async removeSong(setlistId: number, entryId: number) {
		await removeSetlistSong(entryId);
		const currentSongs = (this.setlistSongs[setlistId] || []).filter((s) => s.id !== entryId);
		// Re-number positions
		for (let i = 0; i < currentSongs.length; i++) {
			if (currentSongs[i].position !== i) {
				currentSongs[i].position = i;
				this.debouncedPositionWrite(currentSongs[i].id, i);
			}
		}
		this.setlistSongs = { ...this.setlistSongs, [setlistId]: currentSongs };
	}

	async reorderSongs(setlistId: number, fromIndex: number, toIndex: number) {
		if (fromIndex === toIndex) return;
		const current = [...(this.setlistSongs[setlistId] || [])];
		const [moved] = current.splice(fromIndex, 1);
		current.splice(toIndex, 0, moved);

		// Update positions
		for (let i = 0; i < current.length; i++) {
			current[i].position = i;
			this.debouncedPositionWrite(current[i].id, i);
		}
		this.setlistSongs = { ...this.setlistSongs, [setlistId]: current };
	}

	// --- Debounced position writes ---

	private pendingPositionWrites = new Map<number, number>();

	private debouncedPositionWrite(entryId: number, position: number) {
		this.pendingPositionWrites.set(entryId, position);
		if (this.writeTimer) clearTimeout(this.writeTimer);
		this.writeTimer = setTimeout(() => {
			this.writeTimer = null;
			this.flushPositionWrites();
		}, 300);
	}

	async flushPositionWrites() {
		if (this.writeTimer) {
			clearTimeout(this.writeTimer);
			this.writeTimer = null;
		}
		const writes = Array.from(this.pendingPositionWrites.entries());
		this.pendingPositionWrites.clear();
		await Promise.all(writes.map(([id, pos]) => updateSetlistSongPosition(id, pos)));
	}

	// --- Share ---

	async getShareUrl(): Promise<string> {
		const setsData = this.setlists.map((setlist) => {
			const songs = (this.setlistSongs[setlist.id] || []).map((entry) => ({
				title: entry.title ?? '',
				key: entry.starting_key || ''
			}));
			return { name: setlist.name, songs };
		});

		const payload = await encodeSetlist({
			sets: setsData,
			font: this.font,
			pageSize: this.pageSize,
			showKeys: this.showKeys ? 1 : 0
		});

		return buildSetlistShareUrl(window.location.origin, this.bandName, this.gigName, payload);
	}

	// --- Song helpers ---

	songsInSetlist(setlistId: number): Set<number> {
		const songs = this.setlistSongs[setlistId] || [];
		return new Set(songs.map((s) => s.song_id));
	}

	async updateSong(songId: number, field: string, value: string | number | null) {
		await updateSongField(songId, field, value);

		// Update local songs array
		const songIdx = this.songs.findIndex((s) => s.id === songId);
		if (songIdx !== -1) {
			(this.songs[songIdx] as unknown as Record<string, unknown>)[field] = value;
			this.songs = [...this.songs];
		}

		// Update setlistSongs entries that reference this song
		const fieldMap: Record<string, string> = {
			title: 'title',
			starting_key: 'starting_key',
			starting_tempo: 'starting_tempo'
		};
		const setlistField = fieldMap[field];
		if (setlistField) {
			const updated = { ...this.setlistSongs };
			for (const setlistId of Object.keys(updated)) {
				const entries = updated[Number(setlistId)];
				for (const entry of entries) {
					if (entry.song_id === songId) {
						(entry as unknown as Record<string, unknown>)[setlistField] = value;
					}
				}
			}
			this.setlistSongs = updated;
		}
	}
}
