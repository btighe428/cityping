// src/lib/cards/environmental-card.tsx
import type { EnvironmentalCardData } from "./types";
import { T } from "./tokens";

export function EnvironmentalCard({ data }: { data: EnvironmentalCardData }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: 600,
        height: 200,
        padding: 24,
        backgroundColor: T.cardBg,
        borderRadius: 16,
        border: `1px solid ${T.border}`,
        borderTop: `3px solid ${T.accent}`,
        fontFamily: "Inter",
      }}
    >
      <span style={{ fontSize: 14, color: T.label, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600, marginBottom: 16 }}>
        Environmental
      </span>

      <div style={{ display: "flex", flex: 1, gap: 12 }}>
        {data.pollen && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              flex: 1,
              backgroundColor: T.innerBg,
              borderRadius: 10,
              padding: 16,
            }}
          >
            <span style={{ fontSize: 10, color: T.subtle, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
              Pollen ({data.pollen.type})
            </span>
            <span style={{ fontSize: 26, fontWeight: 700, color: T.accent }}>
              {data.pollen.category}
            </span>
          </div>
        )}

        {data.uv && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              flex: 1,
              backgroundColor: T.innerBg,
              borderRadius: 10,
              padding: 16,
            }}
          >
            <span style={{ fontSize: 10, color: T.subtle, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
              UV Index
            </span>
            <span style={{ fontSize: 32, fontWeight: 700, color: T.orange }}>
              {data.uv.value}
            </span>
            <span style={{ fontSize: 12, color: T.subtle, marginTop: 2 }}>{data.uv.category}</span>
          </div>
        )}
      </div>
    </div>
  );
}
