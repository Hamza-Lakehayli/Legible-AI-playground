import Link from "next/link";
import { Container } from "@/components/ui/layout";
import { site } from "@/lib/site";
import { offerings } from "@/lib/content/offerings";

export function SiteFooter() {
  const year = site.foundedYear;

  return (
    <footer className="border-t border-line">
      <Container className="py-12">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <p className="flex items-baseline gap-1">
              <span className="text-lg font-semibold tracking-tight">{site.name}</span>
              <span className="font-mono text-sm text-accent">/ai</span>
            </p>
            <p className="mt-3 max-w-xs text-sm/6 text-muted">
              {site.tagline}. Built in the open as a Next.js showcase — billing runs in
              Polar sandbox mode, nothing is sold, and every demo tool is a mock.
            </p>
          </div>

          <nav aria-label="Work">
            <p className="font-mono text-xs font-medium tracking-[0.14em] text-muted uppercase">
              Work
            </p>
            <ul className="mt-3 space-y-2">
              {offerings.map((o) => (
                <li key={o.slug}>
                  <Link
                    href={`/offerings/${o.slug}`}
                    className="text-sm text-muted transition-colors hover:text-ink"
                  >
                    {o.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Site">
            <p className="font-mono text-xs font-medium tracking-[0.14em] text-muted uppercase">
              Site
            </p>
            <ul className="mt-3 space-y-2">
              {site.nav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-muted transition-colors hover:text-ink"
                  >
                    {item.label}
                  </Link>
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
