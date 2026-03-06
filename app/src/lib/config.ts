// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Central app name used in page titles, branding, etc.
 * Fork-friendly: change this single value to rename the app everywhere.
 */
export const APP_NAME = 'Lost the Plot';

import { preferences } from '$lib/state/preferences.svelte';

export function getNavLinks(): { label: string; href: string }[] {
	const links: { label: string; href: string }[] = [{ label: 'Bands', href: '/bands' }];
	if (preferences.showSongs) links.push({ label: 'Songs', href: '/songs' });
	if (preferences.showFestivals) links.push({ label: 'Festivals', href: '/festivals' });
	if (preferences.showTours) links.push({ label: 'Tours', href: '/tours' });
	links.push({ label: 'Gear', href: '/gear' }, { label: 'Settings', href: '/settings' });
	return links;
}
