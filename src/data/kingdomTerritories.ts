export interface DemoTerritory {
  kingdomId: string;
  note: string;
  geometry: GeoJSON.Feature<GeoJSON.Polygon>;
}

function metersToDegLat(m: number) { return m / 111320; }
function metersToDegLng(m: number, lat: number) { return m / (111320 * Math.cos((lat * Math.PI) / 180)); }

const OFFSETS = [
  { dx: 0, dy: 0, size: 260 },
  { dx: 420, dy: -260, size: 250 },
  { dx: -380, dy: -220, size: 270 },
  { dx: 360, dy: 300, size: 240 },
  { dx: -400, dy: 280, size: 260 },
  { dx: 720, dy: 0, size: 250 },
  { dx: -700, dy: 60, size: 250 },
  { dx: 120, dy: 620, size: 260 },
  { dx: -180, dy: -620, size: 260 },
  { dx: 620, dy: -520, size: 240 },
];

export function generateNeighbourhoodTerritories(center: [number, number], kingdomIds: string[]): DemoTerritory[] {
  const [lat, lng] = center;
  const ids = Array.from({ length: 10 }, (_, i) => kingdomIds[i % kingdomIds.length]);
  return ids.map((id, i) => {
    const r = OFFSETS[i];
    const clat = lat + metersToDegLat(r.dy);
    const clng = lng + metersToDegLng(r.dx, lat);
    const half = r.size / 2;
    const coords: [number, number][] = [
      [clng - metersToDegLng(half, clat), clat - metersToDegLat(half)],
      [clng + metersToDegLng(half, clat), clat - metersToDegLat(half)],
      [clng + metersToDegLng(half, clat), clat + metersToDegLat(half)],
      [clng - metersToDegLng(half, clat), clat + metersToDegLat(half)],
      [clng - metersToDegLng(half, clat), clat - metersToDegLat(half)],
    ];
    return {
      kingdomId: id,
      note: "Illustrative demo territory (~" + ((r.size * r.size) / 1e6).toFixed(2) + " km²). Not a verified property boundary.",
      geometry: {
        type: "Feature",
        properties: { kingdomId: id, slot: i },
        geometry: { type: "Polygon", coordinates: [coords.map(([lo, la]) => [lo, la])] },
      },
    };
  });
}
