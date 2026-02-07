// SPDX-License-Identifier: AGPL-3.0-only

import type { DbAdapter } from './types.js';

interface Row {
	[key: string]: unknown;
}

/**
 * In-memory adapter for SSR and tests.
 * Stores data in plain JS Maps — no persistence.
 */
export function createMemoryAdapter(): DbAdapter {
	const tables = new Map<string, Row[]>();
	let ready = false;

	return {
		async init() {
			ready = true;
		},
		async exec(_sql: string) {
			if (!ready) throw new Error('Database not initialized');
			// No-op for memory adapter — DDL statements are ignored
		},
		async run(_sql: string, _params?: unknown[]) {
			if (!ready) throw new Error('Database not initialized');
			return { changes: 0, lastInsertRowid: 0 };
		},
		async query<T = Record<string, unknown>>(_sql: string, _params?: unknown[]): Promise<T[]> {
			if (!ready) throw new Error('Database not initialized');
			return [] as T[];
		},
		async queryOne<T = Record<string, unknown>>(
			_sql: string,
			_params?: unknown[]
		): Promise<T | null> {
			if (!ready) throw new Error('Database not initialized');
			return null;
		},
		async close() {
			tables.clear();
			ready = false;
		}
	};
}
