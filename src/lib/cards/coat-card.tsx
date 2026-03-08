// src/lib/cards/coat-card.tsx
import type { CoatCardData } from "./types";
import { T } from "./tokens";

export function CoatCard({ data }: { data: CoatCardData }) {
  const emoji = data.coat === "heavy" ? "\u{1F9E5}" : data.coat === "light" ? "\u{1F9E4}" : "\u{1F455}";
  const umbrellaEmoji = data.umbrella ? " \u2614" : "";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: 600,
        height: 220,
        padding: 24,
        backgroundColor: T.cardBg,
        borderRadius: 16,
        fontFamily: "Inter",
      }}
    >
      <span style={{ fontSize: 14, color: T.label, textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 }}>
        What to Wear
      </span>

      {/* Main row: emoji + recommendation */}
      <div style={{ display: "flex", alignItems: "center", flex: 1 }}>
        <span style={{ fontSize: 56, marginRight: 20 }}>{emoji}{umbrellaEmoji}</span>
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: T.white, lineHeight: 1.3 }}>
            {data.summary}
          </span>
          <span style={{ fontSize: 13, color: T.subtle, marginTop: 4 }}>{data.conditions}</span>
        </div>
      </div>

      {/* Temperature strip */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px",
          backgroundColor: T.innerBg,
          borderRadius: 8,
          marginTop: 8,
        }}
      >
        <span style={{ fontSize: 13, color: T.body }}>
          {data.temperature}°F
        </span>
        <span style={{ fontSize: 12, color: T.subtle }}>
          Feels like {data.feelsLike}°F
        </span>
        {data.precipProbability > 10 && (
          <span style={{ fontSize: 12, color: T.orange }}>
            Rain {data.precipProbability}%
          </span>
        )}
      </div>
    </div>
  );
}
