import type { ReactNode } from "react";

export function Card({
  title,
  subtitle,
  children,
  className,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[0_8px_30px_rgba(15,23,42,0.06)] motion-safe:transition-all motion-safe:duration-200 motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-[0_16px_36px_rgba(15,23,42,0.08)] motion-reduce:transition-none ${className ?? ""}`}
    >
      {(title || subtitle) && (
        <header className="mb-4 space-y-1">
          {title && <h2 className="text-lg font-bold tracking-tight">{title}</h2>}
          {subtitle && <p className="text-sm text-[var(--ink-soft)]">{subtitle}</p>}
        </header>
      )}
      {children}
    </section>
  );
}
