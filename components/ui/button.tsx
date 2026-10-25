import Link from "next/link";
import type { ComponentProps } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "link";
type Size = "md" | "sm";

const base =
  "inline-flex items-center justify-center gap-2 rounded-sm font-medium whitespace-nowrap transition-colors duration-150 ease-out disabled:pointer-events-none disabled:opacity-55 aria-disabled:pointer-events-none aria-disabled:opacity-55";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-on-primary hover:bg-primary-hover",
  secondary: "border border-line-strong bg-transparent text-fg hover:border-fg",
  ghost: "bg-transparent text-fg hover:bg-subtle",
  danger: "bg-error text-ink-50 hover:brightness-110",
  link: "text-accent underline decoration-1 underline-offset-4 hover:decoration-2",
};

// md keeps the 44 × 44 px touch target; sm is for dense admin tables only.
const sizes: Record<Size, string> = {
  md: "min-h-11 px-5 text-base",
  sm: "min-h-9 px-3 text-sm",
};

export function buttonClasses(variant: Variant = "primary", size: Size = "md", extra = ""): string {
  const sizing = variant === "link" ? "" : sizes[size];
  return [base, variants[variant], sizing, extra].filter(Boolean).join(" ");
}

type ButtonProps = ComponentProps<"button"> & { variant?: Variant; size?: Size };

export function Button({ variant, size, className = "", type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClasses(variant, size, className)} {...props} />;
}

type ButtonLinkProps = ComponentProps<typeof Link> & { variant?: Variant; size?: Size };

export function ButtonLink({ variant, size, className = "", ...props }: ButtonLinkProps) {
  return <Link className={buttonClasses(variant, size, className)} {...props} />;
}
