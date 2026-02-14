<script lang="ts">
	// SPDX-License-Identifier: AGPL-3.0-only
	let { children } = $props();
</script>

<div class="box-border flex min-h-[calc(100dvh-1.25rem)] flex-col py-6">
	{@render children()}
</div>
