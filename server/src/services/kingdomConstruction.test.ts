import { describe, expect, it } from "vitest";
import { initialKingdomBuildings } from "./kingdoms.js";
import { constructionUpgradeCost } from "./kingdomClaims.js";

describe("persistent kingdom construction rules", () => {
  it("initializes real building records at level one with no fabricated progress", () => {
    const buildings = initialKingdomBuildings("kingdom-id");

    expect(buildings).toHaveLength(6);
    expect(buildings.every((building) => building.kingdomId === "kingdom-id")).toBe(true);
    expect(buildings.every((building) => building.level === 1 && building.progress === 0)).toBe(true);
    expect(new Set(buildings.map((building) => building.id)).size).toBe(6);
  });

  it("uses the established construction cost formula and rejects incomplete or malformed progress", () => {
    expect(constructionUpgradeCost(99, 100)).toBeNull();
    expect(constructionUpgradeCost(100, 100)).toBe(50);
    expect(constructionUpgradeCost(101, 100)).toBeNull();
    expect(constructionUpgradeCost(Number.NaN, 100)).toBeNull();
    expect(constructionUpgradeCost(100, 0)).toBeNull();
  });
});
