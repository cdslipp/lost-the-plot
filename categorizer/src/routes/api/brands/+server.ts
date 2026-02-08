import { json } from '@sveltejs/kit';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import type { RequestHandler } from './$types';
import type { Brand } from '$lib/types';

const ASSETS_DIR = join(process.cwd(), '..', 'app', 'static', 'final_assets');
const BRANDS_PATH = join(ASSETS_DIR, 'brands.json');

function slugify(value: string): string {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/(^-|-$)+/g, '');
}

export const POST: RequestHandler = async ({ request }) => {
	const payload = (await request.json()) as Partial<Brand>;
	const name = (payload.name ?? '').trim();
	if (!name) {
		return json({ error: 'Brand name is required.' }, { status: 400 });
	}

	const slug = payload.slug ? slugify(payload.slug) : slugify(name);
	if (!slug) {
		return json({ error: 'Invalid brand slug.' }, { status: 400 });
	}

	await mkdir(ASSETS_DIR, { recursive: true });
	let brands: Brand[] = [];
	if (existsSync(BRANDS_PATH)) {
		try {
			const data = await readFile(BRANDS_PATH, 'utf-8');
			brands = JSON.parse(data);
		} catch {
			brands = [];
		}
	}

	if (brands.some((b) => b.slug === slug || b.name.toLowerCase() === name.toLowerCase())) {
		return json({ error: 'Brand already exists.' }, { status: 409 });
	}

	const brand: Brand = {
		name,
		slug,
		website: payload.website?.trim() || undefined,
		status: payload.status ?? 'active',
		notes: payload.notes?.trim() || undefined
	};

	brands.push(brand);
	brands.sort((a, b) => a.name.localeCompare(b.name));
	await writeFile(BRANDS_PATH, JSON.stringify(brands, null, 2));

	return json({ success: true, brand });
};
