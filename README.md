# Botten & Skeletten Catalogus

A web app for inventorying a school's collection of skeletons, taxidermy,
skulls, bones and eggs. Each item is photographed, given a Dutch and Latin
name, tagged with its type, part and condition, and assigned to a room. The
result is a searchable, filterable record of what the collection holds and
where each item is kept. The app runs entirely in the browser and has no
backend.

Identification exists to speed up data entry, not to drive the app. It proposes
a name that the user confirms or replaces.

## Stack

- Vite, React and TypeScript
- transformers.js running CLIP (`clip-vit-large-patch14`) in the browser
- localStorage for persistence, with JSON export and import

## Getting started

```
npm install
npm run build:data
npm run dev
```

`build:data` generates the species list and the precomputed embeddings, which
downloads the CLIP text model once. `npm run dev` starts the Vite server; open
the printed URL, or the Network URL to reach the app from a phone on the same
network.

The image model (about 1 GB) is fetched by the browser the first time a photo
is classified and cached afterwards. Recognition then runs locally.

## How identification works

No general model recognises bones directly, so the app uses CLIP for zero-shot
matching. During the build, every species name is encoded with CLIP's text
encoder and the resulting vectors are stored. At runtime only the image encoder
runs: the photo's vector is compared by cosine similarity against the stored
name vectors, and the closest matches are offered as suggestions.

The species list in `public/species.json` holds roughly 1,800 animals that have
a Dutch common name, sourced from Wikidata. Accuracy on bare skeletal material
is limited, as these models are trained mainly on live animals, so a suggestion
should be treated as a starting point.

## Build scripts

- `npm run build:taxonomy` fetches animals with a Dutch common name from
  Wikidata into `public/species.json`. A seed list is committed, so this step is
  optional. Most insects time out on Wikidata and are supplied by the seed.
- `npm run build:embeddings` encodes the species list and the type, part and
  state labels with CLIP and writes the vectors to `public/embeddings`. Run it
  again after changing `species.json`.
- `npm run build:data` runs both.

## Project structure

```
src/lib         model loading, storage and image processing
src/views       Scan, EntryForm, EntryDetail and Catalog screens
src/components  shared UI components
src/data        type, part and state option lists
scripts         build scripts
public          species.json and the generated embeddings
```

## Data and conventions

Entries are kept in localStorage and can be exported to or imported from a JSON
file for backup and transfer between devices. Coding conventions and known
limitations are documented in `CONTRIBUTING.md`.
