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

  return (
    <label htmlFor={selectId} className="block space-y-1.5">
      <span className="text-sm font-medium text-[var(--muted)]">{label}</span>
      <select
        id={selectId}
        className={`w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)] focus-visible:outline-none ${className ?? ""}`}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {!error && helperText ? <p className="text-xs text-[var(--muted)]">{helperText}</p> : null}
      {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
    </label>
  );
}
