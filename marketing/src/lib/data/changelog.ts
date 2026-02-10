export interface ChangelogEntry {
	version: string;
	date: string;
	summary: string;
	added?: string[];
	changed?: string[];
	fixed?: string[];
}

export const changelog: ChangelogEntry[] = [
	{
		version: '0.1.0',
		date: '2026-02-07',
		summary: 'Initial release',
		added: [
			'Drag-and-drop stage plot editor with zoned canvas',
			'Auto-generated input list from stage items',
			'Patch sheet generation',
			'Export and print support',
			'Offline-capable PWA (works without internet)',
			'Open gear library with 200+ items across 10 categories',
			'Multi-angle gear views (front, back, left, right, angled)',
			'Dark mode support',
			'SQLite-based local storage (OPFS)',
			'No account required -- all data stays on your device'
		]
	}
];
