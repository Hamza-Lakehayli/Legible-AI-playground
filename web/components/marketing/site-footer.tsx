import Link from "next/link";
import { Container } from "@/components/ui/layout";
import { site } from "@/lib/site";
import { PlaygroundEntryLink } from "@/components/transitions/playground-entry-link";

export function SiteFooter() {
  const year = site.foundedYear;

  return (
    <footer className="border-t border-line">
      <Container className="max-w-7xl py-12">
        <div className="grid gap-10 md:grid-cols-[1fr_auto]">
          <div>
            <p className="flex items-baseline gap-1">
              <span className="text-lg font-semibold tracking-tight">{site.name}</span>
              <span className="font-mono text-sm text-accent">/ai</span>
            </p>
            <p className="mt-3 max-w-xs text-sm/6 text-muted">
              {site.tagline}. A working product demo; Playground tools use seeded
              data and do not change external systems.
            </p>
          </div>

          <nav aria-label="Product">
            <p className="font-mono text-xs font-medium tracking-[0.14em] text-muted uppercase">
              Product
            </p>
            <ul className="mt-3 space-y-2">
              {site.nav.map((item) => (
                <li key={item.href}>
                  {item.href === "/playground" ? (
                    <PlaygroundEntryLink className="text-sm text-muted transition-colors hover:text-ink">
                      {item.label}
                    </PlaygroundEntryLink>
                  ) : (
                    <Link
                      href={item.href}
                      className="text-sm text-muted transition-colors hover:text-ink"
                    >
                      {item.label}
                    </Link>
                  )}
                </li>
              ))}
              <li>
                <Link
                  href="/login"
                  className="text-sm text-muted transition-colors hover:text-ink"
                >
                  Log in
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
          <p className="text-sm text-muted">
            © {year} {site.name}
          </p>
          <p className="font-mono text-xs text-muted">
            Next.js · Tailwind · Postgres · FastAPI runtime
          </p>
        </div>
      </Container>
    </footer>
  );
}
