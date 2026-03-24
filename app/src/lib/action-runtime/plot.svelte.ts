export const plotActionBindings = $state({
	openAddItemPalette: null as null | (() => void),
	undo: null as null | (() => void),
	redo: null as null | (() => void),
	clearSelection: null as null | (() => void),
	toggleMainPaneTab: null as null | (() => void),
	canToggleMainPaneTab: false,
	isAddMenuOpen: false
});

export function setPlotActionBindings(bindings: {
	openAddItemPalette?: null | (() => void);
	undo?: null | (() => void);
	redo?: null | (() => void);
	clearSelection?: null | (() => void);
	toggleMainPaneTab?: null | (() => void);
	canToggleMainPaneTab?: boolean;
	isAddMenuOpen?: boolean;
}): void {
	if (bindings.openAddItemPalette !== undefined) {
		plotActionBindings.openAddItemPalette = bindings.openAddItemPalette;
	}
	if (bindings.undo !== undefined) {
		plotActionBindings.undo = bindings.undo;
	}
	if (bindings.redo !== undefined) {
		plotActionBindings.redo = bindings.redo;
	}
	if (bindings.clearSelection !== undefined) {
		plotActionBindings.clearSelection = bindings.clearSelection;
	}
	if (bindings.toggleMainPaneTab !== undefined) {
		plotActionBindings.toggleMainPaneTab = bindings.toggleMainPaneTab;
	}
	if (bindings.canToggleMainPaneTab !== undefined) {
		plotActionBindings.canToggleMainPaneTab = bindings.canToggleMainPaneTab;
	}
	if (bindings.isAddMenuOpen !== undefined) {
		plotActionBindings.isAddMenuOpen = bindings.isAddMenuOpen;
	}
}

export function resetPlotActionBindings(): void {
	plotActionBindings.openAddItemPalette = null;
	plotActionBindings.undo = null;
	plotActionBindings.redo = null;
	plotActionBindings.clearSelection = null;
	plotActionBindings.toggleMainPaneTab = null;
	plotActionBindings.canToggleMainPaneTab = false;
	plotActionBindings.isAddMenuOpen = false;
}
