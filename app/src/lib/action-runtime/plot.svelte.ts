const defaults = {
	openAddItemPalette: null as null | (() => void),
	undo: null as null | (() => void),
	redo: null as null | (() => void),
	clearSelection: null as null | (() => void),
	toggleMainPaneTab: null as null | (() => void),
	canToggleMainPaneTab: false,
	isAddMenuOpen: false
};

export const plotActionBindings = $state({ ...defaults });

export function setPlotActionBindings(bindings: Partial<typeof defaults>): void {
	Object.assign(plotActionBindings, bindings);
}

export function resetPlotActionBindings(): void {
	Object.assign(plotActionBindings, defaults);
}
