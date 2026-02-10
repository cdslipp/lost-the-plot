// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Share Codec — encodes/decodes stage plot data into URL-safe compressed strings.
 *
 * URL format: /s/{bandName}/{plotName}#{compressedPayload}
 *
 * The payload is: JSON -> gzip (CompressionStream) -> base64url
 * Band name and plot name appear in plaintext in the URL path.
 * Everything else (people, positions, items) is compressed and opaque.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

/** Compact representation of a person (band-level contact info) */
export type SharePerson = [
	name: string,
	role: string,
	pronouns: string,
	phone: string,
	email: string,
	memberType: number, // 0=performer, 1=crew, 2=management, 3=other
	status: number // 0=permanent, 1=occasional, 2=temporary, 3=inactive
];

/** Compact representation of a musician (plot-level) */
export type ShareMusician = [name: string, instrument: string];

/**
 * Compact representation of an item on the stage plot.
 * Standard item: [catalogIdx, variantIdx, x, y, w, h, channel, musicianIdx, typeEnum]
 * Riser item:    [catalogIdx, variantIdx, x, y, w, h, channel, musicianIdx, typeEnum, riserW, riserD, riserH]
 */
export type ShareItem = number[];

/** The full shareable payload (before compression) */
export interface SharePayload {
	/** Schema version for forward compatibility */
	v: number;
	/** Stage width in feet */
	sw: number;
	/** Stage depth in feet */
	sd: number;
	/** Persons array (band-level contacts, compressed) */
	p: SharePerson[];
	/** Musicians array (plot-level) */
	m: ShareMusician[];
	/** Items array (compact numeric tuples) */
	i: ShareItem[];
}

// ─── Enums for compact encoding ──────────────────────────────────────────────

const MEMBER_TYPE_MAP = ['performer', 'crew', 'management', 'other'] as const;
const MEMBER_STATUS_MAP = ['permanent', 'occasional', 'temporary', 'inactive'] as const;

/** Item type enum — maps string types to compact numbers */
const ITEM_TYPE_MAP = [
	'input',
	'output',
	'riser',
	'stageDeck',
	'amp',
	'cable_connector',
	'di_box',
	'drumset',
	'equipment',
	'furniture',
	'instrument',
	'microphone',
	'mixer',
	'monitor',
	'pedal',
	'person',
	'power',
	'speaker',
	'stagebox',
	'stagecraft',
	'stand'
] as const;

/**
 * Common variant keys — maps string variant names to compact indices.
 * Variants not in this list fall back to index 0 (default).
 */
const VARIANT_MAP = [
	'default',
	'R',
	'L',
	'RA',
	'LA',
	'RB',
	'LB',
	'back',
	'backRA',
	'backLA',
	'B',
	'BRA',
	'BLA',
	'_Vocal',
	'_VocalR',
	'_VocalL',
	'_VocalRA',
	'_VocalLA',
	'_short',
	'_shortR',
	'_shortL',
	'_shortRA',
	'_shortLA',
	'_shortBack',
	'4',
	'projector',
	'quad'
] as const;

// ─── Catalog Index ───────────────────────────────────────────────────────────

/** Build a map from catalog item path -> index for compact encoding */
export function buildCatalogIndex(catalog: { path: string }[]): Map<string, number> {
	const map = new Map<string, number>();
	for (let i = 0; i < catalog.length; i++) {
		map.set(catalog[i].path, i);
	}
	return map;
}

// ─── Encode ──────────────────────────────────────────────────────────────────

export interface EncodeInput {
	/** Stage width in feet */
	stageWidth: number;
	/** Stage depth in feet */
	stageDepth: number;
	/** Plot-level items */
	items: Array<{
		type: string;
		itemData?: {
			path?: string;
			riserWidth?: number;
			riserDepth?: number;
			riserHeight?: number;
			[key: string]: unknown;
		} | null;
		currentVariant?: string;
		position: { x: number; y: number; width: number; height: number };
		channel: string;
		musician: string;
		size?: string;
		name?: string;
	}>;
	/** Plot-level musicians */
	musicians: Array<{ name: string; instrument: string }>;
	/** Band-level persons (optional — will be included if provided) */
	persons?: Array<{
		name: string;
		role?: string;
		pronouns?: string;
		phone?: string;
		email?: string;
		member_type?: string;
		status?: string;
	}>;
}

/**
 * Encode a stage plot into a compact payload string suitable for a URL hash.
 *
 * @param input - The plot data to encode
 * @param catalogIndex - Map from item path to catalog index (from buildCatalogIndex)
 * @returns base64url-encoded compressed payload string
 */
