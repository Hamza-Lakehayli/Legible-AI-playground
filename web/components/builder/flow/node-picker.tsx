"use client";

import { useEffect, useRef } from "react";
import {
  NODE_DESCRIPTIONS,
  NODE_LABELS,
  type NodeKind,
} from "@/lib/builder/schema";
import { KIND_META } from "./nodes";

const INSERTABLE: NodeKind[] = ["agent", "llm", "tool", "decision", "end"];

/** The palette and the edge `+` menu are the same component. */
export function NodePicker({
  x,
  y,
  onPick,
  onClose,
}: {
  x: number;
  y: number;
  onPick: (kind: NodeKind) => void;
  onClose: () => void;
}) {
  const firstItemRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    firstItemRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const width = 264;
  const height = 316;
  const left = Math.max(
    8,
    Math.min(x, (typeof window === "undefined" ? 1200 : window.innerWidth) - width - 8),
  );
  const top = Math.max(
    8,
    Math.min(y, (typeof window === "undefined" ? 800 : window.innerHeight) - height - 8),
  );

  return (
    <div className="fixed inset-0 z-50" onMouseDown={onClose}>
      <div
        role="menu"
        aria-label="Choose a node"
        className="absolute w-64 rounded-panel border border-line bg-surface p-1"
        style={{ left, top }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <p className="px-2 py-1.5 font-mono text-[10px] text-muted uppercase">
          Insert node
        </p>
        {INSERTABLE.map((kind, index) => {
          const Icon = KIND_META[kind].icon;
          return (
            <button
              key={kind}
              ref={index === 0 ? firstItemRef : undefined}
              type="button"
              role="menuitem"
              onClick={() => onPick(kind)}
              className="flex w-full items-start gap-2 rounded-[4px] px-2 py-1.5 text-left transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-accent"
            >
              <Icon className="mt-0.5 size-3.5 shrink-0 text-accent-ink" aria-hidden />
              <span>
                <span className="block text-[13px] font-medium text-ink">
                  {NODE_LABELS[kind]}
                </span>
                <span className="block text-[11px]/4 text-muted">
                  {NODE_DESCRIPTIONS[kind]}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
