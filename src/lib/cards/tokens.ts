// src/lib/cards/tokens.ts
// Apple Fitness Dark design tokens for card images

export const T = {
  cardBg: "#1C1C1E",
  innerBg: "#2C2C2E",
  green: "#30D158",
  orange: "#FF9F0A",
  red: "#FF453A",
  white: "#FFFFFF",
  body: "#EBEBF5",
  label: "#8E8E93",
  subtle: "#636366",
  barBg: "#3A3A3C",
} as const;

export function scoreColor(score: number): string {
  if (score >= 7) return T.red;
  if (score >= 5) return T.orange;
  return T.green;
}

export function severityColor(severity: string): string {
  switch (severity) {
    case "critical": return T.red;
    case "major": return T.orange;
    case "minor": return "#FFD60A"; // yellow
    default: return T.label;
  }
}
