import { registerAction } from '@stageplotter/action-registry';
import { setlistActionBindings } from '$lib/action-runtime/setlist.svelte';
import { globalUiState } from '$lib/action-runtime/ui.svelte';

registerAction({
	id: 'setlist.open-song-palette',
	label: 'Add Song to Setlist',
	description: 'Open song command palette for active setlist',
	scope: 'setlist',
	category: 'setlist',
	shortcut: 'mod+k',
	canExecute: () => Boolean(setlistActionBindings.openSongPalette) && !globalUiState.jumpBarOpen,
	execute: async () => {
		setlistActionBindings.openSongPalette?.();
		return { success: true };
	}
});

registerAction({
	id: 'setlist.cycle-tabs',
	label: 'Cycle Setlist Tabs',
	description: 'Cycle set tabs in multi-set gigs',
	scope: 'setlist',
	category: 'navigation',
	shortcut: 'tab',
	canExecute: () =>
		Boolean(setlistActionBindings.cycleTabs) &&
		!setlistActionBindings.isSongPaletteOpen &&
		!globalUiState.jumpBarOpen,
	execute: async () => {
		setlistActionBindings.cycleTabs?.();
		return { success: true };
	}
});
