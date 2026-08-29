import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
};

export function Button({
  className = "",
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  const variantClass =
    variant === "primary"
      ? "bg-[var(--primary-fill)] text-white hover:bg-[var(--primary-fill-hover)] disabled:bg-[var(--border)]"
      : "border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-muted)] disabled:text-[var(--text-muted)]";

  return (
    <button
      type={type}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-semibold transition-colors disabled:cursor-not-allowed ${variantClass} ${className}`}
      {...props}
    />
  );
}
