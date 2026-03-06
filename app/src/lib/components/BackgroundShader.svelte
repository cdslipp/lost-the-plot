<script lang="ts">
	import { Shader, FilmGrain, Swirl, WaveDistortion } from 'shaders/svelte';
	import { mode } from 'mode-watcher';
	import { browser } from '$app/environment';
</script>

{#if browser}
<Shader>
	<Swirl
		colorA={mode.current === 'dark' ? '#3a3a3a' : '#8a8a8a'}
		colorB={mode.current === 'dark' ? '#1c1c1c' : '#d4d4d4'}
		colorSpace="oklch"
		detail={1.6}
		speed={0.3}
	/>
	<WaveDistortion
		angle={133}
		edges="mirror"
		frequency={1.6}
		speed={0.8}
		strength={0.1}
		visible={true}
	/>
	<FilmGrain strength={0.15} />
</Shader>
{/if}
