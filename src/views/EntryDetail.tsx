import labels from "../data/labels.json";
import { dutchLabelFor } from "../lib/labels";
import type { Entry } from "../types";

interface Props {
  entry: Entry;
  onEdit: () => void;
  onDelete: () => void;
  onBack: () => void;
}

export default function EntryDetail({ entry, onEdit, onDelete, onBack }: Props) {
  const addedOn = new Date(entry.createdAt).toLocaleDateString("nl-NL");

  const handleDelete = () => {
    if (confirm(`"${entry.nameNl || "dit item"}" verwijderen?`)) onDelete();
  };

  return (
    <div>
      <div className="photo-hero">
        <img src={entry.photo} alt={entry.nameNl} />
        <button className="retake" onClick={onBack}>
          Terug
        </button>
      </div>

      <div className="block">
        <div className="detail-name">{entry.nameNl || "—"}</div>
        <div className="match-latin">{entry.nameLatin}</div>
      </div>

      <dl className="detail-list">
        <div>
          <dt>Lokaal</dt>
          <dd>{entry.classroom || "onbekend"}</dd>
        </div>
        <div>
          <dt>Type</dt>
          <dd>{dutchLabelFor(labels.type, entry.type)}</dd>
        </div>
        <div>
          <dt>Onderdeel / groep</dt>
          <dd>{dutchLabelFor(labels.part, entry.part)}</dd>
        </div>
        <div>
          <dt>Staat</dt>
          <dd>{dutchLabelFor(labels.state, entry.state)}</dd>
        </div>
        <div>
          <dt>Toegevoegd</dt>
          <dd>{addedOn}</dd>
        </div>
      </dl>

      <div style={{ height: 80 }} />

      <div className="action-bar">
        <button className="btn danger" onClick={handleDelete}>
          Verwijderen
        </button>
        <button className="btn" onClick={onEdit}>
          Bewerken
        </button>
      </div>
    </div>
  );
}
