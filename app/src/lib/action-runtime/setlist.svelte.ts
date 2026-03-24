export const setlistActionBindings = $state({
	openSongPalette: null as null | (() => void),
	cycleTabs: null as null | (() => void),
	isSongPaletteOpen: false
});

export function setSetlistActionBindings(bindings: {
	openSongPalette?: null | (() => void);
	cycleTabs?: null | (() => void);
	isSongPaletteOpen?: boolean;
}): void {
	if (bindings.openSongPalette !== undefined) {
		setlistActionBindings.openSongPalette = bindings.openSongPalette;
	}
	if (bindings.cycleTabs !== undefined) {
		setlistActionBindings.cycleTabs = bindings.cycleTabs;
	}
	if (bindings.isSongPaletteOpen !== undefined) {
		setlistActionBindings.isSongPaletteOpen = bindings.isSongPaletteOpen;
	}
}

export function resetSetlistActionBindings(): void {
	setlistActionBindings.openSongPalette = null;
	setlistActionBindings.cycleTabs = null;
	setlistActionBindings.isSongPaletteOpen = false;
}
