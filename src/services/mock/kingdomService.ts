import type { Kingdom } from "../../types";
import { MOCK_KINGDOMS } from "../../data/mockKingdoms";

/**
 * Demo territory / kingdom discovery service.
 * These are LABELLED DEMO KINGDOMS around a clearly simulated region —
 * never presented as real kingdoms near the user's real location.
 */

export interface NearbyKingdom extends Kingdom {
  distanceLabel: string;
}

/** Deterministic pseudo-distance for labelled demo kingdoms (NOT real geography). */
export function demoDistance(k: Kingdom): number {
  return Math.hypot(k.mapX, k.mapY) / 2.2 + 4;
}

export const mockKingdomService = {
  async discoverNearby(): Promise<NearbyKingdom[]> {
    // Simulated latency for realistic loading states.
    await new Promise((r) => setTimeout(r, 400));
    return MOCK_KINGDOMS.map((k) => ({
      ...k,
      distanceLabel: `${(Math.hypot(k.mapX, k.mapY) / 2.2 + 4).toFixed(1)} km`,
    }));
  },

  async get(kingdomId: string): Promise<Kingdom | undefined> {
    await new Promise((r) => setTimeout(r, 150));
    return MOCK_KINGDOMS.find((k) => k.id === kingdomId);
  },
};
