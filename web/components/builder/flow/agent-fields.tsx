"use client";

import { Input } from "@/components/ui/input";
import {
  MCP_PRESETS,
  HOOK_PRESETS,
  SKILL_PRESETS,
  TOOL_IDS,
  TOOL_LABELS,
  TOOL_DESCRIPTIONS,
  type AgentCard,
  type ToolId,
} from "@/lib/builder/schema";
import { cn } from "@/lib/utils";

const compactMono =
  "w-full rounded-[4px] border border-line bg-surface px-2 py-1.5 font-mono text-xs/5 text-ink transition-colors focus:border-accent focus:outline-2 focus:-outline-offset-2 focus:outline-accent";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="font-mono text-[9px] text-muted uppercase">{label}</span>
      <span className="mt-1 block">{children}</span>
      {hint ? <span className="mt-1 block text-[11px]/4 text-muted">{hint}</span> : null}
    </label>
  );
}

function ChipList({
  label,
  presets,
  selected,
  onToggle,
  note,
}: {
  label: string;
  presets: { id: string; label: string }[];
  selected: string[];
  onToggle: (id: string) => void;
  note: string;
}) {
  return (
    <div>
      <p className="font-mono text-[10px] text-muted uppercase">{label}</p>
      <div className="mt-1 flex flex-wrap gap-1.5" role="group" aria-label={label}>
        {presets.map((preset) => {
          const on = selected.includes(preset.id);
          return (
            <button
              key={preset.id}
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(preset.id)}
              className={cn(
                "rounded-[4px] border px-1.5 py-1 font-mono text-[10px] transition-colors",
                on
                  ? "border-accent bg-accent-soft text-accent-ink"
                  : "border-line bg-surface text-muted hover:border-muted hover:text-ink",
              )}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
      <p className="mt-1 text-[11px]/4 text-muted">{note}</p>
    </div>
  );
}

/**
 * The agent config card, rendered wherever an Agent node is selected.
 * Same fields as the plan's standalone agent card; the node carries it.
 */
export function AgentFields({
  agent,
  onChange,
}: {
  agent: AgentCard;
  onChange: (patch: Partial<AgentCard>) => void;
}) {
  const toggleIn = <T,>(list: readonly T[], id: T): T[] =>
    list.includes(id) ? list.filter((item) => item !== id) : [...list, id];

  return (
    <div className="space-y-3.5">
      <Field label="Name">
        <Input
          value={agent.name}
          maxLength={80}
          onChange={(event) => onChange({ name: event.target.value })}
          className="h-7 px-2 text-[13px]"
        />
      </Field>
      <Field label="Description">
        <Input
          value={agent.description}
          maxLength={240}
          onChange={(event) => onChange({ description: event.target.value })}
          className="h-7 px-2 text-[13px]"
        />
      </Field>
      <Field
        label="Model (optional)"
        hint="Leave blank for the runtime default (NIM on server)."
      >
        <Input
          value={agent.model ?? ""}
          maxLength={120}
          placeholder="runtime default"
          onChange={(event) =>
            onChange({ model: event.target.value.trim() || null })
          }
          className="h-7 px-2 font-mono text-xs"
        />
      </Field>
      <Field
        label="System prompt"
        hint="The runtime hands the task to the agent as the user message."
      >
        <textarea
          value={agent.systemPrompt}
          rows={5}
          maxLength={4000}
          onChange={(event) => onChange({ systemPrompt: event.target.value })}
          className={compactMono}
        />
      </Field>
      <div>
        <span className="font-mono text-[9px] text-muted uppercase">Tools</span>
        <ul className="mt-1 space-y-1">
          {TOOL_IDS.map((tool: ToolId) => {
            const on = agent.tools.includes(tool);
            const policy = agent.approval[tool] ?? "auto";
            return (
              <li
                key={tool}
                className={cn(
                  "rounded-[4px] border px-2 py-1.5 transition-colors",
                  on ? "border-line bg-surface" : "border-line/60 bg-surface/50",
                )}
              >
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() =>
                      onChange({
                        tools: toggleIn(agent.tools, tool),
                      })
                    }
                    className="size-3.5 accent-accent"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-mono text-[11px] text-ink">
                      {tool}
                    </span>
                    <span className="block text-[10px]/3 text-muted">
                      {TOOL_DESCRIPTIONS[tool]}
                    </span>
                  </span>
                  {on ? (
                    <select
                      value={policy}
                      aria-label={`Approval policy for ${TOOL_LABELS[tool]}`}
                      onChange={(event) =>
                        onChange({
                          approval: {
                            ...agent.approval,
                            [tool]: event.target.value as "ask" | "auto",
                          },
                        })
                      }
                      className="rounded-[4px] border border-line bg-surface px-1 py-0.5 font-mono text-[10px] text-ink focus:border-accent focus:outline-none"
                    >
                      <option value="ask">ask</option>
                      <option value="auto">auto</option>
                    </select>
                  ) : null}
                </label>
              </li>
            );
          })}
        </ul>
      </div>
      <ChipList
        label="MCP servers"
        presets={MCP_PRESETS}
        selected={agent.mcpServers}
        onToggle={(id) => onChange({ mcpServers: toggleIn(agent.mcpServers, id) })}
        note="Recorded with the card. v1 runs prompt, model, tools, and policy."
      />
      <ChipList
        label="Hooks"
        presets={HOOK_PRESETS}
        selected={agent.hooks}
        onToggle={(id) => onChange({ hooks: toggleIn(agent.hooks, id) })}
        note="Recorded with the card; the runtime gates tools by policy alone."
      />
      <ChipList
        label="Skills"
        presets={SKILL_PRESETS}
        selected={agent.skills}
        onToggle={(id) => onChange({ skills: toggleIn(agent.skills, id) })}
        note="Recorded with the card; not retrieved by the v1 runtime."
      />
    </div>
  );
}
