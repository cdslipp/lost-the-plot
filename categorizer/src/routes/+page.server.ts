import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import type { PageServerLoad } from './$types';
import type { CatalogItem, OriginalItem, ItemType, PersonSubcategory, Brand } from '$lib/types';
import { CATEGORY_MAP } from '$lib/schema';

const ASSETS_DIR = join(process.cwd(), '..', 'app', 'static', 'final_assets');
const ITEMS_PATH = join(ASSETS_DIR, 'items.json');
const BRANDS_PATH = join(ASSETS_DIR, 'brands.json');
const DATA_DIR = join(process.cwd(), 'data');
const ENRICHED_PATH = join(DATA_DIR, 'enriched-items.json');

function slugify(path: string): string {
	return path
		.replace(/\//g, '-')
		.replace(/[^a-z0-9-]/gi, '-')
		.replace(/-+/g, '-')
		.toLowerCase();
}

function guessCategory(path: string): string {
	const first = path.split('/')[0];
	return CATEGORY_MAP[first] || 'equipment';
}

function guessItemType(original: OriginalItem): ItemType {
	const path = original.path.toLowerCase();
	const name = original.name.toLowerCase();

	// Labels and markers
	if (path.startsWith('alphabet/') || path.startsWith('numerals/')) return 'label';
	if (path.startsWith('symbols/')) return 'marker';

	// Power
	if (path.startsWith('ac/')) return 'power';

	// Microphones
	if (path.startsWith('mics/')) {
		if (path.includes('stand') && !path.includes('mic')) return 'stand';
		return 'microphone';
	}

	// Drums
	if (path.startsWith('drums/drum_kits/') || path.startsWith('drums/drumkits/')) return 'drumset';
	if (path.startsWith('drums/')) {
		if (name.includes('throne') || name.includes('drummat')) return 'furniture';
		if (name.includes('shield')) return 'stagecraft';
		return 'instrument';
	}

	// Monitors/outputs
	if (path.startsWith('outputs/') || path.startsWith('monitors/')) return 'monitor';

	// Amps (actual amps after migration moves instruments out)
	if (path.startsWith('amps/')) {
		if (path.includes('stand')) return 'stand';
		return 'amp';
	}

	// People
	if (path.startsWith('people/')) return 'person';

	// Connectors
	if (path.startsWith('connectors/')) {
		if (path.includes('stagebox')) return 'stagebox';
		return 'cable_connector';
	}

	// Instruments
	if (
		path.startsWith('guitars/') ||
		path.startsWith('bass/') ||
		path.startsWith('keys/') ||
		path.startsWith('strings/') ||
		path.startsWith('winds/') ||
		path.startsWith('percussion/')
	) {
		if (path.includes('stand') && !name.includes('player')) return 'stand';
		return 'instrument';
	}

	// Stagecraft
	if (path.startsWith('stagecraft/')) {
		if (path.includes('stagebox')) return 'stagebox';
		return 'stagecraft';
	}

	// More catch-all
	if (path.startsWith('more/')) {
		if (path.includes('furniture') || path.includes('podium')) return 'furniture';
		if (path.includes('mixer')) return 'mixer';
		if (path.includes('gobo') || path.includes('sandbag')) return 'stagecraft';
		if (path.includes('fan')) return 'equipment';
		if (path.includes('dj_gear')) return 'equipment';
		return 'equipment';
	}

	if (path.startsWith('furniture/')) return 'furniture';
	if (path.startsWith('equipment/')) return 'equipment';

	return 'equipment';
}

function guessPersonSubcategory(path: string, name: string): PersonSubcategory {
	const lp = path.toLowerCase();
	const ln = name.toLowerCase();

	if (lp.includes('players/') || lp.includes('player')) return 'player';
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
		ln.includes('man') ||
		ln.includes('singer') ||
		ln.includes('conductor') ||
		ln.includes('dancer')
	)
		return 'player';

	return '';
}

