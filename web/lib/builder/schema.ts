import { z } from "zod";

/**
 * Builder schemas — the single source of truth for what the canvas can draw
 * and what the runtime can execute. The runtime mirrors these in
 * runtime/app/builder.py; `validateWorkflow` mirrors its structural checks so
 * the canvas can explain problems before a run is attempted.
 */

export const TOOL_IDS = ["orders.lookup", "orders.refund"] as const;
export type ToolId = (typeof TOOL_IDS)[number];

export const TOOL_LABELS: Record<ToolId, string> = {
  "orders.lookup": "Order lookup · read-only",
  "orders.refund": "Mock refund · writes, asks first",
};

export const TOOL_DESCRIPTIONS: Record<ToolId, string> = {
  "orders.lookup": "Reads seeded demo order data. Safe to auto-approve.",
  "orders.refund": "Requests a mock refund. Human approval is the default.",
};

/** The seeded demo order — the only data the mock tools accept. */
export const TOOL_EXAMPLE_ARGUMENTS: Record<ToolId, Record<string, string>> = {
  "orders.lookup": { order_id: "4821" },
  "orders.refund": { order_id: "4821", amount: "49.90" },
};

export const NODE_KINDS = [
  "start",
  "agent",
  "llm",
  "tool",
  "decision",
  "end",
] as const;
export type NodeKind = (typeof NODE_KINDS)[number];

export const NODE_LABELS: Record<NodeKind, string> = {
  start: "Start",
  agent: "Agent",
  llm: "LLM call",
  tool: "Tool",
  decision: "Decision",
  end: "End",
};

export const NODE_DESCRIPTIONS: Record<NodeKind, string> = {
  start: "Where the run begins. Exactly one per workflow.",
  agent: "Runs an agent you built (prompt, model, tools, policy).",
  llm: "One model call with a prompt template.",
  tool: "Calls a mock tool directly.",
  decision: "Branches on the previous output.",
  end: "Stops the run and reports its output.",
};

/**
 * The agent config card that lives inside an Agent node (the old standalone
 * agent builder's fields). Parsing stays lenient on purpose — the live card
 * must survive a half-typed field, and `validateWorkflow` explains what a run
 * needs instead of dropping the draft over it.
 */
export const agentCardSchema = z.object({
  name: z.string().max(80).default("Agent"),
  description: z.string().max(240).default(""),
  model: z.string().max(120).nullable().default(null),
  systemPrompt: z.string().max(4000).default(""),
  tools: z.array(z.enum(TOOL_IDS)).default([]),
  approval: z.record(z.string(), z.enum(["ask", "auto"])).default({}),
  mcpServers: z.array(z.string().max(60)).default([]),
  hooks: z.array(z.string().max(60)).default([]),
  skills: z.array(z.string().max(60)).default([]),
});

export type AgentCard = z.infer<typeof agentCardSchema>;

export const nodeConfigSchema = z
  .object({
    agent: agentCardSchema.optional(),
    input: z.string().max(4000).optional(),
    prompt: z.string().max(4000).optional(),
    tool: z.enum(TOOL_IDS).optional(),
    arguments: z.record(z.string(), z.unknown()).optional(),
    approval: z.enum(["ask", "auto"]).optional(),
    mode: z.enum(["always", "contains", "equals"]).optional(),
    value: z.string().max(400).optional(),
    trueLabel: z.string().max(40).optional(),
    falseLabel: z.string().max(40).optional(),
  })
  .default({});

export type NodeConfig = z.infer<typeof nodeConfigSchema>;

export const workflowNodeSchema = z.object({
  id: z.string().min(1).max(64),
  type: z.enum(NODE_KINDS),
  label: z.string().max(80).default(""),
  position: z.object({ x: z.number(), y: z.number() }),
  config: nodeConfigSchema,
});

export const workflowEdgeSchema = z.object({
  id: z.string().min(1).max(80),
  source: z.string().min(1).max(64),
  target: z.string().min(1).max(64),
  label: z.string().max(40).optional(),
});

