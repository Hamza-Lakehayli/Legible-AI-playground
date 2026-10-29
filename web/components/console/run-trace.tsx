"use client";

import {
  CircleCheck,
  CircleDot,
  Flag,
  GitBranch,
  MessageSquare,
  PauseCircle,
  Play,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ConsoleEventRow, type EventTone } from "@/components/console/event-row";
import type { RunEvent } from "@/components/console/use-run-session";

type EventStyle = {
  icon: LucideIcon;
  tone: EventTone;
  label: string;
};

const eventStyles: Record<string, EventStyle> = {
  "run.started": { icon: Play, tone: "accent", label: "Run started" },
  "message.delta": { icon: MessageSquare, tone: "muted", label: "Agent message" },
  "tool.requested": { icon: Wrench, tone: "ink", label: "Tool requested" },
  "tool.denied": { icon: ShieldCheck, tone: "danger", label: "Tool denied" },
  "policy.evaluated": { icon: ShieldCheck, tone: "muted", label: "Policy evaluated" },
  "approval.required": { icon: PauseCircle, tone: "warning", label: "Approval required" },
  "approval.resolved": { icon: ShieldCheck, tone: "muted", label: "Approval resolved" },
  "tool.completed": { icon: CircleCheck, tone: "success", label: "Tool completed" },
  "workflow.step": { icon: GitBranch, tone: "muted", label: "Workflow step" },
  "run.completed": { icon: Flag, tone: "success", label: "Run completed" },
  "run.failed": { icon: Flag, tone: "danger", label: "Run failed" },
  "run.expired": { icon: Flag, tone: "warning", label: "Run expired" },
};

function clip(value: string, max = 140): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function nodeLabel(event: RunEvent): string | null {
  const node = event.payload.node as { label?: string } | undefined;
  return typeof node?.label === "string" && node.label ? node.label : null;
}

export function eventDetail(event: RunEvent): string {
  const { payload } = event;
  if (event.type === "message.delta") return clip(String(payload.text ?? ""));
  if (event.type === "tool.requested") {
    return `${String(payload.tool)} ${JSON.stringify(payload.arguments)}`;
  }
  if (event.type === "policy.evaluated") {
    return `${String(payload.tool)} → ${String(payload.policy)} · risk ${String(payload.risk)}`;
  }
  if (event.type === "approval.required") {
    return String(payload.reason ?? "A human decision is required.");
  }
  if (event.type === "approval.resolved") {
    return `Decision: ${String(payload.decision)}`;
  }
  if (event.type === "tool.completed") {
    return `${String(payload.tool)} → ${clip(JSON.stringify(payload.result))}`;
  }
  if (event.type === "workflow.step") {
    const label = String(payload.node_label ?? "node");
    const branch = payload.branch ? ` → branch ${String(payload.branch)}` : "";
    const output = payload.output ? ` · ${clip(String(payload.output), 100)}` : "";
    return `${label}${branch}${output}`;
  }
  if (event.type === "run.failed" || event.type === "run.expired") {
    return String(payload.message ?? payload.code ?? "The run ended.");
  }
  if (event.type === "run.completed") {
    if (payload.steps) {
      return `${String(payload.steps)} steps · ${String(payload.tokens_in ?? 0)} input tokens · ${String(payload.tokens_out ?? 0)} output tokens`;
    }
    return `${String(payload.tokens_in ?? 0)} input tokens · ${String(payload.tokens_out ?? 0)} output tokens`;
  }
  return String(payload.model ?? payload.demo ?? event.type);
}

/**
 * The single run trace for every surface (console, agent card, workflow
 * canvas). Workflow events carry a node attribution rendered as a chip.
 */
export function RunTrace({
  events,
  empty,
}: {
  events: RunEvent[];
  empty?: React.ReactNode;
}) {
  if (!events.length) {
    return (
      <div className="flex min-h-72 flex-col justify-center px-6 py-8">
        <CircleDot className="size-5 text-muted" aria-hidden />
        <h3 className="mt-3 text-sm font-medium text-ink">No run in progress</h3>
        <p className="mt-1 max-w-xs text-sm/6 text-muted">
          {empty ?? "Start a run to see model, tool, and policy events appear here."}
        </p>
      </div>
    );
  }

  return (
    <ol className="divide-y divide-line">
      {events.map((event) => {
        const base =
          event.type === "workflow.step"
            ? {
                icon:
                  event.payload.status === "entered" ? CircleDot : CircleCheck,
                tone: (event.payload.branch ? "accent" : "muted") as EventTone,
                label:
                  event.payload.status === "entered"
                    ? "Node entered"
                    : "Node completed",
              }
            : eventStyles[event.type] ?? {
                icon: CircleDot,
                tone: "muted" as const,
                label: event.type,
              };
        const node = nodeLabel(event);
        return (
          <ConsoleEventRow
            key={`${event.run_id}-${event.seq}`}
            time={new Date(event.ts * 1000).toLocaleTimeString([], {
              minute: "2-digit",
              second: "2-digit",
            })}
            type={base.label}
            tone={base.tone}
            icon={base.icon}
            detail={eventDetail(event)}
            highlight={event.type === "approval.required"}
            right={
              node ? (
                <span className="shrink-0 font-mono text-[10px] text-muted">
                  {node}
                </span>
              ) : undefined
            }
          />
        );
      })}
    </ol>
  );
}
