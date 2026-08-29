import type { InputHTMLAttributes } from "react";

type TextInputProps = InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  description?: string;
};

export function TextInput({
  id,
  label,
  description,
  className = "",
  ...props
}: TextInputProps) {
  const descriptionId = description ? `${id}-description` : undefined;

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-2 block font-semibold text-[var(--foreground)]">
        {label}
      </label>
      {description ? (
        <p id={descriptionId} className="mb-2 text-sm text-[var(--text-muted)]">
          {description}
        </p>
      ) : null}
      <input
        id={id}
        aria-describedby={descriptionId}
        className="min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-[var(--foreground)] placeholder:text-[var(--text-muted)] hover:border-[var(--border)] focus:border-[var(--primary)]"
        {...props}
      />
    </div>
  );
}
