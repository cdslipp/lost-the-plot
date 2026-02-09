// Band template definitions for quick plot creation.
// Positions are relative (0-1) and get scaled to the canvas at apply time.
// Image dimensions are from the default variant PNGs.

export interface TemplateItem {
	name: string;
	type: string;
	category?: string;
	path: string;
	variants: Record<string, string>;
	currentVariant: string;
	imageWidth: number;
	imageHeight: number;
	/** Relative X position (0 = left edge, 1 = right edge) */
	relX: number;
	/** Relative Y position (0 = top/upstage, 1 = bottom/downstage) */
	relY: number;
	channel?: number;
	/** Index into the template's persons array, or null */
	personIndex?: number | null;
}

export interface TemplatePerson {
	name: string;
	role: string;
}

export interface BandTemplate {
	id: string;
	name: string;
	description: string;
	persons: TemplatePerson[];
	items: TemplateItem[];
}

// ── 4-Piece Rock Band ────────────────────────────────────────────────
// Drums (upstage center), Guitar (stage left), Bass (stage right), Vocals (downstage center)
const fourPiece: BandTemplate = {
	id: '4-piece-rock',
	name: '4-Piece Rock Band',
	description: 'Vocals, Guitar, Bass, Drums',
	persons: [
		{ name: 'Vocalist', role: 'Vocals' },
		{ name: 'Guitarist', role: 'Guitar' },
		{ name: 'Bassist', role: 'Bass' },
		{ name: 'Drummer', role: 'Drums' }
	],
	items: [
		// ── Drums (upstage center) ───────────────────────────────
		{
			name: 'Drum Kit',
			type: 'drumset',
			category: 'drums',
			path: 'drums/drum_kits/threetoms',
			variants: {
				L: 'ThreeTomsL.png',
				default: 'ThreeToms.png',
				R: 'ThreeTomsR.png',
				RA: 'ThreeTomsRA.png',
				LA: 'ThreeTomsLA.png'
			},
			currentVariant: 'default',
			imageWidth: 198,
			imageHeight: 122,
			relX: 0.42,
			relY: 0.08,
			channel: 1,
			personIndex: 3
		},
		{
			name: 'Drum Wedge',
			type: 'monitor',
			category: 'monitors',
			path: 'monitors/wedge',
			variants: { default: 'Wedge.png' },
			currentVariant: 'default',
			imageWidth: 40,
			imageHeight: 39,
			relX: 0.58,
			relY: 0.22,
			personIndex: null
		},

		// ── Guitar (stage left = canvas left) ────────────────────
		{
			name: 'Guitar',
			type: 'instrument',
			category: 'guitars',
			path: 'guitars/electric/guitaronstand',
			variants: {
				R: 'guitaronstandR.png',
				L: 'guitaronstandL.png',
				LA: 'guitaronstandLA.png',
				default: 'guitaronstand.png',
				RA: 'guitaronstandRA.png'
			},
			currentVariant: 'default',
			imageWidth: 52,
			imageHeight: 80,
			relX: 0.18,
			relY: 0.3,
			channel: 11,
			personIndex: 1
		},
		{
			name: 'Guitar Amp',
			type: 'amp',
			category: 'amps',
			path: 'amps/guitar/fender_amp',
			variants: {
				default: 'FenderAmp.png',
				back: 'FenderAmpBack.png',
				R: 'FenderAmpR.png',
				RA: 'FenderAmpRA.png',
				L: 'FenderAmpL.png',
				LA: 'FenderAmpLA.png'
			},
			currentVariant: 'default',
			imageWidth: 57,
			imageHeight: 36,
			relX: 0.1,
			relY: 0.18,
			channel: 12,
			personIndex: null
		},
		{
			name: 'Guitar Wedge',
			type: 'monitor',
			category: 'monitors',
			path: 'monitors/wedge',
			variants: { default: 'Wedge.png' },
			currentVariant: 'default',
			imageWidth: 40,
			imageHeight: 39,
			relX: 0.22,
			relY: 0.48,
			personIndex: null
		},

		// ── Bass (stage right = canvas right) ────────────────────
		{
			name: 'Bass',
			type: 'instrument',
			category: 'guitars',
			path: 'guitars/bass/p_bass',
			variants: {
				RA: 'P_BassRA.png',
				default: 'P_Bass.png'
			},
			currentVariant: 'default',
			imageWidth: 48,
			imageHeight: 72,
			relX: 0.72,
			relY: 0.3,
			channel: 13,
			personIndex: 2
		},
		{
			name: 'Bass Amp',
			type: 'amp',
			category: 'amps',
			path: 'amps/bass/bassamp',
			variants: {
				L: 'BassAmpL.png',
				RA: 'BassAmpRA.png',
				LA: 'BassAmpLA.png',
				R: 'BassAmpR.png',
				default: 'BassAmp.png'
			},
			currentVariant: 'default',
			imageWidth: 52,
			imageHeight: 41,
			relX: 0.8,
			relY: 0.18,
			channel: 14,
			personIndex: null
		},
		{
			name: 'Bass Wedge',
			type: 'monitor',
			category: 'monitors',
			path: 'monitors/wedge',
			variants: { default: 'Wedge.png' },
			currentVariant: 'default',
			imageWidth: 40,
			imageHeight: 39,
			relX: 0.68,
			relY: 0.48,
			personIndex: null
		},

		// ── Vocals (downstage center) ────────────────────────────
		{
			name: 'Vocal Mic',
			type: 'stand',
			category: 'mics',
			path: 'mics/stands/centervocal',
			variants: {
				BRA: 'Center_VocalBackRA.png',
				R: 'Center_VocalR.png',
				B: 'Center_VocalBack.png',
				BLA: 'Center_VocalBackLA.png',
				LA: 'Center_VocalLA.png',
				RA: 'Center_VocalRA.png',
				default: 'Center_Vocal.png',
				L: 'Center_VocalL.png'
			},
			currentVariant: 'default',
			imageWidth: 28,
			imageHeight: 100,
			relX: 0.47,
			relY: 0.58,
			channel: 15,
			personIndex: 0
		},
		{
			name: 'Vocal Wedge',
			type: 'monitor',
			category: 'monitors',
			path: 'monitors/wedge',
			variants: { default: 'Wedge.png' },
			currentVariant: 'default',
			imageWidth: 40,
			imageHeight: 39,
			relX: 0.46,
			relY: 0.82,
			personIndex: null
		}
	]
};

