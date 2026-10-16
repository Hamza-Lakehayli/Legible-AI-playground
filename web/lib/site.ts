/**
 * Central site identity. Rename the product by editing this file only.
 */
export const site = {
  name: "Showcase",
  tagline: "Independent AI engineering",
  /** Launch year — the footer is prerendered, so no runtime Date is allowed. */
  foundedYear: 2026,
  description:
    "Agents, governed agents, multi-agent systems, MCP servers, skills and automations — presented as working software you can inspect and run, not slides.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  nav: [
    { href: "/offerings", label: "Work" },
    { href: "/playground", label: "Playground" },
    { href: "/pricing", label: "Pricing" },
    { href: "/about", label: "About" },
  ],
} as const;
