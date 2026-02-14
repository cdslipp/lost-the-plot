// SPDX-License-Identifier: AGPL-3.0-only

export type TimeFormat = '12h' | '24h';

const TIME_FORMAT_KEY = 'stageplotter-time-format';

function loadTimeFormat(): TimeFormat {
	if (typeof window !== 'undefined') {
		const saved = localStorage.getItem(TIME_FORMAT_KEY);
		if (saved === '12h' || saved === '24h') return saved;
	}
	return '12h';
}

class Preferences {
	#timeFormat: TimeFormat = $state(loadTimeFormat());

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
}

export const preferences = new Preferences();
