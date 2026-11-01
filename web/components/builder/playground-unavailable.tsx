"use client";

import { useEffect } from "react";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { usePlaygroundEntry } from "@/components/transitions/playground-entry-provider";

export function PlaygroundUnavailable() {
  const { requestId, signalReady } = usePlaygroundEntry();

  useEffect(() => {
    if (requestId !== null) signalReady(requestId);
  }, [requestId, signalReady]);

  return (
    <main
      id="playground-main"
      tabIndex={-1}
      className="flex min-h-screen items-center justify-center bg-page px-6 py-16 outline-none"
    >
      <section
        role="alert"
        className="w-full max-w-lg rounded-2xl border border-line bg-surface p-8 text-center shadow-sm sm:p-12"
      >
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent-ink">
          <TriangleAlert aria-hidden="true" className="size-6" />
        </div>
        <p className="mt-6 font-mono text-xs font-medium tracking-[0.14em] text-accent-ink uppercase">
          Feature unavailable
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
          Playground is temporarily offline
        </h1>
        <p className="mt-4 text-base/7 text-muted">
          We’re working on deploying the runtime. Please check back soon.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center justify-center rounded-control border border-line px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-surface-muted"
        >
          Return home
        </Link>
      </section>
    </main>
  );
}
