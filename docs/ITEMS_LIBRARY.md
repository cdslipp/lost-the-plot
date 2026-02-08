# Items Library Onboarding

This guide explains how the stage plot items library is organized, where the source JSON lives, and how changes flow into the app.

## Quick Orientation

- `categorizer/data/enriched-items.json` is the source of truth for catalog metadata.
- `app/static/final_assets/items.json` is the runtime catalog consumed by the app.
- `app/static/final_assets/**` contains the actual PNG assets and per-item `item.json` stubs.
- `app/static/final_assets/brands.json` is the curated brand registry.

## Data Flow

1. **Source edits**
   - Edit `categorizer/data/enriched-items.json` directly for names, tags, categories, default inputs/outputs, etc.
   - Update or add PNGs under `app/static/final_assets/` if you are adding art.

2. **Categorizer UI (optional)**
   - The Categorizer app is a convenience UI for editing the same data.
   - It writes back into `categorizer/data/enriched-items.json`.

3. **Runtime catalog**
   - `app/static/final_assets/items.json` is loaded by the app.
   - Keep it aligned with the enriched data when you add/remove items.

## Catalog Item Shape (Enriched)

Each item in `categorizer/data/enriched-items.json` follows the enriched schema:

- `name`, `item_type`, `variants`, `path`
- `category`, `subcategory`, `tags`
- `default_inputs` for sources that create inputs
- `default_outputs` for monitors/output devices
- `dimensions`, `connectors`, `provision_default`, `is_backline`

## Adding a New Item

1. **Add or duplicate assets**
   - Create a directory under `app/static/final_assets/<category>/<item_slug>/`.
   - Copy the PNGs and add `item.json` describing variants.

2. **Add catalog entries**
   - Append a new item to `categorizer/data/enriched-items.json`.
   - Add a matching entry to `app/static/final_assets/items.json`.

3. **Check paths and variants**
   - `path` should match the asset folder path.
   - Variant filenames must exist in the asset directory.

## Brands Registry

`app/static/final_assets/brands.json` is a curated list of manufacturer metadata.

Recommended fields:

- `name`: Display name
- `slug`: URL-safe identifier
- `website`: Primary brand website
- `status`: `active` or `defunct`
- `notes`: Optional context (mergers, rebrands, etc.)

## Contribution Flow (Git)

- The library is JSON-driven, so changes are reviewable as simple diffs.
- Add or update JSON + assets in a single commit.
- Keep filenames ASCII and consistent with existing naming patterns.
