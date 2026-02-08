// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Console definitions for mixing desk integration.
 * Each console type defines its available scribble-strip colors,
 * channel counts, and .scn color codes.
 */

export interface ConsoleColor {
	/** Internal identifier */
	id: string;
	/** Display label */
	label: string;
	/** Code used in .scn files (e.g. 'RD', 'GN') */
	scnCode: string;
	/** CSS hex color for rendering */
	hex: string;
	/** Whether this is an inverted variant */
	inverted: boolean;
}

export interface ConsoleDefinition {
	/** Unique key (e.g. 'x32') */
	id: string;
	/** Display name */
	name: string;
	/** Max input channels */
	inputChannels: number;
	/** Max output buses */
	outputBuses: number;
	/** Available scribble strip colors */
	colors: ConsoleColor[];
	/** Supported channel count options for the UI */
	channelOptions: number[];
	/** Supported output count options for the UI */
	outputOptions: number[];
}

/**
 * Color categories for auto-assigning channel colors.
 * These map broadly to the asset catalog categories.
 */
export const COLOR_CATEGORIES = [
	'vocals',
	'drums',
	'guitars',
	'bass',
	'keys',
	'strings',
	'winds',
	'percussion',
	'monitors'
] as const;

export type ColorCategory = (typeof COLOR_CATEGORIES)[number];

/** Map asset catalog category paths to color categories */
export const CATALOG_TO_COLOR_CATEGORY: Record<string, ColorCategory> = {
	// Microphones → vocals (most common use)
	'Microphones': 'vocals',
	'Microphones - Boom': 'vocals',
	'Microphones - Hand Held': 'vocals',
	'Microphones - Headset': 'vocals',
	'Microphones - Straight': 'vocals',
	// Drums
	'Drums': 'drums',
	'Drums - Hardware': 'drums',
	'Drums - Individual': 'drums',
	'Drum Kits': 'drums',
	// Guitars
	'Guitars': 'guitars',
	// Bass amps → bass
	'Bass Amplifiers': 'bass',
	// General amps → guitars (most common use)
	'Amplifiers': 'guitars',
	// Keys
	'Keyboards & Piano': 'keys',
	// Strings
	'String Instruments': 'strings',
	// Winds
	'Wind Instruments': 'winds',
	// Percussion
	'Percussion': 'percussion',
	// Outputs → monitors
	'Outputs': 'monitors'
};

// --- X32 / M32 Console Definition ---

const X32_COLORS: ConsoleColor[] = [
	// Normal colors
	{ id: 'off', label: 'Off', scnCode: 'OFF', hex: '#1a1a1a', inverted: false },
	{ id: 'red', label: 'Red', scnCode: 'RD', hex: '#ff0000', inverted: false },
	{ id: 'green', label: 'Green', scnCode: 'GN', hex: '#00c800', inverted: false },
	{ id: 'yellow', label: 'Yellow', scnCode: 'YE', hex: '#e8e800', inverted: false },
	{ id: 'blue', label: 'Blue', scnCode: 'BL', hex: '#0064ff', inverted: false },
	{ id: 'magenta', label: 'Magenta', scnCode: 'MG', hex: '#d000d0', inverted: false },
	{ id: 'cyan', label: 'Cyan', scnCode: 'CY', hex: '#00c8c8', inverted: false },
	{ id: 'white', label: 'White', scnCode: 'WH', hex: '#e0e0e0', inverted: false },
	// Inverted colors
	{ id: 'off_inv', label: 'Off Inv', scnCode: 'OFFi', hex: '#1a1a1a', inverted: true },
	{ id: 'red_inv', label: 'Red Inv', scnCode: 'RDi', hex: '#ff4444', inverted: true },
	{ id: 'green_inv', label: 'Green Inv', scnCode: 'GNi', hex: '#44dd44', inverted: true },
	{ id: 'yellow_inv', label: 'Yellow Inv', scnCode: 'YEi', hex: '#eeee44', inverted: true },
	{ id: 'blue_inv', label: 'Blue Inv', scnCode: 'BLi', hex: '#4488ff', inverted: true },
	{ id: 'magenta_inv', label: 'Magenta Inv', scnCode: 'MGi', hex: '#dd44dd', inverted: true },
	{ id: 'cyan_inv', label: 'Cyan Inv', scnCode: 'CYi', hex: '#44dddd', inverted: true },
	{ id: 'white_inv', label: 'White Inv', scnCode: 'WHi', hex: '#f0f0f0', inverted: true }
];

export const X32_CONSOLE: ConsoleDefinition = {
	id: 'x32',
	name: 'Behringer X32 / Midas M32',
	inputChannels: 32,
	outputBuses: 16,
	colors: X32_COLORS,
	channelOptions: [8, 16, 24, 32],
	outputOptions: [8, 16]
};

/** Default category → color mapping for X32 */
export const X32_DEFAULT_CATEGORY_COLORS: Record<ColorCategory, string> = {
	vocals: 'red',
	drums: 'blue',
	guitars: 'green',
	bass: 'yellow',
	keys: 'cyan',
	strings: 'magenta',
	winds: 'white',
	percussion: 'blue_inv',
	monitors: 'green_inv'
};

