/**
 * Quick roundtrip test for the share codec.
 * Run with: bun run packages/shared/src/share-codec.test.ts
 */

import {
	encodePayload,
	decodePayload,
	buildCatalogIndex,
	buildShareUrl,
	type EncodeInput
} from './share-codec.js';

// Mock catalog (subset of real items)
const mockCatalog = [
	{
		path: 'amps/guitar/fender_amp',
		name: 'Fender Amp',
		item_type: 'amp',
		variants: { default: 'FenderAmp.png', R: 'FenderAmpR.png', L: 'FenderAmpL.png' }
	},
	{
		path: 'mics/boom/sm57_boom/sm57_boom',
		name: 'SM57 Boom',
		item_type: 'microphone',
		variants: { default: 'SM57Boom.png' }
	},
	{
		path: 'guitars/electric/electricguitar',
		name: 'Electric Guitar',
		item_type: 'instrument',
		variants: { default: 'electricguitar.png' }
	},
	{
		path: 'drums/drum_kits/basickit',
		name: 'Basic Kit',
		item_type: 'drumset',
		variants: { default: 'BasicKit.png' }
	},
	{
		path: 'outputs/wedge/wedge',
		name: 'Wedge',
		item_type: 'monitor',
		variants: { default: 'Wedge.png', L: 'WedgeL.png' }
	}
];

const catalogIndex = buildCatalogIndex(mockCatalog);

// Typical 5-piece band stage plot
const input: EncodeInput = {
	stageWidth: 24,
	stageDepth: 16,
	musicians: [
		{ name: 'John Smith', instrument: 'Guitar' },
		{ name: 'Jane Doe', instrument: 'Vocals' },
		{ name: 'Mike Johnson', instrument: 'Bass' },
		{ name: 'Sarah Williams', instrument: 'Drums' },
		{ name: 'Tom Brown', instrument: 'Keys' }
	],
	persons: [
		{
			name: 'John Smith',
			role: 'Guitar',
			pronouns: 'he/him',
			phone: '+15551234567',
			email: 'john@band.com',
			member_type: 'performer',
			status: 'permanent'
		},
		{
			name: 'Jane Doe',
			role: 'Vocals',
			pronouns: 'she/her',
			phone: '+15559876543',
			email: 'jane@band.com',
			member_type: 'performer',
			status: 'permanent'
		},
		{
			name: 'Mike Johnson',
			role: 'Bass',
			phone: '+15555551212',
			email: 'mike@band.com',
			member_type: 'performer',
			status: 'permanent'
		},
		{
			name: 'Sarah Williams',
			role: 'Drums',
			member_type: 'performer',
			status: 'permanent'
		},
		{
			name: 'Tom Brown',
			role: 'Keys',
			member_type: 'performer',
			status: 'occasional'
		}
	],
	items: [
		{
			type: 'amp',
			itemData: {
				path: 'amps/guitar/fender_amp',
				name: 'Fender Amp'
			},
			currentVariant: 'default',
			position: { x: 200, y: 300, width: 57, height: 80 },
			channel: '1',
			musician: 'John Smith',
			name: 'Fender Amp'
		},
		{
			type: 'microphone',
			itemData: {
				path: 'mics/boom/sm57_boom/sm57_boom',
				name: 'SM57 Boom'
			},
			currentVariant: 'default',
			position: { x: 260, y: 310, width: 30, height: 50 },
			channel: '2',
			musician: 'John Smith',
			name: 'SM57 Boom'
		},
		{
			type: 'instrument',
			itemData: {
				path: 'guitars/electric/electricguitar',
				name: 'Electric Guitar'
			},
			currentVariant: 'default',
			position: { x: 180, y: 250, width: 40, height: 120 },
			channel: '',
			musician: 'John Smith',
			name: 'Electric Guitar'
		},
		{
			type: 'drumset',
			itemData: {
				path: 'drums/drum_kits/basickit',
				name: 'Basic Kit'
			},
			currentVariant: 'default',
			position: { x: 500, y: 100, width: 200, height: 180 },
			channel: '5',
			musician: 'Sarah Williams',
			name: 'Basic Kit'
		},
		{
			type: 'monitor',
			itemData: {
				path: 'outputs/wedge/wedge',
				name: 'Wedge'
			},
			currentVariant: 'L',
			position: { x: 350, y: 600, width: 50, height: 30 },
			channel: '',
			musician: '',
			name: 'Wedge'
		},
		{
			type: 'riser',
			itemData: {
				path: '',
				riserWidth: 8,
				riserDepth: 4,
				riserHeight: 1
			},
			currentVariant: 'default',
			position: { x: 450, y: 80, width: 224, height: 112 },
			channel: '',
			musician: '',
			name: 'Riser 8x4'
		}
	]
};

