// Fetches animal species that HAVE a Dutch common name from Wikidata and merges
// them into public/species.json. Requiring a Dutch label keeps the list to what a
// Dutch school catalog actually needs, and keeps each SPARQL query tractable.
//
// The shipped seed list is never lost: results are merged and de-duplicated by
// scientific name, so running this only ever grows coverage.
//
//   node scripts/build-taxonomy.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const outputPath = join(currentDirectory, "..", "public", "species.json");
const SPARQL_ENDPOINT = "https://query.wikidata.org/sparql";

// Major animal classes -> our internal group value (matches labels.json "part").
const ANIMAL_CLASSES = [
  { wikidataId: "Q7377", group: "mammal" }, // Mammalia
  { wikidataId: "Q5113", group: "bird" }, // Aves
  { wikidataId: "Q10811", group: "reptile" }, // Reptilia
  { wikidataId: "Q10908", group: "amphibian" }, // Amphibia
  { wikidataId: "Q127282", group: "fish" }, // Actinopterygii (ray-finned fish)
  { wikidataId: "Q179876", group: "fish" }, // Chondrichthyes (sharks and rays)
  { wikidataId: "Q1390", group: "insect" }, // Insecta
];

function buildQuery(classWikidataId) {
  return `
    SELECT ?taxonName ?nlLabel ?enLabel WHERE {
      ?item wdt:P171* wd:${classWikidataId} .
      ?item wdt:P105 wd:Q7432 .
      ?item wdt:P225 ?taxonName .
      ?item rdfs:label ?nlLabel . FILTER(LANG(?nlLabel) = "nl")
      OPTIONAL { ?item rdfs:label ?enLabel . FILTER(LANG(?enLabel) = "en") }
    }`;
}

async function fetchSpeciesForClass({ wikidataId, group }) {
  const url = `${SPARQL_ENDPOINT}?format=json&query=${encodeURIComponent(buildQuery(wikidataId))}`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/sparql-results+json",
      "User-Agent": "bone-catalog-poc/0.1 (school cataloguing tool)",
    },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${wikidataId}`);

  const json = await response.json();
  return json.results.bindings
    .map((binding) => ({
      latin: binding.taxonName.value,
      nl: binding.nlLabel.value,
      en: binding.enLabel?.value ?? "",
      group,
    }))
    // Wikidata auto-fills the Dutch label with the scientific name for most taxa.
    // Keep only real Dutch common names: lowercase-initial and not the Latin name.
    .filter(
      (record) =>
        record.nl[0] === record.nl[0].toLowerCase() &&
        record.nl.toLowerCase() !== record.latin.toLowerCase(),
    )
    .map((record) => ({
      latin: record.latin,
      nl: record.nl.toLowerCase(),
      en: record.en.toLowerCase(),
      group,
    }));
}

async function main() {
  const speciesByLatinName = new Map();

  // Seed first so curated entries always survive.
  for (const species of JSON.parse(readFileSync(outputPath, "utf8"))) {
    speciesByLatinName.set(species.latin.toLowerCase(), species);
  }
  const seedCount = speciesByLatinName.size;

  for (const animalClass of ANIMAL_CLASSES) {
    try {
      const records = await fetchSpeciesForClass(animalClass);
      for (const record of records) {
        // Keep the entry with the richer English name if a duplicate appears.
        const existing = speciesByLatinName.get(record.latin.toLowerCase());
        if (!existing || (!existing.en && record.en)) {
          speciesByLatinName.set(record.latin.toLowerCase(), record);
        }
      }
      console.log(`  ${animalClass.wikidataId} (${animalClass.group}): +${records.length}`);
    } catch (error) {
      console.warn(`  ${animalClass.wikidataId} (${animalClass.group}) failed, skipping: ${error.message}`);
    }
  }

  const allSpecies = [...speciesByLatinName.values()].sort((first, second) =>
    first.nl.localeCompare(second.nl, "nl"),
  );
  writeFileSync(outputPath, JSON.stringify(allSpecies, null, 0) + "\n");
  console.log(`Wrote ${allSpecies.length} species (${seedCount} seed) -> ${outputPath}`);
}

main();
