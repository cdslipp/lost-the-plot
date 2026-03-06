import { browser } from '$app/environment';

export const isMac = browser && /Mac|iPhone|iPad|iPod/.test(navigator.platform);
export const modKey = isMac ? '⌘' : 'Ctrl+';

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
