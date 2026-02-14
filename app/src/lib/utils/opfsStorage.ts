// SPDX-License-Identifier: AGPL-3.0-only

const PREFIX = 'festival-files';

async function getDir(path: string): Promise<FileSystemDirectoryHandle> {
	const root = await navigator.storage.getDirectory();
	const parts = path.split('/').filter(Boolean);
	let dir = root;
	for (const part of parts.slice(0, -1)) {
		dir = await dir.getDirectoryHandle(part, { create: true });
	}
	return dir;
}

function fileName(path: string): string {
	const parts = path.split('/').filter(Boolean);
	return parts[parts.length - 1];
}

export async function saveFile(path: string, data: ArrayBuffer): Promise<void> {
	const fullPath = `${PREFIX}/${path}`;
	const dir = await getDir(fullPath);
	const name = fileName(fullPath);
	const fileHandle = await dir.getFileHandle(name, { create: true });
	const writable = await fileHandle.createWritable();
	await writable.write(data);
	await writable.close();
}

export async function readFile(path: string): Promise<ArrayBuffer | null> {
	try {
		const fullPath = `${PREFIX}/${path}`;
		const dir = await getDir(fullPath);
		const name = fileName(fullPath);
		const fileHandle = await dir.getFileHandle(name);
		const file = await fileHandle.getFile();
		return await file.arrayBuffer();
	} catch {
		return null;
	}
}

export async function deleteFile(path: string): Promise<void> {
	try {
		const fullPath = `${PREFIX}/${path}`;
		const dir = await getDir(fullPath);
		const name = fileName(fullPath);
		await dir.removeEntry(name);
	} catch {
		// File doesn't exist, nothing to delete
	}
}
