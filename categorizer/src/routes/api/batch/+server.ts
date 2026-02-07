import { json } from '@sveltejs/kit';
import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import type { RequestHandler } from './$types';
import type { CatalogItem } from '$lib/types';

const ENRICHED_PATH = join(process.cwd(), 'data', 'enriched-items.json');

interface BatchUpdate {
	paths: string[];
	fields: Partial<
		Pick<
			CatalogItem,
			| 'item_type'
			| 'category'
			| 'subcategory'
			| 'provision_default'
			| 'is_backline'
			| 'connectors'
			| 'power_requirements'
		>
	>;
}

export const POST: RequestHandler = async ({ request }) => {
	const update: BatchUpdate = await request.json();

	if (!existsSync(ENRICHED_PATH)) {
		return json({ error: 'Enriched data not initialized' }, { status: 500 });
	}

	const data = await readFile(ENRICHED_PATH, 'utf-8');
	const items: CatalogItem[] = JSON.parse(data);

	const pathSet = new Set(update.paths);
	let updated = 0;

	for (const item of items) {
		if (pathSet.has(item.path)) {
			Object.assign(item, update.fields);
			updated++;
		}
	}

	await writeFile(ENRICHED_PATH, JSON.stringify(items, null, 2));

	return json({ success: true, updated });
};
