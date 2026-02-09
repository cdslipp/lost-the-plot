// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Platform detection for dual-target builds (PWA + Tauri desktop).
 */

declare global {
	interface Window {
		__TAURI_INTERNALS__?: unknown;
	}
}

/**
 * Returns true when running inside a Tauri desktop app.
 */
export function isTauri(): boolean {
	if (typeof window === 'undefined') return false;
	return '__TAURI_INTERNALS__' in window;
}
