import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variantClass: Record<Variant, string> = {
  primary: "bg-[var(--brand)] text-white hover:brightness-95 active:brightness-90",
  secondary:
    "border border-[var(--line)] bg-[var(--surface-strong)] text-[var(--ink)] hover:bg-[var(--line)] active:bg-slate-200",
  ghost:
    "bg-transparent text-[var(--ink)] hover:bg-[var(--surface-strong)] hover:text-[var(--ink)] active:bg-[var(--line)]",
  danger: "bg-[var(--danger)] text-white hover:brightness-95 active:brightness-90",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: Variant;
}

export function Button({ children, className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex h-10 items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${variantClass[variant]} ${className ?? ""}`}
      {...props}
    >
      {children}
    </button>
  );
}
