// src/app/api/cards/[type]/route.tsx
import { ImageResponse } from "next/og";
import { TrafficCard } from "@/lib/cards/traffic-card";
import { CitiBikeCard } from "@/lib/cards/citibike-card";
import { AirportCard } from "@/lib/cards/airport-card";
import { EnvironmentalCard } from "@/lib/cards/environmental-card";
import { FerryCard } from "@/lib/cards/ferry-card";
import { CoatCard } from "@/lib/cards/coat-card";
import { MoneySaverCard } from "@/lib/cards/money-saver-card";
import type {
  TrafficCardData,
  CitiBikeCardData,
  AirportCardData,
  EnvironmentalCardData,
  FerryCardData,
  CoatCardData,
  MoneySaverCardData,
} from "@/lib/cards/types";
import { join } from "path";
import { readFile } from "fs/promises";

// Cache fonts at module level
let interRegular: ArrayBuffer | null = null;
let interBold: ArrayBuffer | null = null;

async function loadFonts() {
  if (!interRegular) {
    const fontDir = join(process.cwd(), "public", "fonts");
    const [regular, bold] = await Promise.all([
      readFile(join(fontDir, "Inter-Regular.ttf")),
      readFile(join(fontDir, "Inter-Bold.ttf")),
    ]);
    interRegular = regular.buffer.slice(regular.byteOffset, regular.byteOffset + regular.byteLength);
    interBold = bold.buffer.slice(bold.byteOffset, bold.byteOffset + bold.byteLength);
  }
  return { interRegular: interRegular!, interBold: interBold! };
}

// Card dimensions
const CARD_CONFIGS: Record<string, { width: number; defaultHeight: number }> = {
  traffic: { width: 600, defaultHeight: 340 },
  citibike: { width: 600, defaultHeight: 280 },
  airport: { width: 600, defaultHeight: 200 },
  environmental: { width: 600, defaultHeight: 200 },
  ferry: { width: 600, defaultHeight: 200 },
  coat: { width: 600, defaultHeight: 220 },
  "money-saver": { width: 600, defaultHeight: 280 },
};

function renderCard(type: string, data: unknown): React.ReactElement | null {
  switch (type) {
    case "traffic":
      return <TrafficCard data={data as TrafficCardData} />;
    case "citibike":
      return <CitiBikeCard data={data as CitiBikeCardData} />;
    case "airport":
      return <AirportCard data={data as AirportCardData} />;
    case "environmental":
      return <EnvironmentalCard data={data as EnvironmentalCardData} />;
    case "ferry":
      return <FerryCard data={data as FerryCardData} />;
    case "coat":
      return <CoatCard data={data as CoatCardData} />;
    case "money-saver":
      return <MoneySaverCard data={data as MoneySaverCardData} />;
    default:
      return null;
  }
}

function getDynamicHeight(type: string, data: unknown): number {
  const config = CARD_CONFIGS[type];
  if (!config) return 200;

  switch (type) {
    case "airport": {
      const d = data as AirportCardData;
      return 60 + d.delays.length * 62;
    }
    case "citibike": {
      const d = data as CitiBikeCardData;
      const rowHeight = d.stations.length === 1 ? 120 : 110;
      return 60 + d.stations.length * (rowHeight + 10);
    }
    case "ferry": {
      const d = data as FerryCardData;
      return d.alerts.length === 0 ? 120 : 60 + d.alerts.length * 52;
    }
    default:
      return config.defaultHeight;
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const { type } = await params;
    const { searchParams } = new URL(request.url);
    const encoded = searchParams.get("d");

    if (!encoded) {
      return new Response("Missing data parameter", { status: 400 });
    }

    const config = CARD_CONFIGS[type];
    if (!config) {
      return new Response(`Unknown card type: ${type}`, { status: 400 });
    }

    let data: unknown;
    try {
      const json = Buffer.from(encoded, "base64url").toString("utf-8");
      data = JSON.parse(json);
    } catch {
      return new Response("Invalid data parameter", { status: 400 });
    }

    const element = renderCard(type, data);
    if (!element) {
      return new Response(`Failed to render card: ${type}`, { status: 500 });
    }

    const fonts = await loadFonts();
    const height = getDynamicHeight(type, data);

    const response = new ImageResponse(element, {
      width: config.width,
      height,
      fonts: [
        { name: "Inter", data: fonts.interRegular, weight: 400, style: "normal" },
        { name: "Inter", data: fonts.interBold, weight: 700, style: "normal" },
      ],
    });

    // Set immutable cache headers
    response.headers.set(
      "Cache-Control",
      "public, max-age=31536000, immutable"
    );

    return response;
  } catch (error) {
    console.error("[CardImage] Error:", error);
    return new Response("Internal error rendering card", { status: 500 });
  }
}
