// Pure utility functions for stage plot canvas calculations.
// All coordinate parameters (cw, ch, x, y, w, h) are in feet — the stage's physical coordinate system.

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

/** Returns center-relative position in feet: X is from center (neg=stage-right, pos=stage-left), Y is distance from downstage edge. */
export function getItemPosition(item: any, cw: number, ch: number) {
	if (!cw || !ch) return { x: 0, y: 0 };
	const relativeX = item.position.x + item.position.width / 2 - cw / 2;
	const relativeY = ch - (item.position.y + item.position.height / 2);
	return { x: +relativeX.toFixed(2), y: +relativeY.toFixed(2) };
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
	const threshold = 0.3; // ~3.6 inches — snaps when within ~4" of a grid line
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
	const keys = Object.keys(variants);
	if (!keys.length) return ['default'];
	const defaultKey = keys.includes('default') ? 'default' : keys[0];
	const customOrder = Array.isArray(item.itemData?.variant_order)
		? item.itemData.variant_order.filter((key: string) => keys.includes(key))
		: [];
	let order = customOrder.length ? customOrder : [];
	order = order.filter((key: string) => key !== defaultKey);
	const remaining = keys.filter((key) => key !== defaultKey && !order.includes(key)).sort();
	return [defaultKey, ...order, ...remaining].filter(Boolean);
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

/**
 * Find a non-overlapping position within a zone for a new item.
 * Scans from zone center outward in a grid pattern.
 * Returns { x, y } in feet, or zone center if no gap found.
 */
export function findOpenPositionInZone(
	zone: { x: number; y: number; w: number; h: number },
	existingItems: Array<{ position: { x: number; y: number; width: number; height: number } }>,
	itemWidth: number,
	itemHeight: number
): { x: number; y: number } {
	const step = 1.0; // 1-foot grid scan
	const centerX = zone.x + zone.w / 2 - itemWidth / 2;
	const centerY = zone.y + zone.h / 2 - itemHeight / 2;

	// Try center first
	if (!hasOverlap(centerX, centerY, itemWidth, itemHeight, existingItems)) {
		return { x: +centerX.toFixed(4), y: +centerY.toFixed(4) };
	}

	// Spiral outward from center
	for (let radius = 1; radius <= Math.max(zone.w, zone.h); radius++) {
		for (let dx = -radius; dx <= radius; dx++) {
			for (let dy = -radius; dy <= radius; dy++) {
				if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue; // Only perimeter
				const x = centerX + dx * step;
				const y = centerY + dy * step;
				// Stay within zone bounds
				if (x < zone.x || x + itemWidth > zone.x + zone.w) continue;
				if (y < zone.y || y + itemHeight > zone.y + zone.h) continue;
				if (!hasOverlap(x, y, itemWidth, itemHeight, existingItems)) {
					return { x: +x.toFixed(4), y: +y.toFixed(4) };
				}
			}
		}
	}

	// Fallback: zone center (will overlap)
	return { x: +centerX.toFixed(4), y: +centerY.toFixed(4) };
}

function hasOverlap(
	x: number,
	y: number,
	w: number,
	h: number,
	items: Array<{ position: { x: number; y: number; width: number; height: number } }>
): boolean {
	for (const item of items) {
		if (
			rectIntersectionArea(
				x,
				y,
				w,
				h,
				item.position.x,
				item.position.y,
				item.position.width,
				item.position.height
			) > 0
		) {
			return true;
		}
	}
	return false;
}
