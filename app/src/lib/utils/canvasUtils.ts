// Pure utility functions for stage plot canvas calculations

export function getZones(cw: number, ch: number) {
	const colWidth = cw / 3;
	const rowHeight = ch / 2;
	return [
		{ key: 'DSR', x: 0, y: rowHeight, w: colWidth, h: rowHeight },
		{ key: 'DSC', x: colWidth, y: rowHeight, w: colWidth, h: rowHeight },
		{ key: 'DSL', x: colWidth * 2, y: rowHeight, w: colWidth, h: rowHeight },
		{ key: 'USR', x: 0, y: 0, w: colWidth, h: rowHeight },
		{ key: 'USC', x: colWidth, y: 0, w: colWidth, h: rowHeight },
		{ key: 'USL', x: colWidth * 2, y: 0, w: colWidth, h: rowHeight }
	];
}

export function rectIntersectionArea(
	ax: number,
	ay: number,
	aw: number,
	ah: number,
	bx: number,
	by: number,
	bw: number,
	bh: number
) {
	const xOverlap = Math.max(0, Math.min(ax + aw, bx + bw) - Math.max(ax, bx));
	const yOverlap = Math.max(0, Math.min(ay + ah, by + bh) - Math.max(ay, by));
	return xOverlap * yOverlap;
}

export function getItemZone(item: any, cw: number, ch: number) {
	const zones = getZones(cw, ch);
	let maxArea = 0;
	let chosen = zones[0].key;
	for (const z of zones) {
		const area = rectIntersectionArea(
			item.position.x,
			item.position.y,
			item.position.width,
			item.position.height,
			z.x,
			z.y,
			z.w,
			z.h
		);
		if (area > maxArea) {
			maxArea = area;
			chosen = z.key;
		}
	}
	return chosen;
}

export function getItemPosition(item: any, cw: number, ch: number) {
	if (!cw || !ch) return { x: 0, y: 0 };
	const relativeX = item.position.x + item.position.width / 2 - cw / 2;
	const relativeY = ch - (item.position.y + item.position.height / 2);
	return { x: Math.round(relativeX), y: Math.round(relativeY) };
}

export function snapToGrid(
	x: number,
	y: number,
	w: number,
	h: number,
	snapping: boolean,
	cw: number,
	ch: number
) {
	if (!snapping) return { x, y };
	const threshold = 15;
	const vLines = [0, cw / 3, (2 * cw) / 3, cw];
	const hLines = [0, ch / 2, ch];
	let sx = x,
		sy = y;
	for (const vl of vLines) {
		if (Math.abs(x - vl) < threshold) sx = vl;
		if (Math.abs(x + w - vl) < threshold) sx = vl - w;
	}
	for (const hl of hLines) {
		if (Math.abs(y - hl) < threshold) sy = hl;
		if (Math.abs(y + h - hl) < threshold) sy = hl - h;
	}
	return { x: sx, y: sy };
}

export function getItemVariants(item: any) {
	if (!item.itemData) return null;
	if (item.itemData.variants) return item.itemData.variants;
	return null;
}

export function getVariantKeys(item: any) {
	const variants = getItemVariants(item);
	if (!variants) return ['default'];
	return Object.keys(variants);
}

export function buildImagePath(item: any, imagePath: string) {
	if (item.itemData?.path) {
		return `/final_assets/${item.itemData.path}/${imagePath}`;
	}
	return imagePath.startsWith('/') ? imagePath : '/' + imagePath;
}

export function getCurrentImageSrc(item: any) {
	const variants = getItemVariants(item);
	if (!variants) return item.itemData?.image || '';
	const variant = item.currentVariant || 'default';
	const imagePath = variants[variant] || variants.default || Object.values(variants)[0];
	return buildImagePath(item, imagePath as string);
}
