import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #4f46e5 0%, #a855f7 100%)",
        borderRadius: 7,
      }}
    >
      <span
        style={{
          color: "white",
          fontSize: 20,
          fontWeight: 900,
          fontFamily: "Georgia, serif",
          letterSpacing: "-0.5px",
          lineHeight: 1,
          paddingBottom: 1,
        }}
      >
        Q
      </span>
    </div>,
    size,
  );
}
