export { TextField } from "@/shared/components/ui/TextField";

import { useId, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: string;
  hint?: string;
};

export function TextArea({ label, error, hint, className, id, ...props }: TextAreaProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const messageId = `${inputId}-message`;
  return (
    <label className="block space-y-1.5" htmlFor={inputId}>
      <span className="text-label-md text-on-surface-variant">{label}</span>
      <textarea
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={error || hint ? messageId : undefined}
        className={cn(
          "min-h-24 w-full resize-y rounded-[12px] border-[1.5px] border-input-border bg-white px-4 py-3 text-body-md text-on-surface outline-none transition placeholder:text-outline",
          "focus:border-emerald focus:shadow-[0_0_0_3px_rgba(16,185,129,0.15)]",
          error && "border-error focus:border-error",
          className,
        )}
        {...props}
      />
      {error ? (
        <span id={messageId} className="block text-body-sm text-error">
          {error}
        </span>
      ) : hint ? (
        <span id={messageId} className="block text-body-sm text-on-surface-variant">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
};

export function Select({ label, error, hint, className, id, children, ...props }: SelectProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const messageId = `${inputId}-message`;
  return (
    <label className="block space-y-1.5" htmlFor={inputId}>
      <span className="text-label-md text-on-surface-variant">{label}</span>
      <select
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={error || hint ? messageId : undefined}
        className={cn(
          "h-[52px] w-full rounded-[12px] border-[1.5px] border-input-border bg-white px-4 text-title-md text-on-surface outline-none transition",
          "focus:border-emerald focus:shadow-[0_0_0_3px_rgba(16,185,129,0.15)]",
          error && "border-error",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      {error ? (
        <span id={messageId} className="block text-body-sm text-error">
          {error}
        </span>
      ) : hint ? (
        <span id={messageId} className="block text-body-sm text-on-surface-variant">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

type SwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  id?: string;
  compact?: boolean;
};

export function Switch({ checked, onChange, label, description, disabled, id, compact }: SwitchProps) {
  const generatedId = useId();
  const switchId = id ?? generatedId;

  if (compact) {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-50",
          checked ? "bg-primary-container" : "bg-surface-container-highest",
        )}
      >
        <span
          className={cn(
            "absolute top-1 size-5 rounded-full bg-white shadow transition-all",
            checked ? "left-6" : "left-1",
          )}
        />
      </button>
    );
  }

  return (
    <div className="flex items-start justify-between gap-4">
      <label htmlFor={switchId} className="min-w-0 cursor-pointer">
        <span className="block text-title-md text-on-surface">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-body-sm text-on-surface-variant">{description}</span>
        ) : null}
      </label>
      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition disabled:opacity-50",
          checked ? "bg-primary-container" : "bg-surface-container-highest",
        )}
      >
        <span
          className={cn(
            "absolute top-1 size-5 rounded-full bg-white shadow transition-all",
            checked ? "left-6" : "left-1",
          )}
        />
      </button>
    </div>
  );
}
