import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Shared text input: 40px control, visible border, cobalt focus ring,
 * danger treatment when aria-invalid is set (driven by form state).
 * The single input style for auth, playground forms, and dashboard
 * filters — square-cornered per the brief.
 */
export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-control border border-line bg-surface px-3 text-sm text-ink",
        "placeholder:text-muted transition-colors",
        "focus:border-accent focus:outline-2 focus:-outline-offset-2 focus:outline-accent",
        "aria-[invalid=true]:border-danger aria-[invalid=true]:focus:outline-danger",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}