export const workflowSchema = z.object({
  id: z.string().min(1).max(64),
  // Lenient: the header field must survive being cleared mid-edit; the
  // UI falls back to "Untitled workflow" for display.
  name: z.string().max(80).default(""),
  nodes: z.array(workflowNodeSchema).max(40),
  edges: z.array(workflowEdgeSchema).max(80),
  createdAt: z.string().default(""),
  updatedAt: z.string().default(""),
});

export type WorkflowNode = z.infer<typeof workflowNodeSchema>;
export type WorkflowEdge = z.infer<typeof workflowEdgeSchema>;
export type WorkflowSpec = z.infer<typeof workflowSchema>;

export const MCP_PRESETS = [
  { id: "mcp_orders", label: "orders · seeded demo server" },
  { id: "mcp_tickets", label: "tickets · seeded demo server" },
];

export const HOOK_PRESETS = [
  { id: "hook_redact", label: "Redact PII before the model sees it" },
  { id: "hook_audit", label: "Attach the actor to every tool call" },
];

export const SKILL_PRESETS = [
  { id: "skill_refund_policy", label: "Refund policy" },
  { id: "skill_tone", label: "Support tone guide" },
];

export function newId(prefix: string): string {
  const random =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID().replace(/-/g, "").slice(0, 12)
      : Math.random().toString(36).slice(2, 14);
  return `${prefix}_${random}`;
}

export function emptyAgentCard(): AgentCard {
  return {
    name: "Support agent",
    description: "",
    model: null,
    systemPrompt:
      "You are a support agent in a sandbox. Only use the provided tools and seeded demo data. Never claim a write happened before the tool returns success.",
    tools: ["orders.lookup"],
    approval: { "orders.refund": "ask" },
    mcpServers: [],
    hooks: [],
    skills: [],
  };
}

/** Every structural problem in the graph, ready to show in the panel. */
export function validateWorkflow(
  graph: Pick<WorkflowSpec, "nodes" | "edges">,
): string[] {
  const errors: string[] = [];
  const ids = graph.nodes.map((node) => node.id);
  if (ids.length !== new Set(ids).size) errors.push("Node ids must be unique.");
  const known = new Set(ids);
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));

  const starts = graph.nodes.filter((node) => node.type === "start");
  const ends = graph.nodes.filter((node) => node.type === "end");
  if (starts.length !== 1) errors.push("The workflow needs exactly one Start node.");
  if (ends.length === 0) errors.push("The workflow needs at least one End node.");

  for (const edge of graph.edges) {
    if (!known.has(edge.source)) errors.push(`Edge ${edge.id} starts at a missing node.`);
    if (!known.has(edge.target)) errors.push(`Edge ${edge.id} points at a missing node.`);
  }

  const outgoing = new Map<string, WorkflowEdge[]>();
  for (const id of known) outgoing.set(id, []);
  for (const edge of graph.edges) {
    if (outgoing.has(edge.source)) outgoing.get(edge.source)!.push(edge);
  }

  if (starts.length === 1) {
    const seen = new Set([starts[0].id]);
    const queue = [starts[0].id];
    while (queue.length) {
      const current = queue.shift()!;
      for (const edge of outgoing.get(current) ?? []) {
        if (known.has(edge.target) && !seen.has(edge.target)) {
          seen.add(edge.target);
          queue.push(edge.target);
        }
      }
    }
    for (const node of graph.nodes) {
      if (!seen.has(node.id)) {
        errors.push(`Node “${node.label || node.id}” is unreachable from Start.`);
      }
    }
  }

  for (const node of graph.nodes) {
    const name = node.label || node.id;
    const branches = outgoing.get(node.id) ?? [];
    if (node.type === "end" && branches.length) {
      errors.push(`End node “${name}” cannot have outgoing edges.`);
    }
    if (node.type !== "end" && branches.length === 0) {
      errors.push(`Node “${name}” has no outgoing edge.`);
    }
    if (node.type === "decision") {
      if (!branches.length) errors.push(`Decision “${name}” needs at least one branch.`);
      const unlabeled = branches.some((edge) => !(edge.label ?? "").trim());
      if (unlabeled) {
        errors.push(`Every branch out of “${name}” needs a label.`);
      } else if (branches.length) {
        // The walker picks a branch by comparing its label to the configured
        // true/false label; a mismatch would only fail mid-run, so catch it here.
        const labels = new Set(
          branches.map((edge) => (edge.label ?? "").trim().toLowerCase()),
        );
        const trueLabel = String(node.config.trueLabel ?? "yes").trim().toLowerCase();
        if (!labels.has(trueLabel)) {
          errors.push(`Decision “${name}” has no “${trueLabel}” branch.`);
        }
        if (String(node.config.mode ?? "always") !== "always") {
          const falseLabel = String(node.config.falseLabel ?? "no")
            .trim()
            .toLowerCase();
          if (!labels.has(falseLabel) && !labels.has("default")) {
            errors.push(
              `Decision “${name}” has no “${falseLabel}” branch (or a “default”).`,
            );
          }
        }
      }
    }
    if (node.type === "agent") {
      const card = node.config.agent;
      if (!card) {
        errors.push(`Agent node “${name}” needs its config card.`);
      } else if (!card.systemPrompt.trim()) {
        errors.push(`Agent node “${name}” needs a system prompt.`);
      }
    }
    if (node.type === "tool" && !node.config.tool) {
      errors.push(`Tool node “${name}” has no tool selected.`);
    }
    if (node.type === "llm" && !(node.config.prompt ?? "").trim()) {
      errors.push(`LLM node “${name}” needs a prompt.`);
    }
  }

  // Keep the map alive for readability in devtools; validation is pure.
  void byId;
  return [...new Set(errors)];
}

