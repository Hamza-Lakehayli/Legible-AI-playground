import Link from "next/link";
import { DesktopNav, MobileNav } from "@/components/marketing/nav";
import { AccountIsland } from "@/components/marketing/account-island";
import { Container } from "@/components/ui/layout";
import { site } from "@/lib/site";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-page">
      <Container>
        <div className="relative flex h-16 items-center justify-between gap-6">
          <Link
            href="/"
            className="flex items-baseline gap-1 text-ink"
            aria-label={`${site.name} — home`}
          >
            <span className="text-lg font-semibold tracking-tight">{site.name}</span>
            <span className="font-mono text-sm text-accent">/ai</span>
          </Link>

          <DesktopNav />

          <div className="hidden items-center gap-2 md:flex">
            <AccountIsland />
          </div>

          <MobileNav />
        </div>
      </Container>
    </header>
  );
}
