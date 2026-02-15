export function LoadingOverlay({ show, label }: { show: boolean; label?: string }) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-6 py-5 shadow-xl">
        <div className="flex items-center gap-3">
          <span className="h-4 w-4 rounded-full border-2 border-[var(--brand)] border-t-transparent motion-safe:animate-spin motion-reduce:animate-none" />
          <p className="text-sm font-medium text-[var(--ink)]">{label ?? "Loading..."}</p>
        </div>
      </div>
    </div>
  );
}
