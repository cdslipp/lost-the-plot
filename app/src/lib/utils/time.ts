/**
 * Shared time parse/format utilities.
 * Inspired by Ontime's flexible time parser.
 * All "time of day" values are stored as milliseconds from midnight.
 */

const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;

/**
 * Parse a flexible user time string into milliseconds from midnight (or duration ms).
 * Returns null if the input is unparseable.
 *
 * Supported formats:
 * - Colon/period/comma separated: "14:30", "2.30", "2,30"
 * - No separator (3-4 digits): "1430" → 14:30, "230" → 2:30
 * - AM/PM suffix: "230p" → 14:30, "8am" → 08:00
 * - Duration tokens: "1h30m", "45m", "2h"
 * - Single/double digit: "3" → 3 minutes (no AM/PM) or 3:00 (with AM/PM)
 */
export function parseUserTime(value: string): number | null {
	const raw = value.trim();
	if (!raw) return null;

	// Try duration format first: e.g. "1h30m", "45m", "2h"
	const durResult = parseDuration(raw);
	if (durResult !== null) return durResult;

	// Detect and strip AM/PM suffix
	const ampmMatch = raw.match(/(a|am|p|pm)$/i);
	const isPM = ampmMatch ? /^p/i.test(ampmMatch[1]) : null;
	const stripped = ampmMatch ? raw.slice(0, -ampmMatch[1].length).trim() : raw;

	if (!stripped) return null;

	let hours: number;
	let minutes: number;

	// Try separator-based: colon, period, comma, or space
	const sepMatch = stripped.match(/^(\d{1,2})[:.·,\s](\d{1,2})$/);
	if (sepMatch) {
		hours = parseInt(sepMatch[1]);
		minutes = parseInt(sepMatch[2]);
	} else if (/^\d{4}$/.test(stripped)) {
		// 4 digits: HHMM
		hours = parseInt(stripped.slice(0, 2));
		minutes = parseInt(stripped.slice(2));
	} else if (/^\d{3}$/.test(stripped)) {
		// 3 digits: HMM
		hours = parseInt(stripped.slice(0, 1));
		minutes = parseInt(stripped.slice(1));
	} else if (/^\d{1,2}$/.test(stripped)) {
		// 1-2 digits
		const num = parseInt(stripped);
		if (isPM !== null) {
			// With AM/PM: treat as hours
			hours = num;
			minutes = 0;
		} else {
			// No AM/PM: treat as minutes
			return num >= 0 && num < MS_PER_DAY / MS_PER_MINUTE ? num * MS_PER_MINUTE : null;
		}
	} else {
		return null;
	}

	// Apply AM/PM
	if (isPM !== null) {
		if (hours < 1 || hours > 12) return null;
		if (isPM && hours !== 12) hours += 12;
		if (!isPM && hours === 12) hours = 0;
	}

	if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

	return (hours * 60 + minutes) * MS_PER_MINUTE;
}

/** Parse duration tokens like "1h30m", "45m", "2h" */
function parseDuration(raw: string): number | null {
	const lower = raw.toLowerCase();
	const durationMatch = lower.match(/^(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?$/);
	if (!durationMatch) return null;
	const [, hStr, mStr] = durationMatch;
	if (!hStr && !mStr) return null;
	const h = hStr ? parseInt(hStr) : 0;
	const m = mStr ? parseInt(mStr) : 0;
	if (h < 0 || m < 0 || m > 59) return null;
	return h * MS_PER_HOUR + m * MS_PER_MINUTE;
}

/**
 * Format milliseconds from midnight to a display string.
 * Returns "--:--" for null.
 */
export function formatTimeMs(ms: number | null, use24h: boolean = true): string {
	if (ms == null) return '--:--';
	const totalMinutes = Math.floor(ms / MS_PER_MINUTE);
	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;

	if (use24h) {
		return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
	}

	const suffix = hours >= 12 ? 'PM' : 'AM';
	const hour12 = hours % 12 || 12;
	return `${hour12}:${minutes.toString().padStart(2, '0')} ${suffix}`;
}

/**
 * Format duration milliseconds for display: "45m", "1h 30m", "2h".
 * Returns "" for null.
 */
export function formatDurationMs(ms: number | null): string {
	if (ms == null) return '';
	const totalMinutes = Math.round(ms / MS_PER_MINUTE);
	if (totalMinutes < 60) return `${totalMinutes}m`;
	const h = Math.floor(totalMinutes / 60);
	const m = totalMinutes % 60;
	return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/**
 * Convert an "HH:MM" string (as stored in gigs DB) to milliseconds.
 * Returns null if the string is empty or unparseable.
 */
export function timeStringToMs(timeStr: string | null): number | null {
	if (!timeStr) return null;
	const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
	if (!match) return null;
	const h = parseInt(match[1]);
	const m = parseInt(match[2]);
	if (h > 23 || m > 59) return null;
	return (h * 60 + m) * MS_PER_MINUTE;
}

/**
 * Convert milliseconds to "HH:MM" string (for writing back to gigs DB).
 */
export function msToTimeString(ms: number): string {
	const totalMinutes = Math.floor(ms / MS_PER_MINUTE);
	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;
	return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}
