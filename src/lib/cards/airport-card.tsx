// src/lib/cards/airport-card.tsx
import type { AirportCardData } from "./types";
import { T } from "./tokens";

export function AirportCard({ data }: { data: AirportCardData }) {
  const totalHeight = 60 + data.delays.length * 62;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: 600,
        height: totalHeight,
        padding: 24,
        backgroundColor: T.cardBg,
        borderRadius: 16,
        fontFamily: "Inter",
      }}
    >
      <span style={{ fontSize: 14, color: T.label, textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 }}>
        Airport Delays
      </span>

      {data.delays.map((d) => {
        const isGroundStop = d.status === "ground_stop";
        const accentColor = isGroundStop ? T.red : T.orange;
        const statusText = isGroundStop
          ? "Ground Stop"
          : d.avgMinutes
            ? `~${d.avgMinutes} min delays`
            : "Delays";

        return (
          <div
            key={d.airportCode}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "10px 14px",
              backgroundColor: T.innerBg,
              borderRadius: 10,
              borderLeft: `4px solid ${accentColor}`,
              marginBottom: 8,
            }}
          >
            <span style={{ fontSize: 20, fontWeight: 700, color: accentColor, width: 56 }}>
              {d.airportCode}
            </span>
            <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: T.body }}>{statusText}</span>
              {d.reason && (
                <span style={{ fontSize: 11, color: T.subtle, marginTop: 2 }}>{d.reason}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
