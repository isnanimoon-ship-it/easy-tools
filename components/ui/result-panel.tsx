import type { HTMLAttributes, ReactNode } from "react";

type ResultPanelProps = HTMLAttributes<HTMLDivElement> & {
  title: string;
  action?: ReactNode;
};

export function ResultPanel({
  title,
  action,
  children,
  className = "",
  ...props
}: ResultPanelProps) {
  return (
    <section
      aria-label={title}
      className={`rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 ${className}`}
      {...props}
    >
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="font-bold text-[var(--foreground)]">
          {title}
        </h2>
        {action}
      </div>
      <div aria-live="polite" className="text-[var(--foreground)]">
        {children}
      </div>
    </section>
  );
}
