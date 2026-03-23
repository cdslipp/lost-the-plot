import type { ActionContext, ActionScope } from '@stageplotter/action-registry';

export const actionContext = $state<ActionContext>({
	scope: 'global',
	entityId: null,
	entityMeta: null
});

export function setActionScope(
	scope: ActionScope,
	entityId: string | null = null,
	entityMeta: Record<string, unknown> | null = null
): void {
	actionContext.scope = scope;
	actionContext.entityId = entityId;
	actionContext.entityMeta = entityMeta;
}
