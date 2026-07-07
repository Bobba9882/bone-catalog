/** A single species record from the shipped taxonomy (public/species.json). */
export interface Species {
  latin: string; // scientific name, e.g. "Vulpes vulpes"
  nl: string; // Dutch common name, e.g. "vos"
  en: string; // English common name (used for the CLIP prompt), may be ""
  group: string; // "mammal" | "bird" | ... (matches a labels.json part value)
}

/** The user-editable fields of a catalog item (shared by create and edit). */
export interface EntryFields {
  classroom: string;
  type: string; // labels.json -> type value
  part: string; // labels.json -> part value
  nameNl: string;
  nameLatin: string;
  state: string; // labels.json -> state value
}

/** One catalogued item. Persisted to localStorage and JSON export. */
export interface Entry extends EntryFields {
  id: string;
  photo: string; // downscaled JPEG data URL
  createdAt: string; // ISO timestamp
}

/** A ranked suggestion produced by the classifier. */
export interface Suggestion {
  label: string; // human-readable text shown on the chip
  score: number; // cosine similarity, 0..1
  /** Extra payload used when the suggestion is a species. */
  species?: Species;
  /** The stored value this maps to (labels.json value) for type/part chips. */
  value?: string;
}
