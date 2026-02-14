<script lang="ts">
	// SPDX-License-Identifier: AGPL-3.0-only
	import ListPageLayout from '$lib/components/ListPageLayout.svelte';
	import { Switch } from 'bits-ui';
	import { mode, setMode } from 'mode-watcher';
	import { preferences } from '$lib/state/preferences.svelte';
</script>

<ListPageLayout title="Settings">
	<div class="flex flex-col gap-6">
		<!-- Appearance -->
		<section>
			<h2 class="mb-3 font-serif text-lg font-semibold text-text-primary">Appearance</h2>
			<div class="rounded-xl border border-border-primary bg-surface p-4">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-text-primary">Dark mode</p>
						<p class="text-xs text-text-tertiary">Switch between light and dark themes</p>
					</div>
					<Switch.Root
						checked={mode.current === 'dark'}
						onCheckedChange={(checked) => setMode(checked ? 'dark' : 'light')}
						class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-stone-300 transition-colors data-[state=checked]:bg-stone-700 dark:bg-stone-600 dark:data-[state=checked]:bg-stone-400"
					>
						<Switch.Thumb
							class="pointer-events-none block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0"
						/>
					</Switch.Root>
				</div>
			</div>
		</section>

		<!-- Time Format -->
		<section>
			<h2 class="mb-3 font-serif text-lg font-semibold text-text-primary">Time Format</h2>
			<div class="rounded-xl border border-border-primary bg-surface p-4">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-text-primary">24-hour time</p>
						<p class="text-xs text-text-tertiary">
							{#if preferences.use24h}
								Showing times as 14:30
							{:else}
								Showing times as 2:30 PM
							{/if}
						</p>
					</div>
					<Switch.Root
						checked={preferences.use24h}
						onCheckedChange={(checked) => {
							preferences.timeFormat = checked ? '24h' : '12h';
						}}
						class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-stone-300 transition-colors data-[state=checked]:bg-stone-700 dark:bg-stone-600 dark:data-[state=checked]:bg-stone-400"
					>
						<Switch.Thumb
							class="pointer-events-none block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0"
						/>
					</Switch.Root>
				</div>
			</div>
		</section>
	</div>
</ListPageLayout>
