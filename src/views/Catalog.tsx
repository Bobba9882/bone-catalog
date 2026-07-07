import { useMemo, useRef, useState } from "react";
import EntryCard from "../components/EntryCard";
import labels from "../data/labels.json";
import { exportEntries, parseImportedFile } from "../lib/storage";
import type { Entry } from "../types";

interface Props {
  entries: Entry[];
  onOpen: (entry: Entry) => void;
  onImport: (entries: Entry[]) => void;
}

const ANY = "";

export default function Catalog({ entries, onOpen, onImport }: Props) {
  const importInputRef = useRef<HTMLInputElement>(null);
  const [searchText, setSearchText] = useState("");
  const [classroomFilter, setClassroomFilter] = useState(ANY);
  const [typeFilter, setTypeFilter] = useState(ANY);
  const [partFilter, setPartFilter] = useState(ANY);
  const [stateFilter, setStateFilter] = useState(ANY);

  const classrooms = useMemo(
    () => [...new Set(entries.map((entry) => entry.classroom).filter(Boolean))].sort(),
    [entries],
  );

  const filteredEntries = useMemo(() => {
    const needle = searchText.trim().toLowerCase();
    return entries.filter(
      (entry) =>
        (classroomFilter === ANY || entry.classroom === classroomFilter) &&
        (typeFilter === ANY || entry.type === typeFilter) &&
        (partFilter === ANY || entry.part === partFilter) &&
        (stateFilter === ANY || entry.state === stateFilter) &&
        (needle === "" ||
          entry.nameNl.toLowerCase().includes(needle) ||
          entry.nameLatin.toLowerCase().includes(needle)),
    );
  }, [entries, searchText, classroomFilter, typeFilter, partFilter, stateFilter]);

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      onImport(await parseImportedFile(file));
    } catch (error) {
      alert(error instanceof Error ? error.message : "Import mislukt.");
    }
  };

  if (entries.length === 0) {
    return (
      <div className="empty">
        <p>Nog geen items in de catalogus.</p>
        <p>Ga naar Scannen om je eerste vondst toe te voegen.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="catalog-head">
        <h2>Catalogus</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn ghost" style={{ width: "auto", padding: "8px 12px" }} onClick={() => exportEntries(entries)}>
            Export
          </button>
          <button
            className="btn ghost"
            style={{ width: "auto", padding: "8px 12px" }}
            onClick={() => importInputRef.current?.click()}
          >
            Import
          </button>
          <input ref={importInputRef} type="file" accept="application/json" hidden onChange={handleImport} />
        </div>
      </div>

      <input
        className="search-input"
        placeholder="Zoek op naam (NL of Latijn)..."
        value={searchText}
        onChange={(event) => setSearchText(event.target.value)}
      />

      <div className="filter-row">
        <select
          className={classroomFilter ? "on" : ""}
          value={classroomFilter}
          onChange={(event) => setClassroomFilter(event.target.value)}
        >
          <option value={ANY}>Alle lokalen</option>
          {classrooms.map((room) => (
            <option key={room} value={room}>
              {room}
            </option>
          ))}
        </select>
        <select className={typeFilter ? "on" : ""} value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
          <option value={ANY}>Alle types</option>
          {labels.type.map((option) => (
            <option key={option.value} value={option.value}>
              {option.nl}
            </option>
          ))}
        </select>
        <select className={partFilter ? "on" : ""} value={partFilter} onChange={(event) => setPartFilter(event.target.value)}>
          <option value={ANY}>Alle onderdelen</option>
          {labels.part.map((option) => (
            <option key={option.value} value={option.value}>
              {option.nl}
            </option>
          ))}
        </select>
        <select className={stateFilter ? "on" : ""} value={stateFilter} onChange={(event) => setStateFilter(event.target.value)}>
          <option value={ANY}>Alle staten</option>
          {labels.state.map((option) => (
            <option key={option.value} value={option.value}>
              {option.nl}
            </option>
          ))}
        </select>
      </div>

      <div className="count">
        {filteredEntries.length} van {entries.length} items
      </div>

      {filteredEntries.length === 0 ? (
        <div className="empty">
          <p>Geen items gevonden met deze filters.</p>
        </div>
      ) : (
        <div className="grid">
          {filteredEntries.map((entry) => (
            <EntryCard key={entry.id} entry={entry} onOpen={onOpen} />
          ))}
        </div>
      )}
    </div>
  );
}
