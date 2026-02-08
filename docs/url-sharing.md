# URL Sharing

Share stage plots via compact, self-contained URLs. All plot data -- items, positions, musicians, and contacts -- is encoded directly in the URL. No server, no database, no account required.

## Overview

The share system encodes a complete stage plot into a URL that anyone can open. The recipient sees a read-only view of the plot with the option to import it into their own local database.

### Design Principles

- **Self-contained**: The URL carries the entire plot. No server round-trip or external storage.
- **Privacy-first**: Personal data (phone numbers, emails) is compressed into an opaque binary blob inside the URL hash fragment, which is never sent to the server.
- **Compact**: A typical 15-item, 5-musician plot encodes to ~600-900 characters. Even large plots stay under 2,000 characters.
- **Human-readable path**: Band name and plot name appear in plaintext in the URL path for easy identification.
- **Versionable**: A schema version field (`v: 1`) allows the format to evolve without breaking old links.

## URL Format

```
https://stageplotter.com/s/{bandName}/{plotName}#{compressedPayload}
```

| Segment               | Content                            | Visibility                 |
| --------------------- | ---------------------------------- | -------------------------- |
| `/s/`                 | Share route prefix                 | Plaintext                  |
| `{bandName}`          | URL-encoded band name              | Plaintext (human-readable) |
| `{plotName}`          | URL-encoded plot name              | Plaintext (human-readable) |
| `#`                   | Hash separator                     | --                         |
| `{compressedPayload}` | gzip + base64url encoded plot data | Opaque binary              |

### Why the Hash Fragment?

The hash fragment (`#...`) is **never sent to the server** in HTTP requests. This means:

- No server-side URL length limits apply (browser limits are ~2MB)
- Personal data stays entirely client-side
- No server infrastructure needed to handle share links
- Works with any static hosting (Cloudflare Pages, Vercel, etc.)

## Encoding Pipeline

```
Stage Plot Data
      |
      v
  Compact JSON         Strip redundant data, use catalog indexes
      |                and numeric tuples instead of objects
      v
  JSON.stringify()
      |
      v
  gzip                 Browser-native CompressionStream API
      |
      v
  base64url            URL-safe encoding (A-Z, a-z, 0-9, -, _)
      |
      v
  URL Hash Fragment
```

### Compaction Strategies

The encoder applies several strategies to minimize payload size before compression:

1. **Catalog index substitution**: Item paths like `"amps/guitar/fender_amp"` (~25 chars) are replaced with a numeric index into the 267-item catalog (~2 bytes).

2. **Numeric tuples**: Items are stored as flat arrays instead of keyed objects:

   ```
   // Instead of this (~150 bytes per item):
   { "catalogPath": "amps/guitar/fender_amp", "variant": "default", "x": 200, ... }

   // We store this (~20 bytes per item):
   [42, 0, 200, 300, 57, 80, 1, 0, 4]
   //  ^  ^   ^    ^   ^   ^  ^  ^  ^
   //  |  |   |    |   |   |  |  |  type enum
   //  |  |   |    |   |   |  |  musician index
   //  |  |   |    |   |   |  channel number
   //  |  |   |    |   |   height
   //  |  |   |    |   width
   //  |  |   |    y position
   //  |  |   x position
   //  |  variant index
   //  catalog index
   ```

3. **Enum encoding**: String types (`"input"`, `"amp"`, `"microphone"`, etc.) are mapped to small integers.

4. **Musician deduplication**: Item-musician associations use an index into the musicians array rather than repeating the name string.

5. **Position rounding**: Pixel positions are rounded to integers (sub-pixel precision is unnecessary for sharing).

### Compact Payload Schema (v1)

```typescript
{
  v: 1,                    // Schema version
  sw: 24,                  // Stage width (feet)
  sd: 16,                  // Stage depth (feet)
  p: [                     // Persons (band contacts)
    // [name, role, pronouns, phone, email, memberTypeEnum, statusEnum]
    ["John Smith", "Guitar", "he/him", "+15551234567", "john@band.com", 0, 0],
  ],
  m: [                     // Musicians (plot-level)
    // [name, instrument]
    ["John Smith", "Guitar"],
  ],
  i: [                     // Items (compact numeric tuples)
    // [catalogIdx, variantIdx, x, y, w, h, channel, musicianIdx, typeEnum]
    [42, 0, 200, 300, 57, 80, 1, 0, 4],
    // Risers append extra fields:
    // [..., riserWidth, riserDepth, riserHeight]
    [-1, 0, 450, 80, 224, 112, 0, -1, 2, 8, 4, 1],
  ]
}
```

### Enum Mappings

**Item types** (index -> value):

| Index | Type            |
| ----- | --------------- |
| 0     | input           |
| 1     | output          |
| 2     | riser           |
| 3     | stageDeck       |
| 4     | amp             |
| 5     | cable_connector |
| 6     | di_box          |
| 7     | drumset         |
| 8     | equipment       |
| 9     | furniture       |
| 10    | instrument      |
| 11    | microphone      |
| 12    | mixer           |
| 13    | monitor         |
| 14    | pedal           |
| 15    | person          |
| 16    | power           |
| 17    | speaker         |
| 18    | stagebox        |
| 19    | stagecraft      |
| 20    | stand           |

**Member types**: 0=performer, 1=crew, 2=management, 3=other

**Member statuses**: 0=permanent, 1=occasional, 2=temporary, 3=inactive

