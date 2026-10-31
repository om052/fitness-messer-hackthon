import { Collection, Db } from "mongodb";
import { getDb } from "../db.js";

export interface KingdomDoc {
  _id?: any;
  seedId?: string;
  name: string;
  description?: string;
  kingClerkUserId: string;
  center: { type: "Point"; coordinates: [number, number] };
  territory: any;
  isSample: boolean;
  treasury: number;
  population: number;
  buildings: KingdomBuildingDoc[];
  buildingOperations?: BuildingOperation[];
  createdAt: Date;
  updatedAt: Date;
}

export interface KingdomBuildingDoc {
  id: string;
  kingdomId: string;
  type: string;
  category: "military" | "defense" | "infrastructure" | "civil" | "training";
  level: number;
  progress: number;
  progressRequired: number;
  position: [number, number];
  description: string;
}

export interface BuildingOperation {
  requestId: string;
  clerkUserId: string;
  buildingId: string;
  cost: number;
  createdAt: Date;
}

const INITIAL_BUILDING_LAYOUT: Omit<KingdomBuildingDoc, "id" | "kingdomId">[] = [
  { type: "Royal Palace", category: "civil", level: 1, progress: 0, progressRequired: 200, position: [0, 0], description: "The seat of the kingdom. Progress requires verified contributions." },
  { type: "Warrior Barracks", category: "military", level: 1, progress: 0, progressRequired: 150, position: [14, 8], description: "Training quarters for the kingdom's defenders." },
  { type: "Defense Towers", category: "defense", level: 1, progress: 0, progressRequired: 100, position: [-15, 9], description: "Fortifications overlooking the territory." },
  { type: "Granary", category: "civil", level: 1, progress: 0, progressRequired: 90, position: [8, -12], description: "Stores supporting the kingdom's population." },
  { type: "Training Yard", category: "training", level: 1, progress: 0, progressRequired: 140, position: [-9, -13], description: "An open ground for training and practice." },
  { type: "Great Roads", category: "infrastructure", level: 1, progress: 0, progressRequired: 120, position: [0, 14], description: "Roads connecting the kingdom's districts." },
];

export function initialKingdomBuildings(kingdomId: string): KingdomBuildingDoc[] {
  return INITIAL_BUILDING_LAYOUT.map((building) => ({
    ...building,
    id: `${kingdomId}-${building.type.toLowerCase().replace(/\s/g, "-")}`,
    kingdomId,
    position: [...building.position] as [number, number],
  }));
}

export async function kingdomsCollection(db?: Db) {
  const d = db || getDb();
  const col = d.collection<KingdomDoc>("kingdoms");
  await col.createIndex({ center: "2dsphere" });
  await col.createIndex({ territory: "2dsphere" }, { sparse: true });
  await col.createIndex({ seedId: 1 }, { unique: true, sparse: true });
  // Atomicity for territory claims: one user-created kingdom per seedId.
  // (seedId is already globally unique; fictional samples pre-fill their seedIds
  // so a second user claiming an occupied seed territory hits E11000.)
  return col;
}

export const DEMO_KINGDOMS = Array.from({ length: 12 }, (_, i) => ({
  seedId: `demo-${i}`,
  name: `Demo Kingdom ${i + 1}`,
  description: "Fictional sample kingdom",
  kingClerkUserId: "system",
  center: { type: "Point" as const, coordinates: [77.209 + (i - 6) * 0.01, 28.6139 + (i % 4 - 2) * 0.01] as [number, number] },
  territory: null,
  isSample: true,
}));

export async function seedDemoKingdoms() {
  const col = await kingdomsCollection();
  for (const k of DEMO_KINGDOMS) {
    await col.updateOne({ seedId: k.seedId }, { $setOnInsert: { ...k, createdAt: new Date(), updatedAt: new Date() } }, { upsert: true });
  }
}

/* ---------------- Territory geometry + fictional development kingdoms ---------------- */

export interface TerritoryPolygon {
  /** GeoJSON Polygon rings: [ [lng, lat], ... ] with first == last. */
  type: "Polygon";
  coordinates: [number, number][][];
}

export interface FictionalKingdomSeed {
  seedId: string;
  name: string;
  description: string;
  kingName: string;
  level: number;
  population: number;
  strength: number;
  center: { type: "Point"; coordinates: [number, number] };
  territory: TerritoryPolygon;
  isSample: true;
}

/** Geodesic-ish square polygon (deg) around a center, ~sideMeters wide. */
export function squarePolygon(
  lat: number,
  lng: number,
  sideMeters: number,
): TerritoryPolygon {
  const dLat = sideMeters / 2 / 111320;
  const dLng = sideMeters / 2 / (111320 * Math.cos((lat * Math.PI) / 180));
  const ring: [number, number][] = [
    [lng - dLng, lat - dLat],
    [lng + dLng, lat - dLat],
    [lng + dLng, lat + dLat],
    [lng - dLng, lat + dLat],
    [lng - dLng, lat - dLat],
  ];
  return { type: "Polygon", coordinates: [ring] };
}

/**
 * 12 fictional development kingdoms in a deliberate, non-overlapping grid
 * around Delhi. Clearly marked `isSample: true` + `seedId` prefixed so they
 * can never be confused with user-created kingdoms. `owner` is "system":
 * they are NOT claimable through the claim endpoint.
 */
