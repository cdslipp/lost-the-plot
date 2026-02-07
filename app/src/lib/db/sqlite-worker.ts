/// <reference lib="webworker" />

// Log immediately to confirm worker script execution
console.log('[SQLite Worker] Starting...');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SqliteDb = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Sqlite3 = any;

type MessageHandler = {
	exec: (data: { sql: string }) => void;
	run: (data: { sql: string; params?: unknown[] | Record<string, unknown> }) => unknown;
	query: (data: { sql: string; params?: unknown[] | Record<string, unknown> }) => unknown[];
	close: () => void;
};

let db: SqliteDb = null;
let sqlite3: Sqlite3;
let opfsAvailable = false;

const post = (type: string, id: number, payload: unknown) => {
	self.postMessage({ type, id, payload });
};

const handlers: MessageHandler = {
	exec({ sql }) {
		if (!db) throw new Error('Database not initialized');
		db.exec(sql);
	},
	run({ sql, params }) {
		if (!db) throw new Error('Database not initialized');
		db.exec({ sql, bind: params });
		return {
			changes: db.changes(),
			lastInsertRowid: Number(db.selectValue('SELECT last_insert_rowid()'))
		};
	},
	query({ sql, params }) {
		if (!db) throw new Error('Database not initialized');
		const results: Record<string, unknown>[] = [];
		db.exec({
			sql,
			bind: params,
			rowMode: 'object',
			callback: (row: Record<string, unknown>) => {
				results.push({ ...row });
			}
		});
		return results;
	},
	close() {
		if (db) {
			db.close();
			db = null;
		}
	}
};

self.onmessage = async (e: MessageEvent) => {
	const { type, id, data } = e.data;
	console.log('[SQLite Worker] Received message:', type, id);

	try {
		if (type === 'init') {
			console.log('[SQLite Worker] Initializing SQLite...');
			const sqlite3InitModule = (await import('@sqlite.org/sqlite-wasm')).default;
			console.log('[SQLite Worker] SQLite module imported');
			sqlite3 = await sqlite3InitModule();
			console.log('[SQLite Worker] SQLite initialized, version:', sqlite3.version);

			// Check if OPFS is available
			if ('opfs' in sqlite3) {
				console.log('[SQLite Worker] OPFS available, attempting to create OpfsDb...');
				try {
					db = new sqlite3.oo1.OpfsDb('/app.db');
					opfsAvailable = true;
					console.log('[SQLite Worker] OpfsDb created successfully');
				} catch (err) {
					console.warn('[SQLite Worker] OPFS failed, falling back to in-memory:', err);
					db = new sqlite3.oo1.DB(':memory:');
				}
			} else {
				console.log('[SQLite Worker] OPFS not available, using in-memory database');
				db = new sqlite3.oo1.DB(':memory:');
			}

			post('ready', id, { opfsAvailable });
			return;
		}

		if (!db) {
			throw new Error('Database not initialized');
		}

		const handler = handlers[type as keyof MessageHandler];
		if (!handler) {
			throw new Error(`Unknown message type: ${type}`);
		}

		const result = handler(data);
		post('success', id, result);
	} catch (err) {
		post('error', id, {
			message: err instanceof Error ? err.message : String(err)
		});
	}
};
