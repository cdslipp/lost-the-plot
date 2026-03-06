<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import { db } from '$lib/db';
	import { onboarding } from '$lib/state/onboarding.svelte';
	import { onMount } from 'svelte';
	import OnboardingWizard from './OnboardingWizard.svelte';

	let { children }: { children: Snippet } = $props();

	const exemptRoute = $derived(
		page.url.pathname.startsWith('/s/') || page.url.pathname === '/tablet'
	);

	onMount(async () => {
		if (exemptRoute) {
			onboarding.needsOnboarding = false;
			return;
		}

		// Wait for DB to be ready, then check
		await db.init();
		await onboarding.check();
	});
</script>

{@render children()}

{#if onboarding.needsOnboarding === true && !exemptRoute}
	<OnboardingWizard />
{/if}
