<script lang="ts">
	// SPDX-License-Identifier: AGPL-3.0-only
	let { children } = $props();
</script>

<div class="flex min-h-[100dvh] flex-col py-6">
	{@render children()}
</div>
