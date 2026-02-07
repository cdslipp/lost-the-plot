// SPDX-License-Identifier: AGPL-3.0-only
// Stub for virtual:pwa-register/svelte used in desktop builds.
// The PWA service worker is not needed in Tauri.

export function useRegisterSW(_opts?: any) {
	return {
		needRefresh: { subscribe: (_fn: any) => () => {} },
		offlineReady: { subscribe: (_fn: any) => () => {} },
		updateServiceWorker: async () => {}
	};
}
