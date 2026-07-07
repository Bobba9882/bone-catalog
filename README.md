# Botten & Skeletten Catalogus

App for keeping track of a school's collection of skeletons, taxidermy, skulls,
bones and eggs: what there is and which room it's in. You take a photo, it
guesses what the animal is (Dutch and Latin name), you check the details and the
location, and it goes into a list you can search and filter. Runs entirely in the
browser, no server.

The point is the inventory. The identification is just there to save some typing,
it's not meant to be clever.

## Running it

```
npm install
npm run build:data   # builds the species list and embeddings, downloads the model once
npm run dev
```

Open the URL it prints. To use it on a phone, open the Network URL from a device
on the same wifi.

The first time you scan something the browser downloads the CLIP model. It's
large (roughly 1 GB) and gets cached, so it only happens once. After that the
recognition runs locally.

## How the guessing works

There's no off-the-shelf model that recognises bones, so this leans on CLIP
(clip-vit-large-patch14, run in the browser via transformers.js). During the
build we push every species name through CLIP's text encoder and save the
resulting vectors. When you take a photo only the image half of CLIP runs, and
the photo's vector is compared against the saved ones to rank the closest names.

The species list (`public/species.json`, around 1,800 animals that have a Dutch
name) is pulled from Wikidata. CLIP ranks the photo against the whole list and
you get the top few as suggestions to pick from or overwrite.

Don't expect much accuracy on a bare skull. These models are trained on living
animals, so treat the suggestion as a head start and correct it.

## Build scripts

- `npm run build:taxonomy` grabs animals with a Dutch common name from Wikidata
  into `public/species.json`. A seed list is committed, so running it is
  optional. Insects mostly time out on Wikidata's side and come from the seed.
- `npm run build:embeddings` runs CLIP over the list and writes the vectors into
  `public/embeddings`. Run it again after you change `species.json`.
- `npm run build:data` runs both.

## Layout

```
src/lib/         model loading, storage, image handling
src/views/       Scan, EntryForm, EntryDetail, Catalog
src/components/  shared UI (cards, pills)
src/data/        the type/part/state option lists
scripts/         the two build scripts
public/          species.json and the generated embeddings
```

Entries live in localStorage. There's JSON export/import for backups and moving
between devices. Conventions and known rough edges are written up in
`CONTRIBUTING.md`.
