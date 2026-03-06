// SPDX-License-Identifier: AGPL-3.0-only

export type TimeFormat = '12h' | '24h';

const TIME_FORMAT_KEY = 'stageplotter-time-format';
const SHOW_FESTIVALS_KEY = 'stageplotter-show-festivals';
const SHOW_TOURS_KEY = 'stageplotter-show-tours';
const SHOW_SONGS_KEY = 'stageplotter-show-songs';

function loadTimeFormat(): TimeFormat {
	if (typeof window !== 'undefined') {
		const saved = localStorage.getItem(TIME_FORMAT_KEY);
		if (saved === '12h' || saved === '24h') return saved;
	}
	return '12h';
}

function loadBool(key: string, defaultValue: boolean): boolean {
	if (typeof window !== 'undefined') {
		const saved = localStorage.getItem(key);
		if (saved === 'true') return true;
		if (saved === 'false') return false;
	}
	return defaultValue;
}

class Preferences {
	#timeFormat: TimeFormat = $state(loadTimeFormat());
	#showFestivals: boolean = $state(loadBool(SHOW_FESTIVALS_KEY, false));
	#showTours: boolean = $state(loadBool(SHOW_TOURS_KEY, false));
	#showSongs: boolean = $state(loadBool(SHOW_SONGS_KEY, false));

	get timeFormat(): TimeFormat {
		return this.#timeFormat;
	}

	set timeFormat(value: TimeFormat) {
		this.#timeFormat = value;
		if (typeof window !== 'undefined') {
			localStorage.setItem(TIME_FORMAT_KEY, value);
		}
	}

	get use24h(): boolean {
		return this.#timeFormat === '24h';
	}

	get showFestivals(): boolean {
		return this.#showFestivals;
	}

	set showFestivals(value: boolean) {
		this.#showFestivals = value;
		if (typeof window !== 'undefined') {
			localStorage.setItem(SHOW_FESTIVALS_KEY, String(value));
		}
	}

	get showTours(): boolean {
		return this.#showTours;
	}

	set showTours(value: boolean) {
		this.#showTours = value;
		if (typeof window !== 'undefined') {
			localStorage.setItem(SHOW_TOURS_KEY, String(value));
		}
	}

	get showSongs(): boolean {
		return this.#showSongs;
	}

	set showSongs(value: boolean) {
		this.#showSongs = value;
		if (typeof window !== 'undefined') {
			localStorage.setItem(SHOW_SONGS_KEY, String(value));
		}
	}
}

export const preferences = new Preferences();
