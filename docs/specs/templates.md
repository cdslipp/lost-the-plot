# Templates Spec

## Status: Planned

## Overview

Templates allow users to start new stage plots from pre-configured layouts instead of blank canvases. This includes both built-in templates and user-saved templates.

## Database Schema

```sql
CREATE TABLE IF NOT EXISTS templates (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'custom',
  description TEXT,
  thumbnail TEXT,  -- Base64 or path to preview image
  metadata TEXT NOT NULL,  -- JSON: { items: [...], musicians: [...] }
  is_builtin INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

## Built-in Template Categories

- **Solo** — Single performer with vocal mic, guitar DI, monitor
- **Duo** — Two performers, two vocal mics, instruments
- **Trio** — Three-piece band (drums, bass, guitar/keys)
- **4-Piece** — Standard rock band (drums, bass, 2x guitar + vocals)
- **5-Piece** — Extended band (drums, bass, 2x guitar, keys)
- **DJ** — DJ table, monitors, laptop, controller
- **Acoustic** — Small acoustic setup with minimal inputs
- **Orchestra** — Large ensemble sections layout

## "New Plot" Flow

1. User clicks "New Plot" on band dashboard
2. Modal/page shows template grid:
   - Built-in templates at top
   - User-saved templates below
   - "Blank" option always available
3. User selects template → new plot created with template items pre-placed
4. Plot opens in editor for customization

## Save as Template

From the editor:

1. User accesses "Save as Template" (menu or button)
2. Dialog: name, category (dropdown), description
3. Current items + musicians snapshot saved to templates table
4. Template appears in user's template library

## Template Thumbnails

- Generated automatically from canvas state as a small PNG/SVG
- Alternatively, store a simplified representation (item positions as dots/rectangles)
- Lazy-generated on first view, cached

## Implementation Notes

- Templates are band-independent (available across all bands)
- Built-in templates seeded via migration
- Template items use relative positions (percentages) so they scale to any canvas size
- When applying a template, item IDs are regenerated to avoid conflicts
