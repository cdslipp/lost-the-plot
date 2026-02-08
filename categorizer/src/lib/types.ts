export type ItemType =
	| 'instrument'
	| 'amp'
	| 'drumset'
	| 'microphone'
	| 'monitor'
	| 'speaker'
	| 'di_box'
	| 'stagebox'
	| 'mixer'
	| 'pedal'
	| 'cable_connector'
	| 'person'
	| 'furniture'
	| 'stand'
	| 'stagecraft'
	| 'equipment'
	| 'power'
	| 'marker'
	| 'label';

export type PersonSubcategory = 'player' | 'crew' | 'generic' | '';

export type ProvisionType = 'artist_provided' | 'venue_provided' | 'rental';
export type StandType = 'none' | 'short_boom' | 'tall_boom' | 'straight';
export type LinkMode = 'mono' | 'stereo_pair' | 'stereo_sum';
export type ConnectorType =
	| 'XLR'
	| 'TRS'
	| 'TS'
	| 'TRRS'
	| 'MIDI'
	| 'USB'
	| 'IEC'
	| 'speakon'
	| 'powercon';

export interface OriginalItem {
	name: string;
	item_type: string;
	variants: Record<string, string>;
	variant_order?: string[];
	path: string;
	default_inputs?: DefaultInput[];
	default_outputs?: DefaultOutput[];
	brands?: string[];
	instrument_signal?: 'acoustic' | 'electric' | '';
}

export interface DefaultInput {
	name: string;
	short_name: string;
	ideal_device?: GearPreference;
	stand: StandType;
	phantom_power: boolean;
	link_mode: LinkMode;
}

export interface DefaultOutput {
	name: string;
	short_name: string;
	type?: string;
	link_mode: LinkMode;
}

export interface Dimensions {
	width_in: number;
	depth_in: number;
	height_in: number;
}

export interface GearPreference {
	preferred?: Gear[];
	allowed?: Gear[];
	disallowed?: Gear[];
}

export interface Gear {
	id: string;
	name: string;
	brand?: string;
	model?: string;
	version?: string;
	connectors?: string[];
	notes?: string;
}

export interface BrandModel {
	brand: string;
	model: string;
}

export interface Brand {
	name: string;
	slug: string;
	website?: string;
	status?: 'active' | 'defunct';
	notes?: string;
}

export interface CatalogItem {
	// Original fields (preserved)
	name: string;
	item_type: ItemType;
	variants: Record<string, string>;
	path: string;

	// Brand/model identification
	brands: string[];
	model: string;
	common_models: BrandModel[];
	variant_order?: string[];
	instrument_signal?: 'acoustic' | 'electric' | '';

	// Enriched fields
	slug: string;
	category: string;
	subcategory: string;
	tags: string[];
	default_inputs: DefaultInput[];
	default_outputs: DefaultOutput[];
	dimensions: Dimensions;
	provision_default: ProvisionType | '';
	is_backline: boolean;
	connectors: ConnectorType[];
	power_requirements: string;
	notes: string;
	auto_number_prefix: string;
	person_subcategory: PersonSubcategory;

	// Meta
	_enriched: boolean;
	_original_name: string;
}
