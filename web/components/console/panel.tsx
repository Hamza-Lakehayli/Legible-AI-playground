import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Framed console surface: title bar, body, optional footer.
 *
 * Theme-aware by design — place it under `[data-theme="console"]` for the
 * dark playground workspace, or pass surface="surface" for light preview
 * panels on marketing pages. This is the shared frame for the hero
 * preview and every playground demo (M3+).
 */
export function ConsolePanel({
  title,
  right,
  footer,
  surface = "page",
  children,
  className,
}: {
  title: ReactNode;
  right?: ReactNode;
  footer?: ReactNode;
  surface?: "page" | "surface";
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-panel border border-line",
        surface === "page" ? "bg-page" : "bg-surface",
        className,
      )}
    >
      <div className="flex h-10 shrink-0 items-center justify-between gap-3 border-b border-line px-4">
        <div className="min-w-0 truncate font-mono text-xs text-muted">{title}</div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
      {footer ? (
        <div className="shrink-0 border-t border-line px-4 py-2 font-mono text-[11px] text-muted">
          {footer}
        </div>
      ) : null}
    </div>
  );
}
