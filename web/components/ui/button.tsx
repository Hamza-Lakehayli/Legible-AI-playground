import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Editorial buttons per the design brief: rectangular, 4–6px radius,
 * modest height, no pills. Shared class factory so <button> and <Link>
 * render identically.
 */
export function buttonVariants({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md";
  className?: string;
} = {}): string {
  return cn(
    "inline-flex select-none items-center justify-center gap-2 rounded-control font-medium transition-colors",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
    "disabled:pointer-events-none disabled:opacity-50",
    size === "sm" ? "h-8 px-3 text-[13px]" : "h-10 px-4 text-sm",
    variant === "primary" && "bg-accent text-white hover:bg-accent-hover",
    variant === "secondary" &&
      "border border-line bg-surface text-ink hover:border-muted hover:bg-surface-muted",
    variant === "ghost" && "text-ink hover:bg-surface-muted",
    className,
  );
}

export function Button({
  variant,
  size,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md";
}) {
  return (
    <button className={buttonVariants({ variant, size, className })} {...props} />
  );
}

export function ButtonLink({
  variant,
  size,
  className,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md";
}) {
  return (
    <a className={buttonVariants({ variant, size, className })} {...props} />
  );
}
