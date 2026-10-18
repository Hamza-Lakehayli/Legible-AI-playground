import { Badge } from "@/components/ui/badge";
import { ConsolePanel } from "@/components/console/panel";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  FileText,
  Filter,
  Mail,
  ShieldCheck,
  Webhook,
} from "lucide-react";

/**
 * Small, honest interface mockups used across offering pages and the home
 * page. All static, all labelled as previews — never fake "live" states.
 * Light-theme panels built on the shared console frame.
 */

function PanelFrame({
  title,
  right,
  children,
  className,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <ConsolePanel
      title={title}
      right={right}
      surface="surface"
      className={className}
    >
      {children}
    </ConsolePanel>
  );
}

/** Governed agents: the approval decision panel. */
export function ApprovalPreview({ className }: { className?: string }) {
  return (
    <PanelFrame
      title="governed-agent / approval"
      right={<Badge variant="warning">HIGH RISK</Badge>}
      className={className}
    >
      <div className="space-y-4 px-4 py-4">
        <div>
          <p className="text-xs font-medium text-ink">Proposed arguments</p>
          <pre className="mt-2 overflow-x-auto rounded-[4px] border border-line bg-surface-muted p-3 font-mono text-[12px]/5 text-ink">
            {`{
  "order_id": "4821",
  "amount": "49.90 EUR",
  "reason": "late delivery"
}`}
          </pre>
        </div>
        <p className="flex items-start gap-2 text-[13px]/5 text-muted">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          Policy requires a human decision: refunds over 50 EUR are high risk.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button className="h-8 rounded-control border border-line px-3 text-[13px] text-danger hover:bg-danger/5">
            Reject
          </button>
          <button className="h-8 rounded-control border border-line px-3 text-[13px] text-ink hover:bg-surface-muted">
            Edit arguments
          </button>
          <button className="h-8 rounded-control border border-line px-3 text-[13px] text-ink hover:bg-surface-muted">
            Approve
          </button>
        </div>
        <p className="font-mono text-[11px] text-muted">
          approve is not preselected for high-risk actions · expires in 09:42
        </p>
      </div>
    </PanelFrame>
  );
}

/** MCP explorer: server list + schema-driven form. */
export function WorkbenchPreview({ className }: { className?: string }) {
  return (
    <PanelFrame
      title="mcp explorer / crm"
      right={<Badge variant="success">CONNECTED</Badge>}
      className={className}
    >
      <div className="grid sm:grid-cols-[150px_1fr]">
        <ul className="border-b border-line sm:border-r sm:border-b-0">
          {[
            { name: "crm", active: true },
            { name: "orders", active: false },
            { name: "docs", active: false },
          ].map((s) => (
            <li
              key={s.name}
              className={cn(
                "border-l-2 px-3 py-2.5 font-mono text-xs",
                s.active
                  ? "border-l-accent bg-surface-muted text-ink"
                  : "border-l-transparent text-muted",
              )}
            >
              {s.name}
            </li>
          ))}
        </ul>
        <div className="space-y-3 px-4 py-4">
          <div>
            <p className="font-mono text-xs text-ink">crm.search_companies</p>
            <p className="mt-1 text-[12px]/5 text-muted">
              Search companies by name or domain. Returns up to `limit` matches.
            </p>
          </div>
          <div>
            <label className="text-[11px] font-medium text-ink">query (required)</label>
            <div className="mt-1 h-8 rounded-[4px] border border-line bg-page px-2 leading-8 font-mono text-xs text-muted">
              acme
            </div>
          </div>
          <div>
            <label className="text-[11px] font-medium text-ink">limit (integer)</label>
            <div className="mt-1 h-8 w-24 rounded-[4px] border border-line bg-page px-2 leading-8 font-mono text-xs text-muted">
              10
            </div>
          </div>
          <button className="h-8 rounded-control bg-accent px-3 text-[13px] font-medium text-white">
            Run tool
          </button>
        </div>
      </div>
    </PanelFrame>
  );
}

/** Multi-agent: readable delegation trace. */
export function TracePreview({ className }: { className?: string }) {
  const rows = [
    { depth: 0, name: "supervisor", detail: "split task into 2 subtasks", icon: Filter },
    { depth: 1, name: "worker:research", detail: "gathered order history", icon: FileText },
    { depth: 1, name: "worker:draft", detail: "wrote customer reply (486 tokens)", icon: Mail },
    { depth: 0, name: "supervisor", detail: "merged results → run.completed", icon: ArrowRight },
  ];
  return (
    <PanelFrame title="multi-agent / trace" className={className}>
      <ul className="divide-y divide-line">
        {rows.map((r, i) => (
          <li key={i} className="flex items-center gap-3 px-4 py-2.5">
            <span style={{ paddingLeft: r.depth * 20 }} className="flex min-w-0 items-center gap-2">
              <r.icon className="size-3.5 shrink-0 text-muted" aria-hidden />
              <span className="font-mono text-xs text-ink">{r.name}</span>
            </span>
            <span className="ml-auto truncate text-[12px] text-muted">{r.detail}</span>
          </li>
        ))}
      </ul>
    </PanelFrame>
  );
}

