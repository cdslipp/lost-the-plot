/**
 * Migration script: Restructures items.json
 * - Removes alphabet items and duplicates
 * - Moves misplaced items (directory + path updates)
 * - Reassigns types and categories
 * - Sets backline, auto-number, and person_subcategory defaults
 *
 * Run with: bun run categorizer/scripts/migrate-catalog.ts
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, cpSync, rmSync } from 'fs';
import { join, dirname } from 'path';

const ASSETS_DIR = join(import.meta.dir, '..', '..', 'app', 'static', 'final_assets');
const ITEMS_PATH = join(ASSETS_DIR, 'items.json');
const BACKUP_PATH = join(ASSETS_DIR, 'items.json.bak');

interface Item {
	name: string;
	item_type: string;
	variants: Record<string, string>;
	path: string;
	[key: string]: unknown;
}

// ─── Load ──────────────────────────────────────────────────────
const raw = readFileSync(ITEMS_PATH, 'utf-8');
const items: Item[] = JSON.parse(raw);
console.log(`Loaded ${items.length} items`);

// Backup
writeFileSync(BACKUP_PATH, raw);
console.log(`Backup written to items.json.bak`);

// ─── Phase 2a: Remove items ───────────────────────────────────
const REMOVE_PATHS = new Set([
	// Duplicates (keeping the better version)
	'people/players/violinist', // keep strings/violin/violinist (8 variants)
	'percussion/bongo/bongos', // keep percussion/bongo (same variants)
	'mics/headset/headsetmic', // keep mics/headset (same variants)
	'stagecraft/curtain' // keep stagecraft/curtain/curtainold
]);

let filtered = items.filter((item) => {
	// Remove all alphabet items
	if (item.path.startsWith('alphabet/')) return false;
	// Remove specific duplicates
	if (REMOVE_PATHS.has(item.path)) return false;
	return true;
});

const removed = items.length - filtered.length;
console.log(`Removed ${removed} items (alphabet + duplicates)`);

// ─── Phase 2b: Move misplaced items (directory moves + path updates) ──

interface MoveSpec {
	from: string;
	to: string;
}

const MOVES: MoveSpec[] = [
	// Instruments wrongly in amps
	{ from: 'amps/steel/steel', to: 'guitars/steel/steel' },
	{ from: 'amps/steel/lapsteel', to: 'guitars/steel/lapsteel' },
	{ from: 'amps/steel/steelpan', to: 'percussion/steelpan' },
	{ from: 'amps/guitar/electricguitar', to: 'guitars/electric/electricguitar' },
	{ from: 'amps/guitar/guitaronstand', to: 'guitars/electric/guitaronstand' },
	{ from: 'amps/guitar/sampler', to: 'equipment/sampler' },

	// Connectors wrongly in people
	{ from: 'people/male/xlrmale', to: 'connectors/xlr/xlrmale' },
	{ from: 'people/male/quartermale', to: 'connectors/quarter/quartermale' },
	{ from: 'people/male/quartermale_balanced', to: 'connectors/quarter/quartermale_balanced' },
	{ from: 'people/male/quartertomalexl', to: 'connectors/adapters/quartertomalexl' },
	{ from: 'people/male/quartertrstomalexl', to: 'connectors/adapters/quartertrstomalexl' },
	{ from: 'people/male/femalexlrtoquarter', to: 'connectors/adapters/femalexlrtoquarter' },
	{
		from: 'people/male/femalexlrtoquartertrs',
		to: 'connectors/adapters/femalexlrtoquartertrs'
	},
	{ from: 'people/male/maletodoublefemale', to: 'connectors/adapters/maletodoublefemale' },
	{ from: 'people/male/doublefemalexl', to: 'connectors/xlr/doublefemalexl' },
	{ from: 'people/male/doublemalexl', to: 'connectors/xlr/doublemalexl' },

	// Instruments wrongly in people
	{ from: 'people/male/mandolin', to: 'guitars/mandolin/mandolin' },
	{ from: 'people/male/mandoman', to: 'people/players/mandoman' },

	// Misplaced keyboards
	{ from: 'more/fan/fantom', to: 'keys/fantom' },
	{ from: 'stagecraft/stage/nordstage88', to: 'keys/nordstage88' },

	// Percussion wrongly in DJ gear
	{ from: 'more/dj_gear/djembe', to: 'percussion/djembe' }
];

let moveCount = 0;
for (const move of MOVES) {
	const item = filtered.find((i) => i.path === move.from);
	if (!item) {
		console.warn(`  WARN: Move source not found: ${move.from}`);
		continue;
	}

	// Create target directory and copy files
	const srcDir = join(ASSETS_DIR, move.from);
	const dstDir = join(ASSETS_DIR, move.to);

	if (existsSync(srcDir)) {
		mkdirSync(dirname(dstDir), { recursive: true });
		mkdirSync(dstDir, { recursive: true });
		cpSync(srcDir, dstDir, { recursive: true });
		console.log(`  Moved: ${move.from} -> ${move.to}`);
		moveCount++;
	} else {
		console.warn(`  WARN: Source dir missing: ${srcDir}`);
	}

	// Update path in item
	item.path = move.to;
}
console.log(`Moved ${moveCount} items`);

// ─── Phase 2c: Bulk type reassignments ────────────────────────

type ItemType = string;

interface TypeRule {
	match: (item: Item) => boolean;
	type: ItemType;
	category?: string;
}

const TYPE_RULES: TypeRule[] = [
	// Power
	{ match: (i) => i.path.startsWith('ac/'), type: 'power', category: 'power' },

	// True amplifiers (remaining after moves)
	{
		match: (i) => {
			if (!i.path.startsWith('amps/')) return false;
			const p = i.path.toLowerCase();
			if (p.includes('standwlamp') || p.includes('standw2_lamps')) return false;
			return true;
		},
		type: 'amp',
		category: 'amps'
	},
	// Music stands near amps
	{
		match: (i) => {
			const p = i.path.toLowerCase();
			return p === 'amps/guitar/standwlamp' || p === 'amps/guitar/standw2_lamps';
		},
		type: 'stand',
		category: 'amps'
	},

	// Guitars
	{
		match: (i) => {
			if (!i.path.startsWith('guitars/')) return false;
			const p = i.path.toLowerCase();
			if (p.includes('guitarstand')) return false;
			return true;
		},
		type: 'instrument',
		category: 'guitars'
	},
	{
		match: (i) =>
			i.path.toLowerCase().includes('guitars/') && i.path.toLowerCase().includes('guitarstand'),
		type: 'stand',
		category: 'guitars'
	},

	// Keys
	{
		match: (i) => {
			if (!i.path.startsWith('keys/')) return false;
			const p = i.path.toLowerCase();
			if (p.includes('keystand') || p.includes('doublekeystand')) return false;
			return true;
		},
		type: 'instrument',
		category: 'keys'
	},
	{
		match: (i) => {
			const p = i.path.toLowerCase();
			return p.startsWith('keys/') && (p.includes('keystand') || p.includes('doublekeystand'));
		},
		type: 'stand',
		category: 'keys'
	},

	// Strings
	{
		match: (i) => i.path.startsWith('strings/'),
		type: 'instrument',
		category: 'strings'
	},

	// Winds (includes bassoon/contrabassoon that were wrongly "output")
	{
		match: (i) => i.path.startsWith('winds/'),
		type: 'instrument',
		category: 'winds'
	},

	// Percussion
	{
		match: (i) => i.path.startsWith('percussion/'),
		type: 'instrument',
		category: 'percussion'
	},

	// Drum kits
	{
		match: (i) => i.path.startsWith('drums/drum_kits/') || i.path.startsWith('drums/drumkits/'),
		type: 'drumset',
		category: 'drums'
	},

	// Individual drum hardware
	{
		match: (i) => {
			if (!i.path.startsWith('drums/')) return false;
			if (i.path.startsWith('drums/drum_kits/') || i.path.startsWith('drums/drumkits/'))
				return false;
			const n = i.name.toLowerCase();
			return n.includes('throne') || n.includes('drummat');
		},
		type: 'furniture',
		category: 'drums'
	},
	{
		match: (i) => {
			if (!i.path.startsWith('drums/')) return false;
			return i.name.toLowerCase().includes('shield');
		},
		type: 'stagecraft',
		category: 'drums'
	},
	{
		match: (i) => {
			if (!i.path.startsWith('drums/')) return false;
			if (i.path.startsWith('drums/drum_kits/') || i.path.startsWith('drums/drumkits/'))
				return false;
			const n = i.name.toLowerCase();
			if (n.includes('throne') || n.includes('drummat') || n.includes('shield')) return false;
			return true;
		},
		type: 'instrument',
		category: 'drums'
	},

	// Mics
	{
		match: (i) => {
			if (!i.path.startsWith('mics/')) return false;
			const p = i.path.toLowerCase();
			// Mic stand without mic
			if (p.includes('standstraight_no') && p.includes('mic')) return false;
			return true;
		},
		type: 'microphone',
		category: 'mics'
	},
	{
		match: (i) => {
			const p = i.path.toLowerCase();
			return p.startsWith('mics/') && p.includes('standstraight_no');
		},
		type: 'stand',
		category: 'mics'
	},

	// People
	{
		match: (i) => i.path.startsWith('people/'),
		type: 'person',
		category: 'people'
	},

	// Outputs → monitors
	{
		match: (i) => i.path.startsWith('outputs/'),
		type: 'monitor',
		category: 'monitors'
	},

	// Connectors (after moves)
	{
		match: (i) => {
			if (!i.path.startsWith('connectors/')) return false;
			return i.path.includes('stagebox');
		},
		type: 'stagebox',
		category: 'connectors'
	},
	{
		match: (i) => {
			if (!i.path.startsWith('connectors/')) return false;
			return !i.path.includes('stagebox');
		},
		type: 'cable_connector',
		category: 'connectors'
	},

	// Equipment (sampler after move)
	{
		match: (i) => i.path.startsWith('equipment/'),
		type: 'equipment',
		category: 'equipment'
	},

	// Stagecraft
	{
		match: (i) => {
			if (!i.path.startsWith('stagecraft/')) return false;
			return i.path.includes('stagebox');
		},
		type: 'stagebox',
		category: 'connectors'
	},
	{
		match: (i) => {
			if (!i.path.startsWith('stagecraft/')) return false;
			if (i.path.includes('stagebox')) return false;
			return true;
		},
		type: 'stagecraft',
		category: 'stagecraft'
	},

	// More catch-all subcategories
	{
		match: (i) => i.path.startsWith('more/furniture/') || i.path.startsWith('more/podium/'),
		type: 'furniture',
		category: 'furniture'
	},
	{
		match: (i) => i.path === 'more/mixer',
		type: 'mixer',
		category: 'equipment'
	},
	{
		match: (i) =>
			i.path === 'more/gobo' || i.path === 'more/sandbag' || i.path === 'more/barricade',
		type: 'stagecraft',
		category: 'stagecraft'
	},
	{
		match: (i) => i.path.startsWith('more/dj_gear/'),
		type: 'equipment',
		category: 'dj_gear'
	},
	{
		match: (i) => {
			if (!i.path.startsWith('more/')) return false;
			// Already handled above
			if (
				i.path.startsWith('more/furniture/') ||
				i.path.startsWith('more/podium/') ||
				i.path === 'more/mixer' ||
				i.path === 'more/gobo' ||
				i.path === 'more/sandbag' ||
				i.path === 'more/barricade' ||
				i.path.startsWith('more/dj_gear/')
			)
				return false;
			return true;
		},
		type: 'equipment',
		category: 'equipment'
	},

	// Numerals and symbols
	{ match: (i) => i.path.startsWith('numerals/'), type: 'label', category: 'equipment' },
	{ match: (i) => i.path.startsWith('symbols/'), type: 'marker', category: 'equipment' }
];

let typeChanges = 0;
for (const item of filtered) {
	for (const rule of TYPE_RULES) {
		if (rule.match(item)) {
			if (item.item_type !== rule.type) {
				typeChanges++;
			}
			item.item_type = rule.type;
			if (rule.category) {
				(item as Record<string, unknown>)._new_category = rule.category;
			}
			break;
		}
	}
}
console.log(`Applied ${typeChanges} type changes`);

// ─── Phase 2d: Set backline and auto-number defaults ──────────

const BACKLINE_TYPES = new Set(['instrument', 'amp', 'drumset']);

function guessAutoNumberPrefix(path: string, category: string): string {
	const lp = path.toLowerCase();
	if (lp.includes('guitar') || lp.includes('gtr')) return 'Gtr';
	if (category === 'bass' || lp.includes('bass')) return 'Bass';
	if (
		category === 'keys' ||
		lp.includes('keys') ||
		lp.includes('piano') ||
		lp.includes('organ') ||
		lp.includes('keyboard')
	)
		return 'Keys';
	if (lp.includes('drum') || category === 'drums') return 'Drums';
	if (lp.includes('vocal') || lp.includes('singer') || lp.includes('vox')) return 'Vox';
	if (lp.includes('horn') || lp.includes('trumpet') || lp.includes('trombone')) return 'Horn';
	if (lp.includes('violin') || lp.includes('viola') || lp.includes('cello')) return 'Str';
	if (lp.includes('sax')) return 'Sax';
	if (lp.includes('flute')) return 'Fl';
	if (lp.includes('banjo')) return 'Bnj';
	if (lp.includes('mandolin')) return 'Mand';
	if (lp.includes('uke') || lp.includes('ukulele')) return 'Uke';
	if (lp.includes('harp')) return 'Harp';
	if (lp.includes('accordion')) return 'Acc';
	return '';
}

// ─── Phase 2e: People subcategories ───────────────────────────

function guessPersonSubcategory(path: string, name: string): string {
	const lp = path.toLowerCase();
	const ln = name.toLowerCase();

	if (lp.includes('players/')) return 'player';
	if (
		ln.includes('man1') ||
		ln.includes('man2') ||
		ln.includes('man3') ||
		ln.includes('woman1') ||
		ln.includes('woman2') ||
		ln.includes('woman3')
	)
		return 'generic';
	if (
		ln.includes('guy') ||
		ln.includes('ist') ||
		ln.includes('player') ||
		ln.includes('man') ||
		ln.includes('singer') ||
		ln.includes('conductor') ||
		ln.includes('dancer')
	)
		return 'player';

	return '';
}

// ─── Apply defaults to all items ──────────────────────────────

for (const item of filtered) {
	const category =
		((item as Record<string, unknown>)._new_category as string) || guessCategory(item.path);

	// Ensure is_backline is set
	if (item.is_backline === undefined) {
		item.is_backline = BACKLINE_TYPES.has(item.item_type);
	} else if (BACKLINE_TYPES.has(item.item_type)) {
		item.is_backline = true;
	}

	// Auto-number prefix
	if (!item.auto_number_prefix) {
		item.auto_number_prefix = guessAutoNumberPrefix(item.path, category);
	}

	// Person subcategory
	if (item.item_type === 'person') {
		if (!item.person_subcategory) {
			item.person_subcategory = guessPersonSubcategory(item.path, item.name);
		}
	} else {
		item.person_subcategory = '';
	}

	// Clean up temp field
	delete (item as Record<string, unknown>)._new_category;
}

function guessCategory(path: string): string {
	const CATEGORY_MAP: Record<string, string> = {
		ac: 'power',
		amps: 'amps',
		drums: 'drums',
		guitars: 'guitars',
		keys: 'keys',
		mics: 'mics',
		more: 'equipment',
		numerals: 'equipment',
		outputs: 'monitors',
		people: 'people',
		percussion: 'percussion',
		stagecraft: 'stagecraft',
		strings: 'strings',
		symbols: 'equipment',
		winds: 'winds',
		connectors: 'connectors',
		monitors: 'monitors',
		furniture: 'furniture',
		equipment: 'equipment',
		bass: 'bass'
	};
	const first = path.split('/')[0];
	return CATEGORY_MAP[first] || 'equipment';
}

// ─── Write output ─────────────────────────────────────────────

// Sort by path for consistency
filtered.sort((a, b) => a.path.localeCompare(b.path));

writeFileSync(ITEMS_PATH, JSON.stringify(filtered, null, 2));
console.log(`\nWrote ${filtered.length} items to items.json`);

// Summary
const typeCounts: Record<string, number> = {};
for (const item of filtered) {
	typeCounts[item.item_type] = (typeCounts[item.item_type] || 0) + 1;
}
console.log('\nType distribution:');
for (const [type, count] of Object.entries(typeCounts).sort((a, b) => b[1] - a[1])) {
	console.log(`  ${type}: ${count}`);
}

const catCounts: Record<string, number> = {};
for (const item of filtered) {
	const cat = guessCategory(item.path);
	catCounts[cat] = (catCounts[cat] || 0) + 1;
}
console.log('\nCategory distribution (by path):');
for (const [cat, count] of Object.entries(catCounts).sort((a, b) => b[1] - a[1])) {
	console.log(`  ${cat}: ${count}`);
}
