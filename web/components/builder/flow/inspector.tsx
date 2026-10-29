"use client";

import { useState } from "react";
import { X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  NODE_LABELS,
  TOOL_EXAMPLE_ARGUMENTS,
  TOOL_IDS,
  TOOL_LABELS,
  type AgentCard,
  type NodeConfig,
  type ToolId,
  type WorkflowEdge,
  type WorkflowNode,
} from "@/lib/builder/schema";
import { AgentFields } from "./agent-fields";

const fieldClass =
  "w-full rounded-control border border-line bg-surface px-2.5 py-2 text-sm text-ink focus:border-accent focus:outline-2 focus:-outline-offset-2 focus:outline-accent";
const monoFieldClass =
  "w-full rounded-control border border-line bg-surface px-2.5 py-2 font-mono text-xs/5 text-ink focus:border-accent focus:outline-2 focus:-outline-offset-2 focus:outline-accent";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] text-muted uppercase">{label}</span>
      <span className="mt-1 block">{children}</span>
      {hint ? <span className="mt-1 block text-[11px]/4 text-muted">{hint}</span> : null}
    </label>
  );
}

function ArgumentsField({
  tool,
  value,
  onChange,
}: {
  tool: ToolId | undefined;
  value: unknown;
  onChange: (next: Record<string, unknown> | null) => void;
}) {
  const [text, setText] = useState(JSON.stringify(value ?? {}, null, 2));
  const [error, setError] = useState<string | null>(null);
  const example = tool ? JSON.stringify(TOOL_EXAMPLE_ARGUMENTS[tool]) : null;

  return (
    <Field
      label="Arguments (JSON)"
      hint={
        error ??
        (example
          ? `Mock tools only. Seeded order: ${example}`
          : "Mock tools only. Keys must match the tool schema.")
      }
    >
      <textarea
        value={text}
        spellCheck={false}
        rows={4}
        onChange={(event) => {
          const next = event.target.value;
          setText(next);
          try {
            const parsed: unknown = JSON.parse(next);
            if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
              throw new Error("Must be a JSON object.");
            }
            setError(null);
            onChange(parsed as Record<string, unknown>);
          } catch {
            setError("Invalid JSON — the node keeps its last valid arguments.");
          }
        }}
        className={monoFieldClass}
      />
    </Field>
  );
}

/**
 * The node/edge details, popped up as a floating card on the canvas the
 * moment a node or edge is clicked. Renders nothing while nothing is
 * selected — the canvas stays the whole interface.
 */
