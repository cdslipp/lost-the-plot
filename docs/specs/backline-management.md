# Backline Management Spec

## Status: Planned

## Overview

Backline refers to the large musical equipment on stage (amplifiers, drum kits, keyboards, etc.) that may be provided by the artist, venue, or rental company. This feature adds provision tracking and requirements generation to stage plot items.

## Data Model

### Item-Level Backline Annotation

Each `StagePlotItem` gains optional backline fields stored in `itemData`:

```typescript
interface BacklineInfo {
  provision: 'artist' | 'venue' | 'rental' | 'tbd';
  make?: string;       // e.g., "Fender"
  model?: string;      // e.g., "Deluxe Reverb"
  notes?: string;      // e.g., "Must be tube amp"
  acceptable_subs?: string;  // e.g., "Vox AC30 also acceptable"
}
```

### Database

No new tables needed — backline info is stored in the item's JSON metadata within the `metadata` column of `stage_plots`. This keeps backline tightly coupled to the specific plot where it matters.

## Inspector Integration

When a backline-eligible item is selected in the editor:

1. **Provision dropdown**: Artist / Venue / Rental / TBD
2. **Make/Model fields**: Text inputs for specific equipment
3. **Notes**: Free-text for special requirements
4. **Acceptable substitutes**: What alternatives work

Backline-eligible item types:

- Amplifiers (guitar amp, bass amp)
- Drum kits and hardware
- Keyboards/pianos
- DJ equipment
- Monitors (sometimes venue-provided)

## Backline Requirements List

A derived view (accessible from the editor or band dashboard):

```
BACKLINE REQUIREMENTS — [Band Name] — [Event Name]
================================================

VENUE-PROVIDED:
  [ ] Drum kit (Yamaha Stage Custom or equivalent)
      - Kick, snare, hi-hat stand, 3 tom stands, 2 cymbal stands
      - Notes: No hardware, just shells preferred
  [ ] Bass amp (Ampeg SVT or equivalent)
      - Notes: 8x10 cab preferred, 4x10 acceptable

ARTIST-PROVIDED:
  - Guitar amp (Fender Deluxe Reverb)
  - Pedalboard

RENTAL NEEDED:
  - Piano (Yamaha CP88 or equivalent)
      - Notes: With stand and sustain pedal

TBD:
  - Monitor wedges x4
```

## Printable/Exportable Rider

- Export as PDF alongside the stage plot
- Format follows industry standard backline rider conventions
- Includes checkboxes for venue to confirm availability
- Separate section per provision type
- Contact info from band's People list included in header

## Implementation Notes

- Backline annotations are per-plot, not per-band (same amp might be artist-provided at one venue and venue-provided at another)
- The requirements list is a derived view computed from all items with backline info
- Items without backline info are excluded from the requirements list
- Consider color-coding items on the canvas by provision type (e.g., green = artist, blue = venue, orange = rental)
