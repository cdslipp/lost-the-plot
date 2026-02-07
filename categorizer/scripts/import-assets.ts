/**
 * Import missing assets from StagePlotPirate reference repo.
 * Copies image files and adds new entries to items.json.
 *
 * Run with: bun run categorizer/scripts/import-assets.ts
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, cpSync } from 'fs';
import { join, basename } from 'path';

const ASSETS_DIR = join(import.meta.dir, '..', '..', 'app', 'static', 'final_assets');
const REF_DIR = join(import.meta.dir, '..', '..', 'ref', 'StagePlotPirate', 'src', 'img');
const ITEMS_PATH = join(ASSETS_DIR, 'items.json');

interface Item {
	name: string;
	item_type: string;
	variants: Record<string, string>;
	path: string;
	is_backline: boolean;
	auto_number_prefix: string;
	person_subcategory: string;
}

// Load current items
const items: Item[] = JSON.parse(readFileSync(ITEMS_PATH, 'utf-8'));
const existingPaths = new Set(items.map((i) => i.path));
console.log(`Loaded ${items.length} existing items`);

// Variant key mapping: suffix -> key
// Standard suffixes: L, R, LA, RA, LB, RB, B, Back, BackLA, BackRA, 1, 1L, etc.
function buildVariants(files: string[], prefix: string): Record<string, string> {
	const variants: Record<string, string> = {};
	const prefixLower = prefix.toLowerCase();

	for (const file of files) {
		if (!file.endsWith('.png') && !file.endsWith('.jpg')) continue;

		const namePart = file.replace(/\.(png|jpg)$/, '');
		const nameLower = namePart.toLowerCase();

		// Must start with the prefix (case-insensitive)
		if (!nameLower.startsWith(prefixLower)) continue;

		const suffix = namePart.slice(prefix.length);

		if (suffix === '' || suffix === '1') {
			variants['default'] = file;
		} else {
			// Map common suffixes to variant keys
			const key = suffix.replace(/^Back/, 'B').replace(/^back/, 'B');
			variants[key] = file;
		}
	}

	return variants;
}

interface ImportSpec {
	refDir: string; // Directory in StagePlotPirate
	prefix: string; // File prefix to match
	ourPath: string; // Target path in our assets
	name: string; // Display name
	item_type: string;
	category: string;
	is_backline: boolean;
	auto_number_prefix: string;
	person_subcategory: string;
}

const IMPORTS: ImportSpec[] = [
	// ─── Pianos/Keys ─────────────────────────────────────────
	{
		refDir: 'piano',
		prefix: 'BabyGrand',
		ourPath: 'keys/babygrand',
		name: 'Baby Grand',
		item_type: 'instrument',
		category: 'keys',
		is_backline: true,
		auto_number_prefix: 'Keys',
		person_subcategory: ''
	},
	{
		refDir: 'piano',
		prefix: 'ClosedGrand',
		ourPath: 'keys/closedgrand',
		name: 'Closed Grand',
		item_type: 'instrument',
		category: 'keys',
		is_backline: true,
		auto_number_prefix: 'Keys',
		person_subcategory: ''
	},
	{
		refDir: 'piano',
		prefix: 'grandpiano',
		ourPath: 'keys/grandpiano',
		name: 'Grand Piano',
		item_type: 'instrument',
		category: 'keys',
		is_backline: true,
		auto_number_prefix: 'Keys',
		person_subcategory: ''
	},
	{
		refDir: 'piano',
		prefix: 'Steinway',
		ourPath: 'keys/steinway',
		name: 'Steinway',
		item_type: 'instrument',
		category: 'keys',
		is_backline: true,
		auto_number_prefix: 'Keys',
		person_subcategory: ''
	},
	{
		refDir: 'piano',
		prefix: 'upright',
		ourPath: 'keys/upright',
		name: 'Upright Piano',
		item_type: 'instrument',
		category: 'keys',
		is_backline: true,
		auto_number_prefix: 'Keys',
		person_subcategory: ''
	},
	{
		refDir: 'piano',
		prefix: 'pplayer',
		ourPath: 'people/players/pianoplayer',
		name: 'Piano Player',
		item_type: 'person',
		category: 'people',
		is_backline: false,
		auto_number_prefix: '',
		person_subcategory: 'player'
	},
	{
		refDir: 'synth',
		prefix: 'DrumMachine',
		ourPath: 'keys/drummachine',
		name: 'Drum Machine',
		item_type: 'instrument',
		category: 'keys',
		is_backline: true,
		auto_number_prefix: 'Keys',
		person_subcategory: ''
	},

	// ─── Speakers/Monitors ───────────────────────────────────
	{
		refDir: 'speaker',
		prefix: 'sidefill',
		ourPath: 'monitors/sidefill',
		name: 'Sidefill',
		item_type: 'speaker',
		category: 'monitors',
		is_backline: false,
		auto_number_prefix: '',
		person_subcategory: ''
	},
	{
		refDir: 'speaker',
		prefix: 'LowProfile',
		ourPath: 'monitors/lowprofile',
		name: 'Low Profile Monitor',
		item_type: 'speaker',
		category: 'monitors',
		is_backline: false,
		auto_number_prefix: '',
		person_subcategory: ''
	},
	{
		refDir: 'speaker',
		prefix: 'Subwoofer',
		ourPath: 'monitors/subwoofer',
		name: 'Subwoofer',
		item_type: 'speaker',
		category: 'monitors',
		is_backline: false,
		auto_number_prefix: '',
		person_subcategory: ''
	},
	{
		refDir: 'speaker',
		prefix: 'linearray',
		ourPath: 'monitors/linearray',
		name: 'Line Array',
		item_type: 'speaker',
		category: 'monitors',
		is_backline: false,
		auto_number_prefix: '',
		person_subcategory: ''
	},
	{
		refDir: 'speaker',
		prefix: 'BoseL1',
		ourPath: 'monitors/bosel1',
		name: 'Bose L1',
		item_type: 'speaker',
		category: 'monitors',
		is_backline: false,
		auto_number_prefix: '',
		person_subcategory: ''
	},
	{
		refDir: 'speaker',
		prefix: 'speakwstand',
		ourPath: 'monitors/speakerwstand',
		name: 'Speaker w/ Stand',
		item_type: 'speaker',
		category: 'monitors',
		is_backline: false,
		auto_number_prefix: '',
		person_subcategory: ''
	},
	{
		refDir: 'speaker',
		prefix: 'speaknsubwstand',
		ourPath: 'monitors/speaknsubwstand',
		name: 'Speaker & Sub w/ Stand',
		item_type: 'speaker',
		category: 'monitors',
		is_backline: false,
		auto_number_prefix: '',
		person_subcategory: ''
	},
	{
		refDir: 'monitor',
		prefix: 'Wedge',
		ourPath: 'monitors/wedge',
		name: 'Wedge Monitor',
		item_type: 'monitor',
		category: 'monitors',
		is_backline: false,
		auto_number_prefix: '',
		person_subcategory: ''
	},
	// Also pick up lowercase wedge variants
	{
		refDir: 'monitor',
		prefix: 'wedge',
		ourPath: 'monitors/wedge',
		name: 'Wedge Monitor',
		item_type: 'monitor',
		category: 'monitors',
		is_backline: false,
		auto_number_prefix: '',
		person_subcategory: ''
	},
	{
		refDir: 'monitor',
		prefix: 'personal_sys',
		ourPath: 'monitors/personalsys',
		name: 'Personal Monitor System',
		item_type: 'monitor',
		category: 'monitors',
		is_backline: false,
		auto_number_prefix: '',
		person_subcategory: ''
	},
	{
		refDir: 'monitor',
		prefix: 'in_ear',
		ourPath: 'monitors/inear',
		name: 'In-Ear Monitor',
		item_type: 'monitor',
		category: 'monitors',
		is_backline: false,
		auto_number_prefix: '',
		person_subcategory: ''
	},

	// ─── Mic Stands ──────────────────────────────────────────
	{
		refDir: 'mic_stand',
		prefix: 'Boom57',
		ourPath: 'mics/stands/boom57',
		name: 'Boom 57',
		item_type: 'stand',
		category: 'mics',
		is_backline: false,
		auto_number_prefix: '',
		person_subcategory: ''
	},
	{
		refDir: 'mic_stand',
		prefix: 'BoomLshort',
		ourPath: 'mics/stands/boomlshort',
		name: 'Boom L Short',
		item_type: 'stand',
		category: 'mics',
		is_backline: false,
		auto_number_prefix: '',
		person_subcategory: ''
	},
	{
		refDir: 'mic_stand',
		prefix: 'BoomRshort',
		ourPath: 'mics/stands/boomrshort',
		name: 'Boom R Short',
		item_type: 'stand',
		category: 'mics',
		is_backline: false,
		auto_number_prefix: '',
		person_subcategory: ''
	},
	{
		refDir: 'mic_stand',
		prefix: 'Center_Vocal',
		ourPath: 'mics/stands/centervocal',
		name: 'Center Vocal Stand',
		item_type: 'stand',
		category: 'mics',
		is_backline: false,
		auto_number_prefix: '',
		person_subcategory: ''
	},
	{
		refDir: 'mic_stand',
		prefix: 'K&Mstand',
		ourPath: 'mics/stands/kmstand',
		name: 'K&M Stand',
		item_type: 'stand',
		category: 'mics',
		is_backline: false,
		auto_number_prefix: '',
		person_subcategory: ''
	},
	{
		refDir: 'mic_stand',
		prefix: 'Straight',
		ourPath: 'mics/stands/straight',
		name: 'Straight Mic Stand',
		item_type: 'stand',
		category: 'mics',
		is_backline: false,
		auto_number_prefix: '',
		person_subcategory: ''
	},

	// ─── Pedals ──────────────────────────────────────────────
	{
		refDir: 'pedal',
		prefix: 'BossPedal',
		ourPath: 'equipment/bosspedal',
		name: 'Boss Pedal',
		item_type: 'pedal',
		category: 'equipment',
		is_backline: false,
		auto_number_prefix: '',
		person_subcategory: ''
	},
	{
		refDir: 'pedal',
		prefix: 'pedalboard',
		ourPath: 'equipment/pedalboard',
		name: 'Pedalboard',
		item_type: 'pedal',
		category: 'equipment',
		is_backline: false,
		auto_number_prefix: '',
		person_subcategory: ''
	},

	// ─── People ──────────────────────────────────────────────
	{
		refDir: 'singer',
		prefix: 'singer',
		ourPath: 'people/players/singer',
		name: 'Singer',
		item_type: 'person',
		category: 'people',
		is_backline: false,
		auto_number_prefix: 'Vox',
		person_subcategory: 'player'
	},
	{
		refDir: 'choir',
		prefix: 'choir',
		ourPath: 'people/choir/choir',
		name: 'Choir',
		item_type: 'person',
		category: 'people',
		is_backline: false,
		auto_number_prefix: '',
		person_subcategory: 'player'
	},
	{
		refDir: 'artist',
		prefix: 'conductor',
		ourPath: 'people/players/conductor',
		name: 'Conductor',
		item_type: 'person',
		category: 'people',
		is_backline: false,
		auto_number_prefix: '',
		person_subcategory: 'player'
	},
	{
		refDir: 'artist',
		prefix: 'dancer',
		ourPath: 'people/players/dancer',
		name: 'Dancer',
		item_type: 'person',
		category: 'people',
		is_backline: false,
		auto_number_prefix: '',
		person_subcategory: 'player'
	},

	// ─── Saxophones ──────────────────────────────────────────
	{
		refDir: 'saxphone',
		prefix: 'altosax',
		ourPath: 'winds/altosax',
		name: 'Alto Sax',
		item_type: 'instrument',
		category: 'winds',
		is_backline: true,
		auto_number_prefix: 'Sax',
		person_subcategory: ''
	},
	{
		refDir: 'saxphone',
		prefix: 'baritonesax',
		ourPath: 'winds/baritonesax',
		name: 'Baritone Sax',
		item_type: 'instrument',
		category: 'winds',
		is_backline: true,
		auto_number_prefix: 'Sax',
		person_subcategory: ''
	},
	{
		refDir: 'saxphone',
		prefix: 'tenorsax',
		ourPath: 'winds/tenorsax',
		name: 'Tenor Sax',
		item_type: 'instrument',
		category: 'winds',
		is_backline: true,
		auto_number_prefix: 'Sax',
		person_subcategory: ''
	},
	{
		refDir: 'saxphone',
		prefix: 'saxman',
		ourPath: 'people/players/saxman',
		name: 'Sax Player',
		item_type: 'person',
		category: 'people',
		is_backline: false,
		auto_number_prefix: 'Sax',
		person_subcategory: 'player'
	},
	{
		refDir: 'saxphone',
		prefix: 'saxophonist',
		ourPath: 'people/players/saxophonist',
		name: 'Saxophonist',
		item_type: 'person',
		category: 'people',
		is_backline: false,
		auto_number_prefix: 'Sax',
		person_subcategory: 'player'
	},

	// ─── DI Boxes ────────────────────────────────────────────
	{
		refDir: 'device',
		prefix: 'DI',
		ourPath: 'equipment/di',
		name: 'DI Box',
		item_type: 'di_box',
		category: 'equipment',
		is_backline: false,
		auto_number_prefix: '',
		person_subcategory: ''
	},
	{
		refDir: 'device',
		prefix: 'stereoDI',
		ourPath: 'equipment/stereodi',
		name: 'Stereo DI',
		item_type: 'di_box',
		category: 'equipment',
		is_backline: false,
		auto_number_prefix: '',
		person_subcategory: ''
	},

	// ─── Equipment ───────────────────────────────────────────
	{
		refDir: 'device',
		prefix: 'EQ',
		ourPath: 'equipment/eq',
		name: 'EQ',
		item_type: 'equipment',
		category: 'equipment',
		is_backline: false,
		auto_number_prefix: '',
		person_subcategory: ''
	},
	{
		refDir: 'device',
		prefix: 'Gates',
		ourPath: 'equipment/gates',
		name: 'Gates',
		item_type: 'equipment',
		category: 'equipment',
		is_backline: false,
		auto_number_prefix: '',
		person_subcategory: ''
	},
	{
		refDir: 'device',
		prefix: 'CDplayer',
		ourPath: 'equipment/cdplayer',
		name: 'CD Player',
		item_type: 'equipment',
		category: 'equipment',
		is_backline: false,
		auto_number_prefix: '',
		person_subcategory: ''
	},
	{
		refDir: 'equipment',
		prefix: 'flightcase',
		ourPath: 'equipment/flightcase',
		name: 'Flight Case',
		item_type: 'equipment',
		category: 'equipment',
		is_backline: false,
		auto_number_prefix: '',
		person_subcategory: ''
	},
	{
		refDir: 'equipment',
		prefix: 'LED_Wall',
		ourPath: 'equipment/ledwall',
		name: 'LED Wall',
		item_type: 'equipment',
		category: 'equipment',
		is_backline: false,
		auto_number_prefix: '',
		person_subcategory: ''
	},
	{
		refDir: 'equipment',
		prefix: 'FloorBox',
		ourPath: 'equipment/floorbox',
		name: 'Floor Box',
		item_type: 'equipment',
		category: 'equipment',
		is_backline: false,
		auto_number_prefix: '',
		person_subcategory: ''
	},

	// ─── Stage Boxes / Connectors ────────────────────────────
	{
		refDir: 'io',
		prefix: 'stagebox8',
		ourPath: 'connectors/stageboxes/stagebox8',
		name: 'Stagebox 8',
		item_type: 'stagebox',
		category: 'connectors',
		is_backline: false,
		auto_number_prefix: '',
		person_subcategory: ''
	},
	{
		refDir: 'io',
		prefix: 'stagebox12',
		ourPath: 'connectors/stageboxes/stagebox12',
		name: 'Stagebox 12',
		item_type: 'stagebox',
		category: 'connectors',
		is_backline: false,
		auto_number_prefix: '',
		person_subcategory: ''
	},
	{
		refDir: 'io',
		prefix: 'stagebox16',
		ourPath: 'connectors/stageboxes/stagebox16',
		name: 'Stagebox 16',
		item_type: 'stagebox',
		category: 'connectors',
		is_backline: false,
		auto_number_prefix: '',
		person_subcategory: ''
	},
	{
		refDir: 'io',
		prefix: 'stagebox24',
		ourPath: 'connectors/stageboxes/stagebox24',
		name: 'Stagebox 24',
		item_type: 'stagebox',
		category: 'connectors',
		is_backline: false,
		auto_number_prefix: '',
		person_subcategory: ''
	},
	{
		refDir: 'io',
		prefix: 'HDMI',
		ourPath: 'connectors/video/hdmi',
		name: 'HDMI',
		item_type: 'cable_connector',
		category: 'connectors',
		is_backline: false,
		auto_number_prefix: '',
		person_subcategory: ''
	},
	{
		refDir: 'io',
		prefix: 'VGA',
		ourPath: 'connectors/video/vga',
		name: 'VGA',
		item_type: 'cable_connector',
		category: 'connectors',
		is_backline: false,
		auto_number_prefix: '',
		person_subcategory: ''
	},

	// ─── Power ───────────────────────────────────────────────
	{
		refDir: 'power',
		prefix: 'euro',
		ourPath: 'ac/electric/euro',
		name: 'Euro Outlet',
		item_type: 'power',
		category: 'power',
		is_backline: false,
		auto_number_prefix: '',
		person_subcategory: ''
	},

	// ─── Furniture ───────────────────────────────────────────
	{
		refDir: 'music_stand',
		prefix: 'musicstand',
		ourPath: 'furniture/musicstand',
		name: 'Music Stand',
		item_type: 'stand',
		category: 'furniture',
		is_backline: false,
		auto_number_prefix: '',
		person_subcategory: ''
	},
	{
		refDir: 'seat',
		prefix: 'pianobench',
		ourPath: 'furniture/pianobench',
		name: 'Piano Bench',
		item_type: 'furniture',
		category: 'furniture',
		is_backline: false,
		auto_number_prefix: '',
		person_subcategory: ''
	},
	{
		refDir: 'seat',
		prefix: 'OrchSeat',
		ourPath: 'furniture/orchseat',
		name: 'Orchestra Seat',
		item_type: 'furniture',
		category: 'furniture',
		is_backline: false,
		auto_number_prefix: '',
		person_subcategory: ''
	},

	// ─── DJ ──────────────────────────────────────────────────
	{
		refDir: 'dj',
		prefix: 'SL1200',
		ourPath: 'more/dj_gear/sl1200',
		name: 'Technics SL-1200',
		item_type: 'equipment',
		category: 'dj_gear',
		is_backline: false,
		auto_number_prefix: '',
		person_subcategory: ''
	}
];

let imported = 0;
let skipped = 0;

for (const spec of IMPORTS) {
	// Skip if we already have this path
	if (existingPaths.has(spec.ourPath)) {
		// But we may need to merge additional variants from the second wedge entry
		if (spec.ourPath === 'monitors/wedge') {
			// Merge variants from both Wedge and wedge prefixes
			const existing = items.find((i) => i.path === spec.ourPath);
			if (existing) {
				const srcDir = join(REF_DIR, spec.refDir);
				if (existsSync(srcDir)) {
					const files = readdirSync(srcDir);
					const newVariants = buildVariants(files, spec.prefix);
					// Merge
					for (const [k, v] of Object.entries(newVariants)) {
						if (!existing.variants[k]) {
							existing.variants[k] = v;
							// Copy the file
							const src = join(srcDir, v);
							const dst = join(ASSETS_DIR, spec.ourPath, v);
							if (existsSync(src)) {
								cpSync(src, dst);
							}
						}
					}
				}
			}
		}
		console.log(`  SKIP (exists): ${spec.ourPath}`);
		skipped++;
		continue;
	}

	const srcDir = join(REF_DIR, spec.refDir);
	if (!existsSync(srcDir)) {
		console.warn(`  WARN: Source dir missing: ${srcDir}`);
		skipped++;
		continue;
	}

	const files = readdirSync(srcDir);
	const variants = buildVariants(files, spec.prefix);

	if (Object.keys(variants).length === 0) {
		console.warn(`  WARN: No matching files for prefix "${spec.prefix}" in ${spec.refDir}`);
		skipped++;
		continue;
	}

	// Create target directory
	const dstDir = join(ASSETS_DIR, spec.ourPath);
	mkdirSync(dstDir, { recursive: true });

	// Copy matching files
	let copiedFiles = 0;
	for (const filename of Object.values(variants)) {
		const src = join(srcDir, filename);
		const dst = join(dstDir, filename);
		if (existsSync(src)) {
			cpSync(src, dst);
			copiedFiles++;
		}
	}

	// Add item to catalog
	const newItem: Item = {
		name: spec.name,
		item_type: spec.item_type,
		variants,
		path: spec.ourPath,
		is_backline: spec.is_backline,
		auto_number_prefix: spec.auto_number_prefix,
		person_subcategory: spec.person_subcategory
	};

	items.push(newItem);
	existingPaths.add(spec.ourPath);
	imported++;
	console.log(
		`  Imported: ${spec.ourPath} (${copiedFiles} files, ${Object.keys(variants).length} variants)`
	);
}

// Sort by path
items.sort((a, b) => a.path.localeCompare(b.path));

// Write updated items.json
writeFileSync(ITEMS_PATH, JSON.stringify(items, null, 2));
console.log(`\nImported ${imported} new items, skipped ${skipped}`);
console.log(`Total items: ${items.length}`);

// Summary
const typeCounts: Record<string, number> = {};
for (const item of items) {
	typeCounts[item.item_type] = (typeCounts[item.item_type] || 0) + 1;
}
console.log('\nFinal type distribution:');
for (const [type, count] of Object.entries(typeCounts).sort((a, b) => b[1] - a[1])) {
	console.log(`  ${type}: ${count}`);
}
