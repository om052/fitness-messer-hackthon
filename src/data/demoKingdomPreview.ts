import type { Building } from "../types";

const BUILDING_LAYOUT = [
  { type: "Royal Palace", category: "civil", progressRequired: 200, position: [0, 0] as [number, number] },
  { type: "Warrior Barracks", category: "military", progressRequired: 150, position: [14, 8] as [number, number] },
  { type: "Defense Towers", category: "defense", progressRequired: 100, position: [-15, 9] as [number, number] },
  { type: "Granary", category: "civil", progressRequired: 90, position: [8, -12] as [number, number] },
  { type: "Training Yard", category: "training", progressRequired: 140, position: [-9, -13] as [number, number] },
  { type: "Great Roads", category: "infrastructure", progressRequired: 120, position: [0, 14] as [number, number] },
] as const;

function stableHash(value: string): number {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function demoKingdomPreviewBuildings(
  kingdomId: string,
  seedId: string | undefined,
): Building[] {
  const seed = stableHash(seedId || kingdomId);
  const turn = seed % 4;
  const angle = turn * Math.PI / 2;

  return BUILDING_LAYOUT.map((building, index) => {
    const [x, z] = building.position;
    const progressRequired = building.progressRequired;
    const progressPercent = ((seed >>> (index % 16)) + index * 29) % 80;
    return {
      id: `preview-${seedId || kingdomId}-${building.type.toLowerCase().replace(/\s/g, "-")}`,
      kingdomId,
      type: building.type,
      category: building.category,
      level: 1 + ((seed + index * 7) % 4),
      progress: Math.floor(progressRequired * progressPercent / 100),
      progressRequired,
      position: [
        Math.round((x * Math.cos(angle) - z * Math.sin(angle)) * 100) / 100,
        Math.round((x * Math.sin(angle) + z * Math.cos(angle)) * 100) / 100,
      ],
      description: "Illustrative demo structure. This state is not saved and has no gameplay effect.",
    };
  });
}

export function demoKingdomPreviewSeed(
  kingdomId: string,
  seedId: string | undefined,
): number {
  return stableHash(seedId || kingdomId);
}
