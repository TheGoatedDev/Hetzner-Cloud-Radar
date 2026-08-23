import { ImageResponse } from "next/og";

export const alt =
  "Hetzner Cloud Radar: live server-type availability by datacentre";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#fcfaf7",
        color: "#14110e",
        padding: "72px 80px",
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: 28,
          letterSpacing: "0.04em",
          color: "#6e6b69",
        }}
      >
        Independent observation
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div
          style={{
            display: "flex",
            fontSize: 72,
            fontWeight: 600,
            letterSpacing: "-0.03em",
            lineHeight: 1.05,
          }}
        >
          Hetzner Cloud Radar
        </div>
        <div
          style={{
            display: "flex",
            maxWidth: 820,
            fontSize: 36,
            lineHeight: 1.35,
            color: "#575552",
          }}
        >
          Live server-type availability by datacentre. Stock-outs, restocks, and
          history, reported honestly.
        </div>
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 28,
          color: "#b75037",
          fontWeight: 500,
        }}
      >
        hetzner.thegoated.dev
      </div>
    </div>,
    { ...size },
  );
}
