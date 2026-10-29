"use client";

import {
  Bot,
  Braces,
  GitBranch,
  Play,
  Square,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";
import type { NodeKind } from "@/lib/builder/schema";

export type BuilderNodeData = {
  kind: NodeKind;
  label: string;
  summary: string;
  invalid: boolean;
};

export const KIND_META: Record<
  NodeKind,
  { icon: LucideIcon; kicker: string }
> = {
  start: { icon: Play, kicker: "start" },
  agent: { icon: Bot, kicker: "agent" },
  llm: { icon: Braces, kicker: "llm call" },
  tool: { icon: Wrench, kicker: "tool" },
  decision: { icon: GitBranch, kicker: "decision" },
  end: { icon: Square, kicker: "end" },
};

/** One component for every node kind: same frame, different vocabulary. */
export function BuilderNodeCard({ data, selected }: NodeProps) {
  const node = data as unknown as BuilderNodeData;
  const meta = KIND_META[node.kind];
  const Icon = meta.icon;

  return (
    <div
      className={cn(
        "w-[230px] rounded-panel border bg-surface px-3 py-2.5 text-left shadow-none transition-colors",
        selected ? "border-accent ring-2 ring-accent/15" : "border-line",
        node.invalid && "border-danger",
        node.kind === "start" && "border-accent/50",
        node.kind === "end" && "bg-surface-muted",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5">
          <Icon className="size-3 text-accent-ink" aria-hidden />
          <span className="font-mono text-[9px] font-medium tracking-[0.12em] text-muted uppercase">
            {meta.kicker}
          </span>
        </span>
        {node.invalid ? (
          <span className="font-mono text-[9px] text-danger">check</span>
        ) : null}
      </div>
      <p className="mt-1 truncate text-sm font-medium text-ink">{node.label}</p>
      {node.summary ? (
        <p className="mt-0.5 truncate font-mono text-[10px] text-muted">
          {node.summary}
        </p>
      ) : null}

      {node.kind !== "start" ? (
        <Handle
          type="target"
          position={Position.Top}
          className="!h-2 !w-2 !border !border-page !bg-accent"
        />
      ) : null}
      {node.kind !== "end" ? (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!h-2 !w-2 !border !border-page !bg-accent"
        />
      ) : null}
    </div>
  );
}
