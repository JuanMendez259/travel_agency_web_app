import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
  trailing?: ReactNode;
};

export function TextField({
  label,
  error,
  hint,
  trailing,
  className,
  id,
  ...props
}: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;

  return (
    <label className="block space-y-1.5" htmlFor={inputId}>
      <span className="text-label-md text-on-surface-variant">{label}</span>
      <span className="relative block">
        <input
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className={cn(
            "h-[52px] w-full rounded-[12px] border-[1.5px] border-input-border bg-white px-4 text-title-md text-on-surface outline-none transition placeholder:text-outline",
            "focus:border-emerald focus:shadow-[0_0_0_3px_rgba(16,185,129,0.15)]",
            error && "border-error focus:border-error focus:shadow-[0_0_0_3px_rgba(186,26,26,0.15)]",
            trailing && "pr-12",
            className,
          )}
          {...props}
        />
        {trailing ? (
          <span className="absolute inset-y-0 right-1 flex items-center">{trailing}</span>
        ) : null}
      </span>
      {error ? (
        <span id={errorId} className="text-body-sm text-error">
          {error}
        </span>
      ) : hint ? (
        <span id={hintId} className="text-body-sm text-on-surface-variant">
          {hint}
        </span>
      ) : null}
    </label>
  );
}
