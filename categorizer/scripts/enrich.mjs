#!/usr/bin/env node
/**
 * Bulk catalog enrichment script.
 * Reads items.json, enriches each item with subcategory, tags, dimensions,
 * connectors, provision_default, brand/model, etc. Writes enriched-items.json
 * and an enrichment-report.md.
 *
 * Usage: node categorizer/scripts/enrich.mjs
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, resolve } from 'path';

const ROOT = resolve(import.meta.dirname, '../..');
const ITEMS_PATH = join(ROOT, 'app/static/final_assets/items.json');
const ASSETS_DIR = join(ROOT, 'app/static/final_assets');
const OUTPUT_PATH = join(ROOT, 'categorizer/data/enriched-items.json');
const REPORT_PATH = join(ROOT, 'categorizer/data/enrichment-report.md');

// ─── CATEGORY MAP ───────────────────────────────────────────────────────────
const CATEGORY_MAP = {
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

// ─── NAME OVERRIDES ─────────────────────────────────────────────────────────
const NAME_OVERRIDES = {
	'amps/bass/bassamp': 'Bass Amp',
	'amps/bass/blondebassman': 'Blonde Bassman',
	'amps/bass/ampeg': 'Ampeg SVT',
	'amps/guitar/fender_amp': 'Fender Deluxe Reverb',
	'amps/keyboard/keyamp': 'Keyboard Amp',
	'amps/guitar/marshall412': 'Marshall 4x12 Cabinet',
	'amps/guitar/marshall_amp': 'Marshall Amp',
	'amps/guitar/marshallcabs': 'Marshall Cabinets',
	'amps/guitar/marshallhead': 'Marshall Head',
	'amps/guitar/nashville_amp': 'Nashville Amp',
	'amps/guitar/vox': 'Vox AC30',
	'connectors/adapters/femalexlrtoquarter': 'Female XLR to 1/4"',
	'connectors/adapters/femalexlrtoquartertrs': 'Female XLR to 1/4" TRS',
	'connectors/adapters/maletodoublefemale': 'Male to Double Female',
	'connectors/adapters/quartertomalexl': '1/4" to Male XLR',
	'connectors/adapters/quartertrstomalexl': '1/4" TRS to Male XLR',
	'connectors/quarter/quartermale': '1/4" Male',
	'connectors/quarter/quartermale_balanced': '1/4" Male Balanced',
	'connectors/video/hdmi': 'HDMI',
	'connectors/video/vga': 'VGA',
	'connectors/xlr/doublefemalexl': 'Double Female XLR',
	'connectors/xlr/doublemalexl': 'Double Male XLR',
	'connectors/xlr/xlrmale': 'XLR Male',
	'snakes/stagebox8': 'Stagebox 8-Channel',
	'snakes/stagebox12': 'Stagebox 12-Channel',
	'snakes/stagebox16': 'Stagebox 16-Channel',
	'snakes/stagebox24': 'Stagebox 24-Channel',
	'drums/drum_kits/doublekick': 'Double Kick Drum Kit',
	'drums/drum_kits/edrums': 'Electronic Drums',
	'drums/drum_kits/fourtoms': 'Drum Kit - Four Toms',
	'drums/drum_kits/rototomset': 'Rototom Set',
	'drums/drum_kits/threetoms': 'Drum Kit - Three Toms',
	'drums/drum_kits/twotoms': 'Drum Kit - Two Toms',
	'drums/hardware/bassdrum': 'Bass Drum',
	'drums/hardware/drummat': 'Drum Mat',
	'drums/hardware/drumshield_one': 'Drum Shield (1 Panel)',
	'drums/hardware/drumshield_two': 'Drum Shield (2 Panel)',
	'drums/hardware/drumshield_three': 'Drum Shield (3 Panel)',
	'drums/hardware/hihat': 'Hi-Hat',
	'drums/hardware/sixbass': 'Six Bass Drums',
	'drums/hardware/cowbell': 'Cowbell',
	'drums/hardware/crash': 'Crash Cymbal',
	'drums/hardware/ride': 'Ride Cymbal',
	'drums/cymbals/cymbal': 'Cymbal',
	'equipment/bosspedal': 'Boss Pedal',
	'equipment/cdplayer': 'CD Player',
	'equipment/di': 'DI Box',
	'equipment/eq': 'EQ',
	'equipment/flightcase': 'Flight Case',
	'equipment/floorbox': 'Floor Box',
	'equipment/gates': 'Noise Gate',
	'equipment/ledwall': 'LED Wall',
	'equipment/pedalboard': 'Pedalboard',
	'equipment/stereodi': 'Stereo DI',
	'furniture/musicstand': 'Music Stand',
	'furniture/orchseat': 'Orchestra Chair',
	'furniture/pianobench': 'Piano Bench',
	'furniture/standw2_lamps': 'Music Stand with 2 Lamps',
	'furniture/standwlamp': 'Music Stand with Lamp',
	'guitars/acoustic/acousticguitar': 'Acoustic Guitar',
	'guitars/azerisaz': 'Azeri Saz',
	'guitars/bass/p_bass': 'P-Bass',
	'guitars/bass/stringbass': 'Upright Bass',
	'guitars/electric/electricguitar': 'Electric Guitar',
	'guitars/electric/guitaronstand': 'Guitar on Stand',
	'guitars/guitarron': 'Guitarrón',
	'guitars/guitarstand': 'Guitar Stand',
	'guitars/guitarsynth': 'Guitar Synth',
	'guitars/steel/lapsteel': 'Lap Steel',
	'guitars/steel/steel': 'Pedal Steel',
	'guitars/national': 'National Resonator',
	'keys/babygrand': 'Baby Grand Piano',
	'keys/closedgrand': 'Closed Grand Piano',
	'keys/doublekeystand': 'Double Keyboard Stand',
	'keys/drummachine': 'Drum Machine',
	'keys/fantom': 'Roland Fantom',
	'keys/grandpiano': 'Grand Piano',
	'keys/grandpiano1': 'Grand Piano (Alt)',
	'keys/keystand': 'Keyboard Stand',
	'keys/keytar/keytar': 'Keytar',
	'keys/leslie': 'Leslie Speaker',
	'keys/nordstage88': 'Nord Stage 88',
	'keys/upright': 'Upright Piano',
	'keys/yamahacp70': 'Yamaha CP-70',
	'keys/yamahagt2': 'Yamaha GT-2',
	'mics/boom/boom57': 'Boom Mic (57)',
	'mics/boom/boomlshort': 'Short Boom Mic (Left)',
	'mics/boom/boomlshortback': 'Short Boom Mic (Left, Back)',
	'mics/boom/boomrshort': 'Short Boom Mic (Right)',
	'mics/boom/boomrshortback': 'Short Boom Mic (Right, Back)',
	'mics/hand_held/wired_mic': 'Wired Mic',
	'mics/hand_held/wireless_mic': 'Wireless Mic',
	'mics/headset': 'Headset Mic',
	'mics/stands/boom57': 'Boom Stand (57)',
	'mics/stands/boomlshort': 'Short Boom Stand (Left)',
	'mics/stands/boomrshort': 'Short Boom Stand (Right)',
	'mics/stands/centervocal': 'Center Vocal Stand',
	'mics/stands/kmstand': 'K&M Mic Stand',
	'mics/stands/straight': 'Straight Mic Stand',
	'mics/straight/standstraight_no-_mic': 'Straight Stand (No Mic)',
	'mics/straight/straight_short': 'Short Straight Mic',
	'mics/straight/straight_shortback': 'Short Straight Mic (Back)',
	'mics/straight/straight_vocal': 'Straight Vocal Mic',
	'monitors/bosel1': 'Bose L1',
	'monitors/inear': 'In-Ear Monitor',
	'monitors/linearray': 'Line Array',
	'monitors/lowprofile': 'Low Profile Monitor',
	'monitors/personalsys': 'Personal Monitor System',
	'monitors/sidefill': 'Sidefill',
	'monitors/speakerwstand': 'Speaker on Stand',
	'monitors/speaknsubwstand': 'Speaker & Sub on Stand',
	'monitors/stageplotproleft': 'StagePlot Pro (Left)',
	'monitors/stageplotprologo': 'StagePlot Pro Logo',
	'monitors/subwoofer': 'Subwoofer',
	'monitors/wedge': 'Wedge Monitor',
	'more/barricade': 'Barricade',
	'more/compressor': 'Compressor',
	'more/dj_gear/dj_setup': 'DJ Setup',
	'more/dj_gear/djm800': 'Pioneer DJM-800',
	'more/dj_gear/djsetup': 'DJ Setup (Compact)',
	'more/dj_gear/djsetup3': 'DJ Setup (3 Deck)',
	'more/dj_gear/pioneercdj2000': 'Pioneer CDJ-2000',
	'more/dj_gear/sl1200': 'Technics SL-1200',
	'more/fan/fan': 'Fan',
	'more/furniture/chair/chair': 'Chair',
	'more/furniture/chair/chairback': 'Chair (Back View)',
	'more/furniture/sofa': 'Sofa',
	'more/furniture/stool/barstool': 'Bar Stool',
	'more/furniture/stool/stool': 'Stool',
	'more/furniture/table/rectable': 'Rectangular Table',
	'more/furniture/table/roundtable': 'Round Table',
	'more/furniture/table/table': 'Table',
	'more/gobo': 'Gobo',
	'more/ipad': 'iPad',
	'more/laptop': 'Laptop',
	'more/mixer': 'Mixer',
	'more/podium/podium': 'Podium',
	'more/podium/podium_mic': 'Podium with Mic',
	'more/rack/gunrack': 'Guitar Rack',
	'more/rack/rack': 'Equipment Rack',
	'more/rack/rackback': 'Equipment Rack (Back)',
	'more/sandbag': 'Sandbag',
	'more/video': 'Video Monitor',
	'outputs/monitors': 'IEM Wired',
	'people/choir/choir': 'Choir',
	'people/female/woman1': 'Woman 1',
	'people/female/woman2': 'Woman 2',
	'people/female/woman3': 'Woman 3',
	'people/male/man1': 'Man 1',
	'people/male/man2': 'Man 2',
	'people/male/man3': 'Man 3',
	'people/players/AcuBassist': 'Acoustic Bassist',
	'people/players/accordionist': 'Accordionist',
	'people/players/banjo_guy': 'Banjo Player',
	'people/players/bassist': 'Bassist',
	'people/players/beguitarist': 'Beginner Guitarist',
	'people/players/conductor': 'Conductor',
	'people/players/dancer': 'Dancer',
	'people/players/drummer': 'Drummer 2',
	'people/players/drummerafrican': 'Drummer 1',
	'people/players/ebassist': 'Electric Bassist',
	'people/players/eguitarist': 'Electric Guitarist',
	'people/players/femacoustic': 'Female Acoustic Guitarist',
	'people/players/femguitarist': 'Female Guitarist',
	'people/players/femkeystand': 'Female Keyboardist',
	'people/players/guitarist': 'Guitarist',
	'people/players/keyboardist': 'Keyboardist',
	'people/players/keytarplayer': 'Keytar Player',
	'people/players/mandoman': 'Mandolin Player',
	'people/players/percussionist': 'Percussionist',
	'people/players/percussionistone': 'Percussionist (Alt)',
	'people/players/pianoplayer': 'Piano Player',
	'people/players/saxman': 'Sax Player',
	'people/players/saxophonist': 'Saxophonist',
	'people/players/singer': 'Singer',
	'people/players/trumpetplayer': 'Trumpet Player',
	'people/players/violinist': 'Violinist',
	'people/players/zinfoniaplayer': 'Zinfonia Player',
	'percussion/bongo': 'Bongos',
	'percussion/conga/conga': 'Conga',
	'percussion/conga/conga_double': 'Double Conga',
	'percussion/percussionpad': 'Percussion Pad',
	'percussion/steelpan': 'Steel Pan',
	'percussion/tenorpan': 'Tenor Pan',
	'percussion/timpani/timpani1': 'Timpani (1)',
	'percussion/timpani/timpani2': 'Timpani (2)',
	'percussion/timpani/timpani3': 'Timpani (3)',
	'percussion/timpani/timpani4': 'Timpani (4)',
	'percussion/timpani/timpaniset': 'Timpani Set',
	'stagecraft/curtain/curtainold': 'Curtain',
	'stagecraft/riser/choralriser2': 'Choral Riser (2-Tier)',
	'stagecraft/riser/choralriser3': 'Choral Riser (3-Tier)',
	'stagecraft/riser/choralriser6': 'Choral Riser (6-Tier)',
	'stagecraft/riser/choralriser8': 'Choral Riser (8-Tier)',
	'stagecraft/riser/riserfront': 'Riser Front',
	'stagecraft/stage/projector_stage': 'Projector',
	'stagecraft/stage/stagedge': 'Stage Edge',
	'stagecraft/stage/stagedgef': 'Stage Edge (Front)',
	'stagecraft/stage/stagefront': 'Stage Front',
	'stagecraft/stairs': 'Stairs',
	'stagecraft/truss': 'Truss',
	'drums/individual_drums/kick': 'Kick Drum',
	'drums/individual_drums/snare': 'Snare Drum',
	'drums/individual_drums/floortom': 'Floor Tom',
	'drums/individual_drums/tom1': 'Rack Tom 1',
	'drums/individual_drums/tom2': 'Rack Tom 2',
	'strings/cello': 'Cello',
	'strings/harp': 'Harp',
	'strings/viola': 'Viola',
	'strings/violin/violin': 'Violin',
	'winds/altosax': 'Alto Saxophone',
	'winds/baritonesax': 'Baritone Saxophone',
	'winds/bassclarinet': 'Bass Clarinet',
	'winds/clarinet/clarinet': 'Clarinet',
	'winds/clarinet/contraclarinet': 'Contra Clarinet',
	'winds/contrabassoon': 'Contrabassoon',
	'ac/electric/electric': 'Power Outlet',
	'ac/electric/electric240_uk': 'UK 240V Outlet',
	'ac/electric/electric240_uk4': 'UK 240V Quad Outlet',
	'ac/electric/electric4': 'Quad Power Outlet',
	'ac/electric/euro': 'Euro Outlet'
};

// ─── SUBCATEGORY RULES ──────────────────────────────────────────────────────
function getSubcategory(path, itemType) {
	const parts = path.split('/');
	const seg1 = parts[0];
	const seg2 = parts[1] || '';
	const seg3 = parts[2] || parts[1] || '';

	// Amps
	if (seg1 === 'amps') {
		if (seg2 === 'bass') return 'bass_amp';
		if (seg2 === 'guitar') return 'guitar_amp';
		if (seg2 === 'keyboard') return 'keyboard_amp';
		if (seg2 === 'steel') return 'steel_amp';
		return 'amp';
	}
	// Drums
	if (seg1 === 'drums') {
		if (seg2 === 'drum_kits') return 'kit';
		if (seg2 === 'hardware') return 'hardware';
		if (seg2 === 'cymbals') return 'cymbal';
		if (seg2 === 'individual_drums') return 'individual_drum';
		return 'drums';
	}
	// Guitars
	if (seg1 === 'guitars') {
		if (seg2 === 'acoustic') return 'acoustic';
		if (seg2 === 'electric') return 'electric';
		if (seg2 === 'bass') return 'bass';
		if (seg2 === 'steel') return 'steel';
		if (seg2 === 'banjo') return 'banjo';
		if (seg2 === 'lute') return 'lute';
		if (seg2 === 'mandolin') return 'mandolin';
		if (seg2 === 'zinfonia') return 'zinfonia';
		if (itemType === 'stand') return 'stand';
		return 'world_string';
	}
	// Keys
	if (seg1 === 'keys') {
		if (['grandpiano', 'grandpiano1', 'closedgrand'].includes(seg2)) return 'grand_piano';
		if (seg2 === 'babygrand') return 'baby_grand';
		if (seg2 === 'upright') return 'upright_piano';
		if (['nordstage88', 'fantom', 'yamahacp70', 'yamahagt2'].includes(seg2)) return 'stage_piano';
		if (seg2 === 'harpsichord' || seg2 === 'celesta') return 'harpsichord';
		if (seg2 === 'clavinet') return 'clavinet';
		if (seg2 === 'mellotron') return 'mellotron';
		if (seg2 === 'accordion') return 'accordion';
		if (seg2 === 'keytar') return 'keytar';
		if (seg2 === 'drummachine') return 'drum_machine';
		if (seg2 === 'leslie') return 'rotary_speaker';
		if (seg2 === 'keystand' || seg2 === 'doublekeystand') return 'stand';
		return 'synth';
	}
	// Mics
	if (seg1 === 'mics') {
		if (seg2 === 'boom') return 'boom';
		if (seg2 === 'hand_held') return 'handheld';
		if (seg2 === 'headset') return 'headset';
		if (seg2 === 'straight') return 'straight';
		if (seg2 === 'stands') return 'stand';
		return 'mic';
	}
	// Monitors
	if (seg1 === 'monitors' || seg1 === 'outputs') {
		if (path.includes('wedge')) return 'wedge';
		if (path.includes('inear') || path.includes('outputs/monitors')) return 'in_ear';
		if (path.includes('sidefill')) return 'sidefill';
		if (path.includes('linearray')) return 'line_array';
		if (path.includes('subwoofer')) return 'subwoofer';
		if (path.includes('lowprofile')) return 'low_profile';
		if (path.includes('personalsys')) return 'personal_system';
		if (path.includes('bosel1')) return 'column_speaker';
		if (path.includes('speakerwstand') || path.includes('speaknsubwstand')) return 'pa_speaker';
		if (path.includes('stageplotpro')) return 'branding';
		return 'monitor';
	}
	// People
	if (seg1 === 'people') {
		if (seg2 === 'players') return 'player';
		if (seg2 === 'choir') return 'ensemble';
		return 'generic';
	}
	// Connectors
	if (seg1 === 'connectors') {
		if (seg2 === 'adapters') return 'adapter';
		if (seg2 === 'xlr') return 'xlr';
		if (seg2 === 'quarter') return 'quarter_inch';
		if (seg2 === 'video') return 'video';
		return 'connector';
	}
	// Snakes
	if (seg1 === 'snakes') return 'stagebox';
	// Stagecraft
	if (seg1 === 'stagecraft') {
		if (seg2 === 'curtain') return 'curtain';
		if (seg2 === 'riser') return 'riser';
		if (seg2 === 'stage') return 'stage_element';
		if (seg2 === 'stairs') return 'stairs';
		if (seg2 === 'truss') return 'truss';
		return 'stagecraft';
	}
	// Percussion - derive from name/path
	if (seg1 === 'percussion') {
		if (path.includes('timpani')) return 'timpani';
		if (path.includes('conga')) return 'conga';
		if (path.includes('bongo')) return 'bongo';
		if (path.includes('marimba')) return 'marimba';
		if (path.includes('steelpan') || path.includes('tenorpan')) return 'steel_drum';
		if (path.includes('gong')) return 'gong';
		if (path.includes('chimes')) return 'chimes';
		if (path.includes('tabla')) return 'tabla';
		if (path.includes('djembe')) return 'djembe';
		if (path.includes('cajon')) return 'cajon';
		if (path.includes('daf') || path.includes('dholak') || path.includes('dhumbuk'))
			return 'hand_drum';
		if (path.includes('percussionpad')) return 'percussion_pad';
		if (path.includes('tambourine')) return 'tambourine';
		if (path.includes('claves')) return 'claves';
		return 'percussion';
	}
	// Strings
	if (seg1 === 'strings') return 'orchestral_string';
	// Winds
	if (seg1 === 'winds') {
		if (path.includes('sax')) return 'saxophone';
		if (path.includes('clarinet')) return 'clarinet';
		if (path.includes('bassoon') || path.includes('contrabassoon')) return 'bassoon';
		if (path.includes('trumpet') || path.includes('cornet')) return 'brass';
		if (path.includes('trombone')) return 'brass';
		if (path.includes('tuba') || path.includes('euphonium')) return 'brass';
		if (path.includes('flute') || path.includes('piccolo')) return 'flute';
		if (path.includes('oboe')) return 'oboe';
		if (path.includes('recorder') || path.includes('ocarina')) return 'recorder';
		if (path.includes('harmonica')) return 'harmonica';
		if (path.includes('bagpipes') || path.includes('gajda') || path.includes('kaval'))
			return 'folk_wind';
		return 'wind';
	}
	// Power
	if (seg1 === 'ac') return 'power_outlet';
	// Equipment / More
	if (seg1 === 'equipment' || seg1 === 'more') {
		if (path.includes('dj_gear')) return 'dj';
		if (path.includes('furniture') || path.includes('podium')) return 'furniture';
		if (path.includes('mixer')) return 'mixer';
		if (path.includes('rack')) return 'rack';
		if (path.includes('di') || path.includes('stereodi')) return 'di_box';
		if (path.includes('pedalboard') || path.includes('bosspedal')) return 'pedal';
		if (path.includes('laptop') || path.includes('ipad')) return 'computer';
		if (path.includes('video') || path.includes('ledwall')) return 'video';
		if (path.includes('compressor') || path.includes('eq') || path.includes('gates'))
			return 'signal_processor';
		if (path.includes('fan')) return 'utility';
		if (path.includes('barricade') || path.includes('sandbag') || path.includes('gobo'))
			return 'stage_utility';
		if (path.includes('flightcase')) return 'case';
		if (path.includes('floorbox')) return 'floor_box';
		if (path.includes('sampler') || path.includes('cdplayer')) return 'playback';
		return 'equipment';
	}
	// Furniture
	if (seg1 === 'furniture') {
		if (path.includes('musicstand') || path.includes('standw')) return 'music_stand';
		if (path.includes('pianobench')) return 'bench';
		if (path.includes('orchseat')) return 'chair';
		return 'furniture';
	}
	return '';
}

// ─── PROVISION DEFAULT ──────────────────────────────────────────────────────
function getProvisionDefault(itemType, path) {
	const artistTypes = ['instrument', 'amp', 'drumset', 'pedal'];
	const venueTypes = [
		'monitor',
		'speaker',
		'microphone',
		'stagebox',
		'mixer',
		'di_box',
		'stand',
		'power',
		'cable_connector',
		'furniture',
		'stagecraft'
	];
	const naTypes = ['person', 'marker', 'label'];

	if (naTypes.includes(itemType)) return '';
	if (artistTypes.includes(itemType)) return 'artist_provided';
	if (venueTypes.includes(itemType)) return 'venue_provided';

	// equipment
	if (itemType === 'equipment') {
		if (path.includes('dj_gear') || path.includes('laptop') || path.includes('ipad'))
			return 'artist_provided';
		return 'venue_provided';
	}
	return '';
}

// ─── CONNECTORS ─────────────────────────────────────────────────────────────
function getConnectors(itemType, category, path) {
	if (itemType === 'microphone') {
		if (path.includes('wireless')) return [];
		return ['XLR'];
	}
	if (itemType === 'instrument') {
		if (category === 'guitars') return ['TS'];
		if (category === 'keys') {
			// Acoustic pianos, harpsichord, celesta, accordion have no connectors
			if (
				[
					'grandpiano',
					'grandpiano1',
					'closedgrand',
					'babygrand',
					'upright',
					'harpsichord',
					'celesta',
					'accordion'
				].some((k) => path.includes(k))
			)
				return [];
			return ['TRS']; // Electric keys
		}
		if (category === 'strings') return []; // Acoustic strings
		if (category === 'winds') return []; // Acoustic winds
		if (category === 'drums') return ['XLR']; // Individual drums (usually miked)
		if (category === 'percussion') return []; // Acoustic percussion
		return [];
	}
	if (itemType === 'drumset') return []; // Miked separately
	if (itemType === 'amp') return ['TS', 'speakon'];
	if (itemType === 'monitor' || itemType === 'speaker') return ['XLR', 'speakon'];
	if (itemType === 'di_box') return ['TS', 'XLR'];
	if (itemType === 'stagebox') return ['XLR'];
	if (itemType === 'mixer') return ['XLR', 'TRS'];
	if (itemType === 'pedal') return ['TS'];
	if (itemType === 'power') return ['IEC'];
	return [];
}

// ─── TAGS ────────────────────────────────────────────────────────────────────
function generateTags(item, subcategory) {
	const tags = [];
	const { item_type, path, brand } = item;
	const category = getCategory(path);

	// Category tag
	if (category) tags.push(category);

	// Item type tag
	if (item_type && !['marker', 'label'].includes(item_type)) tags.push(item_type);

	// Subcategory tag
	if (subcategory && subcategory !== item_type) tags.push(subcategory);

	// Path-derived tags
	const parts = path.split('/');
	if (parts.length > 1) {
		const seg2 = parts[1];
		if (seg2 === 'bass' && !tags.includes('bass')) tags.push('bass');
		if (seg2 === 'guitar' && !tags.includes('guitar')) tags.push('guitar');
		if (seg2 === 'keyboard' && !tags.includes('keyboard')) tags.push('keyboard');
		if (seg2 === 'acoustic') tags.push('acoustic');
		if (seg2 === 'electric') tags.push('electric');
	}

	// Brand tag
	if (brand) tags.push(brand.toLowerCase());

	// Genre/context tags for world instruments
	const worldInstruments = {
		azerisaz: ['world', 'middle_eastern', 'azeri'],
		balalaika: ['world', 'russian', 'folk'],
		bouzouki: ['world', 'greek', 'folk'],
		charango: ['world', 'latin', 'andean'],
		cuatro: ['world', 'latin', 'venezuelan'],
		guitarron: ['world', 'latin', 'mexican', 'mariachi'],
		sitar: ['world', 'indian', 'hindustani'],
		oud: ['world', 'middle_eastern', 'arabic'],
		tiple: ['world', 'latin', 'colombian'],
		tumbi: ['world', 'indian', 'punjabi'],
		zinfonia: ['world', 'folk'],
		bagpipes: ['world', 'celtic', 'scottish'],
		gajda: ['world', 'balkan', 'folk'],
		kaval: ['world', 'balkan', 'folk'],
		daf: ['world', 'middle_eastern', 'persian'],
		dholak: ['world', 'indian'],
		dhumbuk: ['world', 'middle_eastern'],
		djembe: ['world', 'african', 'west_african'],
		tabla: ['world', 'indian', 'hindustani'],
		steelpan: ['world', 'caribbean', 'trinidadian'],
		tenorpan: ['world', 'caribbean', 'trinidadian']
	};

	const lastSeg = parts[parts.length - 1];
	for (const [key, worldTags] of Object.entries(worldInstruments)) {
		if (lastSeg.includes(key) || path.includes(key)) {
			tags.push(...worldTags);
			break;
		}
	}

	// Backline tag
	if (item.is_backline) tags.push('backline');

	// Signal chain
	if (['pedal', 'di_box'].includes(item_type)) tags.push('signal_chain');

	// DJ
	if (
		path.includes('dj_gear') ||
		path.includes('dj_setup') ||
		path.includes('sl1200') ||
		path.includes('djm') ||
		path.includes('cdj')
	) {
		if (!tags.includes('dj')) tags.push('dj');
	}

	return [...new Set(tags)];
}

// ─── BRAND/MODEL DB ─────────────────────────────────────────────────────────
const BRAND_MODEL_DB = {
	'amps/bass/blondebassman': { brand: 'Fender', model: 'Bassman (Blonde)' },
	'keys/yamahacp70': { brand: 'Yamaha', model: 'CP-70' },
	'keys/yamahagt2': { brand: 'Yamaha', model: 'GT-2' },
	'keys/leslie': { brand: 'Leslie', model: 'Rotary Speaker' },
	'keys/mellotron': { brand: 'Mellotron', model: 'M400' },
	'keys/clavinet': { brand: 'Hohner', model: 'Clavinet D6' },
	'amps/guitar/nashville_amp': { brand: 'Peavey', model: 'Nashville 400' }
};

// ─── COMMON MODELS DB ───────────────────────────────────────────────────────
const COMMON_MODELS_DB = {
	'guitars/electric/electricguitar': [
		'Fender Stratocaster',
		'Gibson Les Paul',
		'Fender Telecaster',
		'PRS Custom 24'
	],
	'guitars/acoustic/acousticguitar': ['Martin D-28', 'Taylor 314ce', 'Gibson J-45'],
	'guitars/bass/p_bass': ['Fender Precision Bass', 'Fender Jazz Bass'],
	'amps/bass/bassamp': ['Ampeg SVT', 'Fender Rumble', 'GK 800RB'],
	'monitors/wedge': ['JBL SRX', 'QSC KW'],
	'monitors/inear': ['Shure PSM300', 'Sennheiser EW IEM G4'],
	'mics/hand_held/wired_mic': ['Shure SM58', 'Sennheiser e835'],
	'equipment/di': ['Radial J48', 'Countryman Type 85'],
	'equipment/stereodi': ['Radial JDI Duplex', 'Radial ProD2'],
	'mics/straight/straight_vocal': ['Shure SM58', 'Sennheiser e835'],
	'mics/boom/boom57': ['Shure SM57'],
	'monitors/sidefill': ['JBL SRX', 'QSC KW'],
	'monitors/speakerwstand': ['JBL EON', 'QSC K12'],
	'monitors/linearray': ['JBL VTX', 'L-Acoustics KARA', 'd&b E Series']
};

// ─── DIMENSIONS DB ──────────────────────────────────────────────────────────
// Approximate dimensions in inches: width x depth x height
const DIMENSIONS_DB = {
	// Amps
	guitar_amp: { width: 24, depth: 10, height: 18 },
	bass_amp: { width: 24, depth: 12, height: 20 },
	keyboard_amp: { width: 20, depth: 12, height: 16 },
	'amps/guitar/marshall412': { width: 30, depth: 14, height: 30 },
	'amps/guitar/marshallcabs': { width: 30, depth: 14, height: 30 },
	'amps/guitar/marshallhead': { width: 30, depth: 10, height: 12 },
	// Drums
	kit: { width: 72, depth: 48, height: 48 },
	// Keys
	grand_piano: { width: 60, depth: 90, height: 40 },
	baby_grand: { width: 58, depth: 72, height: 40 },
	upright_piano: { width: 58, depth: 24, height: 48 },
	stage_piano: { width: 52, depth: 14, height: 36 },
	synth: { width: 52, depth: 14, height: 36 },
	clavinet: { width: 40, depth: 16, height: 32 },
	mellotron: { width: 36, depth: 20, height: 32 },
	accordion: { width: 20, depth: 20, height: 18 },
	// Monitors
	wedge: { width: 16, depth: 14, height: 10 },
	in_ear: { width: 4, depth: 4, height: 1 },
	sidefill: { width: 24, depth: 18, height: 42 },
	pa_speaker: { width: 14, depth: 14, height: 72 },
	line_array: { width: 14, depth: 14, height: 72 },
	subwoofer: { width: 24, depth: 24, height: 24 },
	column_speaker: { width: 14, depth: 14, height: 84 },
	low_profile: { width: 20, depth: 14, height: 6 },
	// Furniture
	chair: { width: 18, depth: 18, height: 32 },
	stool: { width: 14, depth: 14, height: 24 },
	bench: { width: 36, depth: 14, height: 20 },
	music_stand: { width: 18, depth: 6, height: 48 },
	table: { width: 48, depth: 30, height: 30 },
	// Drums hardware
	bass_drum: { width: 22, depth: 16, height: 22 },
	cymbal: { width: 18, depth: 18, height: 48 },
	// Percussion
	timpani: { width: 32, depth: 32, height: 30 },
	conga: { width: 12, depth: 12, height: 30 },
	bongo: { width: 14, depth: 8, height: 10 },
	marimba: { width: 96, depth: 30, height: 36 },
	djembe: { width: 14, depth: 14, height: 24 },
	cajon: { width: 12, depth: 12, height: 18 },
	hand_drum: { width: 14, depth: 14, height: 8 },
	gong: { width: 36, depth: 6, height: 42 },
	tabla: { width: 18, depth: 12, height: 10 },
	steel_drum: { width: 24, depth: 24, height: 36 },
	// Strings
	orchestral_string: { width: 24, depth: 12, height: 48 },
	// Individual drums
	individual_drum: { width: 14, depth: 14, height: 14 },
	'drums/individual_drums/kick': { width: 22, depth: 16, height: 22 },
	'drums/individual_drums/snare': { width: 14, depth: 14, height: 6 },
	'drums/individual_drums/floortom': { width: 16, depth: 16, height: 16 },
	'drums/individual_drums/tom1': { width: 12, depth: 12, height: 10 },
	'drums/individual_drums/tom2': { width: 13, depth: 13, height: 11 },
	// Stagecraft
	riser: { width: 96, depth: 48, height: 12 },
	stairs: { width: 48, depth: 36, height: 24 },
	truss: { width: 120, depth: 12, height: 12 },
	// Equipment
	rack: { width: 20, depth: 20, height: 42 },
	di_box: { width: 5, depth: 4, height: 2 },
	pedal: { width: 6, depth: 4, height: 2 },
	mixer: { width: 30, depth: 20, height: 8 },
	stagebox: { width: 12, depth: 10, height: 4 }
};

function getDimensions(path, subcategory) {
	// Check path-specific first
	if (DIMENSIONS_DB[path]) return DIMENSIONS_DB[path];
	// Then subcategory
	if (DIMENSIONS_DB[subcategory]) return DIMENSIONS_DB[subcategory];
	return null;
}

// ─── DEFAULT INPUTS DB ──────────────────────────────────────────────────────
function getDefaultInputs(path, itemType, category, subcategory) {
	if (itemType === 'drumset') {
		return [
			{ name: 'Kick', connector: 'XLR' },
			{ name: 'Snare', connector: 'XLR' },
			{ name: 'HH', connector: 'XLR' },
			{ name: 'OH L', connector: 'XLR' },
			{ name: 'OH R', connector: 'XLR' }
		];
	}
	if (itemType === 'microphone') {
		if (path.includes('wireless')) return [];
		return [{ name: 'Vocal', connector: 'XLR' }];
	}
	if (itemType === 'instrument') {
		if (category === 'guitars') {
			if (subcategory === 'acoustic') return [{ name: 'Acoustic DI', connector: 'TS' }];
			if (subcategory === 'bass') return [{ name: 'Bass', connector: 'TS' }];
			if (['electric', 'steel'].includes(subcategory)) return [{ name: 'Guitar', connector: 'TS' }];
			return [{ name: 'Guitar', connector: 'TS' }]; // Default for string instruments with pickup
		}
		if (category === 'keys') {
			// Acoustic pianos and harpsichord are miked
			if (['grand_piano', 'baby_grand', 'upright_piano', 'harpsichord'].includes(subcategory)) {
				return [
					{ name: 'Keys L', connector: 'XLR' },
					{ name: 'Keys R', connector: 'XLR' }
				];
			}
			// Electric keys
			if (
				['stage_piano', 'synth', 'clavinet', 'mellotron', 'drum_machine', 'keytar'].includes(
					subcategory
				)
			) {
				return [
					{ name: 'Keys L', connector: 'TRS' },
					{ name: 'Keys R', connector: 'TRS' }
				];
			}
			return [];
		}
		// Individual drums are miked
		if (category === 'drums') {
			return [{ name: 'Drum', connector: 'XLR' }];
		}
		// Strings & winds are typically miked (no direct input from instrument)
		return [];
	}
	if (itemType === 'amp') {
		return [{ name: 'Amp', connector: 'XLR' }]; // Mic'd amp
	}
	return [];
}

// ─── PREFIX OVERRIDES ───────────────────────────────────────────────────────
function getAutoNumberPrefix(item, subcategory, category) {
	const { item_type, path } = item;

	// People keep their existing prefix mostly
	if (item_type === 'person') return item.auto_number_prefix;

	// Flute was moved to winds, fix prefix
	if (path === 'winds/flute') return 'Fl';

	// Percussion items all get "Perc"
	if (category === 'percussion') return 'Perc';

	// Wind instruments
	if (category === 'winds') {
		if (path.includes('bassclarinet')) return 'Cl';
		if (path.includes('bassoon')) return 'Bsn';
		if (path.includes('contrabassoon')) return 'Bsn';
		if (path.includes('clarinet')) return 'Cl';
		if (path.includes('oboe')) return 'Ob';
		if (path.includes('piccolo')) return 'Picc';
		if (path.includes('flute')) return 'Fl';
		if (path.includes('tuba')) return 'Tuba';
		if (path.includes('euphonium')) return 'Euph';
		if (path.includes('cornet')) return 'Horn';
		if (path.includes('altosax')) return 'Sax';
		if (path.includes('baritonesax')) return 'Sax';
		if (path.includes('sax')) return 'Sax';
		if (path.includes('trumpet')) return 'Horn';
		if (path.includes('trombone')) return 'Horn';
		if (path.includes('recorder') || path.includes('ocarina')) return 'Rec';
		if (path.includes('harmonica')) return 'Harm';
		if (path.includes('bagpipes') || path.includes('gajda') || path.includes('kaval'))
			return 'Wind';
		return 'Wind';
	}

	// Strings
	if (category === 'strings') return 'Str';

	// Guitar bass items
	if (path.includes('guitars/bass')) return 'Bass';

	// Keyboard amp fix
	if (path === 'amps/keyboard/keyamp') return 'Keys';

	// Keep existing prefix if it's set and reasonable
	if (item.auto_number_prefix) return item.auto_number_prefix;

	// Defaults by type
	if (item_type === 'monitor' || item_type === 'speaker') return 'Mon';
	if (item_type === 'microphone') return 'Mic';
	if (item_type === 'stagebox') return 'SB';
	if (item_type === 'di_box') return 'DI';

	return '';
}

// ─── HELPERS ────────────────────────────────────────────────────────────────
function getCategory(path) {
	const seg1 = path.split('/')[0];
	return CATEGORY_MAP[seg1] || '';
}

function walkLeafDirs(dir, base = '') {
	const entries = readdirSync(dir, { withFileTypes: true });
	const dirs = entries.filter((e) => e.isDirectory());
	if (dirs.length === 0) return base ? [base] : [];
	const results = [];
	for (const d of dirs) {
		const rel = base ? base + '/' + d.name : d.name;
		const sub = walkLeafDirs(join(dir, d.name), rel);
		if (sub.length === 0) results.push(rel);
		else results.push(...sub);
	}
	return results;
}

// ─── MAIN PIPELINE ──────────────────────────────────────────────────────────
const items = JSON.parse(readFileSync(ITEMS_PATH, 'utf8'));

// Load existing enriched items to preserve manual edits
let preserveMap = {};
if (existsSync(OUTPUT_PATH)) {
	try {
		const existing = JSON.parse(readFileSync(OUTPUT_PATH, 'utf8'));
		for (const item of existing) {
			if (item._enriched) {
				preserveMap[item.path] = item;
			}
		}
		console.log(`Loaded ${Object.keys(preserveMap).length} manually-enriched items to preserve.`);
	} catch {
		// ignore
	}
}

const flags = [];
const enriched = [];

for (const item of items) {
	const category = getCategory(item.path);
	const subcategory = getSubcategory(item.path, item.item_type);

	// Start with existing item data
	const enrichedItem = { ...item };

	// If previously manually enriched, preserve it
	if (preserveMap[item.path]) {
		enriched.push({ ...preserveMap[item.path] });
		continue;
	}

	// Name
	enrichedItem.name = NAME_OVERRIDES[item.path] || item.name;
	if (enrichedItem.name === item.name && !NAME_OVERRIDES[item.path]) {
		// Flag items with ugly auto-generated names
		if (/^[A-Z][a-z]+[A-Z]/.test(item.name) || item.name.includes('_')) {
			flags.push({
				type: 'name_review',
				path: item.path,
				name: item.name,
				suggestion: 'Auto name may need review'
			});
		}
	}

	// Category
	enrichedItem.category = category;

	// Subcategory
	enrichedItem.subcategory = subcategory;

	// Provision default
	enrichedItem.provision_default = getProvisionDefault(item.item_type, item.path);

	// Connectors
	enrichedItem.connectors = getConnectors(item.item_type, category, item.path);

	// Tags
	enrichedItem.tags = generateTags(enrichedItem, subcategory);

	// Brand/Model
	const bm = BRAND_MODEL_DB[item.path];
	if (bm) {
		if (!enrichedItem.brand) enrichedItem.brand = bm.brand;
		if (!enrichedItem.model) enrichedItem.model = bm.model;
	}

	// Common models
	if (COMMON_MODELS_DB[item.path] && enrichedItem.common_models.length === 0) {
		enrichedItem.common_models = COMMON_MODELS_DB[item.path];
	}

	// Dimensions
	const dims = getDimensions(item.path, subcategory);
	if (dims) {
		enrichedItem.dimensions = dims;
	}

	// Default inputs
	const inputs = getDefaultInputs(item.path, item.item_type, category, subcategory);
	if (inputs.length > 0) {
		enrichedItem.default_inputs = inputs;
	}

	// Auto number prefix
	enrichedItem.auto_number_prefix = getAutoNumberPrefix(item, subcategory, category);

	enriched.push(enrichedItem);
}

// ─── ORPHAN SCAN ────────────────────────────────────────────────────────────
const allLeafDirs = walkLeafDirs(ASSETS_DIR);
const itemPaths = new Set(items.map((i) => i.path));
const orphans = allLeafDirs.filter(
	(d) =>
		!itemPaths.has(d) &&
		!d.startsWith('alphabet') &&
		!d.startsWith('numerals') &&
		!d.startsWith('symbols')
);
const alphabetOrphans = allLeafDirs.filter(
	(d) => d.startsWith('alphabet') || d.startsWith('numerals') || d.startsWith('symbols')
);

// ─── WRITE ENRICHED JSON ────────────────────────────────────────────────────
writeFileSync(OUTPUT_PATH, JSON.stringify(enriched, null, '\t') + '\n');
console.log(`\nWrote ${enriched.length} items to ${OUTPUT_PATH}`);

// ─── STATS ──────────────────────────────────────────────────────────────────
const stats = {
	total: enriched.length,
	withCategory: enriched.filter((i) => i.category).length,
	withSubcategory: enriched.filter((i) => i.subcategory).length,
	withProvision: enriched.filter((i) => i.provision_default).length,
	withConnectors: enriched.filter((i) => i.connectors && i.connectors.length > 0).length,
	withTags: enriched.filter((i) => i.tags && i.tags.length > 0).length,
	withBrand: enriched.filter((i) => i.brand).length,
	withDimensions: enriched.filter((i) => i.dimensions).length,
	withDefaultInputs: enriched.filter((i) => i.default_inputs && i.default_inputs.length > 0).length,
	withPrefix: enriched.filter((i) => i.auto_number_prefix).length
};

// ─── GENERATE REPORT ────────────────────────────────────────────────────────
let report = `# Enrichment Report\n\nGenerated: ${new Date().toISOString()}\n\n`;
report += `## Summary\n\n`;
report += `| Field | Count | % |\n|-------|-------|---|\n`;
for (const [key, val] of Object.entries(stats)) {
	const pct = key === 'total' ? '-' : `${Math.round((val / stats.total) * 100)}%`;
	report += `| ${key} | ${val} | ${pct} |\n`;
}

// Flagged items
report += `\n## Name Review\n\nItems where auto-cleaned name may need manual attention:\n\n`;
const nameFlags = flags.filter((f) => f.type === 'name_review');
if (nameFlags.length === 0) {
	report += `None - all items have clean names.\n`;
} else {
	report += `| Path | Current Name | Note |\n|------|-------------|------|\n`;
	for (const f of nameFlags) {
		report += `| ${f.path} | ${f.name} | ${f.suggestion} |\n`;
	}
}

// Orphaned directories
report += `\n## Orphaned Asset Directories\n\nDirectories on disk with no matching item in catalog (${orphans.length} dirs):\n\n`;
if (orphans.length > 0) {
	report += `| Directory | Suggested Action |\n|-----------|------------------|\n`;
	for (const o of orphans) {
		let action = 'Investigate';
		if (o.includes('stageboxes') && !o.includes('stagebox'))
			action = 'Empty parent dir — can delete';
		if (o.includes('individual_drums')) action = 'Legacy dir — can delete';
		if (o.includes('truss')) action = 'Consider adding to catalog';
		if (
			o.includes('player') ||
			o.includes('man') ||
			o.includes('woman') ||
			o.includes('guitarist') ||
			o.includes('bassist') ||
			o.includes('drummer') ||
			o.includes('pianist') ||
			o.includes('violinist') ||
			o.includes('trumpetplayer') ||
			o.includes('saxophonist') ||
			o.includes('zinfoniaplayer') ||
			o.includes('keytarplayer') ||
			o.includes('percussionist') ||
			o.includes('accordionist') ||
			o.includes('mandoman') ||
			o.includes('keystand')
		)
			action = 'Misplaced asset — belongs elsewhere';
		if (o.includes('nordstage88')) action = 'Duplicate of keys/nordstage88 — can delete';
		if (o.includes('stageplotpro')) action = 'Duplicate of monitors/ entry — can delete';
		if (o.includes('electricguitar') || o.includes('guitaronstand') || o.includes('sampler'))
			action = 'Misplaced in amps/guitar — belongs in guitars/ or equipment/';
		if (o.includes('standw') || o.includes('fenderampback'))
			action = 'Variant/alternate — consider adding to catalog';
		if (o.includes('marshall412_a')) action = 'Marshall 4x12 variant — consider adding';
		if (o.includes('femacoustic') || o.includes('banjo_guy') || o.includes('femkeystand'))
			action = 'Player asset misplaced in instrument dir';
		if (o.includes('sixbass')) action = 'Six bass drum setup — listed under drums/hardware';
		if (o.includes('djembe') && o.includes('dj_gear'))
			action = 'Djembe misplaced in dj_gear — belongs in percussion/';
		if (o.includes('fantom') && o.includes('fan'))
			action = 'Roland Fantom misplaced in fan dir — belongs in keys/';
		if (o.includes('bongos') && o.includes('bongo')) action = 'Sub-dir in bongo — may be variant';
		if (o.includes('headsetmic')) action = 'Sub-dir of headset — may need path fix';
		if (o.match(/people\/male\/(double|female|male|quarter|xlr)/))
			action = 'Connector assets misplaced in people/male/';
		if (o.includes('people/male/mandolin')) action = 'Instrument misplaced in people/male/';
		report += `| \`${o}\` | ${action} |\n`;
	}
}

if (alphabetOrphans.length > 0) {
	report += `\nPlus ${alphabetOrphans.length} alphabet/numeral/symbol dirs (expected, used for labels).\n`;
}

// Ambiguous items
report += `\n## Ambiguous Items\n\nItems that may need manual review:\n\n`;
report += `| Path | Issue |\n|------|-------|\n`;
report += `| \`keys/drummachine\` | Is this an instrument or equipment? Currently categorized as instrument. |\n`;
report += `| \`monitors/stageplotproleft\` | StagePlot Pro branding asset — not a real monitor |\n`;
report += `| \`monitors/stageplotprologo\` | StagePlot Pro branding asset — not a real monitor |\n`;
report += `| \`drums/hardware/sixbass\` | Six bass drum setup — confusing name, no standard auto_number_prefix |\n`;

// Missing brand/model
report += `\n## Items That May Have Known Brands\n\nItems that look branded but weren't in the override map:\n\n`;
report += `| Path | Current Name | Note |\n|------|-------------|------|\n`;
const potentialBranded = enriched.filter(
	(i) =>
		!i.brand &&
		(i.path.includes('bose') ||
			i.path.includes('yamaha') ||
			i.path.includes('roland') ||
			i.path.includes('marshall') ||
			i.path.includes('fender') ||
			i.path.includes('nord') ||
			i.path.includes('pioneer') ||
			i.path.includes('technics') ||
			i.path.includes('shure'))
);
for (const i of potentialBranded) {
	report += `| \`${i.path}\` | ${i.name} | Looks branded |\n`;
}
if (potentialBranded.length === 0) {
	report += `None — all branded-looking items have brand set.\n`;
}

writeFileSync(REPORT_PATH, report);
console.log(`Wrote report to ${REPORT_PATH}`);

// Print summary
console.log('\n--- Enrichment Summary ---');
for (const [key, val] of Object.entries(stats)) {
	const pct = key === 'total' ? '' : ` (${Math.round((val / stats.total) * 100)}%)`;
	console.log(`  ${key}: ${val}${pct}`);
}
console.log(`  flags: ${flags.length}`);
console.log(`  orphaned dirs: ${orphans.length}`);
