import { Badge } from "@/components/ui/badge";
import {
  CircleCheck,
  Flag,
  MessageSquare,
  PauseCircle,
  Play,
  ScrollText,
  ShieldCheck,
  Wrench,
} from "lucide-react";

/**
 * Hero preview: a recorded governed-agent run, shown in the dark console
 * theme. Clearly labelled SAMPLE RUN — the brief forbids faking live
 * execution on marketing surfaces.
 */

type Row = {
  time: string;
  type: string;
  typeClass: string;
  detail: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden": true }>;
  highlight?: "warning";
  right?: string;
};

const fullRows: Row[] = [
  {
    time: "00:00",
    type: "run.started",
    typeClass: "text-accent",
    detail: "Refund order #4821 — customer waited 9 days for delivery.",
    icon: Play,
  },
  {
    time: "00:01",
    type: "message.delta",
    typeClass: "text-muted",
    detail: "Checking the order and the refund policy before acting.",
    icon: MessageSquare,
  },
  {
    time: "00:03",
    type: "tool.requested",
    typeClass: "text-ink",
    detail: "orders.lookup {\"order_id\": \"4821\"}",
    sub: "risk: low · completed in 118 ms",
    icon: Wrench,
  },
  {
    time: "00:05",
    type: "tool.requested",
    typeClass: "text-ink",
    detail: "orders.refund {\"order_id\": \"4821\", \"amount\": \"49.90 EUR\"}",
    icon: Wrench,
    right: "HIGH",
  },
  {
    time: "00:05",
    type: "policy.evaluated",
    typeClass: "text-muted",
    detail: "orders.refund → ask — refund amount is over the threshold.",
    icon: ShieldCheck,
  },
  {
    time: "00:06",
    type: "approval.required",
    typeClass: "text-warning",
    detail: "Waiting for approval — approve, edit the arguments, or reject.",
    icon: PauseCircle,
    highlight: "warning",
  },
  {
    time: "00:41",
    type: "approval.resolved",
    typeClass: "text-muted",
    detail: "Approved by visitor — amount confirmed at 49.90 EUR.",
    icon: ScrollText,
  },
  {
    time: "00:41",
    type: "tool.completed",
    typeClass: "text-ink",
    detail: "orders.refund → refund_id: rf_2211",
    sub: "completed in 96 ms",
    icon: CircleCheck,
  },
  {
    time: "00:42",
    type: "run.completed",
    typeClass: "text-accent",
    detail: "6 tool events · 1,204 tokens in · 486 tokens out.",
    icon: Flag,
  },
];

/** Narrower cut of the same run for split feature rows (agents). */
const agentRows: Row[] = fullRows.slice(0, 4);

export function ConsolePreview({
  variant = "full",
  className,
}: {
  variant?: "full" | "agents";
  className?: string;
}) {
  const rows = variant === "full" ? fullRows : agentRows;

  return (
    <div
      data-theme="console"
      className={`overflow-hidden rounded-panel border border-line bg-page ${
        className ?? ""
      }`}
    >
      <div className="flex h-10 items-center justify-between border-b border-line px-4">
        <p className="font-mono text-xs text-muted">playground / governed-agent</p>
        <Badge>SAMPLE RUN</Badge>
      </div>

      <div className="flex items-center gap-3 border-b border-line px-4 py-2.5 font-mono text-[11px] text-muted">
        <span>run_7k2m9x</span>
        <span aria-hidden>·</span>
        <span className="hidden sm:inline">nvidia/llama-3.3-70b-instruct</span>
        <span aria-hidden className="hidden sm:inline">
          ·
        </span>
        <span>00:42 elapsed</span>
      </div>

      <ul className="divide-y divide-line">
        {rows.map((row) => (
          <li
            key={`${row.time}-${row.type}`}
            className={`flex items-start gap-3 px-4 py-2.5 ${
              row.highlight === "warning" ? "bg-warning/10" : ""
            }`}
          >
            <span className="w-9 shrink-0 pt-0.5 font-mono text-[11px] text-muted">
              {row.time}
            </span>
            <row.icon
              className={`mt-0.5 size-3.5 shrink-0 ${
                row.highlight === "warning" ? "text-warning" : "text-muted"
              }`}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className="flex items-center justify-between gap-2">
                <span className={`font-mono text-[11px] font-medium ${row.typeClass}`}>
                  {row.type}
                </span>
                {row.right ? (
                  <span className="font-mono text-[10px] font-medium tracking-wide text-warning">
                    {row.right}
                  </span>
                ) : null}
              </p>
              <p className="mt-0.5 text-[13px]/5 text-[var(--text)] break-words">
                {row.detail}
              </p>
              {row.sub ? (
                <p className="mt-0.5 font-mono text-[11px] text-muted">{row.sub}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      <div className="border-t border-line px-4 py-2">
        <p className="font-mono text-[11px] text-muted">
          mock tools · demo data only · no side effects
        </p>
      </div>
    </div>
  );
}
