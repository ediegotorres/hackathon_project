import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
}

export function Input({ label, id, error, helperText, className, ...props }: InputProps) {
  const inputId = id ?? props.name ?? label.toLowerCase().replace(/\s+/g, "-");

  return (
    <label htmlFor={inputId} className="block space-y-1.5">
      <span className="text-sm font-medium text-[var(--muted)]">{label}</span>
      <input
        id={inputId}
        className={`w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-sm text-[var(--ink)] outline-none transition placeholder:text-slate-400 focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)] focus-visible:outline-none ${className ?? ""}`}
        {...props}
      />
      {!error && helperText ? <p className="text-xs text-[var(--muted)]">{helperText}</p> : null}
      {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
    </label>
  );
}
