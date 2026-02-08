// SPDX-License-Identifier: AGPL-3.0-only

import { db } from '$lib/db';
import { generateId } from '@stageplotter/shared';

/**
 * Deep-duplicate a band with all related entities:
 * persons, songs, plots (with items and musicians), gigs (with setlists and setlist songs).
 */
export async function duplicateBand(bandId: string): Promise<string | null> {
	const sourceBand = await db.queryOne<{ id: string; name: string }>(
		'SELECT id, name FROM bands WHERE id = ?',
		[bandId]
	);
	if (!sourceBand) return null;

	const newBandId = generateId();
	const newBandName = `${sourceBand.name} Copy`;
	await db.run('INSERT INTO bands (id, name) VALUES (?, ?)', [newBandId, newBandName]);

	// --- Persons ---
	const persons = await db.query<{
		name: string;
		role: string | null;
		pronouns: string | null;
		phone: string | null;
		email: string | null;
		member_type: string | null;
		status: string | null;
	}>(
		'SELECT name, role, pronouns, phone, email, member_type, status FROM persons WHERE band_id = ?',
		[bandId]
	);
	for (const person of persons) {
		await db.run(
			'INSERT INTO persons (band_id, name, role, pronouns, phone, email, member_type, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
			[
				newBandId,
				person.name,
				person.role,
				person.pronouns,
				person.phone,
				person.email,
				person.member_type,
				person.status
			]
		);
	}

	// --- Songs (with ID mapping for setlist songs) ---
	const songs = await db.query<{
		id: number;
		title: string;
		starting_key: string | null;
		starting_tempo: number | null;
		instruments: string | null;
		notes: string | null;
		starred: number | null;
	}>(
		'SELECT id, title, starting_key, starting_tempo, instruments, notes, starred FROM songs WHERE band_id = ?',
		[bandId]
	);
	const songIdMap = new Map<number, number>();
	for (const song of songs) {
		const result = await db.run(
			'INSERT INTO songs (band_id, title, starting_key, starting_tempo, instruments, notes, starred) VALUES (?, ?, ?, ?, ?, ?, ?)',
			[
				newBandId,
				song.title,
				song.starting_key,
				song.starting_tempo,
				song.instruments,
				song.notes,
				song.starred ?? 0
			]
		);
		songIdMap.set(song.id, result.lastInsertRowid);
	}

	// --- Plots (with ID mapping for gig.plot_id references) ---
	const plots = await db.query<{
		id: string;
		name: string;
		revision_date: string;
		canvas_width: number;
		canvas_height: number;
		metadata: string | null;
		stage_width: number | null;
		stage_depth: number | null;
		event_name: string | null;
		event_date: string | null;
		event_time: string | null;
		venue: string | null;
	}>(
		`SELECT id, name, revision_date, canvas_width, canvas_height, metadata, stage_width, stage_depth, event_name, event_date, event_time, venue
		 FROM stage_plots WHERE band_id = ?`,
		[bandId]
	);
	const plotIdMap = new Map<string, string>();
	for (const plot of plots) {
		const newPlotId = generateId();
		plotIdMap.set(plot.id, newPlotId);
		await db.run(
			`INSERT INTO stage_plots
				(id, name, revision_date, canvas_width, canvas_height, metadata, band_id, stage_width, stage_depth, event_name, event_date, event_time, venue)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				newPlotId,
				plot.name,
				plot.revision_date,
				plot.canvas_width,
				plot.canvas_height,
				plot.metadata,
				newBandId,
				plot.stage_width,
				plot.stage_depth,
				plot.event_name,
				plot.event_date,
				plot.event_time,
				plot.venue
			]
		);
	}

	// --- Items and Musicians (from plots) ---
	if (plots.length > 0) {
		const plotIds = plots.map((plot) => plot.id);
		const plotPlaceholders = plotIds.map(() => '?').join(',');

		const items = await db.query<{
			plot_id: string;
			name: string;
			type: string;
			category: string | null;
			current_variant: string | null;
			pos_x: number;
			pos_y: number;
			width: number;
			height: number;
			channel: string | null;
			musician: string | null;
			item_data: string | null;
			sort_order: number | null;
		}>(
			`SELECT plot_id, name, type, category, current_variant, pos_x, pos_y, width, height, channel, musician, item_data, sort_order
			 FROM items WHERE plot_id IN (${plotPlaceholders})`,
			plotIds
		);
		for (const item of items) {
			const newPlotId = plotIdMap.get(item.plot_id);
			if (!newPlotId) continue;
			await db.run(
				`INSERT INTO items
					(plot_id, name, type, category, current_variant, pos_x, pos_y, width, height, channel, musician, item_data, sort_order)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				[
					newPlotId,
					item.name,
					item.type,
					item.category,
					item.current_variant,
					item.pos_x,
					item.pos_y,
					item.width,
					item.height,
					item.channel,
					item.musician,
					item.item_data,
					item.sort_order
				]
			);
		}

		const musicians = await db.query<{
			plot_id: string;
			name: string;
			instrument: string | null;
		}>(
			`SELECT plot_id, name, instrument FROM musicians WHERE plot_id IN (${plotPlaceholders})`,
			plotIds
		);
		for (const musician of musicians) {
			const newPlotId = plotIdMap.get(musician.plot_id);
			if (!newPlotId) continue;
			await db.run('INSERT INTO musicians (plot_id, name, instrument) VALUES (?, ?, ?)', [
				newPlotId,
				musician.name,
				musician.instrument
			]);
		}
	}

	// --- Gigs (with ID mapping for setlists) ---
	const gigs = await db.query<{
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
		'SELECT id, name, venue, date, time, set_time, changeover_minutes, plot_id, notes FROM gigs WHERE band_id = ?',
		[bandId]
	);
	const gigIdMap = new Map<number, number>();
	for (const gig of gigs) {
		const newPlotId = gig.plot_id ? (plotIdMap.get(gig.plot_id) ?? null) : null;
		const result = await db.run(
			'INSERT INTO gigs (band_id, name, venue, date, time, set_time, changeover_minutes, plot_id, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
			[
				newBandId,
				gig.name,
				gig.venue,
				gig.date,
				gig.time,
				gig.set_time,
				gig.changeover_minutes,
				newPlotId,
				gig.notes
			]
		);
		gigIdMap.set(gig.id, result.lastInsertRowid);
	}

	// --- Setlists and Setlist Songs ---
	if (gigs.length > 0) {
		const gigIds = gigs.map((gig) => gig.id);
		const gigPlaceholders = gigIds.map(() => '?').join(',');
		const setlists = await db.query<{ id: number; gig_id: number; name: string }>(
			`SELECT id, gig_id, name FROM setlists WHERE gig_id IN (${gigPlaceholders})`,
			gigIds
		);
		const setlistIdMap = new Map<number, number>();
		for (const setlist of setlists) {
			const newGigId = gigIdMap.get(setlist.gig_id);
			if (!newGigId) continue;
			const result = await db.run('INSERT INTO setlists (gig_id, name) VALUES (?, ?)', [
				newGigId,
				setlist.name
			]);
			setlistIdMap.set(setlist.id, result.lastInsertRowid);
		}

		if (setlists.length > 0) {
			const setlistIds = setlists.map((setlist) => setlist.id);
			const setlistPlaceholders = setlistIds.map(() => '?').join(',');
			const setlistSongs = await db.query<{
				setlist_id: number;
				song_id: number;
				position: number;
				notes: string | null;
			}>(
				`SELECT setlist_id, song_id, position, notes FROM setlist_songs WHERE setlist_id IN (${setlistPlaceholders})`,
				setlistIds
			);
			for (const setlistSong of setlistSongs) {
				const newSetlistId = setlistIdMap.get(setlistSong.setlist_id);
				const newSongId = songIdMap.get(setlistSong.song_id);
				if (!newSetlistId || !newSongId) continue;
				await db.run(
					'INSERT INTO setlist_songs (setlist_id, song_id, position, notes) VALUES (?, ?, ?, ?)',
					[newSetlistId, newSongId, setlistSong.position, setlistSong.notes]
				);
			}
		}
	}

	return newBandId;
}
