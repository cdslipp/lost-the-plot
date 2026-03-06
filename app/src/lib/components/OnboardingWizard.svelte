<script lang="ts">
	import { goto } from '$app/navigation';
	import { generateId } from '@stageplotter/shared';
	import { createBand } from '$lib/db/repositories/bands';
	import { createPerson } from '$lib/db/repositories/persons';
	import { createPlot, savePlotEntities, type PlotItemRow } from '$lib/db/repositories/plots';
	import { addPersonToPlot } from '$lib/db/repositories/plotPersons';
	import {
		onboarding,
		type UserRole,
		type ActType,
		type BandSize,
		type BassPosition,
		type MonitorType
	} from '$lib/state/onboarding.svelte';
	import { modKey } from '$lib/utils/platform';
	import { onMount, tick } from 'svelte';

	// Steps: welcome, role, act type, band name, members, drums?, band size, bass position, monitors
	const STEP_NAMES = [
		'welcome',
		'role',
		'act_type',
		'band_name',
		'members',
		'drums',
		'band_size',
		'bass_position',
		'monitors'
	] as const;

	let step = $derived(onboarding.currentStep);
	let stepName = $derived(STEP_NAMES[step] ?? 'welcome');
	let creating = $state(false);

	// Step refs
	let bandNameInput: HTMLInputElement | undefined = $state();
	let newMemberName = $state('');
	let memberInput: HTMLInputElement | undefined = $state();

	// Focus management
	onMount(() => {
		focusStep();
	});

	$effect(() => {
		void step;
		tick().then(focusStep);
	});

	function focusStep() {
		const el = document.querySelector<HTMLElement>('[data-onboarding-focus]');
		el?.focus();
	}

	async function handleSkip() {
		await onboarding.markComplete();
	}

	function goTo(name: (typeof STEP_NAMES)[number]) {
		onboarding.currentStep = STEP_NAMES.indexOf(name);
	}

	function nextStep() {
		onboarding.currentStep = Math.min(step + 1, STEP_NAMES.length - 1);
	}

	function prevStep() {
		onboarding.currentStep = Math.max(step - 1, 0);
	}

	function selectRole(role: UserRole) {
		onboarding.userRole = role;
		nextStep();
	}

	function selectActType(type: ActType) {
		onboarding.actType = type;
		nextStep();
	}

	function selectDrums(has: boolean) {
		onboarding.hasDrums = has;
		nextStep();
	}

	function selectBandSize(size: BandSize) {
		onboarding.bandSize = size;
		nextStep();
	}

	function selectBassPosition(pos: BassPosition) {
		onboarding.bassPosition = pos;
		nextStep();
	}

	function selectMonitorType(type: MonitorType) {
		onboarding.monitorType = type;
		handleFinish();
	}

	function addMember() {
		const name = newMemberName.trim();
		if (!name) return;
		onboarding.memberNames = [...onboarding.memberNames, name];
		newMemberName = '';
		tick().then(() => memberInput?.focus());
	}

	function removeMember(index: number) {
		onboarding.memberNames = onboarding.memberNames.filter((_, i) => i !== index);
	}

	function handleMemberKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			if (e.metaKey || e.ctrlKey) {
				nextStep();
			} else {
				addMember();
			}
		}
	}

	function handleBandNameKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && onboarding.bandName.trim()) {
			nextStep();
		}
	}

	function buildTemplateItems(
		plotId: string,
		hasDrums: boolean,
		bassPosition: string | null
	): PlotItemRow[] {
		const items: PlotItemRow[] = [];
		const baseId = Date.now();

		if (hasDrums) {
			const drumId = baseId;
			const drumItemData = {
				name: 'Drum Kit - Two Toms',
				item_type: 'drumset',
				slug: 'drums-drum-kits-twotoms',
				category: 'drums',
				subcategory: 'kit',
				path: 'drums/drum_kits/twotoms',
				variants: {
					L: 'TwoTomsL.png',
					RA: 'TwoTomsRA.png',
					LA: 'TwoTomsLA.png',
					R: 'TwoTomsR.png',
					default: 'TwoToms.png'
				},
				variant_order: ['default', 'LA', 'L', 'R', 'RA'],
				default_inputs: [
					{ name: 'Kick', connector: 'XLR' },
					{ name: 'Snare', connector: 'XLR', stand: 'none', link_mode: 'mono', phantom_power: false },
					{ name: 'HH', connector: 'XLR', stand: 'none', link_mode: 'mono', phantom_power: false },
					{ name: 'OH L', connector: 'XLR', stand: 'none', link_mode: 'mono', phantom_power: false },
					{ name: 'OH R', connector: 'XLR', stand: 'none', link_mode: 'mono', phantom_power: false }
				],
				default_outputs: [],
				auto_number_prefix: 'Drums',
				provision_default: 'artist_provided',
				is_backline: true
			};

			items.push({
				id: drumId,
				plot_id: plotId,
				name: 'Drum Kit - Two Toms',
				type: 'drumset',
				category: 'drums',
				current_variant: 'default',
				pos_x: 9,
				pos_y: 3,
				width: 6.125,
				height: 3.94,
				rotation: 0,
				person_id: null,
				item_data: JSON.stringify(drumItemData),
				sort_order: 0,
				size: null
			});

			// Add input children for each default input
			drumItemData.default_inputs.forEach((input, idx) => {
				items.push({
					id: drumId + idx + 1,
					plot_id: plotId,
					name: input.name,
					type: 'input',
					category: 'Input',
					current_variant: 'default',
					pos_x: 0,
					pos_y: 0,
					width: 0,
					height: 0,
					rotation: 0,
					person_id: null,
					item_data: JSON.stringify({
						...input,
						item_type: 'input',
						name: input.name,
						category: 'Input',
						path: ''
					}),
					sort_order: items.length,
					size: null
				});
			});
		}

		if (bassPosition === 'stage_right' || bassPosition === 'stage_left') {
			const bassId = baseId + 100;
			const bassItemData = {
				name: 'Bass Amp',
				item_type: 'amp',
				slug: 'amps-bass-bassamp',
				category: 'amps',
				subcategory: 'bass_amp',
				path: 'amps/bass/bassamp',
				variants: {
					L: 'BassAmpL.png',
					RA: 'BassAmpRA.png',
					LA: 'BassAmpLA.png',
					R: 'BassAmpR.png',
					default: 'BassAmp.png'
				},
				variant_order: ['default', 'LA', 'L', 'R', 'RA'],
				default_inputs: [
					{ name: 'Amp', connector: 'XLR', stand: 'none', link_mode: 'mono', phantom_power: false }
				],
				default_outputs: [],
				auto_number_prefix: 'Bass',
				provision_default: 'artist_provided',
				is_backline: true
			};

			const posX = bassPosition === 'stage_right' ? 2.85 : 19;
			const posY = bassPosition === 'stage_right' ? 1.6 : 1.3;

			items.push({
				id: bassId,
				plot_id: plotId,
				name: 'Bass Amp',
				type: 'amp',
				category: 'amps',
				current_variant: 'default',
				pos_x: posX,
				pos_y: posY,
				width: 1.86,
				height: 1.47,
				rotation: 0,
				person_id: null,
				item_data: JSON.stringify(bassItemData),
				sort_order: items.length,
				size: null
			});

			// Add input child for bass amp
			items.push({
				id: bassId + 1,
				plot_id: plotId,
				name: 'Amp',
				type: 'input',
				category: 'Input',
				current_variant: 'default',
				pos_x: 0,
				pos_y: 0,
				width: 0,
				height: 0,
				rotation: 0,
				person_id: null,
				item_data: JSON.stringify({
					name: 'Amp',
					connector: 'XLR',
					stand: 'none',
					link_mode: 'mono',
					phantom_power: false,
					item_type: 'input',
					category: 'Input',
					path: ''
				}),
				sort_order: items.length + 1,
				size: null
			});
		}

		return items;
	}

	async function handleFinish() {
		if (creating) return;
		creating = true;
		try {
			const bandId = generateId();
			const bandName = onboarding.bandName.trim() || 'My Band';
			await createBand(bandId, bandName);

			// Create members
			const personIds: number[] = [];
			for (const name of onboarding.memberNames) {
				const personId = await createPerson(bandId, name);
				personIds.push(personId);
			}

			// Create default plot
			const plotId = generateId();
			await createPlot(plotId, 'Main Stage Plot', bandId);

			// Add all members to the plot
			for (const personId of personIds) {
				await addPersonToPlot(plotId, personId);
			}

			// Pre-populate stage plot with items based on onboarding answers
			const templateItems = buildTemplateItems(plotId, onboarding.hasDrums === true, onboarding.bassPosition);
			if (templateItems.length > 0) {
				await savePlotEntities(plotId, {
					items: templateItems,
					outputs: [],
					inputChannels: [],
					outputChannels: []
				});
			}

			await onboarding.markComplete();
			goto(`/bands/${bandId}/plots/${plotId}?new=1`);
		} catch (e) {
			console.error('Failed to create band:', e);
			creating = false;
		}
	}

	const roles: { id: UserRole; label: string; description: string }[] = [
		{ id: 'musician', label: 'Musician', description: 'I play in a band' },
		{ id: 'audio_tech', label: 'Audio Technician', description: 'I mix live sound' },
		{
			id: 'tour_manager',
			label: 'Tour Manager',
			description: 'I manage tours and advancing'
		},
		{
			id: 'stage_manager',
			label: 'Stage Manager / PM',
			description: 'I run festival stages'
		}
	];

	const bandSizes: { id: BandSize; label: string; description: string }[] = [
		{ id: '3piece', label: '3-piece', description: 'Guitar, bass, drums' },
		{ id: '4piece', label: '4-piece', description: 'Two guitars, bass, drums' },
		{ id: '5piece', label: '5-piece', description: 'Keys, two guitars, bass, drums' }
	];
