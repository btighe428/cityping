// src/lib/cards/tokens.ts
// Warm cream/brown editorial design tokens matching email palette

export const T = {
  cardBg: "#FAF7F2",      // Cream (email background)
  innerBg: "#F5F1E8",     // Slightly darker cream
  barBg: "#E8DFD1",       // Beige for bar backgrounds
  primary: "#2d2d2d",     // Dark charcoal headers
  body: "#5a5a5a",        // Medium gray body
  label: "#8B7355",       // Warm brown labels
  subtle: "#A59784",      // Muted brown-gray
  accent: "#8B7355",      // Warm brown accent
  green: "#4CAF50",       // Softer green
  orange: "#E8944A",      // Warmer orange
  red: "#C0392B",         // Deeper red
  white: "#FFFFFF",
  border: "#E8DFD1",      // Light beige
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
    case "minor": return "#D4A843"; // warm yellow
    default: return T.label;
  }
}
