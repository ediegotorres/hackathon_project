import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
  secondaryAction,
  icon,
  compact = false,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  secondaryAction?: ReactNode;
  icon?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-dashed border-[var(--line)] bg-[linear-gradient(180deg,#ffffff_0%,#f8faf9_100%)] px-6 text-center ${
        compact ? "py-5" : "py-8"
      }`}
    >
      {icon ? <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-strong)]">{icon}</div> : null}
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-[var(--muted)]">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
      {secondaryAction ? <div className="mt-2 text-sm">{secondaryAction}</div> : null}
    </div>
  );
}
