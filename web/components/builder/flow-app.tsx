"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type NodeDimensionChange,
  type NodePositionChange,
  type XYPosition,
  useNodesInitialized,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import Link from "next/link";
import { ArrowLeft, Download, ListTree, Plus, Save, Upload, Undo2, Redo2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRunSession } from "@/components/console/use-run-session";
import {
  NODE_LABELS,
  collectAgents,
  emptyAgentCard,
  newId,
  toRuntimeGraph,
  validateWorkflowDetails,
  type AgentCard,
  type NodeConfig,
  type NodeKind,
  type WorkflowNode,
  type WorkflowSpec,
  TOOL_EXAMPLE_ARGUMENTS,
} from "@/lib/builder/schema";
import { createWorkflowTemplate, DEFAULT_WORKFLOW_INPUT, TEMPLATE_WORKFLOW } from "@/lib/builder/templates";
import {
  downloadBundle,
  exportBundle,
  getSavedGraphsSnapshot,
  getServerSavedGraphsSnapshot,
  getGraphDraftSnapshot,
  getServerGraphDraftSnapshot,
  importBundle,
  loadSavedGraphs,
  saveGraphDraft,
  saveGraphs,
  subscribeSavedGraphs,
  subscribeDrafts,
} from "@/lib/builder/store";
import { persistWorkflowTransition, renameWorkflow, resolveWorkflowById } from "@/lib/builder/workflow-actions";
import { BuilderNodeCard, type BuilderNodeData } from "./flow/nodes";
import { BuilderEdge, type BuilderEdgeData } from "./flow/edge";
import { NodePicker } from "./flow/node-picker";
import { NodeInspector } from "./flow/inspector";
import { RunDock } from "./flow/run-dock";
import { WorkflowSwitcher } from "./workflow-switcher";
import { useGraphHistory } from "./use-graph-history";
import { duplicateNode } from "@/lib/builder/editing";
import { usePlaygroundEntry } from "@/components/transitions/playground-entry-provider";

type FlowNode = Node<BuilderNodeData>;
type FlowEdge = Edge<BuilderEdgeData>;
type Selection = { kind: "node" | "edge"; id: string } | null;
type Picker = { x: number; y: number; edgeId?: string } | null;
type AddNodeOptions = {
  edgeId?: string;
  shift?: { ids: Set<string>; dy: number };
};

const nodeTypes = { builder: BuilderNodeCard };
const edgeTypes = { builder: BuilderEdge };

/**
 * Identity cache for React Flow nodes: a drag updates one node's signature,
 * so one card re-renders per tick instead of the whole canvas. It lives at
 * module scope because render-phase ref writes are not allowed; every value
 * is derived purely from its signature (positions, selection, validity,
 * label, summary, and kind included), so sharing it across mounts and
 * graphs is safe.
 */
const flowNodeCache = new Map<string, { obj: FlowNode; sig: string }>();
const subscribeHydration = () => () => {};
const getHydratedSnapshot = () => true;
const getServerHydrationSnapshot = () => false;

function summarize(node: WorkflowNode): string {
  switch (node.type) {
    case "agent": {
      const card = node.config.agent;
      if (!card) return "no config card";
      if (card.description.trim()) return card.description.slice(0, 48);
      return card.tools.length ? card.tools.join(" · ") : "no tools";
    }
    case "llm": {
      const prompt = (node.config.prompt ?? "").trim();
      return prompt ? prompt.slice(0, 46) : "no prompt";
    }
    case "tool":
      return node.config.tool ?? "no tool selected";
    case "decision": {
      const mode = node.config.mode ?? "always";
      return mode === "always"
        ? "always takes yes"
        : `${mode} “${node.config.value ?? ""}”`;
    }
    default:
      return "";
  }
}

/** The playground app: full-screen canvas, floating cards, one run deck. */
export function FlowApp() {
  return (
    <ReactFlowProvider>
      <FlowAppInner />
    </ReactFlowProvider>
  );
}

