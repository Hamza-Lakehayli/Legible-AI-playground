import type { Metadata } from "next";
import { FlowApp } from "@/components/builder/flow-app";

export const metadata: Metadata = {
  title: "Playground",
  description:
    "Draw a workflow canvas: start, agent, LLM call, tool, and decision nodes. Click an agent node to fill its config card, then run it on the governed runtime with mock tools, human approval gates, and an inspectable event trace.",
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
