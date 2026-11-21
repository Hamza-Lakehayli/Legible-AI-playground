"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Check, ChevronDown, Plus } from "lucide-react";
import type { WorkflowSpec } from "@/lib/builder/schema";

interface WorkflowSwitcherProps {
  current: WorkflowSpec;
  savedWorkflows: WorkflowSpec[];
  disabled?: boolean;
  onSelect: (workflow: WorkflowSpec) => boolean;
  onCreateFromTemplate: () => boolean;
  onRename: (name: string) => boolean;
}

function displayName(workflow: WorkflowSpec) {
  return workflow.name.trim() || "Untitled workflow";
}

function hasUnsavedChanges(
  current: WorkflowSpec,
  saved: WorkflowSpec | undefined,
) {
  if (!saved) return true;
  return (
    JSON.stringify({ ...current, updatedAt: "" }) !==
    JSON.stringify({ ...saved, updatedAt: "" })
  );
}

export function WorkflowSwitcher({
  current,
  savedWorkflows,
  disabled = false,
  onSelect,
  onCreateFromTemplate,
  onRename,
}: WorkflowSwitcherProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);

  const savedCurrent = savedWorkflows.find((workflow) => workflow.id === current.id);
  const otherWorkflows = savedWorkflows
    .filter((workflow) => workflow.id !== current.id)
    .slice()
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

  useEffect(() => {
    if (open && renaming) renameInputRef.current?.focus();
  }, [open, renaming]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setRenaming(false);
        setRenameError(null);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open || !rootRef.current || !panelRef.current) return;
    const positionPanel = () => {
      const rootLeft = rootRef.current?.getBoundingClientRect().left ?? 0;
      const panelWidth = panelRef.current?.getBoundingClientRect().width ?? 0;
      const left = Math.min(0, window.innerWidth - 8 - rootLeft - panelWidth);
      if (panelRef.current) panelRef.current.style.left = `${left}px`;
    };
    positionPanel();
    window.addEventListener("resize", positionPanel);
    return () => window.removeEventListener("resize", positionPanel);
  }, [open]);

  function closeAndRestoreFocus() {
    setOpen(false);
    setRenaming(false);
    setRenameError(null);
    triggerRef.current?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Escape") return;
    event.preventDefault();
    closeAndRestoreFocus();
  }

  function beginRename() {
    setRenameValue(displayName(current));
    setRenameError(null);
    setRenaming(true);
  }

  function submitRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = renameValue.trim();
    if (!name) {
      setRenameError("Enter a workflow name.");
      return;
    }
    if (!onRename(name)) return;
    closeAndRestoreFocus();
  }

  function activate(workflow: WorkflowSpec) {
    if (onSelect(workflow)) closeAndRestoreFocus();
  }

  function create(onCreate: () => boolean) {
    if (onCreate()) closeAndRestoreFocus();
  }

  const unsaved = hasUnsavedChanges(current, savedCurrent);
  const currentStatus = !savedCurrent
    ? "Current draft"
    : unsaved
      ? "Unsaved changes"
      : "Saved";

  return (
    <div ref={rootRef} className="relative min-w-0 max-w-[min(18rem,42vw)]">
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Current workflow: ${displayName(current)}`}
        aria-expanded={open}
        aria-controls="workflow-switcher-panel"
        disabled={disabled}
        onClick={() => {
          setOpen((value) => !value);
          setRenaming(false);
          setRenameError(null);
        }}
        className="inline-flex h-11 max-w-full min-w-0 items-center gap-1 rounded-control px-2 text-left text-sm font-semibold text-ink hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="truncate">{displayName(current)}</span>
        <ChevronDown className="size-3.5 shrink-0 text-muted" aria-hidden="true" />
      </button>

      <div
        ref={panelRef}
        id="workflow-switcher-panel"
        hidden={!open}
        className="absolute left-0 top-full z-[60] mt-1 max-h-[min(70dvh,32rem)] w-[min(19rem,calc(100vw-1rem))] overflow-y-auto rounded-panel border border-line bg-surface p-1.5 shadow-[0_12px_32px_-16px_oklch(20%_0.01_90_/_0.32)]"
        onKeyDown={handleKeyDown}
      >
          {renaming ? (
            <form onSubmit={submitRename} className="p-2">
              <label htmlFor="rename-workflow" className="block text-xs font-medium text-ink">
                Rename workflow
              </label>
              <input
                ref={renameInputRef}
                id="rename-workflow"
                value={renameValue}
                maxLength={80}
                aria-invalid={Boolean(renameError)}
                aria-describedby={renameError ? "rename-workflow-error" : undefined}
                onChange={(event) => {
                  setRenameValue(event.target.value);
                  setRenameError(null);
                }}
                className="mt-2 h-11 w-full rounded-control border border-line bg-page px-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
              />
              {renameError ? (
                <p id="rename-workflow-error" role="alert" className="mt-1 text-xs text-danger">
                  {renameError}
                </p>
              ) : null}
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeAndRestoreFocus}
                  className="min-h-11 rounded-control px-3 text-xs text-ink hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-accent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-11 rounded-control bg-accent px-3 text-xs font-medium text-white hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  Save name
                </button>
              </div>
            </form>
          ) : (
            <>
              <p className="px-2 py-1.5 text-[11px] font-medium text-muted">Current workflow</p>
              <button
                type="button"
                aria-current="true"
                onClick={() => activate(current)}
                className="flex min-h-11 w-full items-center gap-2 rounded-control px-2 text-left text-sm text-ink hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-accent"
              >
                <Check className="size-3.5 shrink-0 text-accent" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate">{displayName(current)}</span>
                <span className="shrink-0 text-[11px] text-muted">
                  {currentStatus}
                </span>
              </button>

              <div className="my-1 border-t border-line" />
              <p className="px-2 py-1.5 text-[11px] font-medium text-muted">
                Saved on this browser
              </p>
              {otherWorkflows.length ? (
                otherWorkflows.map((workflow) => (
                  <button
                    key={workflow.id}
                    type="button"
                    onClick={() => activate(workflow)}
                    className="flex min-h-11 w-full min-w-0 items-center gap-2 rounded-control px-2 text-left text-sm text-ink hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-accent"
                  >
                    <span className="size-3.5 shrink-0" aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate">{displayName(workflow)}</span>
                  </button>
                ))
              ) : (
                <p className="px-2 py-2 text-xs text-muted">No other workflows saved yet.</p>
              )}

              <div className="my-1 border-t border-line" />
              <p className="px-2 py-1.5 text-[11px] font-medium text-muted">Templates</p>
              <button
                type="button"
                disabled={disabled}
                onClick={() => create(onCreateFromTemplate)}
                className="flex min-h-11 w-full items-center gap-2 rounded-control px-2 text-left text-sm text-ink hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus className="size-3.5 shrink-0 text-muted" aria-hidden="true" />
                <span className="min-w-0 truncate">Create from refund approval template</span>
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={beginRename}
                className="mt-1 flex min-h-11 w-full items-center rounded-control px-2 text-left text-sm text-ink hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60"
              >
                Rename workflow…
              </button>
            </>
          )}
      </div>
    </div>
  );
}
