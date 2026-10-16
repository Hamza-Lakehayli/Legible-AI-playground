import Link from "next/link";
import { Container } from "@/components/ui/layout";

export default function NotFound() {
  return (
    <Container className="flex flex-1 flex-col items-start justify-center py-28">
      <p className="font-mono text-xs font-medium tracking-[0.14em] text-accent-ink uppercase">
        404
      </p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
        No event at this sequence number.
      </h1>
      <p className="mt-4 max-w-md text-base/7 text-muted">
        The page you asked for does not exist, moved, or was never prerendered. The
        trace continues from the home page.
      </p>
      <Link
        href="/"
        className="mt-8 text-sm font-medium text-accent-ink underline-offset-4 hover:underline"
      >
        ← Back to the start of the run
      </Link>
    </Container>
  );
}
