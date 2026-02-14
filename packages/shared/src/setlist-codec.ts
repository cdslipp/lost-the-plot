// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Setlist Codec — encodes/decodes setlist data into URL-safe compressed strings.
 *
 * URL format: /sl/{bandName}/{gigName}#{compressedPayload}
 *
 * The payload is: JSON -> gzip (CompressionStream) -> base64url
 * Reuses compression utilities from share-codec.ts.
 */

import { compressToBase64url, decompressFromBase64url } from './share-codec.js';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SetlistShareInput {
	/** Array of sets, each with a name and songs */
	sets: Array<{
		name: string;
		songs: Array<{ title: string; key: string }>;
	}>;
	/** Font choice: 0=sans, 1=serif, 2=marker */
	font: number;
	/** Page size: 0=letter, 1=A4 */
	pageSize: number;
	/** Show keys: 0=no, 1=yes */
	showKeys: number;
}

export interface SetlistShareData {
	v: number;
	sets: Array<{ n: string; s: [string, string][] }>;
	f: number;
	p: number;
	k: number;
}

// ─── Encode ──────────────────────────────────────────────────────────────────

/**
 * Encode setlist data into a compact payload string suitable for a URL hash.
 */
export async function encodeSetlist(input: SetlistShareInput): Promise<string> {
	const payload: SetlistShareData = {
		v: 1,
		sets: input.sets.map((set) => ({
			n: set.name,
			s: set.songs.map((song) => [song.title, song.key])
		})),
		f: input.font,
		p: input.pageSize,
		k: input.showKeys
	};
	return compressToBase64url(JSON.stringify(payload));
}

// ─── Decode ──────────────────────────────────────────────────────────────────

/**
 * Decode a compressed payload string back into setlist data.
 */
export async function decodeSetlist(payload: string): Promise<SetlistShareData> {
	const json = await decompressFromBase64url(payload);
	const data: SetlistShareData = JSON.parse(json);
	if (data.v !== 1) {
		throw new Error(`Unsupported setlist format version: ${data.v}`);
	}
	return data;
}

// ─── URL Builder ─────────────────────────────────────────────────────────────

/**
 * Build a full share URL for a setlist.
 */
export function buildSetlistShareUrl(
	baseUrl: string,
	bandName: string,
	gigName: string,
	payload: string
): string {
	const safeBand = encodeURIComponent(bandName.trim() || 'Unnamed-Band');
	const safeGig = encodeURIComponent(gigName.trim() || 'Untitled-Gig');
	return `${baseUrl}/sl/${safeBand}/${safeGig}#${payload}`;
}
