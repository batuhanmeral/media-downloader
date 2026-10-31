"use client";

export interface SegmentOption<T extends string | number> {
  value: T;
  label: string;
  hint?: string;
}

interface SegmentedControlProps<T extends string | number> {
  name: string;
  legend: string;
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  mono?: boolean;
}

export function SegmentedControl<T extends string | number>({
  name,
  legend,
  options,
  value,
  onChange,
  mono = false,
}: SegmentedControlProps<T>) {
  return (
    <fieldset className="flex min-w-0 flex-col">
      <legend className="mb-1.5 text-xs text-muted">{legend}</legend>
      <div className="flex flex-wrap gap-1">
        {options.map((option) => (
          <label key={option.value}>
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={option.value === value}
              onChange={() => onChange(option.value)}
              className="peer sr-only"
            />
            <span
              className={`block cursor-pointer rounded-ui border border-fg px-3 py-1.5 text-ui peer-checked:bg-fg peer-checked:text-bg peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent ${mono ? "font-mono" : ""}`}
            >
              {option.label}
              {option.hint && (
                <>
                  {" "}
                  <span className="text-xs opacity-70">{option.hint}</span>
                </>
              )}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
