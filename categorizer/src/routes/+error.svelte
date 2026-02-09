<script lang="ts">
	import { page } from '$app/state';
</script>

<div class="flex h-full flex-col items-center justify-center bg-white text-center">
	<h1 class="text-5xl font-bold text-gray-900">{page.status}</h1>
	<p class="mt-3 text-gray-500">
		{#if page.status === 404}
			Page not found.
		{:else}
			Something went wrong.
		{/if}
	</p>
	<a
		href="/"
		class="mt-6 inline-flex items-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
	>
		Back to Categorizer
	</a>
</div>
