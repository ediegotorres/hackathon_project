import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
}

export function Input({ label, id, error, helperText, className, ...props }: InputProps) {
  const inputId = id ?? props.name ?? label.toLowerCase().replace(/\s+/g, "-");
  const helperId = `${inputId}-helper`;
  const errorId = `${inputId}-error`;
  const describedBy = error ? errorId : helperText ? helperId : undefined;

  return (
    <label htmlFor={inputId} className="block space-y-1.5">
      <span className="text-sm font-medium text-[var(--ink-soft)]">{label}</span>
      <input
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className={`w-full rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-2.5 text-sm text-[var(--ink)] placeholder:text-[var(--muted)] motion-safe:transition-colors motion-safe:duration-200 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] ${error ? "border-rose-400" : "focus:border-teal-400"} ${className ?? ""}`}
        {...props}
      />
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