export async function encodePayload(
	input: EncodeInput,
	catalogIndex: Map<string, number>
): Promise<string> {
	// Build musician name -> index lookup
	const musicianLookup = new Map<string, number>();
	input.musicians.forEach((m, i) => musicianLookup.set(m.name, i));

	const payload: SharePayload = {
		v: 2,
		sw: input.stageWidth,
		sd: input.stageDepth,
		p: (input.persons ?? []).map((person) => [
			person.name,
			person.role ?? '',
			person.pronouns ?? '',
			person.phone ?? '',
			person.email ?? '',
			Math.max(0, MEMBER_TYPE_MAP.indexOf(person.member_type as any)),
			Math.max(0, MEMBER_STATUS_MAP.indexOf(person.status as any))
		]),
		m: input.musicians.map((m) => [m.name, m.instrument]),
		i: input.items.map((item) => {
			const catalogIdx = item.itemData?.path ? (catalogIndex.get(item.itemData.path) ?? -1) : -1;
			const variantIdx = Math.max(
				0,
				VARIANT_MAP.indexOf((item.currentVariant ?? 'default') as (typeof VARIANT_MAP)[number])
			);
			const typeIdx = Math.max(
				0,
				ITEM_TYPE_MAP.indexOf(item.type as (typeof ITEM_TYPE_MAP)[number])
			);
			const musicianIdx = item.musician ? (musicianLookup.get(item.musician) ?? -1) : -1;

			// Positions encoded as centifeet (×100) for integer precision
			const tuple: number[] = [
				catalogIdx,
				variantIdx,
				Math.round(item.position.x * 100),
				Math.round(item.position.y * 100),
				Math.round(item.position.width * 100),
				Math.round(item.position.height * 100),
				item.channel ? parseInt(item.channel, 10) || 0 : 0,
				musicianIdx,
				typeIdx
			];

			// Append riser dimensions if it's a riser
			if (item.type === 'riser' && item.itemData) {
				tuple.push(
					item.itemData.riserWidth ?? 0,
					item.itemData.riserDepth ?? 0,
					item.itemData.riserHeight ?? 0
				);
			}

			return tuple;
		})
	};

	const json = JSON.stringify(payload);
	return compress(json);
}

/**
 * Build a full share URL from the encoded payload.
 *
 * @param baseUrl - The base URL of the app (e.g. "https://stageplotter.com" or window.location.origin)
 * @param bandName - Band name (will appear in plaintext in the URL)
 * @param plotName - Plot name (will appear in plaintext in the URL)
 * @param payload - The base64url payload from encodePayload()
 */
export function buildShareUrl(
	baseUrl: string,
	bandName: string,
	plotName: string,
	payload: string
): string {
	const safeBand = encodeURIComponent(bandName.trim() || 'Unnamed-Band');
	const safePlot = encodeURIComponent(plotName.trim() || 'Untitled-Plot');
	return `${baseUrl}/s/${safeBand}/${safePlot}#${payload}`;
}

// ─── Decode ──────────────────────────────────────────────────────────────────

export interface DecodedPlot {
	stageWidth: number;
	stageDepth: number;
	persons: Array<{
		name: string;
		role: string;
		pronouns: string;
		phone: string;
		email: string;
		member_type: string;
		status: string;
	}>;
	musicians: Array<{ id: number; name: string; instrument: string }>;
	items: Array<{
		id: number;
		type: string;
		name: string;
		itemData: {
			path: string;
			name: string;
			item_type: string;
			variants: Record<string, string>;
			riserWidth?: number;
			riserDepth?: number;
			riserHeight?: number;
		} | null;
		currentVariant: string;
		position: { x: number; y: number; width: number; height: number };
		channel: string;
		musician: string;
	}>;
}

/**
 * Decode a compressed payload string back into a full stage plot.
 *
 * @param payloadStr - The base64url payload from the URL hash
 * @param catalog - The full catalog array (loaded from items.json)
 * @returns The decoded plot data
 */
