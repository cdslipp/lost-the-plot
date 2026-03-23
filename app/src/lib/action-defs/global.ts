import { registerAction, type ActionResult } from '@stageplotter/action-registry';
import { globalUiState } from '$lib/action-runtime/ui.svelte';

function ok(message?: string, navigateTo?: string): ActionResult {
	return { success: true, message, navigateTo };
}

registerAction({
	id: 'ui.open-jumpbar',
	label: 'Open Jump Bar',
	description: 'Open quick navigation and actions palette',
	scope: 'global',
	category: 'ui',
	shortcut: 'mod+j',
	execute: async () => {
		globalUiState.jumpBarOpen = true;
		return ok();
	}
});

registerAction({
	id: 'ui.close-jumpbar',
	label: 'Close Jump Bar',
	description: 'Close quick navigation and actions palette',
	scope: 'global',
	category: 'ui',
	shortcut: 'escape',
	canExecute: () => globalUiState.jumpBarOpen,
	execute: async () => {
		globalUiState.jumpBarOpen = false;
		return ok();
	}
});

registerAction({
	id: 'nav.home',
	label: 'Go to Home',
	description: 'Navigate to the home page',
	scope: 'global',
	category: 'navigation',
	execute: async () => ok(undefined, '/')
});

registerAction({
	id: 'nav.bands',
	label: 'Go to Bands',
	description: 'Navigate to all bands',
	scope: 'global',
	category: 'navigation',
	execute: async () => ok(undefined, '/bands')
});

registerAction({
	id: 'nav.festivals',
	label: 'Go to Festivals',
	description: 'Navigate to all festivals',
	scope: 'global',
	category: 'navigation',
	execute: async () => ok(undefined, '/festivals')
});

registerAction({
	id: 'nav.tours',
	label: 'Go to Tours',
	description: 'Navigate to all tours',
	scope: 'global',
	category: 'navigation',
	execute: async () => ok(undefined, '/tours')
});
