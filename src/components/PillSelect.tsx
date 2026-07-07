interface Option {
  value: string;
  label: string;
}

interface Props {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  /** The value the model rated highest, marked so it stays visible after the user changes the selection. */
  suggestedValue?: string;
}

/** A tap-to-select segmented control — clearer on a phone than a dropdown. */
export default function PillSelect({ options, value, onChange, suggestedValue }: Props) {
  return (
    <div className="pills">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={"pill" + (option.value === value ? " active" : "")}
          onClick={() => onChange(option.value)}
        >
          {option.label}
          {option.value === suggestedValue && <span className="star">✨</span>}
        </button>
      ))}
    </div>
  );
}