export async function decodePayload(
	payloadStr: string,
	catalog: Array<{
		path: string;
		name: string;
		item_type: string;
		variants: Record<string, string>;
	}>
): Promise<DecodedPlot> {
	const json = await decompress(payloadStr);
	const payload: SharePayload = JSON.parse(json);

	if (payload.v !== 1 && payload.v !== 2) {
		throw new Error(`Unsupported share format version: ${payload.v}`);
	}

	const isV2 = payload.v >= 2;

	// Rebuild musicians with IDs
	const musicians = payload.m.map(([name, instrument], i) => ({
		id: Date.now() + i,
		name,
		instrument
	}));

	// Rebuild persons
	const persons = payload.p.map(([name, role, pronouns, phone, email, memberType, status]) => ({
		name,
		role,
		pronouns,
		phone,
		email,
		member_type: MEMBER_TYPE_MAP[memberType] ?? 'performer',
		status: MEMBER_STATUS_MAP[status] ?? 'permanent'
	}));

	// For v1→feet migration: compute pixel-to-feet conversion factors
	// V1 used a 1100px-wide canvas
	const v1CanvasW = 1100;
	const v1CanvasH = Math.round((v1CanvasW * payload.sd) / payload.sw);
	const v1PxPerFtX = v1CanvasW / payload.sw;
	const v1PxPerFtY = v1CanvasH / payload.sd;

	// Rebuild items
	const items = payload.i.map((tuple, idx) => {
		const [catalogIdx, variantIdx, rawX, rawY, rawW, rawH, channel, musicianIdx, typeIdx] = tuple;

		const typeName = ITEM_TYPE_MAP[typeIdx] ?? 'input';
		const variantName = VARIANT_MAP[variantIdx] ?? 'default';
		const musicianName =
			musicianIdx >= 0 && musicianIdx < musicians.length ? musicians[musicianIdx].name : '';

		// Decode positions: v2=centifeet÷100, v1=pixels→feet
		let x: number, y: number, w: number, h: number;
		if (isV2) {
			x = rawX / 100;
			y = rawY / 100;
			w = rawW / 100;
			h = rawH / 100;
		} else {
			x = rawX / v1PxPerFtX;
			y = rawY / v1PxPerFtY;
			w = rawW / v1PxPerFtX;
			h = rawH / v1PxPerFtY;
		}

		// Reconstruct itemData from catalog
		let itemData: DecodedPlot['items'][number]['itemData'] = null;
		if (catalogIdx >= 0 && catalogIdx < catalog.length) {
			const catItem = catalog[catalogIdx];
			itemData = {
				path: catItem.path,
				name: catItem.name,
				item_type: catItem.item_type,
				variants: catItem.variants
			};
		}

		// Handle riser extra fields
		if (typeName === 'riser' && tuple.length >= 12) {
			const riserW = tuple[9];
			const riserD = tuple[10];
			const riserH = tuple[11];
			itemData = {
				path: '',
				name: `Riser ${riserW}'x${riserD}'`,
				item_type: 'riser',
				variants: {},
				riserWidth: riserW,
				riserDepth: riserD,
				riserHeight: riserH
			};
		}

		return {
			id: Date.now() + idx + musicians.length,
			type: typeName,
			name: itemData?.name ?? '',
			itemData,
			currentVariant: variantName,
			position: { x, y, width: w, height: h },
			channel: channel > 0 ? String(channel) : '',
			musician: musicianName
		};
	});

	return {
		stageWidth: payload.sw,
		stageDepth: payload.sd,
		persons,
		musicians,
		items
	};
}

// ─── Compression utilities (browser-native gzip) ────────────────────────────

/**
 * Compress a string using gzip via the CompressionStream API,
 * then encode as base64url.
 */
async function compress(input: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(input);

	const cs = new CompressionStream('gzip');
	const writer = cs.writable.getWriter();
	writer.write(data as unknown as BufferSource);
	writer.close();

	const reader = cs.readable.getReader();
	const chunks: Uint8Array[] = [];
	let totalLength = 0;

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		chunks.push(value);
		totalLength += value.length;
	}

	// Merge chunks
	const compressed = new Uint8Array(totalLength);
	let offset = 0;
	for (const chunk of chunks) {
		compressed.set(chunk, offset);
		offset += chunk.length;
	}

	return uint8ToBase64url(compressed);
}

/**
 * Decompress a base64url string using gzip via the DecompressionStream API.
 */
async function decompress(base64url: string): Promise<string> {
	const compressed = base64urlToUint8(base64url);

	const ds = new DecompressionStream('gzip');
	const writer = ds.writable.getWriter();
	writer.write(compressed as unknown as BufferSource);
	writer.close();

	const reader = ds.readable.getReader();
	const chunks: Uint8Array[] = [];
	let totalLength = 0;

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		chunks.push(value);
		totalLength += value.length;
	}

	const decompressed = new Uint8Array(totalLength);
	let offset = 0;
	for (const chunk of chunks) {
		decompressed.set(chunk, offset);
		offset += chunk.length;
	}

	const decoder = new TextDecoder();
	return decoder.decode(decompressed);
}

// ─── Base64url encoding (URL-safe, no padding) ──────────────────────────────

function uint8ToBase64url(bytes: Uint8Array): string {
	let binary = '';
	for (let i = 0; i < bytes.length; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlToUint8(base64url: string): Uint8Array {
	// Restore standard base64
	let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
	// Add padding
	while (base64.length % 4 !== 0) {
		base64 += '=';
	}
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes;
}
