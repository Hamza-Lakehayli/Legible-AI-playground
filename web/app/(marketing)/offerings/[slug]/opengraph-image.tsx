import { ImageResponse } from "next/og";
import { getOffering } from "@/lib/data/offerings";

export const alt = "Offering preview";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OfferingOgImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const offering = await getOffering(slug);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#f7f6f2",
          padding: 64,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontSize: 32, fontWeight: 700, color: "#191a18" }}>
            Showcase
          </span>
          <span style={{ fontSize: 26, color: "#3547c8" }}>/ai</span>
          <span
            style={{
              fontSize: 22,
              color: "#222f91",
              marginLeft: 16,
              textTransform: "uppercase",
              letterSpacing: 2,
            }}
          >
            {offering?.kindLabel ?? "Offering"}
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              width: 88,
              height: 6,
              backgroundColor: "#3547c8",
              marginBottom: 32,
            }}
          />
          <span
            style={{
              fontSize: 60,
              fontWeight: 700,
              color: "#191a18",
              lineHeight: 1.15,
              maxWidth: 940,
            }}
          >
            {offering?.headline ?? offering?.title ?? "Offering"}
          </span>
          <span style={{ fontSize: 26, color: "#686a65", marginTop: 24, maxWidth: 900 }}>
            {offering?.summary ?? ""}
          </span>
        </div>
      </div>
    ),
    size,
  );
}