// ── 5-Piece Band (with Keys) ────────────────────────────────────────
const fivePiece: BandTemplate = {
	id: '5-piece-keys',
	name: '5-Piece Band',
	description: 'Vocals, Guitar, Bass, Keys, Drums',
	persons: [
		{ name: 'Vocalist', role: 'Vocals' },
		{ name: 'Guitarist', role: 'Guitar' },
		{ name: 'Bassist', role: 'Bass' },
		{ name: 'Keyboardist', role: 'Keys' },
		{ name: 'Drummer', role: 'Drums' }
	],
	items: [
		// ── Drums (upstage center) ───────────────────────────────
		{
			name: 'Drum Kit',
			type: 'drumset',
			category: 'drums',
			path: 'drums/drum_kits/threetoms',
			variants: {
				L: 'ThreeTomsL.png',
				default: 'ThreeToms.png',
				R: 'ThreeTomsR.png',
				RA: 'ThreeTomsRA.png',
				LA: 'ThreeTomsLA.png'
			},
			currentVariant: 'default',
			imageWidth: 198,
			imageHeight: 122,
			relX: 0.42,
			relY: 0.08,
			channel: 1,
			personIndex: 4
		},
		{
			name: 'Drum Wedge',
			type: 'monitor',
			category: 'monitors',
			path: 'monitors/wedge',
			variants: { default: 'Wedge.png' },
			currentVariant: 'default',
			imageWidth: 40,
			imageHeight: 39,
			relX: 0.58,
			relY: 0.22,
			personIndex: null
		},

		// ── Guitar (stage left = canvas left) ────────────────────
		{
			name: 'Guitar',
			type: 'instrument',
			category: 'guitars',
			path: 'guitars/electric/guitaronstand',
			variants: {
				R: 'guitaronstandR.png',
				L: 'guitaronstandL.png',
				LA: 'guitaronstandLA.png',
				default: 'guitaronstand.png',
				RA: 'guitaronstandRA.png'
			},
			currentVariant: 'default',
			imageWidth: 52,
			imageHeight: 80,
			relX: 0.12,
			relY: 0.3,
			channel: 11,
			personIndex: 1
		},
		{
			name: 'Guitar Amp',
			type: 'amp',
			category: 'amps',
			path: 'amps/guitar/fender_amp',
			variants: {
				default: 'FenderAmp.png',
				back: 'FenderAmpBack.png',
				R: 'FenderAmpR.png',
				RA: 'FenderAmpRA.png',
				L: 'FenderAmpL.png',
				LA: 'FenderAmpLA.png'
			},
			currentVariant: 'default',
			imageWidth: 57,
			imageHeight: 36,
			relX: 0.05,
			relY: 0.18,
			channel: 12,
			personIndex: null
		},
		{
			name: 'Guitar Wedge',
			type: 'monitor',
			category: 'monitors',
			path: 'monitors/wedge',
			variants: { default: 'Wedge.png' },
			currentVariant: 'default',
			imageWidth: 40,
			imageHeight: 39,
			relX: 0.16,
			relY: 0.48,
			personIndex: null
		},

		// ── Bass (stage right = canvas right) ────────────────────
		{
			name: 'Bass',
			type: 'instrument',
			category: 'guitars',
			path: 'guitars/bass/p_bass',
			variants: {
				RA: 'P_BassRA.png',
				default: 'P_Bass.png'
			},
			currentVariant: 'default',
			imageWidth: 48,
			imageHeight: 72,
			relX: 0.78,
			relY: 0.3,
			channel: 13,
			personIndex: 2
		},
		{
			name: 'Bass Amp',
			type: 'amp',
			category: 'amps',
			path: 'amps/bass/bassamp',
			variants: {
				L: 'BassAmpL.png',
				RA: 'BassAmpRA.png',
				LA: 'BassAmpLA.png',
				R: 'BassAmpR.png',
				default: 'BassAmp.png'
			},
			currentVariant: 'default',
			imageWidth: 52,
			imageHeight: 41,
			relX: 0.86,
			relY: 0.18,
			channel: 14,
			personIndex: null
		},
		{
			name: 'Bass Wedge',
			type: 'monitor',
			category: 'monitors',
			path: 'monitors/wedge',
			variants: { default: 'Wedge.png' },
			currentVariant: 'default',
			imageWidth: 40,
			imageHeight: 39,
			relX: 0.74,
			relY: 0.48,
			personIndex: null
		},

		// ── Keys (stage right of center, between bass and drums) ─
		{
			name: 'Keyboard',
			type: 'instrument',
			category: 'keys',
			path: 'keys/fantom',
			variants: {
				default: 'Fantom.png',
				R: 'FantomR.png',
				B: 'FantomB.png',
				L: 'FantomL.png',
				RA: 'FantomRA.png',
				RB: 'FantomRB.png',
				LB: 'FantomLB.png',
				LA: 'FantomLA.png'
			},
			currentVariant: 'default',
			imageWidth: 110,
			imageHeight: 41,
			relX: 0.58,
			relY: 0.38,
			channel: 15,
			personIndex: 3
		},
		{
			name: 'Key Amp',
			type: 'amp',
			category: 'amps',
			path: 'amps/keyboard/keyamp',
			variants: {
				RA: 'keyampRA.png',
				LA: 'keyampLA.png',
				default: 'keyamp.png'
			},
			currentVariant: 'default',
			imageWidth: 41,
			imageHeight: 42,
			relX: 0.68,
			relY: 0.28,
			channel: 16,
			personIndex: null
		},
		{
			name: 'Keys Wedge',
			type: 'monitor',
			category: 'monitors',
			path: 'monitors/wedge',
			variants: { default: 'Wedge.png' },
			currentVariant: 'default',
			imageWidth: 40,
			imageHeight: 39,
			relX: 0.56,
			relY: 0.5,
			personIndex: null
		},

		// ── Vocals (downstage center) ────────────────────────────
		{
			name: 'Vocal Mic',
			type: 'stand',
			category: 'mics',
			path: 'mics/stands/centervocal',
			variants: {
				BRA: 'Center_VocalBackRA.png',
				R: 'Center_VocalR.png',
				B: 'Center_VocalBack.png',
				BLA: 'Center_VocalBackLA.png',
				LA: 'Center_VocalLA.png',
				RA: 'Center_VocalRA.png',
				default: 'Center_Vocal.png',
				L: 'Center_VocalL.png'
			},
			currentVariant: 'default',
			imageWidth: 28,
			imageHeight: 100,
			relX: 0.47,
			relY: 0.58,
			channel: 17,
			personIndex: 0
		},
		{
			name: 'Vocal Wedge',
			type: 'monitor',
			category: 'monitors',
			path: 'monitors/wedge',
			variants: { default: 'Wedge.png' },
			currentVariant: 'default',
			imageWidth: 40,
			imageHeight: 39,
			relX: 0.46,
			relY: 0.82,
			personIndex: null
		}
	]
};

