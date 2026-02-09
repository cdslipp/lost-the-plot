// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Generate a hex ID string (no dashes) for use as entity identifiers.
 * @param length Number of characters (default 32 = full UUID without dashes)
 */
export function generateId(length: number = 32): string {
	return crypto.randomUUID().replace(/-/g, '').slice(0, length);
}
