// src/lib/cards/ferry-card.tsx
import type { FerryCardData } from "./types";
import { T } from "./tokens";

function severityDotColor(severity: string): string {
  switch (severity) {
    case "critical": return T.red;
    case "major": return T.orange;
    case "minor": return "#FFD60A";
    default: return T.label;
  }
}

export function FerryCard({ data }: { data: FerryCardData }) {
  const isAllClear = data.alerts.length === 0;
  const totalHeight = isAllClear ? 120 : 60 + data.alerts.length * 52;

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
        Ferry Status
      </span>

      {isAllClear ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flex: 1,
            backgroundColor: T.innerBg,
            borderRadius: 10,
            padding: 12,
          }}
        >
          <span style={{ fontSize: 16, color: T.green, fontWeight: 600 }}>
            All routes operating normally
          </span>
        </div>
      ) : (
        data.alerts.map((a, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "10px 14px",
              backgroundColor: T.innerBg,
              borderRadius: 10,
              marginBottom: 8,
            }}
          >
            {/* Severity dot */}
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: severityDotColor(a.severity),
                marginRight: 12,
              }}
            />
            {a.routeName && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: T.white,
                  backgroundColor: T.barBg,
                  padding: "3px 8px",
                  borderRadius: 4,
                  marginRight: 10,
                }}
              >
                {a.routeName}
              </span>
            )}
            <span style={{ fontSize: 13, color: T.body, flex: 1 }}>{a.title}</span>
          </div>
        ))
      )}
    </div>
  );
}
