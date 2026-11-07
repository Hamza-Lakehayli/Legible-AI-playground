import type { Metadata } from "next";
import { FlowApp } from "@/components/builder/flow-app";

export const metadata: Metadata = {
  title: "Playground",
  description:
    "Explore a governed workflow canvas with mock tools, human approval gates, and an inspectable run trace.",
  alternates: { canonical: "/playground" },
};

/**
 * The builder is its own app — no site header or footer, full-viewport
 * canvas. It lives outside the (marketing) group on purpose: the marketing
 * layout's chrome (site nav, scroll ring, glitch stage) would wrap a page
 * that never scrolls.
 */
export default function PlaygroundPage() {
  return <FlowApp />;
}
