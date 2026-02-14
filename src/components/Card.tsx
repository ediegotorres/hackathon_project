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
      className={`rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm transition hover:shadow-md ${className ?? ""}`}
    >
      {(title || subtitle) && (
        <header className="mb-4">
          {title && <h2 className="text-lg font-bold tracking-tight">{title}</h2>}
          {subtitle && <p className="text-sm text-[var(--muted)]">{subtitle}</p>}
        </header>
      )}
      {children}
    </section>
  );
}
