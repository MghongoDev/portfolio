import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#05080a",
          borderRadius: 14,
          border: "1px solid rgba(151,199,187,0.3)",
          color: "#e9f1ee",
          fontSize: 34,
          fontWeight: 700,
        }}
      >
        D<span style={{ color: "#c8f04b" }}>_</span>
      </div>
    ),
    size,
  );
}
