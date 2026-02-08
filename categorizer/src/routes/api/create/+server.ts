import { json } from '@sveltejs/kit';
import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import type { RequestHandler } from './$types';
import type { CatalogItem } from '$lib/types';

const ENRICHED_PATH = join(process.cwd(), 'data', 'enriched-items.json');

export const POST: RequestHandler = async ({ request }) => {
	const item = (await request.json()) as CatalogItem;

	if (!existsSync(ENRICHED_PATH)) {
		return json({ error: 'Enriched data not initialized' }, { status: 500 });
	}

	if (!item?.path || !item?.name) {
		return json({ error: 'Missing required item fields.' }, { status: 400 });
	}

	const data = await readFile(ENRICHED_PATH, 'utf-8');
	const items: CatalogItem[] = JSON.parse(data);

	if (items.some((i) => i.path === item.path)) {
		return json({ error: 'Item path already exists.' }, { status: 409 });
	}

	items.push(item);
	await writeFile(ENRICHED_PATH, JSON.stringify(items, null, 2));

	return json({ success: true });
};
