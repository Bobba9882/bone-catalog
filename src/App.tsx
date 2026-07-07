import { useEffect, useMemo, useState } from "react";
import type { ClassificationResult } from "./lib/classifier";
import labels from "./data/labels.json";
import { createEntryId, loadEntries, saveEntries } from "./lib/storage";
import type { Entry, EntryFields } from "./types";
import Scan from "./views/Scan";
import EntryForm from "./views/EntryForm";
import EntryDetail from "./views/EntryDetail";
import Catalog from "./views/Catalog";

export interface Draft extends ClassificationResult {
  photo: string;
}

type Tab = "scan" | "catalog";

/** Prefill a new entry's fields from the scan's top suggestions. */
function initialFieldsFromDraft(draft: Draft): EntryFields {
  const topSpecies = draft.species[0]?.species;
  return {
    classroom: "",
    type: draft.type[0]?.value ?? labels.type[0].value,
    part: draft.part[0]?.value ?? labels.part[0].value,
    nameNl: topSpecies?.nl ?? "",
    nameLatin: topSpecies?.latin ?? "",
    state: "good",
  };
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("scan");
  const [entries, setEntries] = useState<Entry[]>(() => loadEntries());
  const [draft, setDraft] = useState<Draft | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);

  // Persist on every change. If storage is full, surface it (fail fast) so the
  // user can export a backup instead of losing data silently.
  useEffect(() => {
    try {
      saveEntries(entries);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Opslaan mislukt.");
    }
  }, [entries]);

  const classrooms = useMemo(
    () => [...new Set(entries.map((entry) => entry.classroom).filter(Boolean))].sort(),
    [entries],
  );

  const createEntry = (fields: EntryFields) => {
    if (!draft) return;
    const entry: Entry = { id: createEntryId(), photo: draft.photo, createdAt: new Date().toISOString(), ...fields };
    setEntries((previous) => [entry, ...previous]);
    setDraft(null);
    setActiveTab("catalog");
  };

  const updateEntry = (fields: EntryFields) => {
    if (!editingEntry) return;
    const updated: Entry = { ...editingEntry, ...fields };
    setEntries((previous) => previous.map((entry) => (entry.id === updated.id ? updated : entry)));
    setEditingEntry(null);
    setSelectedEntry(updated); // return to the detail view, now showing the edits
  };

  const deleteEntry = (id: string) => {
    setEntries((previous) => previous.filter((entry) => entry.id !== id));
    setSelectedEntry(null);
    setEditingEntry(null);
  };

  // Switching tabs always closes any open form/detail overlay.
  const goToTab = (tab: Tab) => {
    setDraft(null);
    setSelectedEntry(null);
    setEditingEntry(null);
    setActiveTab(tab);
  };

  const body = draft ? (
    <EntryForm
      photo={draft.photo}
      initialFields={initialFieldsFromDraft(draft)}
      suggestions={draft}
      classrooms={classrooms}
      submitLabel="Opslaan in catalogus"
      onSubmit={createEntry}
      onCancel={() => setDraft(null)}
    />
  ) : editingEntry ? (
    <EntryForm
      photo={editingEntry.photo}
      initialFields={editingEntry}
      classrooms={classrooms}
      submitLabel="Wijzigingen opslaan"
      onSubmit={updateEntry}
      onCancel={() => setEditingEntry(null)}
    />
  ) : selectedEntry ? (
    <EntryDetail
      entry={selectedEntry}
      onEdit={() => setEditingEntry(selectedEntry)}
      onDelete={() => deleteEntry(selectedEntry.id)}
      onBack={() => setSelectedEntry(null)}
    />
  ) : activeTab === "scan" ? (
    <Scan onClassified={setDraft} />
  ) : (
    <Catalog entries={entries} onOpen={setSelectedEntry} onImport={setEntries} />
  );

  return (
    <div className="app">
      <header>
        <h1>Botten &amp; Skeletten Catalogus</h1>
        <p>Fotografeer · benoem · catalogiseer</p>
      </header>

      {body}

      <nav className="tabs">
        <button className={activeTab === "scan" ? "active" : ""} onClick={() => goToTab("scan")}>
          Scannen
        </button>
        <button className={activeTab === "catalog" ? "active" : ""} onClick={() => goToTab("catalog")}>
          Catalogus ({entries.length})
        </button>
      </nav>
    </div>
  );
}