export function NodeInspector({
  node,
  edge,
  onClose,
  onNodeLabel,
  onNodeConfig,
  onNodeAgent,
  onEdgeLabel,
  onDelete,
}: {
  node: WorkflowNode | null;
  edge: WorkflowEdge | null;
  onClose: () => void;
  onNodeLabel: (label: string) => void;
  onNodeConfig: (patch: Partial<NodeConfig>) => void;
  onNodeAgent: (patch: Partial<AgentCard>) => void;
  onEdgeLabel: (label: string) => void;
  onDelete: () => void;
}) {
  if (!node && !edge) return null;
  const headerLabel = node ? NODE_LABELS[node.type] : "Edge";

  return (
    <aside
      aria-label={`${headerLabel} details`}
      className="panel-in absolute top-7 right-3 bottom-24 z-30 flex w-[min(340px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-panel border border-line bg-surface shadow-lg shadow-black/5"
    >
      <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
        <p className="min-w-0 truncate font-mono text-[10px] text-muted uppercase">
          {headerLabel}
        </p>
        <span className="flex shrink-0 items-center gap-0.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-1.5"
            onClick={onDelete}
            title="Delete selection"
          >
            <Trash2 className="size-3.5" aria-hidden />
            <span className="sr-only">Delete selection</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-1.5"
            onClick={onClose}
            title="Close details"
          >
            <X className="size-3.5" aria-hidden />
            <span className="sr-only">Close details</span>
          </Button>
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {edge ? (
          <div className="space-y-4">
            <p className="text-sm text-ink">
              {edge.source} <span className="font-mono text-xs text-muted">→</span>{" "}
              {edge.target}
            </p>
            <Field
              label="Branch label"
              hint="Decision branches match this label (yes / no / default)."
            >
              <Input
                value={edge.label ?? ""}
                maxLength={40}
                onChange={(event) => onEdgeLabel(event.target.value)}
              />
            </Field>
          </div>
        ) : null}

        {node ? (
          <div className="space-y-3.5">
            <Field label="Label">
              <Input
                value={node.label}
                maxLength={80}
                onChange={(event) => onNodeLabel(event.target.value)}
              />
            </Field>

            {node.type === "agent" ? (
              node.config.agent ? (
                <AgentFields
                  agent={node.config.agent}
                  onChange={onNodeAgent}
                />
              ) : (
                <p className="text-[11px]/5 text-muted">
                  This agent node has no config card. Delete it and add a new
                  Agent node from the canvas palette.
                </p>
              )
            ) : null}

            {node.type === "agent" ? (
              <Field
                label="Input (optional)"
                hint="Defaults to the previous node's output, then the run input."
              >
                <textarea
                  value={String(node.config.input ?? "")}
                  rows={2}
                  onChange={(event) => onNodeConfig({ input: event.target.value })}
                  className={fieldClass}
                />
              </Field>
            ) : null}

            {node.type === "llm" ? (
              <Field
                label="Prompt"
                hint="Use {{input}} for the run input and {{last}} for the previous output."
              >
                <textarea
                  value={String(node.config.prompt ?? "")}
                  rows={5}
                  onChange={(event) => onNodeConfig({ prompt: event.target.value })}
                  className={monoFieldClass}
                />
              </Field>
            ) : null}

            {node.type === "tool" ? (
              <>
                <Field label="Tool">
                  <select
                    value={String(node.config.tool ?? "")}
                    onChange={(event) =>
                      onNodeConfig({ tool: event.target.value as NodeConfig["tool"] })
                    }
                    className={fieldClass}
                  >
                    <option value="">Select a tool…</option>
                    {TOOL_IDS.map((tool) => (
                      <option key={tool} value={tool}>
                        {TOOL_LABELS[tool]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Approval">
                  <select
                    value={String(node.config.approval ?? "ask")}
                    onChange={(event) =>
                      onNodeConfig({
                        approval: event.target.value as "ask" | "auto",
                      })
                    }
                    className={fieldClass}
                  >
                    <option value="ask">Always ask a human</option>
                    <option value="auto">Auto-approve</option>
                  </select>
                </Field>
                <ArgumentsField
                  key={`${node.id}:${node.config.tool ?? ""}`}
                  tool={node.config.tool}
                  value={node.config.arguments}
                  onChange={(next) => onNodeConfig({ arguments: next ?? {} })}
                />
              </>
            ) : null}

            {node.type === "decision" ? (
              <>
                <Field
                  label="Test"
                  hint="Evaluated against the previous node's output."
                >
                  <select
                    value={String(node.config.mode ?? "always")}
                    onChange={(event) =>
                      onNodeConfig({
                        mode: event.target.value as NodeConfig["mode"],
                      })
                    }
                    className={fieldClass}
                  >
                    <option value="always">Always take “yes”</option>
                    <option value="contains">Output contains…</option>
                    <option value="equals">Output equals…</option>
                  </select>
                </Field>
                {node.config.mode && node.config.mode !== "always" ? (
                  <Field label="Value">
                    <Input
                      value={String(node.config.value ?? "")}
                      onChange={(event) => onNodeConfig({ value: event.target.value })}
                    />
                  </Field>
                ) : null}
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Yes label">
                    <Input
                      value={String(node.config.trueLabel ?? "yes")}
                      maxLength={40}
                      onChange={(event) => onNodeConfig({ trueLabel: event.target.value })}
                    />
                  </Field>
                  <Field label="No label">
                    <Input
                      value={String(node.config.falseLabel ?? "no")}
                      maxLength={40}
                      onChange={(event) => onNodeConfig({ falseLabel: event.target.value })}
                    />
                  </Field>
                </div>
              </>
            ) : null}

            {node.type === "start" || node.type === "end" ? (
              <p className="text-[11px]/5 text-muted">
                {node.type === "start"
                  ? "The run begins here. Exactly one Start node per workflow."
                  : "The run stops here and reports the previous output."}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </aside>
  );
}
