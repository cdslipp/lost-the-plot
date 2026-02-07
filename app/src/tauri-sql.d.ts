// SPDX-License-Identifier: AGPL-3.0-only

// Type stub for @tauri-apps/plugin-sql.
// The actual package is only installed in the desktop workspace.

declare module '@tauri-apps/plugin-sql' {
	export interface QueryResult {
		rowsAffected: number;
		lastInsertId: number;
	}

	export default class Database {
		static load(path: string): Promise<Database>;
		execute(sql: string, params?: unknown[]): Promise<QueryResult>;
		select<T = unknown>(sql: string, params?: unknown[]): Promise<T>;
		close(): Promise<void>;
	}
}
