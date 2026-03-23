import { getAllActions } from './registry.js';

export interface ActionDocEntry {
	id: string;
	label: string;
	description: string;
	category: string;
	scope: string[];
	shortcut?: string;
	platform?: string;
	featureFlag?: string;
	requiresAuth: boolean;
	undoable: boolean;
}

export function generateActionDocs(): ActionDocEntry[] {
	return getAllActions().map((action) => ({
		id: action.id,
		label: action.label,
		description: action.description ?? '',
		category: action.category ?? 'general',
		scope: Array.isArray(action.scope) ? action.scope : [action.scope],
		shortcut: action.shortcut,
		platform: action.platform,
		featureFlag: action.featureFlag,
		requiresAuth: Boolean(action.requiresAuth),
		undoable: Boolean(action.undoable)
	}));
}

export function groupActionDocsByCategory(
	entries: ActionDocEntry[]
): Map<string, ActionDocEntry[]> {
	const groups = new Map<string, ActionDocEntry[]>();
	for (const entry of entries) {
		const key = entry.category || 'general';
		const current = groups.get(key) ?? [];
		current.push(entry);
		groups.set(key, current);
	}
	return groups;
}

export function generateOscAddressTable(entries: ActionDocEntry[] = generateActionDocs()): {
	address: string;
	actionId: string;
	label: string;
	description: string;
}[] {
	return entries.map((entry) => ({
		address: `/${entry.id.replaceAll('.', '/')}`,
		actionId: entry.id,
		label: entry.label,
		description: entry.description
	}));
}

export function generateCompanionActionDefs(entries: ActionDocEntry[] = generateActionDocs()): {
	actionId: string;
	name: string;
	description: string;
	options: [];
}[] {
	return entries.map((entry) => ({
		actionId: entry.id,
		name: entry.label,
		description: entry.description,
		options: []
	}));
}