**Variant keys**: 0=default, 1=R, 2=L, 3=RA, 4=LA, 5=RB, 6=LB, 7=back, ... (27 total, covering all asset variants)

## Size Estimates

| Scenario                 | Items | Musicians | Persons | URL Length         |
| ------------------------ | ----- | --------- | ------- | ------------------ |
| Solo acoustic            | 3     | 1         | 1       | ~250 chars         |
| Small band               | 8     | 3         | 3       | ~400 chars         |
| Typical 5-piece          | 15    | 5         | 5       | ~600-900 chars     |
| Large band               | 30    | 10        | 10      | ~1,200-1,600 chars |
| Maximum practical (48ch) | 48    | 15        | 15      | ~2,000-2,500 chars |

Measured from the roundtrip test: a 6-item, 5-musician, 5-person plot encodes to **487 characters** total URL with **80.6% compression** from raw JSON.

### URL Length Limits

| Environment                 | Max Length    | Status                    |
| --------------------------- | ------------- | ------------------------- |
| Chrome / Edge / Firefox     | ~2MB          | Well within limits        |
| Safari                      | ~80,000 chars | Well within limits        |
| Cloudflare (server-side)    | ~8,192 chars  | N/A (hash is client-only) |
| iMessage / WhatsApp / Slack | ~2,000 chars  | Fits typical plots        |
| QR codes (alphanumeric)     | ~4,296 chars  | Fits all scenarios        |

Since the payload is in the hash fragment (never sent to the server), the only real limit is the browser's URL bar -- effectively unlimited.

## User Flow

### Sharing a Plot

1. Open a stage plot in the editor
2. Click the **Share** button in the toolbar
3. The URL is generated and copied to the clipboard
4. A "Copied!" confirmation appears for 3 seconds
5. Paste the URL into any messaging app, email, or document

### Viewing a Shared Plot

1. Open the share URL in a browser
2. The page loads the asset catalog, then decodes the hash payload
3. The stage plot renders in a read-only view showing:
   - Full canvas with all items positioned correctly
   - Musicians list
   - Input list (sorted by channel number)
   - Contacts section (names, roles, phone numbers, emails)
4. Click **Copy Link** to re-share the same URL
5. Click **Import to My Plots** to save locally

### Importing a Shared Plot

When the user clicks "Import to My Plots":

1. A new band is created in the local SQLite database (using the band name from the URL)
2. All persons are imported with their full contact details
3. A new stage plot is created under that band with all items and musicians
4. The user is redirected to the editor for the imported plot

## Architecture

### Files

| File                                                  | Purpose                                                                 |
| ----------------------------------------------------- | ----------------------------------------------------------------------- |
| `packages/shared/src/share-codec.ts`                  | Core encode/decode engine, compression utilities, catalog index builder |
| `app/src/routes/s/[bandName]/[plotName]/+page.svelte` | Read-only share viewer page                                             |
| `app/src/lib/components/EditorToolbar.svelte`         | Share button (encodes + copies to clipboard)                            |

### Dependencies

- **CompressionStream / DecompressionStream**: Browser-native gzip. No external compression library needed.
- **Asset catalog** (`/final_assets/items.json`): Required at both encode time (to build the catalog index) and decode time (to reconstruct item data from indexes). Loaded via `fetch()`.

### API Reference

```typescript
// Build a catalog index (path -> numeric index)
buildCatalogIndex(catalog: { path: string }[]): Map<string, number>

// Encode a stage plot into a compressed payload string
encodePayload(input: EncodeInput, catalogIndex: Map<string, number>): Promise<string>

// Assemble the full share URL
buildShareUrl(baseUrl: string, bandName: string, plotName: string, payload: string): string

// Decode a compressed payload back into full plot data
decodePayload(payloadStr: string, catalog: CatalogItem[]): Promise<DecodedPlot>
```

### Browser Compatibility

| Feature             | Chrome | Firefox | Safari | Edge |
| ------------------- | ------ | ------- | ------ | ---- |
| CompressionStream   | 80+    | 113+    | 16.4+  | 80+  |
| DecompressionStream | 80+    | 113+    | 16.4+  | 80+  |
| base64 (btoa/atob)  | All    | All     | All    | All  |

All target browsers are supported. The share feature requires no polyfills.

## Versioning

The payload schema includes a version field (`v: 1`). When the format needs to change:

1. Increment the version number in the encoder
2. Add a new decode path in `decodePayload()` that handles the new version
3. Keep the old decode path for backwards compatibility
4. Old share URLs will continue to work indefinitely

## Security Considerations

- **No server exposure**: Hash fragments are never sent in HTTP requests. Share URLs can be served from static hosting with zero server-side processing.
- **No executable code**: The payload is pure JSON data. No code execution occurs during decoding.
- **Data minimization**: Only the data needed to render the plot is included. No internal IDs, undo history, or database metadata is shared.
- **Personal data in opaque blob**: Phone numbers, emails, and other PII are inside the compressed binary payload -- not visible as plaintext in the URL. However, the data is compressed, not encrypted. Anyone with the URL can decode it. Treat share URLs with the same care as sharing a PDF of the plot.

## Testing

Run the roundtrip test:

```bash
bun run packages/shared/src/share-codec.test.ts
```

This verifies:

- Encode/decode roundtrip fidelity for all data types
- Musician name/instrument preservation
- Person contact detail preservation (phone, email, pronouns)
- Item position, channel, and musician assignment accuracy
- Riser dimension roundtrip
- Compression ratio and URL size reporting
