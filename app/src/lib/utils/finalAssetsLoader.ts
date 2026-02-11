// SPDX-License-Identifier: AGPL-3.0-only

// Utility to load items from the final_assets directory structure

export interface FinalAssetItem {
	name: string;
	item_type: string;
	variants: Record<string, string>;
	variant_order?: string[];
	default_inputs?: any[];
	default_outputs?: any[];
	instrument_signal?: 'acoustic' | 'electric' | '';
	path: string;
	slug?: string;
	category?: string;
	subcategory?: string;
	tags?: string[];
	is_backline?: boolean;
	brands?: string[];
	brand?: string;
	model?: string;
	dimensions?: { width_in: number; depth_in: number; height_in: number };
	provision_default?: string;
	connectors?: string[];
	notes?: string;
	auto_number_prefix?: string;
	person_subcategory?: string;
}

export interface ProcessedItem {
	id: string;
	name: string;
	type: string;
	category: string;
	subcategory?: string;
	image: string;
	keywords: string[];
	description?: string;
	variants?: Record<string, string>;
	variant_order?: string[];
	path: string;
	default_inputs?: any[];
	default_outputs?: any[];
	instrument_signal?: 'acoustic' | 'electric' | '';
	is_backline?: boolean;
}

/**
 * Load all items from the consolidated items.json file.
 * Results are cached after the first successful fetch so multiple
 * callers (command palette, patch list, etc.) don't re-download and
 * re-parse the same JSON.
 */
let _cachedAssets: ProcessedItem[] | null = null;
let _pendingLoad: Promise<ProcessedItem[]> | null = null;

export async function loadFinalAssets(): Promise<ProcessedItem[]> {
	if (_cachedAssets) return _cachedAssets;
	if (_pendingLoad) return _pendingLoad;

	_pendingLoad = (async () => {
		try {
			const response = await fetch(`/final_assets/items.json`);
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			const itemsData: FinalAssetItem[] = await response.json();
			_cachedAssets = itemsData.map(processItem).filter(Boolean) as ProcessedItem[];
			return _cachedAssets;
		} catch (error) {
			console.error('Error loading final assets:', error);
			return [];
		} finally {
			_pendingLoad = null;
		}
	})();

	return _pendingLoad;
}

function processItem(itemData: FinalAssetItem): ProcessedItem | null {
	if (!itemData.name || !itemData.variants) {
		return null;
	}

	const defaultImage = itemData.variants.default || Object.values(itemData.variants)[0];
	if (!defaultImage) {
		return null;
	}

	const imagePath = `/final_assets/${itemData.path}/${defaultImage}`;
	const category = itemData.category || itemData.path.split('/')[0];

	const keywords = [
		itemData.name.toLowerCase(),
		itemData.item_type.toLowerCase(),
		...itemData.name.toLowerCase().split(/\s+/),
		...(itemData.tags || []).map((t) => t.toLowerCase()),
		category.toLowerCase(),
		...(itemData.subcategory ? [itemData.subcategory.toLowerCase()] : [])
	].filter(Boolean);

	return {
		id: itemData.slug || `final-asset-${itemData.path.replace(/[^a-zA-Z0-9]/g, '-')}`,
		name: itemData.name,
		type: itemData.item_type,
		category,
		subcategory: itemData.subcategory,
		image: imagePath,
		keywords: [...new Set(keywords)],
		description: `${itemData.name} - ${category}`,
		variants: itemData.variants,
		variant_order: itemData.variant_order,
		path: itemData.path,
		default_inputs: itemData.default_inputs,
		default_outputs: itemData.default_outputs,
		instrument_signal: itemData.instrument_signal,
		is_backline: itemData.is_backline
	};
}

/**
 * Filter items based on criteria
 */
export function filterItems(
	items: ProcessedItem[],
	criteria: {
		includeInputs?: boolean;
		includeAccessories?: boolean;
		includeSymbols?: boolean;
		categories?: string[];
	}
): ProcessedItem[] {
	return items.filter((item) => {
		if (criteria.includeInputs === false && item.type === 'input') return false;
		if (criteria.includeAccessories === false && item.type === 'accessory') return false;
		if (criteria.includeSymbols === false && item.type === 'symbol') return false;
		if (criteria.categories && !criteria.categories.includes(item.category)) return false;
		return true;
	});
}
