"use client";

import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from "@xyflow/react";
import { Plus } from "lucide-react";

export type BuilderEdgeData = {
  onInsert?: (edgeId: string, clientX: number, clientY: number) => void;
};

/**
 * The reference image's core interaction: every edge carries a `+` that
 * inserts a node in place, plus the branch label on decision out-edges.
 */
export function BuilderEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  label,
  data,
  selected,
}: EdgeProps) {
  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    borderRadius: 4,
  });
  const onInsert = (data as BuilderEdgeData | undefined)?.onInsert;

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        style={{
          stroke: selected ? "var(--accent)" : "var(--border)",
          strokeWidth: selected ? 1.6 : 1.3,
        }}
      />
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan absolute flex items-center gap-1"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: "all",
          }}
        >
          {label ? (
            <span className="rounded-[3px] border border-line bg-surface px-1.5 py-0.5 font-mono text-[10px] text-muted">
              {label}
            </span>
          ) : null}
          {onInsert ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onInsert(id, event.clientX, event.clientY);
              }}
              aria-label="Insert a node on this edge"
              className="grid size-5 place-items-center rounded-[3px] border border-line bg-surface text-muted transition-colors hover:border-accent hover:text-accent-ink focus-visible:outline-2 focus-visible:outline-accent"
            >
              <Plus className="size-3" aria-hidden />
            </button>
          ) : null}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
