// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Core types for StagePlotter, derived from the JSON schemas in static/specs/.
 */

export interface Band {
	id: string;
	name: string;
	created_at?: string;
	updated_at?: string;
}

export interface StagePlot {
	version: string;
	type: 'stage_plot';
	plot_name: string;
	revision_date: string;
	canvas: CanvasSpec;
	stage?: StageSpec;
	items: StagePlotItem[];
	metadata?: Record<string, unknown>;
	band_id?: string;
	event_name?: string;
	event_date?: string;
	event_time?: string;
	venue?: string;
}

export interface CanvasSpec {
	format?: 'letter';
	orientation?: 'landscape' | 'portrait';
	width: number;
	height: number;
	dpi?: number;
}

export interface StageSpec {
	x: number;
	y: number;
	width: number;
	height: number;
	margins?: {
		top: number;
		right: number;
		bottom: number;
		left: number;
	};
}

export interface StagePlotItem {
	id: number;
	name: string;
	type: string;
	category?: string;
	currentVariant?: string;
	position: ItemPosition;
	channel: string;
	person_id: number | null;
	itemData?: ItemData;
	size?: string; // For stage decks
}

export interface ItemPosition {
	x: number;
	y: number;
	width: number;
	height: number;
	rotation?: number;
	zone?: string;
	relativeX?: number;
	relativeY?: number;
}

export interface ItemData {
	name: string;
	item_type?: string;
	type?: string;
	category?: string;
	image?: string;
	variants?: Record<string, string>;
	variant_order?: string[];
	path?: string;
	keywords?: string[];
	default_inputs?: DefaultInput[];
	default_outputs?: DefaultOutput[];
	instrument_signal?: 'acoustic' | 'electric' | '';
	// Riser-specific fields
	riserWidth?: number;
	riserDepth?: number;
	riserHeight?: number;
}

export interface DefaultInput {
	name: string;
	ch?: number;
	source?: string;
}

export interface DefaultOutput {
	name: string;
	short_name?: string;
	type?: Output['type'] | string;
	link_mode?: 'mono' | 'stereo_pair' | 'stereo_sum';
}

/** An output item on a plot (e.g. wedge, IEM assigned to an output channel). */
export interface PlotOutputItem {
	id: number;
	name: string;
	channel: string;
	itemData?: ItemData;
	link_mode?: 'mono' | 'stereo_pair';
}

/** Valid channel-count options for input/output patch lists. */
export type ChannelMode = 8 | 16 | 24 | 32 | 48;

export interface PlotPerson {
	id: number;
	plot_id: string;
	person_id: number;
}

export type MemberType = 'performer' | 'crew' | 'management' | 'other';
export type MemberStatus = 'permanent' | 'occasional' | 'temporary' | 'inactive';

export interface Person {
	id?: number;
	band_id?: string;
	musician_id?: number;
	name: string;
	role?: string;
	pronouns?: string;
	phone?: string;
	email?: string;
	member_type?: MemberType;
	status?: MemberStatus;
}

export interface Input {
	id: string;
	name: string;
	short_name?: string;
	color?: string;
	channel_id?: string;
	linked_to?: string;
	ideal_device?: string;
	stand?: string;
	phantom_power?: boolean;
}

export interface Output {
	id: string;
	name: string;
	type?: 'wedge' | 'iem_stereo' | 'iem_mono' | 'sidefill' | 'sub';
}

export interface Song {
	id?: number;
	band_id?: string;
	title: string;
	starting_key?: string;
	starting_tempo?: number;
	instruments?: string;
	notes?: string;
	starred?: number;
	created_at?: string;
	updated_at?: string;
}

export interface Gig {
	id?: number;
	band_id?: string;
	name: string;
	venue?: string;
	date?: string;
	time?: string;
	set_time?: string;
	changeover_minutes?: number;
	plot_id?: string;
	notes?: string;
	created_at?: string;
	updated_at?: string;
}

export interface Setlist {
	id?: number;
	gig_id?: number;
	name: string;
	created_at?: string;
}

export interface SetlistSong {
	id?: number;
	setlist_id?: number;
	song_id?: number;
	position: number;
	notes?: string;
	// Joined display fields
	song_title?: string;
	starting_key?: string;
	starting_tempo?: number;
}
