// Small helper to turn a stored value (e.g. "skeleton") into its Dutch label
// (e.g. "Skelet"), used by the catalog card and the detail view.

type LabelOption = { value: string; nl: string };

export function dutchLabelFor(options: LabelOption[], value: string): string {
  return options.find((option) => option.value === value)?.nl ?? value;
}
