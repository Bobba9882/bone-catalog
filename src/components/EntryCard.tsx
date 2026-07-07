import labels from "../data/labels.json";
import { dutchLabelFor } from "../lib/labels";
import type { Entry } from "../types";

interface Props {
  entry: Entry;
  onOpen: (entry: Entry) => void;
}

export default function EntryCard({ entry, onOpen }: Props) {
  return (
    <button className="card" onClick={() => onOpen(entry)}>
      <img src={entry.photo} alt={entry.nameNl} />
      <div className="body">
        <div className="nl">{entry.nameNl || "—"}</div>
        <div className="latin">{entry.nameLatin}</div>
        <div className="badges">
          <span className="badge">{dutchLabelFor(labels.type, entry.type)}</span>
          <span className="badge">{dutchLabelFor(labels.part, entry.part)}</span>
          <span className="badge">{dutchLabelFor(labels.state, entry.state)}</span>
        </div>
        <div className="meta">{entry.classroom || "onbekend"}</div>
      </div>
    </button>
  );
}
