# Contributing

This project follows the [TapRaise Engineering Principles](https://tapraise.atlassian.net/wiki/spaces/DH/pages/1520336898)
and their operating rule, **match effort to risk**.

## Tier

This app is an **experimental, low-risk, reversible** proof-of-concept: a
school inventory tool with no backend and no sensitive data. Per the operating
rule we move fast and keep the strictness low — no test suite is required at
this tier, and we avoid speculative structure. If any part later becomes a
one-way door (real shared data, an outside integration), that part gets
core-grade care regardless of the tier.

## How these principles show up here

- **Build for value; do less, better.** The app does one job — log what the
  school has and where. Identification only speeds up manual entry; it is not
  the point, so we don't invest in chasing accuracy.
- **Keep it simple.** Plain React state, no router or state-management library,
  a single source of truth for the option lists (`src/data/labels.json`). No
  speculative abstractions; remove dead code in the same change.
- **Build it clean and well-bounded.** Domain names in full words (no
  abbreviations). Clear boundaries: `lib/` (model + storage + image), `views/`
  (screens), `components/` (reusable UI), `data/` (static config).
- **Reliability, security, privacy.** Photos are re-encoded on capture, which
  also strips metadata such as GPS. Storage failures are surfaced, not
  swallowed (see `src/lib/storage.ts`).

## Craft conventions

- Full, readable identifiers — never abbreviations.
- One catalog entry shape lives in `src/types.ts`; option lists in
  `src/data/labels.json`. Change those, not scattered literals.
- After editing the taxonomy (`public/species.json`), re-run
  `npm run build:embeddings` so the vectors match.

### Naming & files

- **File names.** React components and screens are `PascalCase.tsx`
  (`EntryCard.tsx`, `Catalog.tsx`). Everything else is `camelCase.ts`
  (`classifier.ts`, `storage.ts`, `types.ts`). Static config is lowercase
  (`labels.json`, `styles.css`).
- **Functions** are verbs in `camelCase` (`loadEntries`, `findTopMatches`);
  React components are `PascalCase`.
- **Component props** that take a callback use the `on` prefix (`onSave`,
  `onDelete`). Functions passed straight to a DOM event use the `handle` prefix
  (`handleSave`, `handleImport`). Plain domain helpers keep a verb name
  (`chooseSpecies`).
- **Booleans / predicates** use `is` / `has` / `can` (`isChosen`).
- **Pure transforms** use a `to` prefix (`toConfidences`, `toPillOptions`).

### Ordering within a file

1. Imports.
2. Module constants, then interfaces/types (grouped together, not scattered).
3. Module-level helpers.
4. The exported component/function last.

Inside a component: hooks and state first, then derived values, then handlers,
then the returned markup.

## Known debt (kept visible on purpose)

- **Storage capacity.** The catalog (photos included) lives in `localStorage`,
  which caps around ~5 MB — roughly 60–150 items. Saving surfaces an error when
  full; the durable fix is IndexedDB or a shared backend. Export JSON as backup.
- **Taxonomy coverage.** Insects come only from the seed list — Wikidata's
  insect tree times out. Other groups are the full Dutch-named set.
- **`part` field** merges taxonomic group (mammal/insect) and physical part
  (skull/egg); acceptable for now, split later if it causes confusion.
- **HEIC photos.** Some iPhone photos may not decode via `createImageBitmap`;
  add a HEIC fallback if it comes up on real devices.