function FlowAppInner() {
  const draftGraph = useSyncExternalStore(
    subscribeDrafts,
    getGraphDraftSnapshot,
    getServerGraphDraftSnapshot,
  );
  const history = useGraphHistory(draftGraph ?? TEMPLATE_WORKFLOW);
  const { graph, setGraph, resetGraph } = history;
  const savedWorkflows = useSyncExternalStore(
    subscribeSavedGraphs,
    getSavedGraphsSnapshot,
    getServerSavedGraphsSnapshot,
  );
  const { signalReady, requestId } = usePlaygroundEntry();
  const nodesInitialized = useNodesInitialized();
  const draftResolved = useSyncExternalStore(subscribeHydration, getHydratedSnapshot, getServerHydrationSnapshot);
  const flowCanvasRef = useRef<HTMLDivElement>(null);
  const measuredNodeIds = useRef(new Set<string>());
  const [measurementVersion, setMeasurementVersion] = useState(0);
  const [selection, setSelection] = useState<Selection>(null);
  const [picker, setPicker] = useState<Picker>(null);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [runInput, setRunInput] = useState(DEFAULT_WORKFLOW_INPUT);
  const [notice, setNotice] = useState<string | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [draftStorageError, setDraftStorageError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [savedGraph, setSavedGraph] = useState<WorkflowSpec | null>(null);

  // Drag positions live outside the spec while a drag is in flight, so
  // autosave/validation/outline only run once, on drop.
  const [dragPositions, setDragPositions] = useState<Map<string, XYPosition>>(
    () => new Map(),
  );

  const fileRef = useRef<HTMLInputElement>(null);
  const { screenToFlowPosition, fitView, viewportInitialized } = useReactFlow<FlowNode, FlowEdge>();
  // Track RF's dimensions events as well as its aggregate hook. This controlled
  // canvas intentionally merges those dimension changes into an identity cache
  // instead of replacing the graph spec, so the local readiness proof matters.
  const fittedDraft = useRef(false);
  useEffect(() => {
    if (!draftGraph || fittedDraft.current) return;
    fittedDraft.current = true;
    const frame = window.requestAnimationFrame(() => {
      void fitView({ padding: 0.28 });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [draftGraph, fitView]);

  useEffect(() => {
    const allNodesMeasured = graph.nodes.every((node) => measuredNodeIds.current.has(node.id));
    if (!requestId || !draftResolved || !viewportInitialized || (graph.nodes.length > 0 && !nodesInitialized && !allNodesMeasured)) return;
    let firstFrame = 0;
    let secondFrame = 0;
    let observer: ResizeObserver | undefined;
    let cancelled = false;
    const afterPaint = () => {
      secondFrame = requestAnimationFrame(() => {
        const bounds = flowCanvasRef.current?.getBoundingClientRect();
        if (!cancelled && bounds && bounds.width > 0 && bounds.height > 0) {
          signalReady(requestId);
          observer?.disconnect();
          return;
        }
        if (!observer && flowCanvasRef.current) {
          observer = new ResizeObserver(() => {
            const rect = flowCanvasRef.current?.getBoundingClientRect();
            if (!cancelled && rect && rect.width > 0 && rect.height > 0) {
              signalReady(requestId);
              observer?.disconnect();
            }
          });
          observer.observe(flowCanvasRef.current);
        }
      });
    };
    firstFrame = requestAnimationFrame(afterPaint);
    return () => {
      cancelled = true;
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
      observer?.disconnect();
    };
  }, [requestId, draftResolved, viewportInitialized, nodesInitialized, measurementVersion, graph.nodes, signalReady]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (saveGraphDraft(graph)) {
        setDraftStorageError(null);
      } else {
        setDraftStorageError("This workflow draft could not be saved in this browser. Check browser storage and try again.");
      }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [graph]);

  const validation = useMemo(() => validateWorkflowDetails(graph), [graph]);
  const issues = validation.errors;
  const invalidIds = useMemo(() => new Set(validation.nodeErrors.keys()), [validation]);

  /**
   * Node objects are identity-stable: dragging changes one position in the
   * cache signature, so one card re-renders per tick instead of the whole
   * canvas — this is what makes the pan/drag feel smooth instead of janky.
   */
  const flowNodes = useMemo<FlowNode[]>(() => {
    const out: FlowNode[] = [];
    for (const node of graph.nodes) {
      const position = dragPositions.get(node.id) ?? node.position;
      const selected = selection?.kind === "node" && selection.id === node.id;
      const invalid = invalidIds.has(node.id);
      const label = node.label || NODE_LABELS[node.type];
      const summary = summarize(node);
      const sig = `${node.type}|${position.x}|${position.y}|${selected ? 1 : 0}|${invalid ? 1 : 0}|${label}|${summary}`;
      const cached = flowNodeCache.get(node.id);
      if (cached && cached.sig === sig) {
        out.push(cached.obj);
        continue;
      }
      // Spread the previous object so React Flow–maintained fields
      // (`measured` and friends) survive every rebuild — dropping them is
      // what made dragged nodes detach and hide mid-drag.
      const obj: FlowNode = {
        ...(cached?.obj ?? {}),
        id: node.id,
        type: "builder",
        position,
        selected,
        data: { kind: node.type, label, summary, invalid },
      } as FlowNode;
      flowNodeCache.set(node.id, { obj, sig });
      out.push(obj);
    }
    return out;
  }, [graph.nodes, dragPositions, invalidIds, selection]);

  const openPickerForEdge = useCallback(
    (edgeId: string, clientX: number, clientY: number) => {
      setPicker({ x: clientX, y: clientY, edgeId });
    },
    [setPicker],
  );

  const updateEdgeLabel = useCallback(
    (id: string, label: string) => {
      setGraph((current) => ({
        ...current,
        edges: current.edges.map((edge) => edge.id === id ? { ...edge, label } : edge),
      }));
      setSaved(false);
    },
    [setGraph, setSaved],
  );

  const flowEdges = useMemo<FlowEdge[]>(
    () =>
      graph.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: "builder",
        label: edge.label,
        selected: selection?.kind === "edge" && selection.id === edge.id,
        data: {
          onInsert: openPickerForEdge,
          onLabelChange: updateEdgeLabel,
          editable: graph.nodes.some((node) => node.id === edge.source && node.type === "decision"),
        },
      })),
    [graph.edges, graph.nodes, selection, openPickerForEdge, updateEdgeLabel],
  );

  const onNodesChange = useCallback(
    (changes: NodeChange<FlowNode>[]) => {
      // React Flow only persists measured sizes if the parent applies the
      // `dimensions` changes it emits (applyNodeChanges does this). The
      // builder keeps its own node objects, so those have to be merged into
      // the identity cache instead — otherwise every rebuild during a drag
      // loses `measured`, React Flow drops the node's handleBounds and the
      // wrapper goes `visibility: hidden` until the drag settles.
      const dimensionChanges = changes.filter(
        (change): change is NodeDimensionChange =>
          change.type === "dimensions" && Boolean(change.dimensions),
      );
      if (dimensionChanges.length) {
        let hasNewMeasurements = false;
        for (const change of dimensionChanges) {
          const dims = change.dimensions;
          if (!dims) continue;
          const cached = flowNodeCache.get(change.id);
          const measured: NonNullable<FlowNode["measured"]> = {
            width: dims.width,
            height: dims.height,
          };
          if (cached) {
            cached.obj = { ...cached.obj, measured };
          } else {
            // No cache entry yet: seed one the memo will spread on its next
            // pass (the sig never matches a seed, so it always rebuilds).
            flowNodeCache.set(change.id, {
              sig: `dimensions|seed`,
              obj: { id: change.id, measured } as unknown as FlowNode,
            });
          }
          if (!measuredNodeIds.current.has(change.id)) {
            measuredNodeIds.current.add(change.id);
            hasNewMeasurements = true;
          }
        }
        if (hasNewMeasurements) setMeasurementVersion((version) => version + 1);
      }

      const removals = changes.filter((change) => change.type === "remove");
      if (removals.length) {
        const removedIds = new Set(removals.map((change) => change.id));
        setGraph((current) => ({
          ...current,
          nodes: current.nodes.filter((node) => !removedIds.has(node.id)),
          edges: current.edges.filter(
            (edge) => !removedIds.has(edge.source) && !removedIds.has(edge.target),
          ),
        }));
        setDragPositions((prev) => {
          if (![...prev.keys()].some((id) => removedIds.has(id))) return prev;
          const next = new Map(prev);
          for (const id of removedIds) next.delete(id);
          return next;
        });
      }

      const positionChanges = changes.filter(
        (change): change is NodePositionChange =>
          change.type === "position" && Boolean(change.position),
      );
      if (!positionChanges.length) return;

      // dragging !== false → the drag is still in flight: keep the position
      // out of the spec (out of autosave, validation, outline).
      const inFlight = positionChanges.filter((change) => change.dragging !== false);
      const finished = positionChanges.filter((change) => change.dragging === false);

      if (inFlight.length) {
        setDragPositions((prev) => {
          const next = new Map(prev);
          for (const change of inFlight) next.set(change.id, change.position!);
          return next;
        });
      }
      if (finished.length) {
        const finals = new Map(
          finished.map((change) => [change.id, change.position!] as const),
        );
        setGraph((current) => ({
          ...current,
          nodes: current.nodes.map((node) =>
            finals.has(node.id) ? { ...node, position: finals.get(node.id)! } : node,
          ),
        }));
        setDragPositions((prev) => {
          const next = new Map(prev);
          for (const id of finals.keys()) next.delete(id);
          return next;
        });
      }
    },
    [setGraph],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange<FlowEdge>[]) => {
      setGraph((current) => {
        const removed = new Set(
          changes
            .filter((change) => change.type === "remove")
            .map((change) => change.id),
        );
        if (!removed.size) return current;
        return {
          ...current,
          edges: current.edges.filter((edge) => !removed.has(edge.id)),
        };
      });
    },
    [setGraph],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      const source = connection.source;
      const target = connection.target;
      if (!source || !target || source === target) return;
      setGraph((current) => ({
        ...current,
        edges: [...current.edges, { id: newId("edge"), source, target }],
      }));
    },
    [setGraph],
  );

  const addNode = useCallback(
    (
      kind: NodeKind,
      at: { x: number; y: number },
      options: AddNodeOptions = {},
    ) => {
      const node: WorkflowNode = {
        id: newId("node"),
        type: kind,
        label: NODE_LABELS[kind],
        position: at,
        config:
          kind === "agent"
            ? { agent: emptyAgentCard() }
            : kind === "decision"
              ? { mode: "always", trueLabel: "yes", falseLabel: "no" }
              : kind === "tool"
                ? { approval: "ask", arguments: {} }
                : {},
      };
      setGraph((current) => {
        let nodes = current.nodes;
        if (options.shift) {
          const { ids, dy } = options.shift;
          nodes = nodes.map((item) =>
            ids.has(item.id)
              ? { ...item, position: { ...item.position, y: item.position.y + dy } }
              : item,
          );
        }
        let edges = current.edges;
        if (options.edgeId) {
          const original = current.edges.find((edge) => edge.id === options.edgeId);
          if (original) {
            edges = [
              ...current.edges.filter((edge) => edge.id !== original.id),
              {
                id: newId("edge"),
                source: original.source,
                target: node.id,
                label: original.label,
              },
              { id: newId("edge"), source: node.id, target: original.target },
            ];
          }
        }
        return { ...current, nodes: [...nodes, node], edges };
      });
      setSelection({ kind: "node", id: node.id });
      setPicker(null);
      setSaved(false);
    },
    [setGraph, setSaved, setSelection, setPicker],
  );

  const insertOnEdge = useCallback(
    (kind: NodeKind, edgeId: string) => {
      const edge = graph.edges.find((item) => item.id === edgeId);
      const source = graph.nodes.find((node) => node.id === edge?.source);
      const target = graph.nodes.find((node) => node.id === edge?.target);
      if (!source || !target) {
        addNode(kind, { x: 320, y: 200 });
        return;
      }
      // The new node takes the target's slot; the target and everything
      // downstream move down so the two never overlap.
      const outgoing = new Map<string, string[]>();
      for (const item of graph.edges) {
        const list = outgoing.get(item.source) ?? [];
        list.push(item.target);
        outgoing.set(item.source, list);
      }
      const shiftIds = new Set<string>([target.id]);
      const queue = [target.id];
      while (queue.length) {
        const id = queue.shift()!;
        for (const next of outgoing.get(id) ?? []) {
          if (!shiftIds.has(next)) {
            shiftIds.add(next);
            queue.push(next);
          }
        }
      }
      shiftIds.delete(source.id);
      addNode(
        kind,
        { x: (source.position.x + target.position.x) / 2, y: target.position.y },
        { edgeId, shift: { ids: shiftIds, dy: 170 } },
      );
    },
    [graph.edges, graph.nodes, addNode],
  );

  const selectedNode =
    selection?.kind === "node"
      ? (graph.nodes.find((node) => node.id === selection.id) ?? null)
      : null;
  const selectedEdge =
    selection?.kind === "edge"
      ? (graph.edges.find((edge) => edge.id === selection.id) ?? null)
      : null;

  const updateNodeLabel = useCallback(
    (id: string, label: string) => {
      setGraph((current) => ({
        ...current,
        nodes: current.nodes.map((node) =>
          node.id === id ? { ...node, label } : node,
        ),
      }));
      setSaved(false);
    },
    [setGraph, setSaved],
  );

  const updateNodeConfig = useCallback(
    (id: string, patch: Partial<NodeConfig>) => {
      setGraph((current) => ({
        ...current,
        nodes: current.nodes.map((node) => {
          if (node.id !== id) return node;
          const next = { ...node.config, ...patch };
          // A new tool node should run with zero edits; seed the demo order
          // unless the author already wrote arguments.
          if (patch.tool && Object.keys(node.config.arguments ?? {}).length === 0) {
            next.arguments = TOOL_EXAMPLE_ARGUMENTS[patch.tool];
          }
          return { ...node, config: next };
        }),
      }));
      setSaved(false);
    },
    [setGraph, setSaved],
  );

  /** The agent config card lives inside the node, so patches merge into it. */
  const updateNodeAgent = useCallback(
    (id: string, patch: Partial<AgentCard>) => {
      setGraph((current) => ({
        ...current,
        nodes: current.nodes.map((node) =>
          node.id === id
            ? {
                ...node,
                config: {
                  ...node.config,
                  agent: { ...(node.config.agent ?? emptyAgentCard()), ...patch },
                },
              }
            : node,
        ),
      }));
      setSaved(false);
    },
    [setGraph, setSaved],
  );

  const deleteSelection = useCallback(() => {
    if (!selection) return;
    const target = selection;
    setGraph((current) =>
      target.kind === "node"
        ? {
            ...current,
            nodes: current.nodes.filter((node) => node.id !== target.id),
            edges: current.edges.filter(
              (edge) => edge.source !== target.id && edge.target !== target.id,
            ),
          }
        : {
            ...current,
            edges: current.edges.filter((edge) => edge.id !== target.id),
          },
    );
    setSelection(null);
  }, [selection, setGraph, setSelection]);

  const session = useRunSession((input) => ({
    kind: "workflow",
    input,
    graph: toRuntimeGraph(graph),
    agents: collectAgents(graph),
  }));

  function resetCanvasForWorkflow(next: WorkflowSpec) {
    resetGraph(next);
    setSelection(null);
    setPicker(null);
    setDragPositions(new Map());
    setSaved(false);
    setSavedGraph(null);
    window.requestAnimationFrame(() => {
      void fitView({ padding: 0.28 });
    });
  }

  function transitionToWorkflow(next: WorkflowSpec): boolean {
    if (next.id === graph.id) return true;
    if (session.runActive) {
      setNotice("Finish or resolve the active run before switching workflows.");
      return false;
    }
    const result = persistWorkflowTransition(
      graph,
      next,
      loadSavedGraphs(),
      saveGraphs,
      saveGraphDraft,
    );
    if (!result.ok) {
      setStorageError(
        result.reason === "workflows"
          ? "This workflow could not be saved in this browser. Your current workflow is still open."
          : "The selected workflow could not be made active. Your current workflow is still open.",
      );
      return false;
    }

    setStorageError(null);
    setDraftStorageError(null);
    setNotice("Current workflow saved on this browser.");
    resetCanvasForWorkflow(next);
    return true;
  }

  function createWorkflow(template: "blank" | "refund"): boolean {
    return transitionToWorkflow(createWorkflowTemplate(template));
  }

  function onSelectWorkflow(workflow: WorkflowSpec): boolean {
    const latest = resolveWorkflowById(workflow.id, graph, loadSavedGraphs());
    if (!latest) {
      setNotice("That workflow is no longer available. Refresh the workflow list and try again.");
      return false;
    }
    return transitionToWorkflow(latest);
  }

  function onRenameWorkflow(name: string): boolean {
    const renamed = renameWorkflow(graph, name);
    if (!renamed) return false;
    setGraph(renamed);
    setSaved(false);
    setSavedGraph(null);
    setStorageError(null);
    setDraftStorageError(null);
    setNotice("Workflow name updated.");
    return true;
  }

  function save() {
    const next = [
      ...loadSavedGraphs().filter((item) => item.id !== graph.id),
      { ...graph, updatedAt: new Date().toISOString() },
    ];
    if (!saveGraphs(next)) {
      setStorageError("This workflow could not be saved in this browser. Check browser storage and try again.");
      return;
    }
    setStorageError(null);
    setDraftStorageError(null);
    setSavedGraph(graph);
    setSaved(true);
    setNotice("Workflow saved in this browser. Export to keep a copy outside it.");
  }

  function onExport() {
    const graphs = [
      ...loadSavedGraphs().filter((item) => item.id !== graph.id),
      graph,
    ];
    downloadBundle(exportBundle(graphs));
    setNotice("Bundle downloaded.");
  }

  async function onImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const text = await file.text();
    const result = importBundle(text, {
      graphs: [...loadSavedGraphs().filter((item) => item.id !== graph.id), graph],
    });
    if (!result.ok) {
      setNotice(result.error);
      return;
    }
    const imported = importBundle(text, { graphs: [] });
    if (!imported.ok || !imported.graphs.length) return;
    const incoming = imported.graphs[0];
    const selected = incoming.id === graph.id
      ? graph
      : result.graphs.find((item) => item.id === incoming.id) ?? incoming;
    if (selected.id !== graph.id && session.runActive) {
      setNotice("Finish or resolve the active run before importing a different workflow.");
      return;
    }
    const transition = persistWorkflowTransition(
      graph,
      selected,
      result.graphs,
      saveGraphs,
      saveGraphDraft,
    );
    if (!transition.ok) {
      setStorageError(
        transition.reason === "workflows"
          ? "The bundle could not be imported because browser storage is unavailable. Your current workflow is unchanged."
          : "The imported workflow could not be made active. Your current workflow is still open.",
      );
      return;
    }
    setStorageError(null);
    setDraftStorageError(null);
    if (selected.id !== graph.id) resetCanvasForWorkflow(selected);
    setNotice(
      `Imported ${result.added} workflow${result.added === 1 ? "" : "s"}${
        result.skipped ? ` · kept ${result.skipped} existing` : ""
      }.`,
    );
  }

  function openPalette(event: ReactMouseEvent<HTMLButtonElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    setPicker({ x: rect.left, y: rect.bottom + 6 });
  }

  // Escape closes the floating inspector card (the picker has its own).
  useEffect(() => {
    if (!selection || picker) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelection(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selection, picker]);

  const outline = useMemo(() => {
    const byId = new Map(graph.nodes.map((node) => [node.id, node]));
    const start = graph.nodes.find((node) => node.type === "start");
    const order: string[] = [];
    const seen = new Set<string>();
    const queue = start ? [start.id] : [];
    while (queue.length) {
      const id = queue.shift()!;
      if (seen.has(id)) continue;
      seen.add(id);
      if (byId.has(id)) order.push(id);
      for (const edge of graph.edges) if (edge.source === id) queue.push(edge.target);
    }
    for (const node of graph.nodes) if (!seen.has(node.id)) order.push(node.id);
    return order;
  }, [graph.nodes, graph.edges]);

  return (
    <main id="playground-main" tabIndex={-1} aria-label="Workflow playground" className="flex h-dvh min-h-0 flex-col overflow-hidden bg-page outline-none" onFocusCapture={history.onFocusCapture} onBlurCapture={history.onBlurCapture}>
      <header className="z-[60] flex min-h-14 shrink-0 flex-wrap items-center gap-2.5 border-b border-line bg-surface px-3 py-2">
        <Link
          href="/"
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[4px] px-2 text-[13px] font-medium text-ink transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          Back to site
        </Link>
        <span className="h-5 w-px bg-line" aria-hidden />
        <WorkflowSwitcher
          current={graph}
          savedWorkflows={savedWorkflows}
          disabled={session.runActive}
          onSelect={onSelectWorkflow}
          onCreateFromTemplate={() => createWorkflow("refund")}
          onRename={onRenameWorkflow}
        />
        {saved && savedGraph === graph ? <Badge variant="success">Saved</Badge> : null}
        {storageError || draftStorageError ? (
          <p role="alert" className="max-w-56 text-xs text-danger">
            {storageError ?? draftStorageError}
          </p>
        ) : null}
        {notice ? (
          <p
            role="status"
            className="hidden max-w-52 truncate font-mono text-[10px] text-muted lg:block"
          >
            {notice}
          </p>
        ) : null}
        <span className="ml-auto flex shrink-0 items-center gap-0.5">
          <Button
            variant="secondary"
            size="sm"
            className="min-h-11 shrink-0 px-2.5 sm:px-3"
            disabled={session.runActive}
            onClick={() => createWorkflow("blank")}
            aria-label="New workflow"
            title="New workflow"
          >
            <Plus className="size-3.5" aria-hidden="true" />
            <span>New workflow</span>
          </Button>
          <Button variant="ghost" size="sm" className="w-8 px-0" onClick={history.undo} disabled={!history.canUndo} title="Undo (Ctrl/Cmd+Z)">
            <Undo2 className="size-3.5" aria-hidden /><span className="sr-only">Undo</span>
          </Button>
          <Button variant="ghost" size="sm" className="w-8 px-0" onClick={history.redo} disabled={!history.canRedo} title="Redo (Ctrl/Cmd+Shift+Z)">
            <Redo2 className="size-3.5" aria-hidden /><span className="sr-only">Redo</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-8 px-0"
            onClick={onExport}
            title="Export a JSON bundle"
          >
            <Download className="size-3.5" aria-hidden />
            <span className="sr-only">Export a JSON bundle</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-8 px-0"
            onClick={() => fileRef.current?.click()}
            title="Import a JSON bundle"
          >
            <Upload className="size-3.5" aria-hidden />
            <span className="sr-only">Import a JSON bundle</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-8 px-0"
            onClick={save}
            title="Save workflow in this browser"
          >
            <Save className="size-3.5" aria-hidden />
            <span className="sr-only">Save workflow in this browser</span>
          </Button>
        </span>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          onChange={onImport}
        />
      </header>

      <div className="relative min-h-0 flex-1">
        <div ref={flowCanvasRef} className="flow-canvas absolute inset-0">
          <ReactFlow<FlowNode, FlowEdge>
            nodes={flowNodes}
            edges={flowEdges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, node) => setSelection({ kind: "node", id: node.id })}
            onEdgeClick={(_, edge) => setSelection({ kind: "edge", id: edge.id })}
            onPaneClick={() => setSelection(null)}
            fitView
            fitViewOptions={{ padding: 0.28 }}
            minZoom={0.35}
            maxZoom={1.5}
            defaultEdgeOptions={{ type: "builder" }}
            deleteKeyCode={["Backspace", "Delete"]}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={18}
              size={1}
              color="var(--border)"
            />
            <Controls position="top-left" showInteractive={false} />
          </ReactFlow>
        </div>

        <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5">
          <Button size="sm" onClick={openPalette}>
            <Plus className="size-3.5" aria-hidden />
            Add node
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setOutlineOpen((open) => !open)}
          >
            <ListTree className="size-3.5" aria-hidden />
            Outline
          </Button>
        </div>

        {outlineOpen ? (
          <aside
            aria-label="Workflow outline"
            className="panel-in absolute top-12 left-3 bottom-24 z-30 flex w-[min(320px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-panel border border-line bg-surface shadow-lg shadow-black/5"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-line px-3 py-1.5">
              <p className="font-mono text-[10px] text-muted uppercase">
                Outline · traversal order
              </p>
              <p className="font-mono text-[10px] text-muted">
                {graph.nodes.length}n · {graph.edges.length}e
              </p>
            </div>
            <ol className="min-h-0 flex-1 overflow-y-auto px-3">
              {outline.map((id) => {
                const node = graph.nodes.find((item) => item.id === id);
                if (!node) return null;
                const outgoing = graph.edges.filter((edge) => edge.source === id);
                return (
                  <li key={id} className="border-b border-line py-2 last:border-0">
                    <button
                      type="button"
                      onClick={() => setSelection({ kind: "node", id })}
                      className="flex w-full items-baseline justify-between gap-3 text-left"
                    >
                      <span className="min-w-0 text-sm text-ink">
                        <span className="mr-2 font-mono text-[9px] text-muted uppercase">
                          {NODE_LABELS[node.type]}
                        </span>
                        {node.label}
                      </span>
                      <span className="shrink-0 font-mono text-[10px] text-muted">
                        {outgoing.length ? `${outgoing.length} out` : "terminal"}
                      </span>
                    </button>
                    {outgoing.length ? (
                      <ul className="mt-0.5 space-y-0.5">
                        {outgoing.map((edge) => {
                          const target = graph.nodes.find(
                            (item) => item.id === edge.target,
                          );
                          return (
                            <li
                              key={edge.id}
                              className="font-mono text-[10px] text-muted"
                            >
                              → {target?.label ?? edge.target}
                              {edge.label ? ` (${edge.label})` : ""}
                            </li>
                          );
                        })}
                      </ul>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          </aside>
        ) : null}

        <NodeInspector
          key={selectedNode?.id ?? selectedEdge?.id ?? "none"}
          node={selectedNode}
          edge={selectedEdge}
          onClose={() => setSelection(null)}
          onNodeLabel={(label) => selectedNode && updateNodeLabel(selectedNode.id, label)}
          onNodeConfig={(patch) => selectedNode && updateNodeConfig(selectedNode.id, patch)}
          onNodeAgent={(patch) => selectedNode && updateNodeAgent(selectedNode.id, patch)}
          onEdgeLabel={(label) => selectedEdge && updateEdgeLabel(selectedEdge.id, label)}
          onDelete={deleteSelection}
          issues={selectedNode ? validation.nodeErrors.get(selectedNode.id) ?? [] : []}
          onDuplicate={() => {
            if (!selectedNode) return;
            const copy = duplicateNode(selectedNode);
            if (!copy) return;
            setGraph((current) => ({ ...current, nodes: [...current.nodes, copy] }));
            setSelection({ kind: "node", id: copy.id });
            setSaved(false);
          }}
        />

        <RunDock
          session={session}
          runInput={runInput}
          onRunInput={setRunInput}
          issues={issues}
          graph={graph}
        />

        {picker ? (
          <NodePicker
            x={picker.x}
            y={picker.y}
            onClose={() => setPicker(null)}
            onPick={(kind) => {
              if (picker.edgeId) {
                insertOnEdge(kind, picker.edgeId);
              } else {
                // Offset the spawn point so a fresh node clears the toolbar
                // chips and the zoom controls it was dropped next to.
                addNode(
                  kind,
                  screenToFlowPosition({ x: picker.x + 48, y: picker.y + 56 }),
                );
              }
            }}
          />
        ) : null}
      </div>
    </main>
  );
}
