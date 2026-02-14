// SPDX-License-Identifier: AGPL-3.0-only

import { readFile } from '$lib/utils/opfsStorage';

export type ThumbnailResult =
	| { type: 'image'; url: string }
	| { type: 'pdf'; url: string }
	| { type: 'generic' }
	| { type: 'error' };

const IMAGE_TYPES = new Set([
	'image/png',
	'image/jpeg',
	'image/gif',
	'image/webp',
	'image/svg+xml',
	'image/bmp'
]);

function isImageType(fileType: string | null): boolean {
	return !!fileType && IMAGE_TYPES.has(fileType);
}

function isPdfType(fileType: string | null): boolean {
	return fileType === 'application/pdf';
}

const MAX_THUMB_WIDTH = 300;
const MAX_THUMB_HEIGHT = 200;

async function renderPdfThumbnail(data: ArrayBuffer): Promise<string> {
	const pdfjs = await import('pdfjs-dist');
	const workerUrl = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url);
	pdfjs.GlobalWorkerOptions.workerSrc = workerUrl.href;

	const pdf = await pdfjs.getDocument({ data }).promise;
	const page = await pdf.getPage(1);

	const unscaledViewport = page.getViewport({ scale: 1 });
	const scale = Math.min(
		MAX_THUMB_WIDTH / unscaledViewport.width,
		MAX_THUMB_HEIGHT / unscaledViewport.height,
		1
	);
	const viewport = page.getViewport({ scale });

	const canvas = new OffscreenCanvas(Math.floor(viewport.width), Math.floor(viewport.height));
	const ctx = canvas.getContext('2d')!;
	await page.render({
		canvas: null,
		canvasContext: ctx as unknown as CanvasRenderingContext2D,
		viewport
	}).promise;

	const blob = await canvas.convertToBlob({ type: 'image/png' });
	return URL.createObjectURL(blob);
}

export async function generateThumbnail(
	filePath: string,
	fileType: string | null
): Promise<ThumbnailResult> {
	if (!isImageType(fileType) && !isPdfType(fileType)) {
		return { type: 'generic' };
	}

	try {
		const data = await readFile(filePath);
		if (!data) return { type: 'error' };

		if (isImageType(fileType)) {
			const blob = new Blob([data], { type: fileType! });
			return { type: 'image', url: URL.createObjectURL(blob) };
		}

		const url = await renderPdfThumbnail(data);
		return { type: 'pdf', url };
	} catch (e) {
		console.error('Failed to generate thumbnail:', e);
		return { type: 'error' };
	}
}

export function revokeThumbnailUrl(result: ThumbnailResult): void {
	if ((result.type === 'image' || result.type === 'pdf') && result.url) {
		URL.revokeObjectURL(result.url);
	}
}
