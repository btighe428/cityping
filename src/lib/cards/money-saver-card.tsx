// src/lib/cards/money-saver-card.tsx
import type { MoneySaverCardData } from "./types";
import { T } from "./tokens";

function categoryColor(category: string): string {
  switch (category) {
    case "dining_deal": return T.green;
    case "free_event": return T.accent;
    default: return T.label;
  }
}

function categoryLabel(category: string): string {
  switch (category) {
    case "dining_deal": return "Dining Deals";
    case "free_event": return "Free Events";
    default: return category;
  }
}

export function MoneySaverCard({ data }: { data: MoneySaverCardData }) {
  const categories = [
    { key: "dining_deal", count: data.diningDeals, icon: "🍽️", top: data.topDeal },
    { key: "free_event", count: data.freeEvents, icon: "🎟️" },
  ].filter(c => c.count > 0);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: 600,
        height: 280,
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
        <span style={{ fontSize: 14, color: T.label, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600, flex: 1 }}>
          Money Saver
        </span>
        <span style={{ fontSize: 24, fontWeight: 700, color: T.green }}>
          {data.totalCount}
        </span>
        <span style={{ fontSize: 12, color: T.subtle, marginLeft: 6 }}>
          active deals
        </span>
      </div>

      {/* Category bars */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
        {categories.map((cat, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "10px 14px",
              backgroundColor: T.innerBg,
              borderRadius: 10,
            }}
          >
            <span style={{ fontSize: 20, marginRight: 12 }}>{cat.icon}</span>
            <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: T.primary }}>
                {categoryLabel(cat.key)}
              </span>
              {cat.top && cat.key === "dining_deal" && (
                <span style={{ fontSize: 11, color: T.subtle, marginTop: 2 }}>
                  {cat.top}
                </span>
              )}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: 32,
                height: 28,
                borderRadius: 14,
                backgroundColor: categoryColor(cat.key),
                padding: "0 10px",
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 700, color: T.white }}>{cat.count}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
