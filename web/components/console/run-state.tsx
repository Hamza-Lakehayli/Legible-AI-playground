import { CircleCheck, CircleX, Clock, PauseCircle, CircleDot, Ban } from "lucide-react";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import type { LucideIcon } from "lucide-react";

/**
 * Run states must be explicit — text and icons, never color alone
 * (brief §7). One component so the playground, trace, and dashboard
 * cannot drift apart.
 */
export type RunStateKind =
  | "queued"
  | "running"
  | "waiting"
  | "completed"
  | "failed"
  | "expired"
  | "cancelled";

const stateConfig: Record<
  RunStateKind,
  { label: string; icon: LucideIcon; variant: BadgeVariant }
> = {
  queued: { label: "Queued", icon: Clock, variant: "neutral" },
  running: { label: "Running", icon: CircleDot, variant: "accent" },
  waiting: { label: "Waiting for approval", icon: PauseCircle, variant: "warning" },
  completed: { label: "Completed", icon: CircleCheck, variant: "success" },
  failed: { label: "Failed", icon: CircleX, variant: "danger" },
  expired: { label: "Expired", icon: Clock, variant: "warning" },
  cancelled: { label: "Cancelled", icon: Ban, variant: "neutral" },
};

export function RunState({
  state,
  className,
}: {
  state: RunStateKind;
  className?: string;
}) {
  const config = stateConfig[state];
  return (
    <Badge variant={config.variant} className={className}>
      <config.icon className="size-3" aria-hidden />
      {config.label}
    </Badge>
  );
}