/** Skills: side-by-side comparison. */
export function ComparePreview({ className }: { className?: string }) {
  return (
    <PanelFrame title="skills / with and without" className={className}>
      <div className="grid divide-line sm:grid-cols-2 sm:divide-x">
        <div className="border-l-2 border-l-accent px-4 py-4">
          <p className="font-mono text-[11px] text-accent-ink">WITH SKILL</p>
          <p className="mt-2 text-[13px]/6 text-ink">
            "Your order #4821 ships Thursday. Refund issued for the delay — no action
            needed."
          </p>
        </div>
        <div className="px-4 py-4">
          <p className="font-mono text-[11px] text-muted">WITHOUT</p>
          <p className="mt-2 text-[13px]/6 text-muted">
            "Your order has been processed and should arrive soon. Let us know if you
            have questions."
          </p>
        </div>
      </div>
      <div className="border-t border-line px-4 py-2">
        <p className="font-mono text-[11px] text-muted">
          same input · same model · the skill changed tone and specificity
        </p>
      </div>
    </PanelFrame>
  );
}

/** Automations: trigger → steps → gate → result. */
export function WorkflowPreview({ className }: { className?: string }) {
  const steps = [
    { name: "trigger", detail: "ticket.created #9102", done: true, icon: Webhook },
    { name: "triage", detail: "classified: billing · p2", done: true, icon: Filter },
    { name: "draft", detail: "reply drafted (312 tokens)", done: true, icon: FileText },
    { name: "gate", detail: "waiting for approval", done: false, icon: ShieldCheck, warn: true },
    { name: "send", detail: "held until approved", done: false, icon: Mail },
  ];
  return (
    <PanelFrame title="automation / ticket-triage" className={className}>
      <ol className="px-4 py-4">
        {steps.map((s, i) => (
          <li key={s.name} className="relative flex gap-3 pb-4 last:pb-0">
            {i < steps.length - 1 ? (
              <span
                aria-hidden
                className="absolute top-5 left-[7px] h-full w-px bg-line"
              />
            ) : null}
            <span
              className={cn(
                "z-10 flex size-4 shrink-0 items-center justify-center rounded-full border bg-surface",
                s.done
                  ? "border-accent"
                  : s.warn
                    ? "border-warning"
                    : "border-line",
              )}
            >
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  s.done ? "bg-accent" : s.warn ? "bg-warning" : "bg-line",
                )}
              />
            </span>
            <div className="min-w-0">
              <p className="flex items-center gap-2 font-mono text-xs text-ink">
                {s.name}
                {s.warn ? <Badge variant="warning">GATE</Badge> : null}
              </p>
              <p className="mt-0.5 text-[12px]/5 text-muted">{s.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </PanelFrame>
  );
}

/** Consulting: packages as written scopes. */
export function ScopesPreview({ className }: { className?: string }) {
  const packages = [
    { name: "Audit", price: "1,900 USD", detail: "Two weeks · findings report + prioritized risks" },
    { name: "Architecture", price: "3,400 USD", detail: "Three weeks · design doc + decision records" },
    { name: "Build sprint", price: "4,900 USD", detail: "Four weeks · one shipped, governed workflow" },
  ];
  return (
    <PanelFrame title="consulting / packages" className={className}>
      <ul className="divide-y divide-line">
        {packages.map((p) => (
          <li key={p.name} className="flex items-center gap-3 px-4 py-3">
            <span className="w-28 text-sm font-medium text-ink">{p.name}</span>
            <span className="font-mono text-xs text-accent-ink">{p.price}</span>
            <span className="ml-auto truncate text-[12px] text-muted">{p.detail}</span>
          </li>
        ))}
      </ul>
      <div className="border-t border-line px-4 py-2">
        <p className="font-mono text-[11px] text-muted">
          one-off checkout · test mode in this showcase · booking link after payment
        </p>
      </div>
    </PanelFrame>
  );
}

/** Map an offering's preview key to its mockup. */
export function OfferingPreview({
  preview,
  className,
}: {
  preview: string;
  className?: string;
}) {
  switch (preview) {
    case "approval":
      return <ApprovalPreview className={className} />;
    case "workbench":
      return <WorkbenchPreview className={className} />;
    case "trace":
      return <TracePreview className={className} />;
    case "compare":
      return <ComparePreview className={className} />;
    case "workflow":
      return <WorkflowPreview className={className} />;
    case "scopes":
      return <ScopesPreview className={className} />;
    default:
      return null;
  }
}
