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
 * Format a measurement in inches as feet'inches"
 */
function formatMeasurement(inches: number): string {
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
}

/**
 * Get formatted dimensions string from pixel values
 */
export function formatDimensions(widthPx: number, heightPx: number): string {
	return `${formatMeasurement(pixelsToInches(widthPx))} × ${formatMeasurement(pixelsToInches(heightPx))}`;
}

/**
 * Get formatted dimensions string from feet values
 */
export function formatFeetDimensions(widthFt: number, heightFt: number): string {
	return `${formatMeasurement(widthFt * 12)} × ${formatMeasurement(heightFt * 12)}`;
}

/**
 * Convert image pixel dimensions to feet using our established scale.
 * E.g. a 57px-wide amp image → ≈2.04 ft real-world width.
 */
export function imagePxToFeet(px: number): number {
	return (px * INCHES_PER_PIXEL) / 12;
}

/**
 * Common stage deck dimensions in feet
 */
export const STAGE_SIZES: Record<string, { width: number; height: number; label: string }> = {
	'4x4': { width: 4, height: 4, label: "4' × 4' Stage Deck" },
	'4x8': { width: 4, height: 8, label: "4' × 8' Stage Deck" },
	'8x8': { width: 8, height: 8, label: "8' × 8' Stage Deck" }
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
	return unit === 'metric' ? Math.round(feetToMeters(valueFeet) * 100) / 100 : valueFeet;
}

export function toFeet(displayVal: number, unit: string): number {
	return unit === 'metric' ? metersToFeet(displayVal) : displayVal;
}

export function unitLabel(unit: string): string {
	return unit === 'metric' ? 'm' : 'ft';
}
