import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";

/** Designed empty state (spec: empty/loading/error are designed first). */
export function EmptyState({
  icon: Icon,
  title,
  detail,
  action,
}: {
  icon: LucideIcon;
  title: string;
  detail: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="flex flex-col items-start gap-3 px-6 py-10">
      <Icon className="size-5 text-muted" aria-hidden />
      <div>
        <p className="text-sm font-medium text-ink">{title}</p>
        <p className="mt-1 max-w-md text-sm/6 text-muted">{detail}</p>
      </div>
      {action ? (
        <ButtonLink href={action.href} variant="secondary" size="sm">
          {action.label}
        </ButtonLink>
      ) : null}
    </div>
  );
}

/** Inline hint used across placeholder pages until their milestone lands. */
export function MilestoneNote({
  milestone,
  children,
}: {
  milestone: string;
  children: React.ReactNode;
}) {
  return (
    <p className="border-t border-line px-6 py-4 font-mono text-xs text-muted">
      {children} <span className="text-accent-ink">{milestone}</span>
    </p>
  );
}

export function WidgetLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="text-sm font-medium text-accent-ink underline-offset-4 hover:underline"
    >
      {label}
    </Link>
  );
}
