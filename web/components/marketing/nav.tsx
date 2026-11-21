"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";
import { PlaygroundEntryLink } from "@/components/transitions/playground-entry-link";

function isActive(pathname: string, href: string) {
  const route = href.split("#")[0] || "/";
  if (route === "/") return pathname === "/";
  return pathname === route || pathname.startsWith(`${route}/`);
}

/** Text links with a restrained accent underline for the active route. */
export function DesktopNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="hidden items-center gap-7 md:flex">
      {site.nav.map((item) => item.href === "/playground" ? (
        <PlaygroundEntryLink key={item.href} className="text-sm text-muted underline-offset-8 transition-colors hover:text-ink">
          {item.label}
        </PlaygroundEntryLink>
      ) : (
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
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;

    const previousOverflow = document.body.style.overflow;
    const closeOnDesktopResize = () => {
      if (window.matchMedia("(min-width: 768px)").matches) setOpen(false);
    };
    document.body.style.overflow = "hidden";
    if (!dialog.open) dialog.showModal();
    closeButtonRef.current?.focus({ preventScroll: true });
    window.addEventListener("resize", closeOnDesktopResize);

    return () => {
      window.removeEventListener("resize", closeOnDesktopResize);
      document.body.style.overflow = previousOverflow;
      if (dialog.open) dialog.close();
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        data-playground-focus-fallback
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="mobile-nav-dialog"
        aria-label={open ? "Close menu" : "Open menu"}
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-control text-ink hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <Menu className="size-5" aria-hidden />
      </button>

      <dialog
        ref={dialogRef}
        id="mobile-nav-dialog"
        aria-labelledby="mobile-nav-title"
        className="mobile-nav-dialog"
        onCancel={(event) => {
          event.preventDefault();
          setOpen(false);
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}
      >
        <div className="mobile-nav-sheet">
          <div className="mobile-nav-handle" aria-hidden="true" />
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-xs font-medium tracking-[0.14em] text-accent-ink uppercase">
                {site.name} <span className="text-muted">/ai</span>
              </p>
              <h2
                id="mobile-nav-title"
                className="mt-2 text-2xl font-semibold tracking-tight text-ink"
              >
                Explore the site
              </h2>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-control border border-line bg-surface text-ink hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>

          <nav aria-label="Main mobile" className="mt-6">
            <ul className="divide-y divide-line border-y border-line">
              {site.nav.filter((item) => item.href !== "/playground").map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group flex min-h-14 items-center justify-between gap-4 px-2 text-base focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent",
                        active ? "font-medium text-ink" : "text-muted hover:text-ink",
                      )}
                    >
                      <span className="flex items-center gap-3">
                        <span
                          aria-hidden="true"
                          className={cn(
                            "size-2 rounded-full",
                            active ? "bg-accent" : "bg-line group-hover:bg-accent/50",
                          )}
                        />
                        {item.label}
                      </span>
                      {active ? (
                        <span className="font-mono text-[10px] tracking-[0.12em] text-accent-ink uppercase">
                          Current
                        </span>
                      ) : (
                        <ArrowUpRight className="size-4 text-muted" aria-hidden="true" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="mt-5 grid gap-2">
            <PlaygroundEntryLink
              variant="primary"
              onClick={() => setOpen(false)}
              className="min-h-12 w-full justify-between px-4"
            >
              <span>Open Playground</span>
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </PlaygroundEntryLink>
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="flex min-h-11 items-center justify-center rounded-control px-4 text-sm text-muted hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Log in
            </Link>
          </div>
        </div>
      </dialog>
    </div>
  );
}
