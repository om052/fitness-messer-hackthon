import { describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/fitness_messer_test";
  process.env.CLERK_SECRET_KEY = "sk_test_fixture";
  process.env.CLERK_PUBLISHABLE_KEY = "pk_test_ZXhhbXBsZS5jbGVyay5hY2NvdW50cy5kZXYk";
});

import {
  isValidTerritoryPolygon,
  squarePolygon,
  territoryCellIds,
} from "./kingdoms.js";

describe("territory geometry rules", () => {
  it("creates a closed valid polygon and deterministic claim cells", () => {
    const polygon = squarePolygon(28.6, 77.2, 900);

    expect(isValidTerritoryPolygon(polygon)).toBe(true);
    expect(polygon.coordinates[0][0]).toEqual(
      polygon.coordinates[0][polygon.coordinates[0].length - 1],
    );
    expect(territoryCellIds(polygon)).toEqual(territoryCellIds(polygon));
    expect(territoryCellIds(polygon).length).toBeGreaterThan(0);
  });

  it("rejects polygons outside supported geographic bounds", () => {
    expect(isValidTerritoryPolygon(squarePolygon(86, 0, 900))).toBe(false);
    expect(
      isValidTerritoryPolygon({ type: "Polygon", coordinates: [] }),
    ).toBe(false);
    expect(
      territoryCellIds({
        type: "Polygon",
        coordinates: [[
          [0, 0],
          [1, 0],
          [1, 1],
        ]],
      }),
    ).toEqual([]);
  });
});
