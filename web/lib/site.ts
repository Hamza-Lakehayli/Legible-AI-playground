/**
 * Central site identity. Rename the product by editing this file only.
 */
export const site = {
  name: "Legible",
  tagline: "Visual AI workflows, with governance built in",
  /** Launch year — the footer is prerendered, so no runtime Date is allowed. */
  foundedYear: 2026,
  description:
    "Build AI agents and workflows on a visual canvas, with human approvals and inspectable execution.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  nav: [
    { href: "/#product", label: "Product" },
    { href: "/playground", label: "Playground" },
    { href: "/pricing", label: "Pricing" },
    { href: "/about", label: "About" },
  ],
} as const;
