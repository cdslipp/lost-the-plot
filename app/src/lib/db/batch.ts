// SPDX-License-Identifier: AGPL-3.0-only
import { db } from '$lib/db';

const DEFAULT_CHUNK_SIZE = 200;

export async function runInTransaction<T>(fn: () => Promise<T>): Promise<T> {
	await db.exec('BEGIN');
	try {
		const result = await fn();
		await db.exec('COMMIT');
		return result;
	} catch (error) {
		await db.exec('ROLLBACK');
		throw error;
	}
}

export async function insertMany(
	table: string,
	columns: string[],
	rows: unknown[][],
	chunkSize = DEFAULT_CHUNK_SIZE
): Promise<void> {
	if (rows.length === 0) return;
	const maxParams = 999;
	const maxRowsPerChunk = Math.max(1, Math.floor(maxParams / columns.length));
	const effectiveChunkSize = Math.min(chunkSize, maxRowsPerChunk);
	const colList = columns.join(', ');
	const rowPlaceholder = `(${columns.map(() => '?').join(', ')})`;
	for (let i = 0; i < rows.length; i += effectiveChunkSize) {
		const chunk = rows.slice(i, i + effectiveChunkSize);
		const placeholders = chunk.map(() => rowPlaceholder).join(', ');
		const params = chunk.flat();
		await db.run(`INSERT INTO ${table} (${colList}) VALUES ${placeholders}`, params);
	}
}