/**
 * Strip canvas-only fields for the runtime payload. Agent nodes carry their
 * config card inline; the runtime looks specs up by node id, so the payload
 * marks the config's agent as this node's own.
 */
export function toRuntimeGraph(graph: WorkflowSpec) {
  return {
    name: graph.name,
    nodes: graph.nodes.map((node) => {
      if (node.type !== "agent" || !node.config.agent) {
        return {
          id: node.id,
          type: node.type,
          label: node.label,
          config: node.config,
        };
      }
      const { agent, ...config } = node.config;
      void agent;
      return {
        id: node.id,
        type: node.type,
        label: node.label,
        config: { ...config, agentId: node.id },
      };
    }),
    edges: graph.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label ?? null,
    })),
  };
}

/** The runtime's snake_case agent spec. */
export function toRuntimeAgent(agent: AgentCard) {
  return {
    name: agent.name || "Agent",
    description: agent.description,
    model: agent.model || null,
    system_prompt: agent.systemPrompt,
    tools: agent.tools,
    approval: agent.approval,
  };
}

/** Agent cards are embedded in the nodes; the runtime wants a spec per id. */
export function collectAgents(
  graph: Pick<WorkflowSpec, "nodes">,
): Record<string, ReturnType<typeof toRuntimeAgent>> {
  const agents: Record<string, ReturnType<typeof toRuntimeAgent>> = {};
  for (const node of graph.nodes) {
    if (node.type === "agent" && node.config.agent) {
      agents[node.id] = toRuntimeAgent(node.config.agent);
    }
  }
  return agents;
}

// Bundles carry graphs; agent configs travel inside their agent nodes.
// Unknown keys (e.g. an older bundle's `agents`) are stripped by zod.
export const bundleSchema = z.object({
  version: z.literal(1),
  graphs: z.array(workflowSchema),
});

export type BuilderBundle = z.infer<typeof bundleSchema>;

export function parseBundle(text: string):
  | { bundle: BuilderBundle }
  | { error: string } {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { error: "That file is not valid JSON." };
  }
  const parsed = bundleSchema.safeParse(json);
  if (!parsed.success) {
    return { error: "That file is not a Legible builder bundle." };
  }
  return { bundle: parsed.data };
}
