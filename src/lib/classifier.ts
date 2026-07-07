// Local, free, zero-shot classification with CLIP running entirely in the browser.
//
// At scan time we run ONLY the CLIP image encoder. The photo's embedding is
// compared (cosine similarity) against text embeddings that were precomputed at
// build time (see scripts/build-embeddings.mjs) for the whole species taxonomy
// and for the type/part label sets. So identification ranks the photo against the
// *complete* register, never a short hand-picked list.

import {
  AutoProcessor,
  CLIPVisionModelWithProjection,
  RawImage,
} from "@huggingface/transformers";
import labels from "../data/labels.json";
import type { Species, Suggestion } from "../types";

const MODEL_NAME = "Xenova/clip-vit-large-patch14";

interface EmbeddingMetadata {
  // The row counts also live in meta.json, but the app derives them from each
  // matrix's byte length, so it only needs the vector width here.
  dimensions: number;
}

/** A precomputed text-embedding matrix (rowCount x dimensions, L2-normalised). */
interface EmbeddingMatrix {
  values: Float32Array;
  rowCount: number;
  dimensions: number;
}

interface ClassifierResources {
  processor: Awaited<ReturnType<typeof AutoProcessor.from_pretrained>>;
  visionModel: Awaited<ReturnType<typeof CLIPVisionModelWithProjection.from_pretrained>>;
  species: Species[];
  matrices: {
    species: EmbeddingMatrix;
    type: EmbeddingMatrix;
    part: EmbeddingMatrix;
  };
}

export interface ClassificationResult {
  species: Suggestion[];
  type: Suggestion[];
  part: Suggestion[];
}

export type ProgressCallback = (message: string) => void;

let resourcesPromise: Promise<ClassifierResources> | null = null;

async function loadEmbeddingMatrix(url: string, dimensions: number): Promise<EmbeddingMatrix> {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const values = new Float32Array(arrayBuffer);
  return { values, rowCount: values.length / dimensions, dimensions };
}

/** Load the CLIP image encoder, trying WebGPU first and falling back to CPU. */
async function loadVisionModel(onProgress: ProgressCallback) {
  const reportProgress = (event: { status: string; file?: string; progress?: number }) => {
    if (event.status === "progress" && event.file && typeof event.progress === "number") {
      onProgress(`Model laden: ${event.file} (${Math.round(event.progress)}%)`);
    }
  };

  const processor = await AutoProcessor.from_pretrained(MODEL_NAME, {
    progress_callback: reportProgress,
  });

  try {
    const visionModel = await CLIPVisionModelWithProjection.from_pretrained(MODEL_NAME, {
      device: "webgpu",
      progress_callback: reportProgress,
    });
    return { processor, visionModel };
  } catch {
    onProgress("WebGPU niet beschikbaar, terugvallen op processor...");
    const visionModel = await CLIPVisionModelWithProjection.from_pretrained(MODEL_NAME, {
      progress_callback: reportProgress,
    });
    return { processor, visionModel };
  }
}

/** Load the model and all precomputed data once; later calls reuse the result. */
export function prepareClassifier(
  onProgress: ProgressCallback = () => {},
): Promise<ClassifierResources> {
  if (!resourcesPromise) {
    resourcesPromise = (async () => {
      onProgress("Gegevens laden...");
      const [metadata, species] = await Promise.all([
        fetch("/embeddings/meta.json").then((response) => response.json()) as Promise<EmbeddingMetadata>,
        fetch("/species.json").then((response) => response.json()) as Promise<Species[]>,
      ]);

      const [speciesMatrix, typeMatrix, partMatrix] = await Promise.all([
        loadEmbeddingMatrix("/embeddings/species.f32", metadata.dimensions),
        loadEmbeddingMatrix("/embeddings/type.f32", metadata.dimensions),
        loadEmbeddingMatrix("/embeddings/part.f32", metadata.dimensions),
      ]);

      const { processor, visionModel } = await loadVisionModel(onProgress);
      onProgress("Klaar");

      return {
        processor,
        visionModel,
        species,
        matrices: { species: speciesMatrix, type: typeMatrix, part: partMatrix },
      };
    })().catch((error) => {
      resourcesPromise = null; // allow a retry after a failure
      throw error;
    });
  }
  return resourcesPromise;
}

/** Embed a photo (data URL) into a normalised CLIP image vector. */
async function embedImage(
  resources: ClassifierResources,
  dataUrl: string,
): Promise<Float32Array> {
  const image = await RawImage.fromURL(dataUrl);
  const inputs = await resources.processor(image);
  const { image_embeds: imageEmbeddings } = await resources.visionModel(inputs);

  const embedding = imageEmbeddings.data as Float32Array;
  let sumOfSquares = 0;
  for (const value of embedding) sumOfSquares += value * value;
  const inverseNorm = 1 / (Math.sqrt(sumOfSquares) || 1);
  return embedding.map((value) => value * inverseNorm);
}

/** Top matches of a matrix by cosine similarity to a normalised query vector. */
function findTopMatches(
  queryVector: Float32Array,
  matrix: EmbeddingMatrix,
  howMany: number,
): Array<{ index: number; score: number }> {
  const ranked: Array<{ index: number; score: number }> = [];
  for (let rowIndex = 0; rowIndex < matrix.rowCount; rowIndex++) {
    let dotProduct = 0;
    const rowStart = rowIndex * matrix.dimensions;
    for (let dimension = 0; dimension < matrix.dimensions; dimension++) {
      dotProduct += queryVector[dimension] * matrix.values[rowStart + dimension];
    }
    ranked.push({ index: rowIndex, score: dotProduct });
  }
  ranked.sort((first, second) => second.score - first.score);
  return ranked.slice(0, howMany);
}

/** Classify a photo into ranked species / type / part suggestions. */
export async function classify(
  dataUrl: string,
  onProgress?: ProgressCallback,
): Promise<ClassificationResult> {
  const resources = await prepareClassifier(onProgress);
  const imageEmbedding = await embedImage(resources, dataUrl);

  const species = findTopMatches(imageEmbedding, resources.matrices.species, 5).map(
    ({ index, score }) => {
      const record = resources.species[index];
      return { label: `${record.nl} — ${record.latin}`, score, species: record } satisfies Suggestion;
    },
  );

  const type = findTopMatches(imageEmbedding, resources.matrices.type, 3).map(({ index, score }) => ({
    label: labels.type[index].nl,
    value: labels.type[index].value,
    score,
  }));

  const part = findTopMatches(imageEmbedding, resources.matrices.part, 3).map(({ index, score }) => ({
    label: labels.part[index].nl,
    value: labels.part[index].value,
    score,
  }));

  return { species, type, part };
}
