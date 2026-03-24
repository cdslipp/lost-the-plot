// Side-effect imports: register all action definitions
import '$lib/action-defs/global';
import '$lib/action-defs/plot';
import '$lib/action-defs/setlist';

export { actionContext, setActionScope } from './context.svelte';
export { actionExecutor } from './executor';
export { formatShortcut, handleGlobalActionShortcuts } from './shortcuts.svelte';
