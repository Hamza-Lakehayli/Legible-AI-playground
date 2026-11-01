import type { Metadata } from "next";
import { PlaygroundUnavailable } from "@/components/builder/playground-unavailable";

export const metadata: Metadata = {
  title: "Playground",
  description: "The Playground runtime is being deployed and is temporarily unavailable.",
  alternates: { canonical: "/playground" },
};

/**
 * The builder is its own app — no site header or footer, full-viewport
 * canvas. It lives outside the (marketing) group on purpose: the marketing
 * layout's chrome (site nav, scroll ring, glitch stage) would wrap a page
 * that never scrolls.
 */
export default function PlaygroundPage() {
  return <PlaygroundUnavailable />;
}
