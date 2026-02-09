import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import type { PageServerLoad } from './$types';
import type { CatalogItem, Brand } from '$lib/types';
import { CATEGORY_MAP } from '$lib/schema';

const ASSETS_DIR = join(process.cwd(), '..', 'app', 'static', 'final_assets');
const ITEMS_PATH = join(ASSETS_DIR, 'items.json');
const BRANDS_PATH = join(ASSETS_DIR, 'brands.json');

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

function normalizeItem(
	item: Partial<CatalogItem> & Pick<CatalogItem, 'name' | 'path' | 'item_type' | 'variants'>
): CatalogItem {
	return {
		name: item.name,
		item_type: item.item_type,
		variants: item.variants,
		variant_order: item.variant_order,
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
		instrument_signal: item.instrument_signal ?? '',
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

	const data = await readFile(ITEMS_PATH, 'utf-8');
	const parsed = JSON.parse(data);
	const items: CatalogItem[] = parsed
		.filter((i: any) => existsSync(join(ASSETS_DIR, i.path)))
		.map(normalizeItem);
	return { items, brands };
};