</script>

<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-bg-secondary/95 backdrop-blur-sm"
	role="dialog"
	aria-modal="true"
	aria-label="Welcome to Lost the Plot"
>
	<!-- Skip button — always visible -->
	<button
		onclick={handleSkip}
		class="absolute top-4 right-4 z-10 rounded-lg px-4 py-2 text-sm text-text-secondary transition hover:bg-surface-hover hover:text-text-primary"
	>
		Skip
	</button>

	<div class="mx-4 w-full max-w-md">
		<!-- Step 0: Welcome -->
		{#if stepName === 'welcome'}
			<div class="flex flex-col items-center gap-8 text-center">
				<h1 class="font-serif text-5xl font-bold text-text-primary">Lost the Plot</h1>
				<p class="text-lg text-text-secondary">
					Stage plots and input lists for musicians and sound engineers. Your data stays on
					this device.
				</p>
				<button
					data-onboarding-focus
					onclick={nextStep}
					class="rounded-lg bg-stone-900 px-8 py-3 text-base font-medium text-white transition hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
				>
					Get Started
				</button>
			</div>

		<!-- Step 1: Role selection -->
		{:else if stepName === 'role'}
			<div class="flex flex-col items-center gap-6 text-center">
				<h2 class="font-serif text-3xl font-bold text-text-primary">What's your role?</h2>
				<p class="text-text-secondary">This helps us tailor the experience.</p>
				<div class="flex w-full flex-col gap-2">
					{#each roles as role, i}
						<button
							data-onboarding-focus={i === 0 ? '' : undefined}
							onclick={() => selectRole(role.id)}
							class="flex items-center gap-3 rounded-xl border border-border-primary bg-surface px-4 py-3 text-left transition hover:border-stone-400 hover:bg-surface-hover"
						>
							<div>
								<div class="font-medium text-text-primary">{role.label}</div>
								<div class="text-xs text-text-secondary">{role.description}</div>
							</div>
						</button>
					{/each}
				</div>
			</div>

		<!-- Step 2: Solo/Duo or Band -->
		{:else if stepName === 'act_type'}
			<div class="flex flex-col items-center gap-6 text-center">
				<h2 class="font-serif text-3xl font-bold text-text-primary">What kind of act?</h2>
				<p class="text-text-secondary">We'll adjust the setup flow accordingly.</p>
				<div class="flex w-full flex-col gap-2">
					<button
						data-onboarding-focus
						onclick={() => selectActType('solo_duo')}
						class="flex items-center gap-3 rounded-xl border border-border-primary bg-surface px-4 py-3 text-left transition hover:border-stone-400 hover:bg-surface-hover"
					>
						<div>
							<div class="font-medium text-text-primary">Solo / Duo</div>
							<div class="text-xs text-text-secondary">One or two performers</div>
						</div>
					</button>
					<button
						onclick={() => selectActType('band')}
						class="flex items-center gap-3 rounded-xl border border-border-primary bg-surface px-4 py-3 text-left transition hover:border-stone-400 hover:bg-surface-hover"
					>
						<div>
							<div class="font-medium text-text-primary">Band</div>
							<div class="text-xs text-text-secondary">Three or more performers</div>
						</div>
					</button>
				</div>
				<button
					onclick={prevStep}
					class="text-sm text-text-tertiary transition hover:text-text-secondary"
				>
					Back
				</button>
			</div>

		<!-- Step 3: Band name -->
		{:else if stepName === 'band_name'}
			<div class="flex flex-col items-center gap-6 text-center">
				<h2 class="font-serif text-3xl font-bold text-text-primary">
					{onboarding.userRole === 'musician'
						? onboarding.actType === 'solo_duo'
							? "What's your act called?"
							: "What's your band called?"
						: 'Create your first band'}
				</h2>
				<p class="text-text-secondary">You can always rename or add more later.</p>
				<div class="flex w-full flex-col gap-4">
					<input
						data-onboarding-focus
						bind:this={bandNameInput}
						bind:value={onboarding.bandName}
						onkeydown={handleBandNameKeydown}
						type="text"
						placeholder={onboarding.actType === 'solo_duo' ? 'Act name' : 'Band name'}
						class="w-full rounded-lg border border-border-primary bg-surface px-4 py-3 text-center text-lg text-text-primary placeholder:text-text-tertiary focus:border-stone-400 focus:outline-none dark:focus:border-stone-500"
					/>
					<button
						onclick={nextStep}
						disabled={!onboarding.bandName.trim()}
						class="rounded-lg bg-stone-900 px-8 py-3 text-base font-medium text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
					>
						Next
					</button>
				</div>
				<button
					onclick={prevStep}
					class="text-sm text-text-tertiary transition hover:text-text-secondary"
				>
					Back
				</button>
			</div>

		<!-- Step 4: Band members -->
		{:else if stepName === 'members'}
			<div class="flex flex-col items-center gap-6 text-center">
				<h2 class="font-serif text-3xl font-bold text-text-primary">
					{onboarding.actType === 'solo_duo' ? "Who's performing?" : "Who's in the band?"}
				</h2>
				<p class="text-text-secondary">Add your performers. You can add roles and details later.</p>
				<div class="flex w-full flex-col gap-3">
					{#if onboarding.memberNames.length > 0}
						<div class="flex flex-col gap-2">
							{#each onboarding.memberNames as name, i}
								<div
									class="flex items-center justify-between rounded-lg border border-border-primary bg-surface px-4 py-2"
								>
									<span class="text-sm text-text-primary">{name}</span>
									<button
										onclick={() => removeMember(i)}
										title="Remove {name}"
										class="flex h-6 w-6 items-center justify-center rounded-full text-text-tertiary transition hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30"
									>
										<svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
											<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
										</svg>
									</button>
								</div>
							{/each}
						</div>
					{/if}
					<div class="flex gap-2">
						<input
							data-onboarding-focus
							bind:this={memberInput}
							bind:value={newMemberName}
							onkeydown={handleMemberKeydown}
							type="text"
							placeholder="Name"
							class="flex-1 rounded-lg border border-border-primary bg-surface px-4 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-stone-400 focus:outline-none dark:focus:border-stone-500"
						/>
						<button
							onclick={addMember}
							disabled={!newMemberName.trim()}
							class="rounded-lg border border-border-primary px-4 py-2.5 text-sm text-text-primary transition hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
						>
							Add
						</button>
					</div>
					<button
						onclick={nextStep}
						class="mt-2 inline-flex items-center justify-center rounded-lg bg-stone-900 px-8 py-3 text-base font-medium text-white transition hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
					>
						{onboarding.memberNames.length === 0 ? 'Skip this step' : 'Next'}
						<kbd class="ml-2 rounded bg-stone-700 px-1.5 py-0.5 text-[10px] font-medium text-stone-200 dark:bg-stone-300 dark:text-stone-800">
							{modKey}&#x23CE;
						</kbd>
					</button>
				</div>
				<button
					onclick={prevStep}
					class="text-sm text-text-tertiary transition hover:text-text-secondary"
				>
					Back
				</button>
			</div>

		<!-- Step 5: Drums? -->
		{:else if stepName === 'drums'}
			<div class="flex flex-col items-center gap-6 text-center">
				<h2 class="font-serif text-3xl font-bold text-text-primary">Do you have drums?</h2>
				<p class="text-text-secondary">This affects the default stage layout.</p>
				<div class="flex w-full gap-3">
					<button
						data-onboarding-focus
						onclick={() => selectDrums(true)}
						class="flex flex-1 flex-col items-center gap-2 rounded-xl border border-border-primary bg-surface px-4 py-6 transition hover:border-stone-400 hover:bg-surface-hover"
					>
						<span class="text-2xl font-bold text-text-primary">Yes</span>
						<span class="text-sm text-text-secondary">Acoustic or electronic kit</span>
					</button>
					<button
						onclick={() => selectDrums(false)}
						class="flex flex-1 flex-col items-center gap-2 rounded-xl border border-border-primary bg-surface px-4 py-6 transition hover:border-stone-400 hover:bg-surface-hover"
					>
						<span class="text-2xl font-bold text-text-primary">No</span>
						<span class="text-sm text-text-secondary">No drum kit on stage</span>
					</button>
				</div>
				<button
					onclick={prevStep}
					class="text-sm text-text-tertiary transition hover:text-text-secondary"
				>
					Back
				</button>
			</div>

		<!-- Step 6: Band size / template -->
		{:else if stepName === 'band_size'}
			<div class="flex flex-col items-center gap-6 text-center">
				<h2 class="font-serif text-3xl font-bold text-text-primary">Band layout</h2>
				<p class="text-text-secondary">Pick a starting template for your stage plot.</p>
				<div class="flex w-full flex-col gap-2">
					{#each bandSizes as size}
						<button
							onclick={() => selectBandSize(size.id)}
							class="flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition {onboarding.bandSize === size.id ? 'border-stone-500 bg-surface-hover' : 'border-border-primary bg-surface hover:border-stone-400 hover:bg-surface-hover'}"
						>
							<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300">
								<span class="text-sm font-bold">{size.id.charAt(0)}</span>
							</div>
							<div>
								<div class="font-medium text-text-primary">{size.label}</div>
								<div class="text-xs text-text-secondary">{size.description}</div>
							</div>
						</button>
					{/each}
				</div>
				<button
					onclick={prevStep}
					class="text-sm text-text-tertiary transition hover:text-text-secondary"
				>
					Back
				</button>
			</div>

		<!-- Step 7: Bass position -->
		{:else if stepName === 'bass_position'}
			<div class="flex flex-col items-center gap-6 text-center">
				<h2 class="font-serif text-3xl font-bold text-text-primary">Bass position</h2>
				<p class="text-text-secondary">Where does your bass player stand?</p>
				<div class="flex w-full gap-3">
					<button
						onclick={() => selectBassPosition('stage_right')}
						class="flex flex-1 flex-col items-center gap-2 rounded-xl border border-border-primary bg-surface px-4 py-6 transition hover:border-stone-400 hover:bg-surface-hover"
					>
						<span class="text-2xl font-bold text-text-primary">SR</span>
						<span class="text-sm text-text-secondary">Stage Right</span>
					</button>
					<button
						onclick={() => selectBassPosition('stage_left')}
						class="flex flex-1 flex-col items-center gap-2 rounded-xl border border-border-primary bg-surface px-4 py-6 transition hover:border-stone-400 hover:bg-surface-hover"
					>
						<span class="text-2xl font-bold text-text-primary">SL</span>
						<span class="text-sm text-text-secondary">Stage Left</span>
					</button>
				</div>
				<button
					onclick={() => selectBassPosition('none')}
					class="rounded-lg border border-border-primary px-4 py-2.5 text-sm text-text-secondary transition hover:bg-surface-hover hover:text-text-primary"
				>
					No bass
				</button>
				<button
					onclick={prevStep}
					class="text-sm text-text-tertiary transition hover:text-text-secondary"
				>
					Back
				</button>
			</div>

		<!-- Step 8: Monitors -->
		{:else if stepName === 'monitors'}
			<div class="flex flex-col items-center gap-6 text-center">
				<h2 class="font-serif text-3xl font-bold text-text-primary">Monitoring</h2>
				<p class="text-text-secondary">How does the band hear themselves on stage?</p>
				<div class="flex w-full flex-col gap-2">
					<button
						data-onboarding-focus
						onclick={() => selectMonitorType('wedges')}
						disabled={creating}
						class="flex items-center gap-3 rounded-xl border border-border-primary bg-surface px-4 py-3 text-left transition hover:border-stone-400 hover:bg-surface-hover disabled:opacity-50"
					>
						<div>
							<div class="font-medium text-text-primary">Floor wedges</div>
							<div class="text-xs text-text-secondary">Traditional monitor speakers on stage</div>
						</div>
					</button>
					<button
						onclick={() => selectMonitorType('iems')}
						disabled={creating}
						class="flex items-center gap-3 rounded-xl border border-border-primary bg-surface px-4 py-3 text-left transition hover:border-stone-400 hover:bg-surface-hover disabled:opacity-50"
					>
						<div>
							<div class="font-medium text-text-primary">In-ear monitors</div>
							<div class="text-xs text-text-secondary">IEMs with wireless or wired packs</div>
						</div>
					</button>
					<button
						onclick={() => selectMonitorType('both')}
						disabled={creating}
						class="flex items-center gap-3 rounded-xl border border-border-primary bg-surface px-4 py-3 text-left transition hover:border-stone-400 hover:bg-surface-hover disabled:opacity-50"
					>
						<div>
							<div class="font-medium text-text-primary">Both</div>
							<div class="text-xs text-text-secondary">Mix of wedges and IEMs</div>
						</div>
					</button>
				</div>
				{#if creating}
					<p class="text-sm text-text-secondary">Setting up your band...</p>
				{/if}
				<button
					onclick={prevStep}
					disabled={creating}
					class="text-sm text-text-tertiary transition hover:text-text-secondary disabled:opacity-50"
				>
					Back
				</button>
			</div>
		{/if}

		<!-- Progress dots -->
		{#if step > 0}
			<div class="mt-8 flex justify-center gap-2">
				{#each Array(STEP_NAMES.length) as _, i}
					<div
						class="h-1.5 rounded-full transition-all {i === step ? 'w-6 bg-stone-900 dark:bg-stone-100' : i < step ? 'w-1.5 bg-stone-400 dark:bg-stone-500' : 'w-1.5 bg-stone-200 dark:bg-stone-700'}"
					></div>
				{/each}
			</div>
		{/if}
	</div>
</div>
