# Quick Create Wizard Spec

## Status: Planned

## Overview

A step-by-step guided flow for non-technical users (band leaders, musicians) who want to create a stage plot without understanding stage plot conventions. This is the "No Time" mode from the product roadmap — designed to be shareable so a band can fill it out remotely.

## Wizard Steps

### Step 1: Band Info

- Band name (pre-filled if creating from band dashboard)
- Number of performers
- Genre/style (optional, influences template suggestions)

### Step 2: Instruments & Performers

For each performer:

- Name
- Primary instrument (dropdown with common options + "Other")
- Needs vocal mic? (yes/no)
- Monitor preference (wedge/IEM/none)

### Step 3: Additional Equipment

- Drum kit configuration (if drums selected): kick, snare, hi-hat, toms, overheads
- Keyboards: how many? DI or amp?
- Guitar/Bass: amp on stage or DI?
- Special items: laptop, DJ controller, additional mics

### Step 4: Stage Preferences

- Stage size estimate (small club / medium venue / large stage)
- Any specific positioning requirements?
- Backline provided by venue? (checkbox per major item)

### Step 5: Review & Generate

- Summary of all selections
- "Generate Plot" button
- Auto-generation logic:
  1. Select best-matching template based on band size + instruments
  2. Place items using template positions
  3. Auto-assign channels
  4. Set musician names from Step 2
  5. Open editor for final adjustments

## Shareable Mode

- Wizard accessible via shareable link: `/wizard/:token`
- Band leader creates a "wizard request" → generates unique token
- Band member fills out wizard → data stored temporarily
- Band leader reviews submissions → imports into a real plot
- Token expires after 30 days or after import

## Auto-Generation Logic

```
function generatePlot(wizardData):
  template = findBestTemplate(wizardData.performerCount, wizardData.instruments)
  plot = applyTemplate(template)

  for each performer in wizardData.performers:
    placeInstrument(plot, performer.instrument, performer.position)
    if performer.needsVocal:
      placeVocalMic(plot, near=performer.position)
    placeMonitor(plot, performer.monitorType, near=performer.position)

  autoAssignChannels(plot)
  return plot
```

## Implementation Dependencies

- Requires: Templates system (see templates.md)
- Requires: Route structure (implemented)
- Optional: Shareable links require server-side or P2P data transfer
