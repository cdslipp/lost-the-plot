export const ITEM_TYPES = [
	'instrument',
	'amp',
	'drumset',
	'microphone',
	'monitor',
	'speaker',
	'di_box',
	'stagebox',
	'mixer',
	'pedal',
	'cable_connector',
	'person',
	'furniture',
	'stand',
	'stagecraft',
	'equipment',
	'power',
	'marker',
	'label'
] as const;

export const CATEGORIES = [
	'guitars',
	'bass',
	'keys',
	'drums',
	'percussion',
	'strings',
	'winds',
	'amps',
	'mics',
	'monitors',
	'dj_gear',
	'people',
	'furniture',
	'stagecraft',
	'connectors',
	'snakes',
	'equipment',
	'power'
] as const;

export const CONNECTOR_TYPES = [
	'XLR',
	'TRS',
	'TS',
	'TRRS',
	'MIDI',
	'USB',
	'IEC',
	'speakon',
	'powercon'
] as const;

export const PROVISION_TYPES = ['artist_provided', 'venue_provided', 'rental'] as const;

export const STAND_TYPES = ['none', 'short_boom', 'tall_boom', 'straight'] as const;

export const LINK_MODES = ['mono', 'stereo_pair', 'stereo_sum'] as const;

export const PERSON_SUBCATEGORIES = ['player', 'crew', 'generic', ''] as const;

/** Types that generate audio inputs when placed on a stage plot */
export const AUDIO_INPUT_TYPES = ['instrument', 'amp', 'drumset', 'microphone'] as const;

/** Types that are monitor outputs */
export const MONITOR_OUTPUT_TYPES = ['monitor', 'speaker'] as const;

/** Types that default to backline */
export const BACKLINE_TYPES = ['instrument', 'amp', 'drumset'] as const;

/** Types in the signal chain (no own input) */
export const SIGNAL_CHAIN_TYPES = ['pedal', 'di_box'] as const;

export const CATEGORY_MAP: Record<string, string> = {
	ac: 'power',
	amps: 'amps',
	drums: 'drums',
	guitars: 'guitars',
	keys: 'keys',
	mics: 'mics',
	more: 'equipment',
	numerals: 'equipment',
	outputs: 'monitors',
	people: 'people',
	percussion: 'percussion',
	stagecraft: 'stagecraft',
	strings: 'strings',
	symbols: 'equipment',
	winds: 'winds',
	connectors: 'connectors',
	snakes: 'snakes',
	monitors: 'monitors',
	furniture: 'furniture',
	equipment: 'equipment',
	bass: 'bass'
};