function guessAutoNumberPrefix(path: string, category: string): string {
	const lp = path.toLowerCase();
	if (lp.includes('guitar') || lp.includes('gtr')) return 'Gtr';
	if (category === 'bass' || lp.includes('bass')) return 'Bass';
	if (category === 'keys' || lp.includes('keys') || lp.includes('piano') || lp.includes('organ'))
		return 'Keys';
	if (lp.includes('drum') || category === 'drums') return 'Drums';
	if (lp.includes('vocal') || lp.includes('singer') || lp.includes('vox')) return 'Vox';
	if (lp.includes('horn') || lp.includes('trumpet') || lp.includes('trombone')) return 'Horn';
	if (lp.includes('violin') || lp.includes('viola') || lp.includes('cello')) return 'Str';
	if (lp.includes('sax')) return 'Sax';
	if (lp.includes('flute')) return 'Fl';
	return '';
}

function initializeItem(original: OriginalItem): CatalogItem {
	const itemType = guessItemType(original);
	const category = guessCategory(original.path);
	const isBackline = ['instrument', 'amp', 'drumset'].includes(itemType);

	return {
		name: original.name,
		item_type: itemType,
		variants: original.variants,
		path: original.path,
		brands: original.brands ?? [],
		model: '',
		common_models: [],
		slug: slugify(original.path),
		category,
		subcategory: '',
		tags: [],
		default_inputs: original.default_inputs || [],
		default_outputs: original.default_outputs || [],
		dimensions: { width_in: 0, depth_in: 0, height_in: 0 },
		provision_default: '',
		is_backline: isBackline,
		connectors: [],
		power_requirements: '',
		notes: '',
		auto_number_prefix: guessAutoNumberPrefix(original.path, category),
		person_subcategory:
			itemType === 'person' ? guessPersonSubcategory(original.path, original.name) : '',
		_enriched: false,
		_original_name: original.name
	};
}

function normalizeItem(
	item: Partial<CatalogItem> & Pick<CatalogItem, 'name' | 'path' | 'item_type' | 'variants'>
): CatalogItem {
	return {
		name: item.name,
		item_type: item.item_type,
		variants: item.variants,
		path: item.path,
		brands: item.brands ?? (item.brand ? [item.brand].filter(Boolean) : []),
		model: item.model ?? '',
		common_models: item.common_models ?? [],
		slug: item.slug ?? slugify(item.path),
		category: item.category ?? guessCategory(item.path),
		subcategory: item.subcategory ?? '',
		tags: item.tags ?? [],
		default_inputs: item.default_inputs ?? [],
		default_outputs: item.default_outputs ?? [],
		dimensions: item.dimensions ?? { width_in: 0, depth_in: 0, height_in: 0 },
		provision_default: item.provision_default ?? '',
		is_backline: item.is_backline ?? false,
		connectors: item.connectors ?? [],
		power_requirements: item.power_requirements ?? '',
		notes: item.notes ?? '',
		auto_number_prefix: item.auto_number_prefix ?? '',
		person_subcategory: item.person_subcategory ?? '',
		_enriched: item._enriched ?? false,
		_original_name: item._original_name ?? item.name
	};
}

export const load: PageServerLoad = async () => {
	let brands: Brand[] = [];
	if (existsSync(BRANDS_PATH)) {
		try {
			const brandData = await readFile(BRANDS_PATH, 'utf-8');
			brands = JSON.parse(brandData);
		} catch {
			brands = [];
		}
	}
	// Try enriched data first, filtering out any items whose assets are missing
	if (existsSync(ENRICHED_PATH)) {
		const data = await readFile(ENRICHED_PATH, 'utf-8');
		const parsed = JSON.parse(data);
		const items: CatalogItem[] = parsed
			.filter((i: any) => existsSync(join(ASSETS_DIR, i.path)))
			.map(normalizeItem);
		return { items, brands };
	}

	// Initialize from original items.json, filtering out items with missing asset dirs
	const data = await readFile(ITEMS_PATH, 'utf-8');
	const originals: OriginalItem[] = JSON.parse(data);
	const items = originals.filter((o) => existsSync(join(ASSETS_DIR, o.path))).map(initializeItem);

	// Persist initial enriched file
	await mkdir(DATA_DIR, { recursive: true });
	await writeFile(ENRICHED_PATH, JSON.stringify(items, null, 2));

	return { items, brands };
};
