"use client";

import { useCallback, useEffect, useRef, useState, type FocusEvent } from "react";
import { commitHistory, createHistory, redoHistory, undoHistory, type History } from "@/lib/builder/history";
import type { WorkflowSpec } from "@/lib/builder/schema";

type Updater = WorkflowSpec | ((current: WorkflowSpec) => WorkflowSpec);

export function useGraphHistory(initial: WorkflowSpec) {
  // Null lets the external draft hydrate before the first author mutation.
  const [history, setHistory] = useState<History<WorkflowSpec> | null>(null);
  const graph = history?.present ?? initial;
  const baseRef = useRef(graph);
  const editGroup = useRef<string | undefined>(undefined);
  const editingTarget = useRef<EventTarget | null>(null);
  const groupId = useRef(0);
  useEffect(() => { baseRef.current = graph; }, [graph]);

  const setGraph = useCallback((updater: Updater) => {
    const group = document.activeElement === editingTarget.current ? editGroup.current : undefined;
    setHistory((current) => {
      const h = current ?? createHistory(baseRef.current);
      return commitHistory(h, typeof updater === "function" ? updater(h.present) : updater, group);
    });
  }, []);
  const undo = useCallback(() => {
    editGroup.current = undefined;
    setHistory((current) => current && undoHistory(current));
  }, []);
  const redo = useCallback(() => {
    editGroup.current = undefined;
    setHistory((current) => current && redoHistory(current));
  }, []);
  const onFocusCapture = useCallback((event: FocusEvent) => {
    const target = event.target;
    if (target instanceof HTMLElement && target.matches('input:not([type="checkbox"]):not([type="radio"]):not([type="file"]), textarea, [contenteditable="true"]')) {
      editGroup.current = `edit-${++groupId.current}`;
      editingTarget.current = target;
    }
  }, []);
  const onBlurCapture = useCallback(() => { editGroup.current = undefined; editingTarget.current = null; }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey || event.key.toLowerCase() !== "z") return;
      if (event.target instanceof HTMLElement && event.target.closest("input, textarea, select, [contenteditable]:not([contenteditable='false'])")) return;
      event.preventDefault();
      if (event.shiftKey) redo(); else undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  return { graph, setGraph, undo, redo, canUndo: Boolean(history?.past.length), canRedo: Boolean(history?.future.length), onFocusCapture, onBlurCapture };
}
