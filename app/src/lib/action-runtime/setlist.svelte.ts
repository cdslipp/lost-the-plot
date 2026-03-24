const defaults = {
	openSongPalette: null as null | (() => void),
	cycleTabs: null as null | (() => void),
	isSongPaletteOpen: false
};

export const setlistActionBindings = $state({ ...defaults });

export function setSetlistActionBindings(bindings: Partial<typeof defaults>): void {
	Object.assign(setlistActionBindings, bindings);
}

export function resetSetlistActionBindings(): void {
	Object.assign(setlistActionBindings, defaults);
}
