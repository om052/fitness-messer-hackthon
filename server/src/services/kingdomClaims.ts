import { Db, ObjectId } from "mongodb";
import {
  isValidTerritoryPolygon,
  initialKingdomBuildings,
  kingdomsCollection,
  squarePolygon,
  territoryCellIds,
  type TerritoryPolygon,
} from "./kingdoms.js";
import { membershipsCollection } from "./memberships.js";

const CONSTRUCTION_COIN_COST_PER_POINT = 0.5;

export interface CreateKingdomInput {
  clerkUserId: string;
  name: string;
  description?: string;
  lat: number;
  lng: number;
}

export function constructionUpgradeCost(
  progress: number,
  progressRequired: number,
): number | null {
  if (
    !Number.isFinite(progress) ||
    !Number.isFinite(progressRequired) ||
    progressRequired <= 0 ||
    progress < progressRequired ||
    progress > progressRequired
  ) {
    return null;
  }
  return Math.ceil(progressRequired * CONSTRUCTION_COIN_COST_PER_POINT);
}

export async function createKingdomWithTerritory(
  db: Db,
  input: CreateKingdomInput,
) {
  const kingdoms = await kingdomsCollection(db);
  const memberships = await membershipsCollection(db);
  const existingMembership = await memberships.findOne({ clerkUserId: input.clerkUserId });
  if (existingMembership) {
    return { kind: "conflict" as const, reason: "already_in_kingdom" };
  }
  const existingKingdom = await kingdoms.findOne({ kingClerkUserId: input.clerkUserId });
  if (existingKingdom) {
    return { kind: "conflict" as const, reason: "already_in_kingdom" };
  }
  const polygon = squarePolygon(input.lat, input.lng, 900);
  if (!isValidTerritoryPolygon(polygon)) {
    return { kind: "invalid" as const };
  }
  const cellIds = territoryCellIds(polygon);
  if (cellIds.length === 0) return { kind: "invalid" as const };

  const geometry = { type: "Polygon" as const, coordinates: polygon.coordinates };
  const overlap = await kingdoms.findOne({
    territory: { $geoIntersects: { $geometry: geometry } },
    isSample: { $ne: true },
  });
  if (overlap) return { kind: "conflict" as const };

  const locks = db.collection<{
    cellId: string;
    claimToken: string;
    createdAt: Date;
    expiresAt: Date;
  }>(
    "territoryClaimCells",
  );
  await locks.createIndex({ cellId: 1 }, { unique: true });
  await locks.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  const claimToken = new ObjectId().toString();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);
  await locks.deleteMany({
    $or: [
      { expiresAt: { $lte: now } },
      { expiresAt: { $exists: false } },
    ],
  });
  const acquired: string[] = [];
  try {
    for (const cellId of cellIds) {
      await locks.insertOne({ cellId, claimToken, createdAt: now, expiresAt });
      acquired.push(cellId);
    }
  } catch (error) {
    await locks.deleteMany({ cellId: { $in: acquired }, claimToken });
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === 11000
    ) {
      return { kind: "conflict" as const };
    }
    throw error;
  }

  const seedId = `terr-${Math.round(input.lat * 1e6)}-${Math.round(input.lng * 1e6)}`;
  const kingdom = {
    _id: new ObjectId(),
    seedId,
    name: input.name,
    description: input.description,
    kingClerkUserId: input.clerkUserId,
    center: {
      type: "Point" as const,
      coordinates: [input.lng, input.lat] as [number, number],
    },
    territory: geometry,
    isSample: false,
    treasury: 0,
    population: 1,
    buildings: [] as ReturnType<typeof initialKingdomBuildings>,
    createdAt: now,
    updatedAt: now,
  };
  let insertedId: ObjectId | null = null;
  try {
    kingdom.buildings = initialKingdomBuildings(kingdom._id.toString());
    const result = await kingdoms.insertOne(kingdom);
    insertedId = result.insertedId;
    const memberships = await membershipsCollection(db);
    await memberships.insertOne({
      kingdomId: result.insertedId,
      clerkUserId: input.clerkUserId,
      role: "King",
      createdAt: now,
    });
    await locks.deleteMany({ cellId: { $in: cellIds }, claimToken });
    return {
      kind: "created" as const,
      kingdom: { ...kingdom, _id: result.insertedId },
    };
  } catch (error) {
    if (insertedId) {
      await kingdoms.deleteOne({ _id: insertedId });
      await (await membershipsCollection(db)).deleteOne({
        kingdomId: insertedId,
        clerkUserId: input.clerkUserId,
      });
    }
    await locks.deleteMany({ cellId: { $in: cellIds }, claimToken });
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === 11000
    ) {
      return { kind: "conflict" as const };
    }
    throw error;
  }
}

