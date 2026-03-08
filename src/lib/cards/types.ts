// src/lib/cards/types.ts
// Data interfaces for each card type — encoded in URL at send time

export interface TrafficCardData {
  averageScore: number;
  label: string;
  worstRegion?: string;
  worstScore?: number;
  boroughs: Array<{ name: string; score: number; label: string }>;
  crz: { rate: number; period: string };
}

export interface CitiBikeCardData {
  stations: Array<{
    type: "home" | "work";
    name: string;
    bikesAvailable: number;
    docksAvailable: number;
    capacity: number;
  }>;
}

export interface AirportCardData {
  delays: Array<{
    airportCode: string;
    status: "delays" | "ground_stop";
    reason: string | null;
    avgMinutes: number | null;
  }>;
}

export interface EnvironmentalCardData {
  pollen?: { type: string; category: string };
  uv?: { value: number; category: string };
}

export interface FerryCardData {
  alerts: Array<{
    severity: string;
    routeName: string | null;
    title: string;
  }>;
}

export interface CoatCardData {
  coat: "heavy" | "light" | "none";
  umbrella: boolean;
  summary: string;
  temperature: number;
  feelsLike: number;
  precipProbability: number;
  conditions: string;
}

export type CardType = "traffic" | "citibike" | "airport" | "environmental" | "ferry" | "coat";

export type CardDataMap = {
  traffic: TrafficCardData;
  citibike: CitiBikeCardData;
  airport: AirportCardData;
  environmental: EnvironmentalCardData;
  ferry: FerryCardData;
  coat: CoatCardData;
};
