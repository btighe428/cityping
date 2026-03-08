// src/lib/cards/url-builder.ts
// Encodes card data into a cacheable image URL

import type { CardType, CardDataMap } from "./types";

export function cardImageUrl<K extends CardType>(
  type: K,
  data: CardDataMap[K]
): string {
  const base = process.env.APP_BASE_URL || "https://cityping.net";
  const encoded = Buffer.from(JSON.stringify(data)).toString("base64url");
  return `${base}/api/cards/${type}?d=${encoded}`;
}