export const BAND_TEMPLATES: BandTemplate[] = [fourPiece, fivePiece];

/**
 * Convert a template to the metadata format used by stage_plots.
 * Returns { items, persons } where items have absolute pixel positions
 * for a canvas of the given dimensions.
 */
export function applyTemplate(
	template: BandTemplate,
	canvasWidth: number,
	canvasHeight: number,
	personIds: number[]
): { items: any[]; personIds: number[] } {
	const baseTime = Date.now();

	const items = template.items.map((ti, idx) => {
		const x = Math.round(ti.relX * canvasWidth - ti.imageWidth / 2);
		const y = Math.round(ti.relY * canvasHeight - ti.imageHeight / 2);

		const defaultImage = ti.variants[ti.currentVariant] || ti.variants['default'];
		const imagePath = `/final_assets/${ti.path}/${defaultImage}`;

		return {
			id: baseTime + idx,
			type: ti.type,
			name: ti.name,
			channel: ti.channel != null ? String(ti.channel) : '',
			person_id: ti.personIndex != null ? (personIds[ti.personIndex] ?? null) : null,
			currentVariant: ti.currentVariant,
			position: {
				x: Math.max(0, x),
				y: Math.max(0, y),
				width: ti.imageWidth,
				height: ti.imageHeight
			},
			itemData: {
				name: ti.name,
				item_type: ti.type,
				type: ti.type,
				category: ti.category,
				image: imagePath,
				variants: ti.variants,
				path: ti.path
			}
		};
	});

	return { items, personIds };
}