// --- Allen & Heath SQ Console Definition ---

const SQ_COLORS: ConsoleColor[] = [
	{ id: 'off', label: 'Off', scnCode: 'OFF', hex: '#1a1a1a', inverted: false },
	{ id: 'red', label: 'Red', scnCode: 'RED', hex: '#e53935', inverted: false },
	{ id: 'green', label: 'Green', scnCode: 'GRN', hex: '#43a047', inverted: false },
	{ id: 'yellow', label: 'Yellow', scnCode: 'YLW', hex: '#fdd835', inverted: false },
	{ id: 'blue', label: 'Blue', scnCode: 'BLU', hex: '#1e88e5', inverted: false },
	{ id: 'magenta', label: 'Magenta', scnCode: 'MAG', hex: '#d81b60', inverted: false },
	{ id: 'cyan', label: 'Cyan', scnCode: 'CYN', hex: '#00acc1', inverted: false },
	{ id: 'white', label: 'White', scnCode: 'WHT', hex: '#f5f5f5', inverted: false },
	{ id: 'orange', label: 'Orange', scnCode: 'ORG', hex: '#fb8c00', inverted: false }
];

export const SQ_CONSOLE: ConsoleDefinition = {
	id: 'sq',
	name: 'Allen & Heath SQ',
	inputChannels: 48,
	outputBuses: 16,
	colors: SQ_COLORS,
	channelOptions: [8, 16, 24, 32, 48],
	outputOptions: [8, 12, 16]
};

/** Default category → color mapping for SQ */
export const SQ_DEFAULT_CATEGORY_COLORS: Record<ColorCategory, string> = {
	vocals: 'red',
	drums: 'blue',
	guitars: 'green',
	bass: 'yellow',
	keys: 'cyan',
	strings: 'magenta',
	winds: 'white',
	percussion: 'orange',
	monitors: 'green'
};

// --- Behringer WING Console Definition ---

const WING_COLORS: ConsoleColor[] = [
	{ id: 'off', label: 'Off', scnCode: 'OFF', hex: '#1a1a1a', inverted: false },
	{ id: 'red', label: 'Red', scnCode: 'RD', hex: '#ff0000', inverted: false },
	{ id: 'green', label: 'Green', scnCode: 'GN', hex: '#00c800', inverted: false },
	{ id: 'yellow', label: 'Yellow', scnCode: 'YE', hex: '#e8e800', inverted: false },
	{ id: 'blue', label: 'Blue', scnCode: 'BL', hex: '#0064ff', inverted: false },
	{ id: 'magenta', label: 'Magenta', scnCode: 'MG', hex: '#d000d0', inverted: false },
	{ id: 'cyan', label: 'Cyan', scnCode: 'CY', hex: '#00c8c8', inverted: false },
	{ id: 'white', label: 'White', scnCode: 'WH', hex: '#e0e0e0', inverted: false }
];

export const WING_CONSOLE: ConsoleDefinition = {
	id: 'wing',
	name: 'Behringer WING',
	inputChannels: 48,
	outputBuses: 48,
	colors: WING_COLORS,
	channelOptions: [8, 16, 24, 32, 48],
	outputOptions: [8, 16, 24, 32, 48]
};

/** Default category → color mapping for WING */
export const WING_DEFAULT_CATEGORY_COLORS: Record<ColorCategory, string> = {
	vocals: 'red',
	drums: 'blue',
	guitars: 'green',
	bass: 'yellow',
	keys: 'cyan',
	strings: 'magenta',
	winds: 'white',
	percussion: 'blue',
	monitors: 'green'
};

// --- Registry of all supported consoles ---

export const CONSOLES: Record<string, ConsoleDefinition> = {
	x32: X32_CONSOLE,
	sq: SQ_CONSOLE,
	wing: WING_CONSOLE
};

/** Get a console definition by ID, or undefined if not found */
export function getConsole(id: string): ConsoleDefinition | undefined {
	return CONSOLES[id];
}

/** Get the list of all available console IDs */
export function getConsoleIds(): string[] {
	return Object.keys(CONSOLES);
}

/** Get a console color by its ID within a console definition */
export function getConsoleColor(
	consoleId: string,
	colorId: string
): ConsoleColor | undefined {
	const def = CONSOLES[consoleId];
	if (!def) return undefined;
	return def.colors.find((c) => c.id === colorId);
}

/** Get default category color map for a console */
export function getDefaultCategoryColors(
	consoleId: string
): Record<ColorCategory, string> {
	// For now only X32 has defaults; future consoles will get their own
	if (consoleId === 'x32') return { ...X32_DEFAULT_CATEGORY_COLORS };
	if (consoleId === 'sq') return { ...SQ_DEFAULT_CATEGORY_COLORS };
	if (consoleId === 'wing') return { ...WING_DEFAULT_CATEGORY_COLORS };
	// Fallback: use X32 defaults
	return { ...X32_DEFAULT_CATEGORY_COLORS };
}
