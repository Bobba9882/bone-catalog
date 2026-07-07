import { useMemo, useState } from "react";
import PillSelect from "../components/PillSelect";
import labels from "../data/labels.json";
import type { ClassificationResult } from "../lib/classifier";
import type { EntryFields, Suggestion } from "../types";

interface Props {
  photo: string;
  initialFields: EntryFields;
  /** Model suggestions — only present when creating from a scan, not when editing. */
  suggestions?: ClassificationResult;
  classrooms: string[];
  submitLabel: string;
  onSubmit: (fields: EntryFields) => void;
  onCancel: () => void;
}

const toPillOptions = (options: { value: string; nl: string }[]) =>
  options.map((option) => ({ value: option.value, label: option.nl }));

/**
 * Turn the raw cosine-similarity scores into relative confidence percentages.
 * Cosine differences between top matches are small, so a low softmax temperature
 * spreads them into numbers that read meaningfully to a person.
 */
function toConfidences(suggestions: Suggestion[]): number[] {
  const temperature = 0.04;
  const weights = suggestions.map((suggestion) => Math.exp(suggestion.score / temperature));
  const total = weights.reduce((sum, weight) => sum + weight, 0) || 1;
  return weights.map((weight) => weight / total);
}

export default function EntryForm({
  photo,
  initialFields,
  suggestions,
  classrooms,
  submitLabel,
  onSubmit,
  onCancel,
}: Props) {
  const [dutchName, setDutchName] = useState(initialFields.nameNl);
  const [latinName, setLatinName] = useState(initialFields.nameLatin);
  const [type, setType] = useState(initialFields.type);
  const [part, setPart] = useState(initialFields.part);
  const [classroom, setClassroom] = useState(initialFields.classroom);
  const [condition, setCondition] = useState(initialFields.state);

  const speciesSuggestions = suggestions?.species ?? [];
  const confidences = useMemo(() => toConfidences(speciesSuggestions), [speciesSuggestions]);
  const bestMatch = speciesSuggestions[0];
  const alternatives = speciesSuggestions.slice(1);

  const chooseSpecies = (suggestion: Suggestion) => {
    if (!suggestion.species) return;
    setDutchName(suggestion.species.nl);
    setLatinName(suggestion.species.latin);
  };

  const isChosen = (suggestion: Suggestion) => suggestion.species?.latin === latinName;

  const handleSubmit = () => {
    onSubmit({
      classroom: classroom.trim(),
      type,
      part,
      nameNl: dutchName.trim(),
      nameLatin: latinName.trim(),
      state: condition,
    });
  };

  return (
    <div>
      <div className="photo-hero">
        <img src={photo} alt="opname" />
        {suggestions && (
          <button className="retake" onClick={onCancel}>
            Opnieuw
          </button>
        )}
      </div>

      {bestMatch?.species && (
        <div className="block">
          <p className="block-label">Beste match</p>
          <button
            className="match-card"
            style={{ display: "block", width: "100%", textAlign: "left", cursor: "pointer" }}
            onClick={() => chooseSpecies(bestMatch)}
          >
            <div className="match-top">
              <div>
                <div className="match-name">{bestMatch.species.nl}</div>
                <div className="match-latin">{bestMatch.species.latin}</div>
              </div>
              <div className="match-pct">{Math.round(confidences[0] * 100)}%</div>
            </div>
            <div className="confidence">
              <span style={{ width: `${Math.round(confidences[0] * 100)}%` }} />
            </div>
          </button>

          {alternatives.length > 0 && (
            <>
              <p className="block-label" style={{ marginTop: 16 }}>
                Andere mogelijkheden
              </p>
              <div className="alts">
                {alternatives.map((suggestion, index) => (
                  <button
                    key={suggestion.label}
                    className="alt"
                    style={isChosen(suggestion) ? { borderColor: "var(--accent)" } : undefined}
                    onClick={() => chooseSpecies(suggestion)}
                  >
                    <div className="alt-name">{suggestion.species?.nl}</div>
                    <div className="alt-latin">{suggestion.species?.latin}</div>
                    <div className="alt-pct">{Math.round(confidences[index + 1] * 100)}%</div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <hr className="subtle-divider" />
      <div className="two-col" style={{ marginTop: 12 }}>
        <label className="field" style={{ marginTop: 0 }}>
          <span className="field-label">Nederlandse naam</span>
          <input value={dutchName} onChange={(event) => setDutchName(event.target.value)} placeholder="bv. vos" />
        </label>
        <label className="field" style={{ marginTop: 0 }}>
          <span className="field-label">Latijnse naam</span>
          <input
            value={latinName}
            onChange={(event) => setLatinName(event.target.value)}
            placeholder="bv. Vulpes vulpes"
          />
        </label>
      </div>

      <div className="block">
        <p className="block-label">Type</p>
        <PillSelect
          options={toPillOptions(labels.type)}
          value={type}
          onChange={setType}
          suggestedValue={suggestions?.type[0]?.value}
        />
      </div>

      <div className="block">
        <p className="block-label">Onderdeel / groep</p>
        <PillSelect
          options={toPillOptions(labels.part)}
          value={part}
          onChange={setPart}
          suggestedValue={suggestions?.part[0]?.value}
        />
      </div>

      <div className="block">
        <p className="block-label">Staat</p>
        <PillSelect options={toPillOptions(labels.state)} value={condition} onChange={setCondition} />
      </div>

      <label className="field">
        <span className="field-label">Lokaal / vindplaats</span>
        <input
          list="classrooms"
          value={classroom}
          onChange={(event) => setClassroom(event.target.value)}
          placeholder="bv. Lokaal B12"
        />
        <datalist id="classrooms">
          {classrooms.map((room) => (
            <option key={room} value={room} />
          ))}
        </datalist>
      </label>

      {/* Spacer so the sticky action bar never covers the last field. */}
      <div style={{ height: 80 }} />

      <div className="action-bar">
        <button className="btn secondary" onClick={onCancel}>
          Annuleren
        </button>
        <button className="btn" onClick={handleSubmit}>
          {submitLabel}
        </button>
      </div>
    </div>
  );
}