export async function upgradeKingdomBuilding(
  db: Db,
  input: {
    kingdomId: ObjectId;
    buildingId: string;
    clerkUserId: string;
    requestId: string;
  },
) {
  const kingdoms = await kingdomsCollection(db);
  const kingdom = await kingdoms.findOne({ _id: input.kingdomId });
  if (!kingdom) return { kind: "not_found" as const };
  if (kingdom.isSample) return { kind: "sample_read_only" as const };

  const previous = kingdom.buildingOperations?.find(
    (operation) => operation.requestId === input.requestId,
  );
  if (previous) {
    if (
      previous.clerkUserId !== input.clerkUserId ||
      previous.buildingId !== input.buildingId
    ) {
      return { kind: "request_conflict" as const };
    }
    return { kind: "duplicate" as const, kingdom, operation: previous };
  }

  const building = kingdom.buildings?.find(
    (candidate) => candidate.id === input.buildingId,
  );
  if (!building) return { kind: "building_not_found" as const };
  const cost = constructionUpgradeCost(
    building.progress,
    building.progressRequired,
  );
  if (cost === null) {
    return { kind: "insufficient_progress" as const };
  }

  if (kingdom.treasury < cost) return { kind: "insufficient_treasury" as const };

  const operation = {
    requestId: input.requestId,
    clerkUserId: input.clerkUserId,
    buildingId: building.id,
    cost,
    createdAt: new Date(),
  };
  const update = await kingdoms.updateOne(
    {
      _id: input.kingdomId,
      treasury: { $gte: cost },
      "buildingOperations.requestId": { $ne: input.requestId },
      buildings: {
        $elemMatch: {
          id: building.id,
          level: building.level,
          progress: building.progress,
          progressRequired: building.progressRequired,
        },
      },
    },
    {
      $inc: {
        treasury: -cost,
        "buildings.$.level": 1,
      },
      $set: {
        "buildings.$.progress": 0,
        updatedAt: operation.createdAt,
      },
      $push: { buildingOperations: operation },
    },
  );
  if (update.modifiedCount === 0) {
    const refreshed = await kingdoms.findOne({ _id: input.kingdomId });
    const replay = refreshed?.buildingOperations?.find(
      (candidate) => candidate.requestId === input.requestId,
    );
    if (
      replay?.clerkUserId === input.clerkUserId &&
      replay.buildingId === input.buildingId
    ) {
      return { kind: "duplicate" as const, kingdom: refreshed!, operation: replay };
    }
    return { kind: "state_changed" as const };
  }
  const updatedKingdom = await kingdoms.findOne({ _id: input.kingdomId });
  if (!updatedKingdom) throw new Error("Updated kingdom could not be reloaded.");
  return { kind: "upgraded" as const, kingdom: updatedKingdom, operation };
}

export function containsPoint(
  polygon: TerritoryPolygon,
  lng: number,
  lat: number,
): boolean {
  if (!isValidTerritoryPolygon(polygon)) return false;
  const [outerRing] = polygon.coordinates;
  let inside = false;
  for (let i = 0, j = outerRing.length - 1; i < outerRing.length; j = i++) {
    const [xi, yi] = outerRing[i];
    const [xj, yj] = outerRing[j];
    const crosses = yi > lat !== yj > lat;
    if (crosses && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}
