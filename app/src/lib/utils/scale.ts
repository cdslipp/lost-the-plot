// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Scale utilities for converting between pixels and real-world measurements
 * Based on FenderAmp.png being 57px wide = 24.5" real world
 */

// Reference measurements
const REFERENCE_ITEM_WIDTH_PX = 57; // FenderAmp.png width
const REFERENCE_ITEM_WIDTH_INCHES = 24.5; // Fender Deluxe Reverb actual width

/**
 * Scale factor: pixels per inch
 */
export const PIXELS_PER_INCH = REFERENCE_ITEM_WIDTH_PX / REFERENCE_ITEM_WIDTH_INCHES;
// 57 ÷ 24.5 = 2.327 pixels per inch

/**
 * Scale factor: inches per pixel
 */
export const INCHES_PER_PIXEL = REFERENCE_ITEM_WIDTH_INCHES / REFERENCE_ITEM_WIDTH_PX;
// 24.5 ÷ 57 = 0.4298 inches per pixel

/**
 * Convert inches to pixels using our established scale
 */
export function inchesToPixels(inches: number): number {
	return Math.round(inches * PIXELS_PER_INCH);
}

/**
 * Convert feet to pixels using our established scale
 */
export function feetToPixels(feet: number): number {
	return inchesToPixels(feet * 12);
}

/**
 * Convert pixels to inches using our established scale
 */
export function pixelsToInches(pixels: number): number {
	return pixels * INCHES_PER_PIXEL;
}


/**
 * Get formatted dimensions string
 */
export function formatDimensions(widthPx: number, heightPx: number): string {
	const widthInches = pixelsToInches(widthPx);
	const heightInches = pixelsToInches(heightPx);

	// Format as feet'inches" if over 12 inches, otherwise just inches
	const formatMeasurement = (inches: number): string => {
		if (inches >= 12) {
			const feet = Math.floor(inches / 12);
			const remainingInches = inches % 12;
			if (remainingInches === 0) {
				return `${feet}'`;
			} else {
				return `${feet}'${remainingInches.toFixed(1)}"`;
			}
		} else {
			return `${inches.toFixed(1)}"`;
		}
	};

	return `${formatMeasurement(widthInches)} × ${formatMeasurement(heightInches)}`;
}

/**
 * Common stage dimensions in pixels
 */
export const STAGE_SIZES: Record<string, { width: number; height: number; label: string }> = {
	'4x4': {
		width: feetToPixels(4),
		height: feetToPixels(4),
		label: "4' × 4' Stage Deck"
	},
	'4x8': {
		width: feetToPixels(4),
		height: feetToPixels(8),
		label: "4' × 8' Stage Deck"
	},
	'8x8': {
		width: feetToPixels(8),
		height: feetToPixels(8),
		label: "8' × 8' Stage Deck"
	}
};

// --- Unit conversion ---
export type UnitSystem = 'imperial' | 'metric';

const FEET_TO_METERS = 0.3048;

export function feetToMeters(feet: number): number {
	return feet * FEET_TO_METERS;
}

export function metersToFeet(meters: number): number {
	return meters / FEET_TO_METERS;
}

export function displayValue(valueFeet: number, unit: string): number {
	return unit === 'metric'
		? Math.round(feetToMeters(valueFeet) * 100) / 100
		: valueFeet;
}

export function toFeet(displayVal: number, unit: string): number {
	return unit === 'metric' ? metersToFeet(displayVal) : displayVal;
}

export function unitLabel(unit: string): string {
	return unit === 'metric' ? 'm' : 'ft';
}


