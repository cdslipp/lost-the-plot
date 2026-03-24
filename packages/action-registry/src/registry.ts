import type {
	ActionAvailabilityOptions,
	ActionContext,
	ActionDefinition,
	AnyActionDefinition
} from './types.js';

const actionMap = new Map<string, AnyActionDefinition>();

export function registerAction<TParams>(definition: ActionDefinition<TParams>): void {
	if (actionMap.has(definition.id)) {
		console.warn(`Action already registered, replacing: ${definition.id}`);
	}
	actionMap.set(definition.id, definition as AnyActionDefinition);
}

export function getAction(actionId: string): AnyActionDefinition | undefined {
	return actionMap.get(actionId);
}

export function getAllActions(): AnyActionDefinition[] {
	return Array.from(actionMap.values()).sort((a, b) => a.id.localeCompare(b.id));
}

export function clearRegisteredActions(): void {
	actionMap.clear();
}

export function normalizeShortcut(shortcut: string): string {
	const parts = shortcut
		.trim()
		.toLowerCase()
		.split('+')
		.map((p) => p.trim())
		.filter(Boolean);

	if (parts.length === 0) return '';

	const base = parts[parts.length - 1];
	const modifiers = new Set(parts.slice(0, -1));
	const normalizedModifiers: string[] = [];
	if (
		modifiers.has('mod') ||
		modifiers.has('ctrl') ||
		modifiers.has('meta') ||
		modifiers.has('cmd')
	) {
		normalizedModifiers.push('mod');
	}
	if (modifiers.has('shift')) normalizedModifiers.push('shift');
	if (modifiers.has('alt') || modifiers.has('option')) normalizedModifiers.push('alt');

	return [...normalizedModifiers, base].join('+');
}

export function isActionAvailable(
	action: AnyActionDefinition,
	ctx: ActionContext,
	options: ActionAvailabilityOptions = {}
): boolean {
	const scopes = Array.isArray(action.scope) ? action.scope : [action.scope];
	if (!scopes.includes('global') && !scopes.includes(ctx.scope)) return false;

	if (action.platform && action.platform !== options.platform) return false;

	if (action.featureFlag && !(options.canSeeFeature?.(action.featureFlag) ?? false)) return false;

	if (action.requiresAuth && !options.isAuthenticated) return false;

	if (action.canExecute && !action.canExecute(ctx)) return false;

	return true;
}

export function getAvailableActions(
	ctx: ActionContext,
	options: ActionAvailabilityOptions = {}
): AnyActionDefinition[] {
	return getAllActions().filter((action) => isActionAvailable(action, ctx, options));
}

export function getActionsForShortcut(
	shortcut: string,
	ctx: ActionContext,
	options: ActionAvailabilityOptions = {}
): AnyActionDefinition[] {
	const normalizedShortcut = normalizeShortcut(shortcut);
	if (!normalizedShortcut) return [];

	return getAvailableActions(ctx, options).filter((action) => {
		if (!action.shortcut) return false;
		return normalizeShortcut(action.shortcut) === normalizedShortcut;
	});
}
