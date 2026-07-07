// Precomputes CLIP text embeddings for the taxonomy and for the type/part label
// sets, so the phone only ever runs the CLIP *image* encoder at scan time.
//
// Outputs (public/embeddings/):
//   species.f32  rowCount x dimensions  float32, L2-normalised, same order as species.json
//   type.f32     rowCount x dimensions  same order as labels.json "type"
//   part.f32     rowCount x dimensions  same order as labels.json "part"
//   meta.json    { model, dimensions, species, type, part }
//
//   node scripts/build-embeddings.mjs

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { AutoTokenizer, CLIPTextModelWithProjection } from "@huggingface/transformers";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const publicDirectory = join(currentDirectory, "..", "public");
const outputDirectory = join(publicDirectory, "embeddings");
const MODEL_NAME = "Xenova/clip-vit-large-patch14";
const BATCH_SIZE = 32;

const speciesPrompt = (species) => `a photo of a ${species.en || species.latin}`;

/** L2-normalise each row of a flat [rowCount x dimensions] Float32Array in place. */
function normaliseRows(values, rowCount, dimensions) {
  for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
    let sumOfSquares = 0;
    for (let dimension = 0; dimension < dimensions; dimension++) {
      sumOfSquares += values[rowIndex * dimensions + dimension] ** 2;
    }
    const inverseNorm = 1 / (Math.sqrt(sumOfSquares) || 1);
    for (let dimension = 0; dimension < dimensions; dimension++) {
      values[rowIndex * dimensions + dimension] *= inverseNorm;
    }
  }
}

async function embedPrompts(tokenizer, model, prompts) {
  const rows = [];
  let dimensions = 0;

  for (let start = 0; start < prompts.length; start += BATCH_SIZE) {
    const batch = prompts.slice(start, start + BATCH_SIZE);
    const inputs = tokenizer(batch, { padding: true, truncation: true });
    const { text_embeds: textEmbeddings } = await model(inputs);
    dimensions = textEmbeddings.dims[1];
    const flatValues = textEmbeddings.data; // Float32Array length batch*dimensions
    for (let itemIndex = 0; itemIndex < batch.length; itemIndex++) {
      rows.push(flatValues.slice(itemIndex * dimensions, (itemIndex + 1) * dimensions));
    }
    process.stdout.write(`\r  embedded ${Math.min(start + BATCH_SIZE, prompts.length)}/${prompts.length}`);
  }
  process.stdout.write("\n");

  const values = new Float32Array(rows.length * dimensions);
  rows.forEach((row, rowIndex) => values.set(row, rowIndex * dimensions));
  normaliseRows(values, rows.length, dimensions);
  return { values, count: rows.length, dimensions };
}

function writeFloat32File(name, values) {
  writeFileSync(join(outputDirectory, name), Buffer.from(values.buffer, values.byteOffset, values.byteLength));
}

async function main() {
  mkdirSync(outputDirectory, { recursive: true });
  const species = JSON.parse(readFileSync(join(publicDirectory, "species.json"), "utf8"));
  const labels = JSON.parse(readFileSync(join(currentDirectory, "..", "src", "data", "labels.json"), "utf8"));

  console.log(`Loading ${MODEL_NAME} (first run downloads the model)...`);
  const tokenizer = await AutoTokenizer.from_pretrained(MODEL_NAME);
  const model = await CLIPTextModelWithProjection.from_pretrained(MODEL_NAME);

  console.log(`Species (${species.length}):`);
  const speciesEmbeddings = await embedPrompts(tokenizer, model, species.map(speciesPrompt));
  console.log(`Type (${labels.type.length}):`);
  const typeEmbeddings = await embedPrompts(tokenizer, model, labels.type.map((label) => label.prompt));
  console.log(`Part (${labels.part.length}):`);
  const partEmbeddings = await embedPrompts(tokenizer, model, labels.part.map((label) => label.prompt));

  writeFloat32File("species.f32", speciesEmbeddings.values);
  writeFloat32File("type.f32", typeEmbeddings.values);
  writeFloat32File("part.f32", partEmbeddings.values);
  writeFileSync(
    join(outputDirectory, "meta.json"),
    JSON.stringify(
      {
        model: MODEL_NAME,
        dimensions: speciesEmbeddings.dimensions,
        species: speciesEmbeddings.count,
        type: typeEmbeddings.count,
        part: partEmbeddings.count,
      },
      null,
      2,
    ),
  );
  console.log(`Done. dimensions=${speciesEmbeddings.dimensions}, species=${speciesEmbeddings.count} -> ${outputDirectory}`);
}

main();
