import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

export const alt = `${site.name} — ${site.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
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
          <span style={{ fontSize: 36, fontWeight: 700, color: "#191a18" }}>
            {site.name}
          </span>
          <span style={{ fontSize: 30, color: "#3547c8" }}>/ai</span>
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
              fontSize: 64,
              fontWeight: 700,
              color: "#191a18",
              lineHeight: 1.1,
              maxWidth: 900,
            }}
          >
            AI systems you can inspect, test, and trust.
          </span>
          <span style={{ fontSize: 28, color: "#686a65", marginTop: 24 }}>
            Agents · governed agents · multi-agent systems · MCP servers
          </span>
        </div>
      </div>
    ),
    size,
  );
}
