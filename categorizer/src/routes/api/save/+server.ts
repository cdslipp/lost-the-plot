import { json } from '@sveltejs/kit';
import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import type { RequestHandler } from './$types';
import type { CatalogItem } from '$lib/types';

const ITEMS_PATH = join(process.cwd(), '..', 'app', 'static', 'final_assets', 'items.json');

export const POST: RequestHandler = async ({ request }) => {
	const item: CatalogItem = await request.json();

	if (!existsSync(ITEMS_PATH)) {
		return json({ error: 'Items data not found' }, { status: 500 });
	}

	const data = await readFile(ITEMS_PATH, 'utf-8');
	const items: CatalogItem[] = JSON.parse(data);

	const index = items.findIndex((i) => i.path === item.path);
	if (index === -1) {
		return json({ error: 'Item not found' }, { status: 404 });
	}

	item._enriched = true;
	items[index] = item;

	await writeFile(ITEMS_PATH, JSON.stringify(items, null, 2));

	return json({ success: true });
};
