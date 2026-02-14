// SPDX-License-Identifier: AGPL-3.0-only

import { readFile } from '$lib/utils/opfsStorage';

export async function downloadOpfsFile(
	path: string,
	filename: string,
	mimeType = 'application/octet-stream'
): Promise<void> {
	const data = await readFile(path);
	if (!data) return;

	const blob = new Blob([data], { type: mimeType });
	const link = document.createElement('a');
	link.href = URL.createObjectURL(blob);
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(link.href);
}
