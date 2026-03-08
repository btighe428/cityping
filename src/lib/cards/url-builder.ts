// src/lib/cards/url-builder.ts
// Encodes card data into a cacheable image URL

import type { CardType, CardDataMap } from "./types";

export function cardImageUrl<K extends CardType>(
  type: K,
  data: CardDataMap[K]
): string {
  // Always use production URL — card images are rendered by email clients,
  // not the sender's machine, so localhost would never work.
  const base = process.env.CARD_IMAGE_BASE_URL
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
    || "https://cityping.net";
  const encoded = Buffer.from(JSON.stringify(data)).toString("base64url");
  return `${base}/api/cards/${type}?d=${encoded}`;
}
