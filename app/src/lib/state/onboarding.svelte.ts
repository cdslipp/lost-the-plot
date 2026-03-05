// SPDX-License-Identifier: AGPL-3.0-only

import { db } from '$lib/db';

const LS_KEY = 'stageplotter-onboarding-completed';

export type UserRole = 'tour_manager' | 'audio_tech' | 'stage_manager' | 'musician';
export type ActType = 'solo_duo' | 'band';
export type BandSize = '3piece' | '4piece' | '5piece';
export type BassPosition = 'stage_left' | 'stage_right' | 'none';
export type MonitorType = 'wedges' | 'iems' | 'both';

class OnboardingState {
	needsOnboarding: boolean | null = $state(null);
	currentStep: number = $state(0);

	// Collected data
	userRole: UserRole | null = $state(null);
	actType: ActType | null = $state(null);
	bandName: string = $state('');
	memberNames: string[] = $state([]);
	hasDrums: boolean | null = $state(null);
	bandSize: BandSize | null = $state(null);
	bassPosition: BassPosition | null = $state(null);
	monitorType: MonitorType | null = $state(null);

	async check(): Promise<void> {
		// Fast-path: localStorage says we're done
		if (typeof window !== 'undefined' && localStorage.getItem(LS_KEY)) {
			this.needsOnboarding = false;
			return;
		}

		// DB check (requires db to be ready)
		try {
			const row = await db.queryOne<{ value: string }>(
				"SELECT value FROM _app_meta WHERE key = 'onboarding_completed_at'"
			);
			if (row) {
				this.needsOnboarding = false;
				// Re-sync localStorage
				if (typeof window !== 'undefined') {
					localStorage.setItem(LS_KEY, row.value);
				}
				return;
			}
		} catch {
			// Table might not exist yet during init race — treat as needs onboarding
		}

		this.needsOnboarding = true;
	}

	async markComplete(): Promise<void> {
		const now = new Date().toISOString();

		await db.run(
			"INSERT OR REPLACE INTO _app_meta (key, value, updated_at) VALUES ('onboarding_completed_at', ?, datetime('now'))",
			[now]
		);

		// Store user role if selected
		if (this.userRole) {
			await db.run(
				"INSERT OR REPLACE INTO _app_meta (key, value, updated_at) VALUES ('user_role', ?, datetime('now'))",
				[this.userRole]
			);
		}

		if (typeof window !== 'undefined') {
			localStorage.setItem(LS_KEY, now);
		}

		this.needsOnboarding = false;
	}
}

export const onboarding = new OnboardingState();
