"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, ScrollText, ShieldCheck, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "Overview", icon: LayoutGrid },
  { href: "/dashboard/runs", label: "Runs", icon: ScrollText },
  { href: "/dashboard/approvals", label: "Approvals", icon: ShieldCheck },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
];

/** Slim left indicator for the active destination — never a giant pill. */
export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Dashboard" className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
      {items.map((item) => {
        const active =
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2.5 border-l-2 px-3 py-2 text-sm transition-colors md:border-l-2",
              active
                ? "border-accent bg-surface-muted font-medium text-ink"
                : "border-transparent text-muted hover:bg-surface-muted hover:text-ink",
            )}
          >
            <item.icon className="size-4" aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
