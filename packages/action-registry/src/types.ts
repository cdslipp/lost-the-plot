export type ActionScope = string;

export interface ActionContext {
	scope: ActionScope;
	entityId: string | null;
	entityMeta: Record<string, unknown> | null;
}

export interface ActionResult {
	success: boolean;
	message?: string;
	error?: string;
	undoPayload?: unknown;
	navigateTo?: string;
}

export interface ActionDefinition<TParams = void> {
	id: string;
	label: string;
	description?: string;
	scope: ActionScope | ActionScope[];
	category?: string;
	shortcut?: string;
	featureFlag?: string;
	platform?: string;
	requiresAuth?: boolean;
	canExecute?: (ctx: ActionContext) => boolean;
	execute: (ctx: ActionContext, params: TParams) => Promise<ActionResult> | ActionResult;
	undoable?: boolean;
	undo?: (ctx: ActionContext, undoPayload: unknown) => Promise<ActionResult> | ActionResult;
}

export type AnyActionDefinition = ActionDefinition<unknown>;

export interface ActionAvailabilityOptions {
	platform?: string | null;
	canSeeFeature?: (flag: string) => boolean;
	isAuthenticated?: boolean;
}

export interface UndoEntry {
	actionId: string;
	label: string;
	undoPayload: unknown;
	context: ActionContext;
	timestamp: number;
}

export interface ExecuteActionOptions {
	skipHistory?: boolean;
	skipToasts?: boolean;
}
