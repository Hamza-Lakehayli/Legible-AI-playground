import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type EventTone = "accent" | "ink" | "muted" | "warning" | "success" | "danger";

const toneClasses: Record<EventTone, string> = {
  accent: "text-accent",
  ink: "text-ink",
  muted: "text-muted",
  warning: "text-warning",
  success: "text-success",
  danger: "text-danger",
};

/**
 * One execution-trace row: timestamp, state icon, event type, detail.
 * The single vocabulary for run traces — the hero preview, the playground
 * inspector, and the dashboard run detail all render this component.
 */
export function ConsoleEventRow({
  time,
  type,
  tone = "ink",
  icon: Icon,
  detail,
  sub,
  right,
  highlight = false,
  className,
}: {
  time: string;
  type: string;
  tone?: EventTone;
  icon: LucideIcon;
  detail: ReactNode;
  sub?: ReactNode;
  right?: ReactNode;
  /** Attention treatment (amber tint) for paused/approval rows. */
  highlight?: boolean;
  className?: string;
}) {
  return (
    <li
      className={cn(
        "flex items-start gap-3 px-4 py-2.5",
        highlight && "bg-warning/10",
        className,
      )}
    >
      <span className="w-9 shrink-0 pt-0.5 font-mono text-[11px] text-muted">
        {time}
      </span>
      <Icon
        className={cn(
          "mt-0.5 size-3.5 shrink-0",
          highlight ? "text-warning" : "text-muted",
        )}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="flex items-center justify-between gap-2">
          <span className={cn("font-mono text-[11px] font-medium", toneClasses[tone])}>
            {type}
          </span>
          {right}
        </p>
        <p className="mt-0.5 text-[13px]/5 text-ink break-words">{detail}</p>
        {sub ? (
          <p className="mt-0.5 font-mono text-[11px] text-muted">{sub}</p>
        ) : null}
      </div>
    </li>
  );
}
