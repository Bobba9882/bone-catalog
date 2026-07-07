// Catalog persistence. Proof-of-concept simple: the whole catalog lives in
// localStorage and can be exported to / imported from a JSON file for backup and
// for moving between devices.
//
// Reliability note (principle 4): photos are stored inline as data URLs, so a
// large catalog can exceed the ~5 MB localStorage quota. We surface that failure
// rather than swallowing it, so data loss never happens silently.

import type { Entry } from "../types";

const STORAGE_KEY = "bone-catalog:entries";

export class StorageFullError extends Error {}

export function loadEntries(): Entry[] {
  const serialized = localStorage.getItem(STORAGE_KEY);
  if (!serialized) return [];
  try {
    return JSON.parse(serialized) as Entry[];
  } catch {
    console.error("Kon de opgeslagen catalogus niet lezen.");
    return [];
  }
}

export function saveEntries(entries: Entry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    throw new StorageFullError("De opslag is vol. Exporteer een back-up en verwijder items.");
  }
}

export function createEntryId(): string {
  // crypto.randomUUID only exists in a secure context (HTTPS or localhost), so
  // it is missing when the app is opened on a phone over plain HTTP. Fall back
  // to a good-enough unique id in that case.
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Trigger a download of the catalog as a JSON file. */
export function exportEntries(entries: Entry[]): void {
  const blob = new Blob([JSON.stringify(entries, null, 2)], { type: "application/json" });
  const objectUrl = URL.createObjectURL(blob);
  const downloadLink = document.createElement("a");
  downloadLink.href = objectUrl;
  downloadLink.download = `botten-catalogus-${new Date().toISOString().slice(0, 10)}.json`;
  downloadLink.click();
  URL.revokeObjectURL(objectUrl);
}

/** Parse an imported JSON file into entries (throws if the shape is wrong). */
export async function parseImportedFile(file: File): Promise<Entry[]> {
  const parsed = JSON.parse(await file.text());
  if (!Array.isArray(parsed)) throw new Error("Bestand bevat geen lijst met items.");
  return parsed as Entry[];
}