async function test() {
	console.log('=== Share Codec Roundtrip Test ===\n');

	// Encode
	console.log('Encoding...');
	const payload = await encodePayload(input, catalogIndex);
	console.log(`Payload length: ${payload.length} chars`);
	console.log(`Payload preview: ${payload.slice(0, 80)}...`);

	// Build full URL
	const url = buildShareUrl('https://stageplotter.com', 'My Band', 'Main Stage Plot', payload);
	console.log(`\nFull URL length: ${url.length} chars`);
	console.log(`URL: ${url.slice(0, 120)}...`);

	// Decode
	console.log('\nDecoding...');
	const decoded = await decodePayload(payload, mockCatalog);

	// Verify
	console.log('\n=== Verification ===');
	console.log(`Stage: ${decoded.stageWidth}' x ${decoded.stageDepth}' (expected: 24' x 16')`);
	console.log(`Musicians: ${decoded.musicians.length} (expected: 5)`);
	console.log(`Persons: ${decoded.persons.length} (expected: 5)`);
	console.log(`Items: ${decoded.items.length} (expected: 6)`);

	// Check musicians
	let pass = true;
	for (let i = 0; i < input.musicians.length; i++) {
		if (
			decoded.musicians[i].name !== input.musicians[i].name ||
			decoded.musicians[i].instrument !== input.musicians[i].instrument
		) {
			console.error(`FAIL: Musician ${i} mismatch`);
			console.error(`  Expected: ${JSON.stringify(input.musicians[i])}`);
			console.error(`  Got: ${JSON.stringify(decoded.musicians[i])}`);
			pass = false;
		}
	}

	// Check persons
	for (let i = 0; i < (input.persons ?? []).length; i++) {
		const orig = input.persons![i];
		const dec = decoded.persons[i];
		if (dec.name !== orig.name || dec.phone !== (orig.phone ?? '')) {
			console.error(`FAIL: Person ${i} mismatch`);
			console.error(`  Expected name: ${orig.name}, phone: ${orig.phone}`);
			console.error(`  Got name: ${dec.name}, phone: ${dec.phone}`);
			pass = false;
		}
	}

	// Check items
	for (let i = 0; i < input.items.length; i++) {
		const orig = input.items[i];
		const dec = decoded.items[i];
		if (dec.type !== orig.type) {
			console.error(`FAIL: Item ${i} type mismatch: ${dec.type} !== ${orig.type}`);
			pass = false;
		}
		if (Math.round(dec.position.x) !== Math.round(orig.position.x)) {
			console.error(
				`FAIL: Item ${i} position.x mismatch: ${dec.position.x} !== ${orig.position.x}`
			);
			pass = false;
		}
		if (dec.channel !== (orig.channel || '')) {
			console.error(`FAIL: Item ${i} channel mismatch: '${dec.channel}' !== '${orig.channel}'`);
			pass = false;
		}
		if (dec.musician !== (orig.musician || '')) {
			console.error(`FAIL: Item ${i} musician mismatch: '${dec.musician}' !== '${orig.musician}'`);
			pass = false;
		}
	}

	// Check riser specifically
	const riser = decoded.items.find((i) => i.type === 'riser');
	if (riser) {
		if (
			riser.itemData?.riserWidth !== 8 ||
			riser.itemData?.riserDepth !== 4 ||
			riser.itemData?.riserHeight !== 1
		) {
			console.error(`FAIL: Riser dimensions mismatch`);
			console.error(`  Got: ${JSON.stringify(riser.itemData)}`);
			pass = false;
		}
	} else {
		console.error('FAIL: No riser found in decoded items');
		pass = false;
	}

	if (pass) {
		console.log('\nALL TESTS PASSED');
	} else {
		console.error('\nSOME TESTS FAILED');
		process.exit(1);
	}

	// Size analysis
	console.log('\n=== Size Analysis ===');
	const rawJson = JSON.stringify({
		stageWidth: input.stageWidth,
		stageDepth: input.stageDepth,
		musicians: input.musicians,
		persons: input.persons,
		items: input.items
	});
	console.log(`Raw JSON: ${rawJson.length} bytes`);
	console.log(`Compressed payload: ${payload.length} chars`);
	console.log(`Compression ratio: ${((1 - payload.length / rawJson.length) * 100).toFixed(1)}%`);
	console.log(`Full URL: ${url.length} chars`);
}

test().catch((e) => {
	console.error('Test failed with error:', e);
	process.exit(1);
});
