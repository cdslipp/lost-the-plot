import {
	generateActionDocs,
	groupActionDocsByCategory,
	generateOscAddressTable,
	generateCompanionActionDefs
} from '@stageplotter/action-registry';

export function getRegisteredActionDocs() {
	const docs = generateActionDocs();
	return {
		actions: docs,
		grouped: groupActionDocsByCategory(docs),
		osc: generateOscAddressTable(docs),
		companion: generateCompanionActionDefs(docs)
	};
}
