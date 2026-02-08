// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Generate a minimal Behringer X32 / Midas M32 .scn scene file.
 *
 * Sets channel names, scribble-strip colors, and stereo link configuration.
 * All other parameters (EQ, dynamics, routing, etc.) are left at factory defaults.
 *
 * Reference: X32 OSC path format as parsed by scnplot (ref/scnplot/main.js)
 */

import { type ConsoleColor, CONSOLES } from '@stageplotter/shared';

export interface ScnChannelData {
	/** Channel number (1-based) */
	channel: number;
	/** Channel name (max 12 chars on X32 scribble strip) */
	name: string;
	/** Color ID from the console definition */
	colorId?: string;
}

export interface ScnGeneratorOptions {
	/** Scene name (shown on console display) */
	sceneName: string;
	/** Input channel data */
	channels: ScnChannelData[];
	/** Channel colors map (channel number → color ID) */
	channelColors: Record<number, string>;
	/** Stereo link start channels (odd numbers: 1,3,5,...) */
	stereoLinks: number[];
	/** Max input channels (default 32 for X32) */
	maxChannels?: number;
}

/**
 * Look up the .scn color code for a given color ID.
 * Falls back to 'OFF' if not found.
 */
function getScnColorCode(colorId: string | undefined): string {
	if (!colorId) return 'OFF';
	const consoleDef = CONSOLES['x32'];
	const color = consoleDef.colors.find((c: ConsoleColor) => c.id === colorId);
	return color?.scnCode ?? 'OFF';
}

/**
 * Truncate a channel name to 12 characters (X32 scribble strip limit).
 * Replaces any double-quotes with single quotes for .scn format safety.
 */
function sanitizeName(name: string): string {
	return name.slice(0, 12).replace(/"/g, "'");
}

/**
 * Generate the .scn file content as a string.
 */
export function generateX32Scn(options: ScnGeneratorOptions): string {
	const { sceneName, channels, channelColors, stereoLinks, maxChannels = 32 } = options;

	const lines: string[] = [];

	// Header line: version sceneName note
	// The X32 uses a version string like "#2#" or similar, but for a simple scene
	// we use a minimal format. The first field is the version/console identifier.
	lines.push(`#2# "${sanitizeName(sceneName)}" "" 0 0 0 0 0 0 0 0 0 0`);

	// Build a map of channel number → data for quick lookup
	const channelMap = new Map<number, ScnChannelData>();
	for (const ch of channels) {
		channelMap.set(ch.channel, ch);
	}

	// Channel configurations (/ch/NN/config)
	for (let i = 1; i <= maxChannels; i++) {
		const ch = i.toString().padStart(2, '0');
		const data = channelMap.get(i);
		const name = data ? sanitizeName(data.name) : '';
		const iconId = 1; // Default icon
		const colorCode = getScnColorCode(channelColors[i] ?? data?.colorId);
		const source = i; // Default: channel routes to its own physical input

		lines.push(`/ch/${ch}/config "${name}" ${iconId} ${colorCode} ${source}`);
	}

	// Channel preamp defaults (/ch/NN/preamp)
	for (let i = 1; i <= maxChannels; i++) {
		const ch = i.toString().padStart(2, '0');
		// trim, gainf, hpon(OFF), hpf(80), phantom OFF
		lines.push(`/ch/${ch}/preamp 0.0000 0.5000 OFF 80 OFF`);
	}

	// Channel gate defaults (/ch/NN/gate)
	for (let i = 1; i <= maxChannels; i++) {
		const ch = i.toString().padStart(2, '0');
		lines.push(`/ch/${ch}/gate OFF GATE -30.0 5 1 10 200 0`);
	}

	// Channel dynamics defaults (/ch/NN/dyn)
	for (let i = 1; i <= maxChannels; i++) {
		const ch = i.toString().padStart(2, '0');
		lines.push(`/ch/${ch}/dyn OFF COMP RMS LIN 0.0 3.0 1 10 10 0 0 0 OFF 120`);
	}

	// Channel insert defaults (/ch/NN/insert)
	for (let i = 1; i <= maxChannels; i++) {
		const ch = i.toString().padStart(2, '0');
		lines.push(`/ch/${ch}/insert OFF POST OFF`);
	}

	// Channel link configuration (/config/chlink)
	// One value per pair: 1-2, 3-4, 5-6, ... 31-32 = 16 pairs
	const linkValues: string[] = [];
	const stereoLinkSet = new Set(stereoLinks);
	for (let pair = 0; pair < maxChannels / 2; pair++) {
		const oddCh = pair * 2 + 1;
		linkValues.push(stereoLinkSet.has(oddCh) ? 'ON' : 'OFF');
	}
	lines.push(`/config/chlink ${linkValues.join(' ')}`);

	// Default bus link (all OFF)
	const busLinkValues = Array(8).fill('OFF');
	lines.push(`/config/buslink ${busLinkValues.join(' ')}`);

	// Default aux link (all OFF)
	const auxLinkValues = Array(3).fill('OFF');
	lines.push(`/config/auxlink ${auxLinkValues.join(' ')}`);

	// Default FX link (all OFF)
	const fxLinkValues = Array(4).fill('OFF');
	lines.push(`/config/fxlink ${fxLinkValues.join(' ')}`);

	// Default matrix link (all OFF)
	const mtxLinkValues = Array(3).fill('OFF');
	lines.push(`/config/mtxlink ${mtxLinkValues.join(' ')}`);

	// Default input routing (local analog inputs)
	lines.push(`/config/routing/IN AN1-8 AN9-16 AN17-24 AN25-32 AUX1-6`);

	return lines.join('\n') + '\n';
}

/**
 * Trigger a browser download of the generated .scn file.
 */
export function downloadScnFile(content: string, filename: string): void {
	const blob = new Blob([content], { type: 'text/plain' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename.endsWith('.scn') ? filename : `${filename}.scn`;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}
