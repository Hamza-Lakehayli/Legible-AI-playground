"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";
import { ButtonLink, buttonVariants } from "@/components/ui/button";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Text links with a restrained accent underline for the active route. */
export function DesktopNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="hidden items-center gap-7 md:flex">
      {site.nav.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={isActive(pathname, item.href) ? "page" : undefined}
          className={cn(
            "text-sm underline-offset-8 transition-colors hover:text-ink",
            isActive(pathname, item.href)
              ? "font-medium text-ink underline decoration-accent decoration-2"
              : "text-muted",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

/** Simple accessible disclosure — no floating pill nav (brief §6). */
export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="mobile-nav"
        aria-label={open ? "Close menu" : "Open menu"}
        className="inline-flex h-10 w-10 items-center justify-center rounded-control text-ink hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
      </button>
      {open ? (
        <div
          id="mobile-nav"
          className="absolute inset-x-0 top-full border-b border-line bg-page px-6 pt-2 pb-6"
        >
          <nav aria-label="Main mobile" className="flex flex-col">
            {site.nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={isActive(pathname, item.href) ? "page" : undefined}
                className={cn(
                  "border-l-2 py-3 text-sm",
                  isActive(pathname, item.href)
                    ? "border-accent font-medium text-ink"
                    : "border-transparent text-muted",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-4 flex flex-col gap-2">
            <ButtonLink href="/login" variant="secondary" onClick={() => setOpen(false)}>
              Log in
            </ButtonLink>
            <ButtonLink
              href="/playground"
              className={buttonVariants()}
              onClick={() => setOpen(false)}
            >
              Open playground
            </ButtonLink>
          </div>
        </div>
      ) : null}
    </div>
  );
}
