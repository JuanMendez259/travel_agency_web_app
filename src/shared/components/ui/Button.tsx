import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger"
  | "icon";

type Size = "sm" | "md" | "lg" | "none";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: Size;
  loading?: boolean;
  children?: ReactNode;
};

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-primary-container text-white shadow-layer-1 hover:bg-primary active:scale-[0.98]",
  secondary:
    "bg-mint text-primary-container hover:bg-secondary-container/50 active:scale-[0.98]",
  outline:
    "border-[1.5px] border-input-border bg-white text-on-surface hover:border-emerald hover:text-primary-container active:scale-[0.98]",
  ghost: "bg-transparent text-primary-container hover:bg-mint active:scale-[0.98]",
  danger:
    "bg-error text-white shadow-layer-1 hover:bg-[#93000a] active:scale-[0.98]",
  icon: "bg-white/90 text-primary-container shadow-layer-2 backdrop-blur-[8px]",
};

const sizes: Record<Size, string> = {
  sm: "h-10 rounded-[10px] px-3 text-label-md",
  md: "h-12 rounded-[12px] px-4 text-label-md",
  lg: "h-[52px] rounded-button px-5 text-label-lg",
  none: "",
};

export function buttonClasses({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: Size;
  className?: string;
} = {}) {
  if (variant === "icon") {
    return cn(
      "inline-flex size-11 shrink-0 items-center justify-center rounded-[12px] transition disabled:cursor-not-allowed disabled:opacity-60",
      variants.icon,
      className,
    );
  }
  return cn(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
    sizes[size],
    variants[variant],
    className,
  );
}

export function Button({
  variant = "primary",
  size = "md",
  loading,
  className,
  children,
  type = "button",
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={buttonClasses({ variant, size, className })}
      {...props}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
