import type { SelectHTMLAttributes } from "react";

interface SelectOption {
  label: string;
  value: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: SelectOption[];
  error?: string;
  helperText?: string;
}

export function Select({ label, id, options, error, helperText, className, ...props }: SelectProps) {
  const selectId = id ?? props.name ?? label.toLowerCase().replace(/\s+/g, "-");
  const helperId = `${selectId}-helper`;
  const errorId = `${selectId}-error`;
  const describedBy = error ? errorId : helperText ? helperId : undefined;

  return (
    <label htmlFor={selectId} className="block space-y-1.5">
      <span className="text-sm font-medium text-[var(--ink-soft)]">{label}</span>
      <select
        id={selectId}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className={`w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-sm text-[var(--ink)] motion-safe:transition-colors motion-safe:duration-200 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] ${error ? "border-rose-400" : "focus:border-teal-400"} ${className ?? ""}`}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {!error && helperText ? (
        <p id={helperId} className="text-xs text-[var(--ink-soft)]">
          {helperText}
        </p>
      ) : null}
      {error && (
        <p id={errorId} role="alert" className="text-xs font-medium text-[var(--danger)]">
          {error}
        </p>
      )}
    </label>
  );
}
