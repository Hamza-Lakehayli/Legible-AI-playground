import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Compact rectangular label with slight corner rounding — never a pill
 * (brief §5). Semantic variants are for execution and risk states only.
 */
export function Badge({
  variant = "neutral",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  variant?: "neutral" | "accent" | "success" | "warning" | "danger";
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-[3px] border px-1.5 font-mono text-[10px] font-medium tracking-wide uppercase",
        variant === "neutral" && "border-line bg-surface-muted text-muted",
        variant === "accent" && "border-accent/30 bg-accent-soft text-accent-ink",
        variant === "success" && "border-success/30 bg-success/10 text-success",
        variant === "warning" && "border-warning/30 bg-warning/10 text-warning",
        variant === "danger" && "border-danger/30 bg-danger/10 text-danger",
        className,
      )}
      {...props}
    />
  );
}
