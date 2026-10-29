import { parseBundle, workflowSchema, type WorkflowSpec } from "./schema";
import { TEMPLATE_WORKFLOW } from "./templates";

/**
 * v2 persistence: localStorage, versioned keys, validated on read. One
 * builder — the canvas — whose agent configs travel inside their nodes.
 * (The plan's upgrade path is runtime.agents / runtime.graphs; not built.)
 *
 * The draft is read through `useSyncExternalStore` in the app shell, so the
 * snapshot is cached by raw string: getSnapshot must be referentially stable
 * between renders or React loops.
 *
 * Keys moved to `.v2` when agent configs moved into nodes; a stale `.v1`
 * draft simply falls back to the template instead of mis-parsing.
 */

const GRAPHS_KEY = "legible.builder.graphs.v2";
const GRAPH_DRAFT_KEY = "legible.builder.graph-draft.v2";

function readRaw(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota or private mode: the in-memory session still works.
  }
}

function parseJson(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function parseGraphs(value: unknown): WorkflowSpec[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const parsed = workflowSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}

/** Drafts do not change outside this tab; the store never notifies. */
export function subscribeDrafts(): () => void {
  return () => {};
}

let graphsCache: { raw: string | null; value: WorkflowSpec[] } | null = null;

export function loadGraphs(): WorkflowSpec[] {
  const raw = readRaw(GRAPHS_KEY);
  if (graphsCache && graphsCache.raw === raw) return graphsCache.value;
  const stored = parseGraphs(parseJson(raw));
  const value = stored.length ? stored : [TEMPLATE_WORKFLOW];
  graphsCache = { raw, value };
  return value;
}

export function saveGraphs(graphs: WorkflowSpec[]): void {
  writeJson(GRAPHS_KEY, graphs);
}

let graphDraftCache: { raw: string | null; value: WorkflowSpec | null } | null =
  null;

export function getGraphDraftSnapshot(): WorkflowSpec | null {
  const raw = readRaw(GRAPH_DRAFT_KEY);
  if (graphDraftCache && graphDraftCache.raw === raw) return graphDraftCache.value;
  const parsed = workflowSchema.safeParse(parseJson(raw));
  const value = parsed.success ? parsed.data : null;
  graphDraftCache = { raw, value };
  return value;
}

export function getServerGraphDraftSnapshot(): WorkflowSpec | null {
  return null;
}

export function saveGraphDraft(graph: WorkflowSpec): void {
  writeJson(GRAPH_DRAFT_KEY, graph);
}

export function exportBundle(graphs: WorkflowSpec[]): string {
  return JSON.stringify({ version: 1, graphs }, null, 2);
}

export type ImportResult =
  | { ok: true; graphs: WorkflowSpec[]; added: number; skipped: number }
  | { ok: false; error: string };

/**
 * Merge by id: existing entries win, imported duplicates are reported —
 * never overwritten silently.
 */
export function importBundle(
  text: string,
  current: { graphs: WorkflowSpec[] },
): ImportResult {
  const parsed = parseBundle(text);
  if ("error" in parsed) return { ok: false, error: parsed.error };
  const { graphs } = parsed.bundle;

  const graphIds = new Set(current.graphs.map((graph) => graph.id));
  const newGraphs = graphs.filter((graph) => !graphIds.has(graph.id));
  const skipped = graphs.length - newGraphs.length;

  return {
    ok: true,
    graphs: [...current.graphs, ...newGraphs],
    added: newGraphs.length,
    skipped,
  };
}

/** Trigger a browser download without touching the DOM outside the click. */
export function downloadBundle(text: string): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "legible-builders.json";
  anchor.click();
  URL.revokeObjectURL(url);
}
