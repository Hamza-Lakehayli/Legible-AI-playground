"use client";

import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from "@xyflow/react";
import { Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type BuilderEdgeData = {
  onInsert?: (edgeId: string, clientX: number, clientY: number) => void;
  onLabelChange?: (edgeId: string, label: string) => void;
  editable?: boolean;
};

function BranchLabel({ id, label, onChange }: { id: string; label: string; onChange: (id: string, value: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(label);
  const cancelled = useRef(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const restoreFocus = useRef(false);
  useEffect(() => {
    if (editing) inputRef.current?.focus();
    else if (restoreFocus.current) buttonRef.current?.focus();
    restoreFocus.current = false;
  }, [editing]);
  const classes = "rounded-[3px] border border-line bg-surface px-1.5 py-0.5 font-mono text-[10px] text-muted focus-visible:outline-2 focus-visible:outline-accent";
  return editing ? (
    <input ref={inputRef} aria-label="Branch label" value={text} maxLength={40}
      className={`${classes} w-24 text-ink`}
      onClick={(event) => event.stopPropagation()}
      onChange={(event) => setText(event.target.value)}
      onBlur={() => { if (!cancelled.current) onChange(id, text); setEditing(false); }}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Enter") { event.preventDefault(); restoreFocus.current = true; event.currentTarget.blur(); }
        if (event.key === "Escape") {
          event.preventDefault(); restoreFocus.current = true; cancelled.current = true; setText(label); setEditing(false);
        }
      }}
    />
  ) : (
    <button ref={buttonRef} type="button" className={classes} aria-label={`Edit branch label ${label || "(empty)"}`}
      onClick={(event) => { event.stopPropagation(); cancelled.current = false; setText(label); setEditing(true); }}>
      {label || "Label…"}
    </button>
  );
}

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
  const edgeData = data as BuilderEdgeData | undefined;

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
          {edgeData?.editable && edgeData.onLabelChange ? (
            <BranchLabel id={id} label={String(label ?? "")} onChange={edgeData.onLabelChange} />
          ) : label ? (
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
