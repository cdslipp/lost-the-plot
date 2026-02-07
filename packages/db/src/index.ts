// SPDX-License-Identifier: AGPL-3.0-only

export type { DbAdapter, DbState, DbStatus } from './types.js';
export { createOpfsAdapter } from './adapter-opfs.js';
export { createMemoryAdapter } from './adapter-memory.js';
// Tauri adapter is loaded via dynamic import — not re-exported here
// to avoid bundling @tauri-apps/plugin-sql in PWA builds.

export { runMigrations } from './migrations/runner.js';
export type { Migration } from './migrations/runner.js';

// Individual migrations
export * as migration001 from './migrations/001_initial.js';
export * as migration002 from './migrations/002_add_bands.js';
export * as migration003 from './migrations/003_add_persons.js';
export * as migration004 from './migrations/004_add_person_meta.js';
export * as migration005 from './migrations/005_add_songs.js';
export * as migration006 from './migrations/006_add_gigs_setlists.js';
