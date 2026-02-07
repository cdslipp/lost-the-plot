// SPDX-License-Identifier: AGPL-3.0-only

export type DbStatus = 'uninitialized' | 'initializing' | 'ready' | 'error';

export interface DbState {
	status: DbStatus;
	error: string | null;
}

export interface DbAdapter {
	init(): Promise<void>;
	exec(sql: string): Promise<void>;
	run(sql: string, params?: unknown[]): Promise<{ changes: number; lastInsertRowid: number }>;
	query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
	queryOne<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T | null>;
	close(): Promise<void>;
}
