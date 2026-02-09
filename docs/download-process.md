# PDF Download Process

## Overview

PDF export is handled by `app/src/lib/utils/pdf.ts` using **jsPDF** for document
creation and **html2canvas** for capturing the stage plot canvas.

## Flow

1. User clicks **Export PDF** in the toolbar (`EditorToolbar.svelte`)
2. `handleExportPdf()` sets an `exporting` flag to prevent double-clicks
3. `exportToPdf()` in `pdf.ts` is called with plot name, canvas element, items,
   and persons
4. **html2canvas** screenshots the canvas element with light-mode overrides
5. **jsPDF** builds a portrait document: header, plot image, input list table,
   and people section
6. A blob is created, downloaded via a temporary `<a>` element, and cleaned up

## Blob Download (why not `doc.save()`)

jsPDF's built-in `doc.save()` creates a blob URL internally but does **not**
revoke it afterward. Browsers may also suppress or ignore repeated downloads of
the same filename within a short window. Together, these cause a bug where the
second PDF export silently fails until the page is hard-refreshed.

The fix (applied Feb 2026) manually handles the download:

```ts
const blob = doc.output('blob');
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `${filename}.pdf`;
document.body.appendChild(a);
a.click();
setTimeout(() => {
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}, 100);
```

Key points:

- **`doc.output('blob')`** — gets the PDF as a Blob without triggering any
  download
- **`URL.createObjectURL`** — creates a fresh, unique URL each time
- **`URL.revokeObjectURL`** — frees the blob memory after a short delay so the
  browser has time to initiate the download
- The anchor element is appended to the DOM, clicked programmatically, then
  removed — this is more reliable across browsers than `window.open()` or
  assigning to `window.location`

## Callers

Both the **editor route** and the **share route** use the same `exportToPdf()`
function. Each caller must map its own data structures to the `PdfExportOptions`
shape:

- `items` — `Array<{ name: string; channel: string; person_name: string }>`
- `persons` — `Array<{ name: string; role: string }>`

The editor route resolves `person_name` by looking up the assigned `person_id`
against the band's persons list. The share route uses the `musician` string
stored directly on each item, and maps `plot.musicians` (with `instrument`) into
the `persons` array.
