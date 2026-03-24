import { registerAction } from '@stageplotter/action-registry';
import { plotActionBindings } from '$lib/action-runtime/plot.svelte';
import { globalUiState } from '$lib/action-runtime/ui.svelte';

registerAction({
	id: 'plot.open-add-item-palette',
	label: 'Add Stage Item',
	description: 'Open item command palette for stage plot editor',
	scope: 'plot',
	category: 'plot',
	shortcut: 'mod+k',
	canExecute: () => Boolean(plotActionBindings.openAddItemPalette) && !globalUiState.jumpBarOpen,
	execute: async () => {
		plotActionBindings.openAddItemPalette?.();
		return { success: true };
	}
});

registerAction({
	id: 'plot.undo',
	label: 'Undo Plot Change',
	description: 'Undo the last plot edit',
	scope: 'plot',
	category: 'edit',
	shortcut: 'mod+z',
	canExecute: () => Boolean(plotActionBindings.undo) && !globalUiState.jumpBarOpen,
	execute: async () => {
		plotActionBindings.undo?.();
		return { success: true };
	}
});

registerAction({
	id: 'plot.redo',
	label: 'Redo Plot Change',
	description: 'Redo the previously undone plot edit',
	scope: 'plot',
	category: 'edit',
	shortcut: 'mod+shift+z',
	canExecute: () => Boolean(plotActionBindings.redo) && !globalUiState.jumpBarOpen,
	execute: async () => {
		plotActionBindings.redo?.();
		return { success: true };
	}
});

registerAction({
	id: 'plot.redo-alt',
	label: 'Redo Plot Change (Y)',
	description: 'Redo using Ctrl/Cmd+Y',
	scope: 'plot',
	category: 'edit',
	shortcut: 'mod+y',
	canExecute: () => Boolean(plotActionBindings.redo) && !globalUiState.jumpBarOpen,
	execute: async () => {
		plotActionBindings.redo?.();
		return { success: true };
	}
});

registerAction({
	id: 'plot.clear-selection',
	label: 'Clear Plot Selection',
	description: 'Clear selected items and placement mode',
	scope: 'plot',
	category: 'plot',
	shortcut: 'escape',
	canExecute: () => Boolean(plotActionBindings.clearSelection) && !globalUiState.jumpBarOpen,
	execute: async () => {
		plotActionBindings.clearSelection?.();
		return { success: true };
	}
});

registerAction({
	id: 'plot.toggle-main-pane',
	label: 'Toggle Canvas/Patch Pane',
	description: 'Switch between canvas and patch list in compact layouts',
	scope: 'plot',
	category: 'navigation',
	shortcut: 'tab',
	canExecute: () =>
		Boolean(plotActionBindings.toggleMainPaneTab) &&
		plotActionBindings.canToggleMainPaneTab &&
		!plotActionBindings.isAddMenuOpen &&
		!globalUiState.jumpBarOpen,
	execute: async () => {
		plotActionBindings.toggleMainPaneTab?.();
		return { success: true };
	}
});
