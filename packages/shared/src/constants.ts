// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Standard canvas and scale constants for StagePlotter.
 */

// Canvas dimensions — letter size landscape at 96 DPI
export const CANVAS_WIDTH = 1100;
export const CANVAS_HEIGHT = 850;
export const CANVAS_DPI = 96;
export const CANVAS_FORMAT = 'letter' as const;
export const CANVAS_ORIENTATION = 'landscape' as const;

// Stage area margins (pixels)
export const STAGE_MARGIN_TOP = 50;
export const STAGE_MARGIN_RIGHT = 50;
export const STAGE_MARGIN_BOTTOM = 100;
export const STAGE_MARGIN_LEFT = 50;

// Scale system — based on Fender Deluxe Reverb reference
export const REFERENCE_ITEM_WIDTH_PX = 57;
export const REFERENCE_ITEM_WIDTH_INCHES = 24.5;
export const PIXELS_PER_INCH = REFERENCE_ITEM_WIDTH_PX / REFERENCE_ITEM_WIDTH_INCHES; // ~2.327
export const INCHES_PER_PIXEL = REFERENCE_ITEM_WIDTH_INCHES / REFERENCE_ITEM_WIDTH_PX;

// Stage zones
export const ZONE_LABELS = ['DSR', 'DSC', 'DSL', 'USR', 'USC', 'USL'] as const;
export type StageZone = (typeof ZONE_LABELS)[number];
