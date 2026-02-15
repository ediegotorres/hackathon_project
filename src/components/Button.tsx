import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variantClass: Record<Variant, string> = {
  primary:
    "border border-[var(--brand-strong)] bg-[linear-gradient(135deg,var(--brand)_0%,var(--brand-strong)_100%)] text-white shadow-sm hover:brightness-95 active:brightness-90",
  secondary:
    "border border-[var(--line)] bg-[var(--surface-strong)] text-[var(--ink)] hover:border-teal-300 hover:bg-teal-50 active:bg-teal-100",
  ghost:
    "border border-transparent bg-transparent text-[var(--ink-soft)] hover:bg-[var(--surface-strong)] hover:text-[var(--ink)] active:bg-[var(--line)]",
  danger: "bg-[var(--danger)] text-white hover:brightness-95 active:brightness-90",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: Variant;
}

export function Button({ children, className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex h-10 items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold motion-safe:transition-all motion-safe:duration-200 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-60 ${variantClass[variant]} ${className ?? ""}`}
      {...props}
    >
      {children}
    </button>
  );
}
