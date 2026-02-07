import SqliteWorker from './sqlite-worker?worker';

let worker: Worker | null = null;
let messageId = 0;
let dbReady = false;
let opfsAvailableResult = false;

const pendingRequests = new Map<
	number,
	{ resolve: (value: unknown) => void; reject: (error: Error) => void }
>();

export type DbStatus = 'uninitialized' | 'initializing' | 'ready' | 'error';

export interface DbState {
	status: DbStatus;
	error: string | null;
	opfsAvailable: boolean;
}

function sendMessage<T>(type: string, data?: unknown): Promise<T> {
	return new Promise((resolve, reject) => {
		if (!worker) {
			reject(new Error('Worker not initialized'));
			return;
		}
		const id = ++messageId;
		pendingRequests.set(id, {
			resolve: resolve as (value: unknown) => void,
			reject
		});
		worker.postMessage({ type, id, data });
	});
}

/**
 * Initialize the SQLite database with OPFS persistence (or in-memory fallback)
 */
export async function initDb(): Promise<{ opfsAvailable: boolean }> {
	if (dbReady && worker) {
		return { opfsAvailable: opfsAvailableResult };
	}

	// Create worker using Vite's ?worker import syntax
	worker = new SqliteWorker();

	worker.onmessage = (e: MessageEvent) => {
		const { type, id, payload } = e.data;
		const pending = pendingRequests.get(id);
		if (!pending) return;

		pendingRequests.delete(id);

		if (type === 'error') {
			pending.reject(new Error(payload.message));
		} else {
			pending.resolve(payload);
		}
	};

	worker.onerror = (e) => {
		console.error('Worker error:', e);
	};

	const result = await sendMessage<{ opfsAvailable: boolean }>('init');
	dbReady = true;
	opfsAvailableResult = result.opfsAvailable;
	return result;
}

/**
 * Execute a SQL statement that doesn't return data
 */
export async function exec(sql: string): Promise<void> {
	await sendMessage('exec', { sql });
}

/**
 * Run a SQL statement with parameters, returns changes info
 */
export async function run(
	sql: string,
	params?: Record<string, unknown> | unknown[]
): Promise<{ changes: number; lastInsertRowid: number }> {
	return sendMessage('run', { sql, params });
}

/**
 * Query for multiple rows
 */
export async function query<T = Record<string, unknown>>(
	sql: string,
	params?: Record<string, unknown> | unknown[]
): Promise<T[]> {
	return sendMessage('query', { sql, params });
}

/**
 * Query for a single row
 */
export async function queryOne<T = Record<string, unknown>>(
	sql: string,
	params?: Record<string, unknown> | unknown[]
): Promise<T | null> {
	const rows = await query<T>(sql, params);
	return rows[0] ?? null;
}

/**
 * Close the database connection
 */
export async function closeDb(): Promise<void> {
	if (!worker) return;
	await sendMessage('close');
	worker.terminate();
	worker = null;
	dbReady = false;
}
