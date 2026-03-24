import { goto } from '$app/navigation';
import { createActionExecutor } from '@stageplotter/action-registry';
import { actionContext } from './context.svelte';
import { isTauri } from '$lib/utils/platform';

export const actionExecutor = createActionExecutor({
	getContext: () => actionContext,
	getAvailabilityOptions: () => ({
		platform: isTauri() ? 'tauri' : 'web',
		isAuthenticated: true,
		canSeeFeature: () => true
	}),
	navigate: async (to) => {
		await goto(to);
	},
	toast: {
		error: (message, actionId) => {
			console.error(`[action:${actionId}] ${message}`);
		}
	}
});
