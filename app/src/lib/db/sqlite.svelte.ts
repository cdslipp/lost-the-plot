import { initDb, closeDb, exec, run, query, queryOne, type DbState, type DbStatus } from './sqlite';
import {
	runMigrations,
	migration001,
	migration002,
	migration003,
	migration004
} from '@stageplotter/db';

class DatabaseStore {
	status = $state<DbStatus>('uninitialized');
	error = $state<string | null>(null);
	opfsAvailable = $state<boolean>(false);

	get state(): DbState {
		return {
			status: this.status,
			error: this.error,
			opfsAvailable: this.opfsAvailable
		};
	}

	get isReady(): boolean {
		return this.status === 'ready';
	}

	async init(): Promise<void> {
		if (this.status === 'ready' || this.status === 'initializing') return;

		this.status = 'initializing';
		this.error = null;

		try {
			const result = await initDb();
			this.opfsAvailable = result.opfsAvailable;

			// Run migrations using this store as the DB adapter
			// (status not yet 'ready' so we skip the isReady check — call raw functions)
			const adapter = {
				init: async () => {},
				exec: (sql: string) => exec(sql),
				run: (sql: string, params?: unknown[]) => run(sql, params),
				query: <T = Record<string, unknown>>(sql: string, params?: unknown[]) =>
					query<T>(sql, params),
				queryOne: <T = Record<string, unknown>>(sql: string, params?: unknown[]) =>
					queryOne<T>(sql, params),
				close: async () => {}
			};

			await runMigrations(adapter, [
				{ version: migration001.version, up: migration001.up },
				{ version: migration002.version, up: migration002.up },
				{ version: migration003.version, up: migration003.up },
				{ version: migration004.version, up: migration004.up }
			]);

			this.status = 'ready';
		} catch (e) {
			this.error = e instanceof Error ? e.message : 'Unknown error';
			this.status = 'error';
			throw e;
		}
	}

	async close(): Promise<void> {
		await closeDb();
		this.status = 'uninitialized';
		this.opfsAvailable = false;
	}

	async exec(sql: string): Promise<void> {
		if (!this.isReady) throw new Error('Database not ready');
		return exec(sql);
	}

	async run(
		sql: string,
		params?: Record<string, unknown> | unknown[]
	): Promise<{ changes: number; lastInsertRowid: number }> {
		if (!this.isReady) throw new Error('Database not ready');
		return run(sql, params);
	}

	async query<T = Record<string, unknown>>(
		sql: string,
		params?: Record<string, unknown> | unknown[]
	): Promise<T[]> {
		if (!this.isReady) throw new Error('Database not ready');
		return query<T>(sql, params);
	}

	async queryOne<T = Record<string, unknown>>(
		sql: string,
		params?: Record<string, unknown> | unknown[]
	): Promise<T | null> {
		if (!this.isReady) throw new Error('Database not ready');
		return queryOne<T>(sql, params);
	}
}

export const db = new DatabaseStore();
