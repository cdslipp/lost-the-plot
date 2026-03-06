<script lang="ts">
	// SPDX-License-Identifier: AGPL-3.0-only
	import { APP_NAME } from '$lib/config';
	import ListPageLayout from '$lib/components/ListPageLayout.svelte';
</script>

<svelte:head>
	<title>Songs | {APP_NAME}</title>
</svelte:head>

<ListPageLayout title="Songs">
	<div class="flex flex-col items-center justify-center py-16 text-center">
		<p class="text-lg text-text-secondary">Coming soon</p>
	</div>
</ListPageLayout>