const FICTIONAL_BASE: Array<Omit<FictionalKingdomSeed, "center" | "territory" | "isSample">> = [
  { seedId: "seed-kailasa",  name: "Kailasa Reach",   description: "Highland waystation famed for dawn drills.",        kingName: "King Vedant",    level: 5, population: 1180, strength: 7400 },
  { seedId: "seed-ashvara",  name: "Ashvara Hold",    description: "Stone walls raised by a million goblet squats.",    kingName: "King Ashwin",    level: 4, population: 960,  strength: 6100 },
  { seedId: "seed-cholagarh",name: "Cholagarh",       description: "River fortress where rowers and runners train.",    kingName: "Queen Nila",     level: 6, population: 1420, strength: 8900 },
  { seedId: "seed-malwan",   name: "Malwan Outpost",  description: "Frontier camp for new warriors finding their feet.", kingName: "King Rudra",    level: 2, population: 410,  strength: 2300 },
  { seedId: "seed-gangadwar",name: "Gangadwar",       description: "Riverside markets fed by walking caravans.",        kingName: "Queen Tara",     level: 3, population: 720,  strength: 3900 },
  { seedId: "seed-vironka",  name: "Vironka",         description: "Old training ground of the first empires.",         kingName: "King Ishaan",    level: 4, population: 880,  strength: 5200 },
  { seedId: "seed-nandigarh",name: "Nandigarh",       description: "Terraced farmlands climbed step by step.",          kingName: "Queen Meera",    level: 3, population: 640,  strength: 3300 },
  { seedId: "seed-suryagarh",name: "Suryagarh",       description: "Sun-temples where morning planks are offered.",     kingName: "King Devraj",    level: 5, population: 1050, strength: 6800 },
  { seedId: "seed-vayupur",  name: "Vayupur",         description: "Wind-swept mesas, home of the long-distance runners.", kingName: "Queen Anaya", level: 4, population: 910,  strength: 5600 },
  { seedId: "seed-jaladri",  name: "Jaladri Isles",   description: "Coastal hamlets of swimmers and haulers.",          kingName: "King Kabir",     level: 2, population: 380,  strength: 2100 },
  { seedId: "seed-parvata",  name: "Parvata Spire",   description: "The highest gymnasium in the known realm.",         kingName: "King Bhaskar",   level: 6, population: 1290, strength: 9100 },
  { seedId: "seed-aranya",   name: "Aranya Deep",     description: "Forest enclave of silent, patient trainers.",       kingName: "Queen Riya",     level: 3, population: 590,  strength: 3100 },
];

/** Grid anchor (Delhi) + spacing ~1.6 km so polygons never overlap. */
const GRID_ORIGIN: [number, number] = [28.6050, 77.1850];
const GRID_STEP_M = 1600;
const POLYGON_SIDE_M = 900;

export const FICTIONAL_KINGDOMS: FictionalKingdomSeed[] = FICTIONAL_BASE.map((k, i) => {
  const col = i % 4;
  const row = Math.floor(i / 4);
  const dLat = ((row - 1) * GRID_STEP_M) / 111320;
  const dLng = ((col - 1.5) * GRID_STEP_M) / (111320 * Math.cos((GRID_ORIGIN[0] * Math.PI) / 180));
  const lat = GRID_ORIGIN[0] + dLat;
  const lng = GRID_ORIGIN[1] + dLng;
  return {
    ...k,
    center: { type: "Point" as const, coordinates: [lng, lat] },
    territory: squarePolygon(lat, lng, POLYGON_SIDE_M),
    isSample: true as const,
  };
});

/** Idempotent seeding — $setOnInsert only, never touches existing docs. */
export async function seedFictionalKingdoms() {
  const col = await kingdomsCollection();
  for (const k of FICTIONAL_KINGDOMS) {
    await col.updateOne(
      { seedId: k.seedId },
      { $setOnInsert: { ...k, createdAt: new Date(), updatedAt: new Date() } },
      { upsert: true },
    );
  }
}

/** True when the GeoJSON polygon ring contains [lng, lat] (planar ray-cast). */
export function polygonContains(ring: [number, number][], lng: number, lat: number): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function isValidTerritoryPolygon(
  polygon: TerritoryPolygon,
): boolean {
  if (polygon.type !== "Polygon" || polygon.coordinates.length === 0) return false;
  return polygon.coordinates.every((ring) => {
    if (ring.length < 4) return false;
    if (
      ring[0][0] !== ring[ring.length - 1][0] ||
      ring[0][1] !== ring[ring.length - 1][1]
    ) {
      return false;
    }
    return ring.every(
      ([lng, lat]) =>
        Number.isFinite(lng) &&
        Number.isFinite(lat) &&
        Math.abs(lng) <= 180 &&
        Math.abs(lat) <= 85,
    );
  });
}

export function territoryCellIds(
  polygon: TerritoryPolygon,
  cellSizeDegrees = 0.005,
): string[] {
  if (!isValidTerritoryPolygon(polygon) || cellSizeDegrees <= 0) return [];
  const points = polygon.coordinates.flat();
  const minLng = Math.min(...points.map(([lng]) => lng));
  const maxLng = Math.max(...points.map(([lng]) => lng));
  const minLat = Math.min(...points.map(([, lat]) => lat));
  const maxLat = Math.max(...points.map(([, lat]) => lat));
  const minX = Math.floor(minLng / cellSizeDegrees);
  const maxX = Math.floor(maxLng / cellSizeDegrees);
  const minY = Math.floor(minLat / cellSizeDegrees);
  const maxY = Math.floor(maxLat / cellSizeDegrees);
  const count = (maxX - minX + 1) * (maxY - minY + 1);
  if (count > 10000) return [];

  const ids: string[] = [];
  for (let x = minX; x <= maxX; x += 1) {
    for (let y = minY; y <= maxY; y += 1) {
      ids.push(`${x}:${y}`);
    }
  }
  return ids;
}
