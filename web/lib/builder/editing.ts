import { newId, type WorkflowNode, type WorkflowSpec } from "./schema";

export function duplicateNode(node: WorkflowNode): WorkflowNode | null {
  if (node.type === "start" || node.type === "end") return null;
  return {
    ...structuredClone(node), id: newId("node"),
    label: `${node.label || node.type} copy`.slice(0, 80),
    position: { x: node.position.x + 24, y: node.position.y + 28 },
  };
}

/** Local autosave is not permission to discard an authored draft. */
export function hasMeaningfulWork(graph: WorkflowSpec): boolean {
  return graph.nodes.some((node) => node.type !== "start" && node.type !== "end") ||
    graph.nodes.length !== 2 || graph.edges.length !== 1 ||
    graph.nodes.some((node) => Object.keys(node.config).length > 0 ||
      node.label !== (node.type === "start" ? "Start" : "End") ||
      node.position.x !== 320 || node.position.y !== (node.type === "start" ? 0 : 200)) ||
    Boolean(graph.name.trim() && graph.name !== "Untitled workflow");
}
