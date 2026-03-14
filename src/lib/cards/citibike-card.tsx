// src/lib/cards/citibike-card.tsx
import type { CitiBikeCardData } from "./types";
import { T } from "./tokens";

function availColor(available: number, capacity: number): string {
  const pct = capacity > 0 ? (available / capacity) * 100 : 0;
  if (pct >= 50) return T.green;
  if (pct >= 25) return T.orange;
  return T.red;
}

export function CitiBikeCard({ data }: { data: CitiBikeCardData }) {
  const rowHeight = data.stations.length === 1 ? 120 : 110;
  const totalHeight = 60 + data.stations.length * (rowHeight + 10);

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
        CitiBike Status
      </span>

      {data.stations.map((s) => {
        const bikeColor = availColor(s.bikesAvailable, s.capacity);
        const dockColor = availColor(s.docksAvailable, s.capacity);
        const fillPct = Math.round((s.bikesAvailable / s.capacity) * 100);
        const icon = s.type === "home" ? "Home" : "Work";

        return (
          <div
            key={s.type}
            style={{
              display: "flex",
              flexDirection: "column",
              padding: 14,
              backgroundColor: T.innerBg,
              borderRadius: 10,
              marginBottom: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: T.white }}>{icon} Station</span>
              <span style={{ fontSize: 11, color: T.label, marginLeft: 10 }}>{s.name}</span>
            </div>

            <div style={{ display: "flex", alignItems: "center" }}>
              {/* Bikes */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 60 }}>
                <span style={{ fontSize: 28, fontWeight: 700, color: bikeColor }}>{s.bikesAvailable}</span>
                <span style={{ fontSize: 10, color: T.label, textTransform: "uppercase" }}>bikes</span>
              </div>

              {/* Fill bar */}
              <div style={{ display: "flex", flex: 1, flexDirection: "column", alignItems: "center", padding: "0 12px" }}>
                <div
                  style={{
                    display: "flex",
                    width: "100%",
                    height: 8,
                    backgroundColor: T.barBg,
                    borderRadius: 4,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${fillPct}%`,
                      height: "100%",
                      backgroundColor: bikeColor,
                      borderRadius: 4,
                    }}
                  />
                </div>
                <span style={{ fontSize: 10, color: T.subtle, marginTop: 4 }}>{fillPct}% full</span>
              </div>

              {/* Docks */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 60 }}>
                <span style={{ fontSize: 28, fontWeight: 700, color: dockColor }}>{s.docksAvailable}</span>
                <span style={{ fontSize: 10, color: T.label, textTransform: "uppercase" }}>docks</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
