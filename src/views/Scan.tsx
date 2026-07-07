import { useRef, useState } from "react";
import type { Draft } from "../App";
import { classify, prepareClassifier } from "../lib/classifier";
import { prepareImageFile } from "../lib/image";

interface Props {
  onClassified: (draft: Draft) => void;
}

type Phase = "idle" | "working" | "error";

export default function Scan({ onClassified }: Props) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow re-selecting the same file
    if (!file) return;

    setPhase("working");
    setStatusMessage("Foto verwerken...");
    try {
      const photo = await prepareImageFile(file);
      setPreviewPhoto(photo);
      setStatusMessage("Herkennen...");
      const result = await classify(photo, setStatusMessage);
      onClassified({ photo, ...result });
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Er ging iets mis.");
      setPhase("error");
      setPreviewPhoto(null);
    }
  };

  const openPicker = (inputRef: React.RefObject<HTMLInputElement>) => {
    void prepareClassifier(setStatusMessage); // warm up the model while the picker is open
    inputRef.current?.click();
  };

  return (
    <div>
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelected}
        hidden
      />
      <input ref={uploadInputRef} type="file" accept="image/*" onChange={handleFileSelected} hidden />

      {phase === "working" && previewPhoto ? (
        <div className="capture-frame">
          <img src={previewPhoto} alt="opname" />
          <div className="overlay">
            <div className="spinner" />
            <div className="msg">{statusMessage || "Bezig..."}</div>
          </div>
        </div>
      ) : (
        <div className="hero">
          <h2>Object toevoegen aan de catalogus</h2>
          <p>Maak of upload een foto van een skelet, taxidermie, schedel, ei of ander object om het vast te leggen.</p>
          <button className="btn" onClick={() => openPicker(cameraInputRef)}>
            Foto maken
          </button>
          <button className="btn secondary" onClick={() => openPicker(uploadInputRef)}>
            Foto uploaden
          </button>
        </div>
      )}

      {phase === "error" && <div className="status error">{statusMessage}</div>}

      {phase === "idle" && (
        <p className="hint">
          De eerste keer wordt het herkenningsmodel gedownload.
          <br />
          Daarna werkt herkennen lokaal in je browser.
        </p>
      )}
    </div>
  );
}
