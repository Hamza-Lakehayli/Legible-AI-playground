import { Badge } from "@/components/ui/badge";
import { ConsolePanel } from "@/components/console/panel";
import { ConsoleEventRow, type EventTone } from "@/components/console/event-row";
import type { LucideIcon } from "lucide-react";
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
 * execution on marketing surfaces. Built entirely from the shared console
 * vocabulary (panel + event rows) that the playground will reuse.
 */

type Row = {
  time: string;
  type: string;
  tone: EventTone;
  detail: string;
  sub?: string;
  icon: LucideIcon;
  highlight?: boolean;
  right?: string;
};

const fullRows: Row[] = [
  {
    time: "00:00",
    type: "run.started",
    tone: "accent",
    detail: "Refund order #4821 — customer waited 9 days for delivery.",
    icon: Play,
  },
  {
    time: "00:01",
    type: "message.delta",
    tone: "muted",
    detail: "Checking the order and the refund policy before acting.",
    icon: MessageSquare,
  },
  {
    time: "00:03",
    type: "tool.requested",
    tone: "ink",
    detail: 'orders.lookup {"order_id": "4821"}',
    sub: "seeded demo data · mock tool",
    icon: Wrench,
  },
  {
    time: "00:05",
    type: "tool.requested",
    tone: "ink",
    detail: 'orders.refund {"order_id": "4821", "amount": "49.90 EUR"}',
    icon: Wrench,
    right: "ASK",
  },
  {
    time: "00:05",
    type: "policy.evaluated",
    tone: "muted",
    detail: "orders.refund → ask — policy requires approval for this action.",
    icon: ShieldCheck,
  },
  {
    time: "00:06",
    type: "approval.required",
    tone: "warning",
    detail: "Waiting for approval — approve, edit the arguments, or reject.",
    icon: PauseCircle,
    highlight: true,
  },
  {
    time: "00:41",
    type: "approval.resolved",
    tone: "muted",
    detail: "Sample decision — proposed amount confirmed at 49.90 EUR.",
    icon: ScrollText,
  },
  {
    time: "00:41",
    type: "tool.completed",
    tone: "ink",
    detail: "orders.refund → refund_id: rf_2211",
    sub: "mock tool result · no external side effect",
    icon: CircleCheck,
  },
  {
    time: "00:42",
    type: "run.completed",
    tone: "accent",
    detail: "6 tool events · 1,204 tokens in · 486 tokens out.",
    icon: Flag,
  },
];

/** Narrower cut of the same run for split feature rows (agents). */
const agentRows: Row[] = fullRows.slice(0, 4);

const proofDetails: Record<string, string> = {
  "tool.requested": "orders.refund · order #4821 · 49.90 EUR",
  "approval.required": "Paused for a human decision.",
  "approval.resolved": "Sample decision: approved at 49.90 EUR.",
  "tool.completed": "Mock refund result: rf_2211",
};

export function ConsolePreview({
  variant = "full",
  className,
}: {
  variant?: "full" | "agents" | "proof";
  className?: string;
}) {
  const rows = variant === "agents"
    ? agentRows
    : variant === "proof"
      ? fullRows.filter((_, index) => [3, 4, 5, 6, 7].includes(index))
      : fullRows;

  return (
    <div data-theme="console">
      <ConsolePanel
        title="playground / governed-agent"
        right={<Badge>SAMPLE RUN</Badge>}
        footer="mock tools · demo data only · no side effects"
        className={className}
      >
        <div className="flex items-center gap-3 border-b border-line px-4 py-2.5 font-mono text-[11px] text-muted">
          <span>sample trace</span>
          <span aria-hidden>·</span>
          <span className="hidden sm:inline">runtime default</span>
          <span aria-hidden className="hidden sm:inline">
            ·
          </span>
          <span>example sequence</span>
        </div>

        <ul className="divide-y divide-line">
          {rows.map((row) => (
            <ConsoleEventRow
              key={`${row.time}-${row.type}`}
              time={row.time}
              type={row.type}
              tone={row.tone}
              icon={row.icon}
              detail={variant === "proof" ? proofDetails[row.type] ?? row.detail : row.detail}
              sub={variant === "proof" ? undefined : row.sub}
              highlight={row.highlight}
              className={variant === "proof" && row.type === "policy.evaluated" ? "max-sm:hidden" : undefined}
              right={
                row.right ? (
                  <span className="font-mono text-[10px] font-medium tracking-wide text-warning">
                    {row.right}
                  </span>
                ) : undefined
              }
            />
          ))}
        </ul>
      </ConsolePanel>
    </div>
  );
}
