<script lang="ts">
	// SPDX-License-Identifier: AGPL-3.0-only
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { db } from '$lib/db';

	onMount(async () => {
		await db.init();

		// If exactly one band exists, go directly to it
		const bands = await db.query<{ id: string }>('SELECT id FROM bands LIMIT 2');
		if (bands.length === 1) {
			goto(`/bands/${bands[0].id}`, { replaceState: true });
		} else {
			goto('/bands', { replaceState: true });
		}
	});
</script>

<div class="flex h-[100dvh] items-center justify-center">
	<p class="text-text-secondary">Loading...</p>
</div>
