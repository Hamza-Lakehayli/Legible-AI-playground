import type { WorkflowSpec } from "./schema";

export type PersistWorkflowTransitionResult =
  | { ok: true; workflows: WorkflowSpec[] }
  | { ok: false; reason: "workflows" | "draft" };

/** Persist the outgoing draft before recording the destination as active. */
export function persistWorkflowTransition(
  current: WorkflowSpec,
  destination: WorkflowSpec,
  storedWorkflows: WorkflowSpec[],
  persistWorkflows: (workflows: WorkflowSpec[]) => boolean,
  persistDraft: (workflow: WorkflowSpec) => boolean,
  updatedAt = new Date().toISOString(),
): PersistWorkflowTransitionResult {
  const outgoing = { ...current, updatedAt };
  const workflows = [
    ...storedWorkflows.filter((workflow) => workflow.id !== current.id),
    outgoing,
  ];

  if (!persistWorkflows(workflows)) return { ok: false, reason: "workflows" };
  if (!persistDraft(destination)) return { ok: false, reason: "draft" };
  return { ok: true, workflows };
}

/** IDs are identities; names are allowed to be duplicated. */
export function resolveWorkflowById(
  id: string,
  current: WorkflowSpec,
  workflows: WorkflowSpec[],
): WorkflowSpec | undefined {
  if (id === current.id) return current;
  return workflows.find((workflow) => workflow.id === id);
}

export function renameWorkflow(
  workflow: WorkflowSpec,
  name: string,
  updatedAt = new Date().toISOString(),
): WorkflowSpec | null {
  const normalized = name.trim().slice(0, 80);
  if (!normalized) return null;
  return { ...workflow, name: normalized, updatedAt };
}
