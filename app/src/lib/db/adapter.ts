// SPDX-License-Identifier: AGPL-3.0-only

import type { DbAdapter } from '@stageplotter/db';
import { isTauri } from '$lib/platform';

let _db: DbAdapter | null = null;

/**
 * Get the database adapter for the current platform.
 * Uses dynamic import() so Tauri-specific code is tree-shaken from PWA builds.
 */
export async function getDb(): Promise<DbAdapter> {
	if (_db) return _db;

	if (isTauri()) {
		const { createTauriAdapter } = await import('@stageplotter/db/tauri');
		_db = await createTauriAdapter();
	} else {
		// PWA: delegate to the existing OPFS worker-based SQLite
		const sqlite = await import('./sqlite');
		const { createOpfsAdapter } = await import('@stageplotter/db/opfs');
		_db = createOpfsAdapter(sqlite);
	}

	return _db!;
}
