// src/lib/cards/traffic-card.tsx
import type { TrafficCardData } from "./types";
import { T, scoreColor } from "./tokens";

export function TrafficCard({ data }: { data: TrafficCardData }) {
  const color = scoreColor(data.averageScore);
  const ringSize = 100;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: 600,
        height: 340,
        padding: 24,
        backgroundColor: T.cardBg,
        borderRadius: 16,
        border: `1px solid ${T.border}`,
        borderTop: `3px solid ${T.accent}`,
        fontFamily: "Inter",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
        <span style={{ fontSize: 14, color: T.label, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>
          Driving Conditions
        </span>
      </div>

      {/* Score + Boroughs */}
      <div style={{ display: "flex", flex: 1 }}>
        {/* Left: Score Ring */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: 160,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: ringSize,
              height: ringSize,
              borderRadius: ringSize / 2,
              border: `6px solid ${color}`,
              backgroundColor: T.innerBg,
            }}
          >
            <span style={{ fontSize: 40, fontWeight: 700, color: T.primary }}>{data.averageScore}</span>
          </div>
          <span style={{ fontSize: 13, color: T.body, marginTop: 8 }}>{data.label}</span>
        </div>

        {/* Right: Borough Bars */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            justifyContent: "center",
            gap: 8,
            paddingLeft: 20,
          }}
        >
          {data.boroughs.slice(0, 5).map((b) => {
            const barColor = scoreColor(b.score);
            const pct = Math.min(b.score * 10, 100);
            return (
              <div key={b.name} style={{ display: "flex", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: T.body, width: 80 }}>{b.name}</span>
                <div
                  style={{
                    display: "flex",
                    flex: 1,
                    height: 10,
                    backgroundColor: T.barBg,
                    borderRadius: 5,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${pct}%`,
                      height: "100%",
                      backgroundColor: barColor,
                      borderRadius: 5,
                    }}
                  />
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: T.primary, width: 36, textAlign: "right" }}>
                  {b.score}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* CRZ Badge */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          marginTop: 12,
          padding: "8px 14px",
          backgroundColor: T.innerBg,
          borderRadius: 8,
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 700, color: T.orange }}>
          CRZ ${data.crz.rate.toFixed(2)}
        </span>
        <span style={{ fontSize: 12, color: T.subtle, marginLeft: 10 }}>
          {data.crz.period} rate
        </span>
      </div>
    </div>
  );
}
