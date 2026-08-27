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
      <label htmlFor={id} className="mb-2 block font-semibold text-slate-800">
        {label}
      </label>
      {description ? (
        <p id={descriptionId} className="mb-2 text-sm text-slate-500">
          {description}
        </p>
      ) : null}
      <input
        id={id}
        aria-describedby={descriptionId}
        className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-950 placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-600"
        {...props}
      />
    </div>
  );
}
