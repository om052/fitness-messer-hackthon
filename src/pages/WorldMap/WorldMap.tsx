import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { GeoJSON, MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});
import { Castle, Crown, LocateFixed, Minus, Plus, RefreshCw, Search, ShieldCheck, X } from "lucide-react";
import { Card, SectionTitle } from "../../components/ui/Primitives";
import { apiFetch } from "../../services/apiClient";
import { useAuth } from "@clerk/clerk-react";
import CreateKingdomModal from "../../components/ui/CreateKingdomModal";
import ClaimKingdomModal from "../../components/ui/ClaimKingdomModal";

const DEFAULT_CENTER: [number, number] = [20, 0];
const DEFAULT_ZOOM = 3;
type Position = [number, number];
type Territory = { type: "Polygon" | "MultiPolygon"; coordinates: any };
type KingdomRecord = {
  _id: string; seedId?: string; name: string; description?: string; kingClerkUserId?: string;
  center?: { type: "Point"; coordinates: [number, number] }; territory?: Territory | null;
  isSample?: boolean; dataSource?: string; createdAt?: string;
};
const COLORS = ["#d6b455", "#32b8bd", "#f18454", "#9d83db", "#79b66c", "#e06a9b"];
const colorFor = (kingdom: KingdomRecord) => {
  const hash = Array.from(kingdom._id).reduce((value, character) => value + character.charCodeAt(0), 0);
  return kingdom.isSample || kingdom.kingClerkUserId === "system" ? "#8d94a3" : COLORS[hash % COLORS.length];
};
function MapRef({ assign }: { assign: (map: L.Map) => void }) {
  const map = useMap();
  useEffect(() => assign(map), [map, assign]);
  return null;
}
function MapClickPicker({ enabled, mode, onPick }: { enabled: boolean; mode: "create" | "claim"; onPick: (position: Position) => void }) {
  useMapEvents({ click(event) { if (enabled) onPick([event.latlng.lat, event.latlng.lng]); } });
  return null;
}
function tileUrl(key: string | undefined, hybrid: boolean) {
  return key ? `https://api.maptiler.com/maps/${hybrid ? "hybrid" : "streets-v2"}/{z}/{x}/{y}.png?key=${encodeURIComponent(key)}` : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
}
function safeTerritory(territory: Territory | null | undefined): boolean {
  if (!territory || (territory.type !== "Polygon" && territory.type !== "MultiPolygon")) return false;
  const polygons = territory.type === "Polygon" ? [territory.coordinates] : territory.coordinates;
  return Array.isArray(polygons) && polygons.length > 0 && polygons.every((rings: any) =>
    Array.isArray(rings) && rings.length > 0 && rings.every((ring: any) => Array.isArray(ring) && ring.length >= 4
      && ring.every((point: any) => Array.isArray(point) && point.length >= 2 && Number.isFinite(point[0]) && Number.isFinite(point[1]) && Math.abs(point[0]) <= 180 && Math.abs(point[1]) <= 90)
      && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]),
  );
}
function errorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error";
  if (message.includes("401") || message.toLowerCase().includes("unauthorized")) return "Your session has expired. Please sign in again.";
  if (message.toLowerCase().includes("overlap")) return "This location overlaps an existing claim. Please choose a different location.";
  return message.length > 180 ? "The request failed. Please try again." : message;
}
const currentLocationIcon = L.divIcon({
  className: "current-location-marker",
  html: '<div style="width:14px;height:14px;border-radius:50%;background:#22d3ee;box-shadow:0 0 0 4px rgba(34,211,238,0.25),0 0 10px rgba(34,211,238,0.8)"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

export default function WorldMap() {
  const navigate = useNavigate();
  const location = useLocation();
  const { getToken } = useAuth();
  const apiKey = import.meta.env.VITE_MAPTILER_KEY as string | undefined;
  const routeLocationState = location.state as {
    initialCenter?: unknown;
    initialZoom?: unknown;
    locationAccuracy?: unknown;
  } | null;
  const initialCenter = routeLocationState?.initialCenter;
  const hasInitialLocation = Array.isArray(initialCenter)
    && initialCenter.length === 2
    && Number.isFinite(initialCenter[0])
    && Number.isFinite(initialCenter[1])
    && Math.abs(initialCenter[0]) <= 90
    && Math.abs(initialCenter[1]) <= 180;
  const initialZoom = typeof routeLocationState?.initialZoom === "number"
    && Number.isFinite(routeLocationState.initialZoom)
    ? Math.max(2, Math.min(18, routeLocationState.initialZoom))
    : DEFAULT_ZOOM;
  const [center, setCenter] = useState<Position>(() =>
    hasInitialLocation
      ? [initialCenter[0], initialCenter[1]]
      : DEFAULT_CENTER,
  );
  const [userCoords, setUserCoords] = useState<Position | null>(() =>
    hasInitialLocation ? [initialCenter[0], initialCenter[1]] : null,
  );

  useEffect(() => {
    if (hasInitialLocation || typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: Position = [position.coords.latitude, position.coords.longitude];
        setUserCoords(coords);
        setLocationAccuracy(position.coords.accuracy);
        setCenter(coords);
        setLocationMessage(null);
      },
      () => {
        setLocationMessage((current) => current ?? "Location permission is unavailable right now. You can still explore or search the map.");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 300000 },
    );
  }, [hasInitialLocation]);
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(() =>
    typeof routeLocationState?.locationAccuracy === "number"
      && Number.isFinite(routeLocationState.locationAccuracy)
      ? routeLocationState.locationAccuracy
      : null,
  );
  const [kingdoms, setKingdoms] = useState<KingdomRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const effectiveCenter = useMemo(() => userCoords ?? center, [center, userCoords]);
  const [search, setSearch] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [tileError, setTileError] = useState(false);
  const [hybrid, setHybrid] = useState(Boolean(apiKey));
  const [createAt, setCreateAt] = useState<Position | null>(null);
  const [selectingLocation, setSelectingLocation] = useState(false);
  const [claimAt, setClaimAt] = useState<Position | null>(null);
  const [claimSuccess, setClaimSuccess] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [memberKingdomIds, setMemberKingdomIds] = useState<Set<string>>(new Set());
  const [membershipLoading, setMembershipLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinMessage, setJoinMessage] = useState<string | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const mapContext = useRef<{ center: Position; zoom: number }>({ center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM });
  const selected = kingdoms.find((kingdom) => kingdom._id === selectedId) ?? null;
  const validKingdoms = useMemo(() => kingdoms
    .filter((kingdom) => kingdom.center?.type === "Point"
      && Number.isFinite(kingdom.center.coordinates?.[0]) && Number.isFinite(kingdom.center.coordinates?.[1])
      && Math.abs(kingdom.center.coordinates[0]) <= 180 && Math.abs(kingdom.center.coordinates[1]) <= 90)
    .sort((left, right) => {
      const leftDistance = Math.hypot(
        (left.center!.coordinates[1] - effectiveCenter[0]) * 111_000,
        (left.center!.coordinates[0] - effectiveCenter[1]) * 111_000,
      );
      const rightDistance = Math.hypot(
        (right.center!.coordinates[1] - effectiveCenter[0]) * 111_000,
        (right.center!.coordinates[0] - effectiveCenter[1]) * 111_000,
      );
      return leftDistance - rightDistance;
    }), [effectiveCenter, kingdoms]);
  const refresh = useCallback(() => setRefreshKey((value) => value + 1), []);
  const fetchKingdomDetails = useCallback(async (id: string) => {
    try {
      const result = await apiFetch(`/kingdoms/${id}`);
      if (!result.kingdom) throw new Error("The server did not return the saved kingdom.");
      setKingdoms((current) => [
        result.kingdom,
        ...current.filter((item) => item._id !== id),
      ]);
      setSelectedId(id);
    } catch (error) {
      setLoadError(errorMessage(error));
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const nearbyCenter = effectiveCenter;
    const nearbyRadius = userCoords ? 50_000 : 20_000;
    setLoading(true); setLoadError(null);
    Promise.allSettled([
      apiFetch(`/kingdoms/nearby?lat=${nearbyCenter[0]}&lng=${nearbyCenter[1]}&radius=${nearbyRadius}`, undefined, { signal: controller.signal }),
      apiFetch(`/kingdoms/all`, undefined, { signal: controller.signal }),
    ])
      .then(([nearbyRes, allRes]) => {
        if (!active) return;
        const failures = [nearbyRes, allRes].filter(
          (result) => result.status === "rejected",
        );
        if (failures.length === 2) {
          setLoadError(errorMessage(failures[0].reason));
          setKingdoms([]);
          return;
        }
        if (failures.length === 1) {
          setLoadError(
            `Some kingdom data could not be loaded: ${errorMessage(failures[0].reason)}`,
          );
        }
        const nearby = Array.isArray(nearbyRes.status === 'fulfilled' ? nearbyRes.value?.kingdoms : []) ? (nearbyRes.status === 'fulfilled' ? nearbyRes.value.kingdoms : []) : [];
        const all = Array.isArray(allRes.status === 'fulfilled' ? allRes.value?.kingdoms : []) ? (allRes.status === 'fulfilled' ? allRes.value.kingdoms : []) : [];
        const merged = [...nearby, ...all];
        const map = new Map<string, any>();
        for (const item of merged) {
          if (item && typeof item._id === 'string') map.set(item._id, item);
        }
        setKingdoms(Array.from(map.values()));
      })
      .catch((error) => { if (active && error.name !== "AbortError") setLoadError(errorMessage(error)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [effectiveCenter, refreshKey, userCoords]);

  useEffect(() => {
    let active = true;
    setMembershipLoading(true);
    void (async () => {
      try {
        const token = await getToken();
        if (!token) {
          if (active) setMemberKingdomIds(new Set());
          return;
        }
        const result = await apiFetch("/kingdoms/mine", token);
        const ids = Array.isArray(result?.memberships)
          ? result.memberships.map((item: { kingdomId: unknown }) => String(item.kingdomId))
          : [];
        if (active) setMemberKingdomIds(new Set(ids));
      } catch (error) {
        if (active) setJoinError(errorMessage(error));
      } finally {
        if (active) setMembershipLoading(false);
      }
    })();
    return () => { active = false; };
  }, [getToken, refreshKey]);

  useEffect(() => {
    if (selectedId && !kingdoms.some((kingdom) => kingdom._id === selectedId)) setSelectedId(null);
  }, [kingdoms, selectedId]);

  const relocate = (position: Position) => {
    setCenter(position);
    mapRef.current?.setView(position, Math.max(mapRef.current.getZoom(), 14));
  };
  const locateMe = () => {
    setLocationMessage(null);
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationMessage("Location is not supported by this browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: Position = [position.coords.latitude, position.coords.longitude];
        setUserCoords(coords);
        setLocationAccuracy(position.coords.accuracy);
        setLocationMessage(null);
        relocate(coords);
        setLocating(false);
      },
      (error) => {
        let msg = "Your location is currently unavailable. Please try again.";
        if (error.code === error.PERMISSION_DENIED) {
          msg = "Location permission was denied. You can still explore or search the map.";
        } else if (error.code === error.TIMEOUT) {
          msg = "Getting your location timed out. Please try again.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = "Location information is unavailable. Please try again.";
        }
        setLocationMessage(msg);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    );
  };
  const searchPlace = async () => {
    const term = search.trim();
    if (!term) return;
    setSearching(true); setSearchError(null);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(term)}&limit=1`, { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error("Place search is temporarily unavailable.");
      const results = await response.json();
      if (!Array.isArray(results) || !results[0]) { setSearchError("No matching place found."); return; }
      const lat = Number(results[0].lat); const lng = Number(results[0].lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new Error("The search result had invalid coordinates.");
      relocate([lat, lng]);
    } catch (error) { setSearchError(errorMessage(error)); }
    finally { setSearching(false); }
  };
  const enterKingdom = (id: string) => {
    if (mapRef.current) { const point = mapRef.current.getCenter(); mapContext.current = { center: [point.lat, point.lng], zoom: mapRef.current.getZoom() }; }
    navigate(`/kingdom/${encodeURIComponent(id)}`, { state: { fromMap: true, mapCenter: mapContext.current.center, mapZoom: mapContext.current.zoom } });
  };
  const styles = (feature: any): L.PathOptions => {
    const kingdom = kingdoms.find((candidate) => candidate._id === feature?.properties?.kingdomId);
    if (!kingdom) return { opacity: 0, fillOpacity: 0 };
    const color = colorFor(kingdom); const isSelected = kingdom._id === selectedId;
    return { color, weight: isSelected ? 4 : 2, opacity: 0.95, fillColor: color, fillOpacity: isSelected ? 0.26 : 0.11, dashArray: kingdom.isSample ? "6 5" : undefined };
  };
  const onPickLocation = (point: Position) => { setCreateAt(point); setSelectingLocation(false); setLocationMessage(null); };
  const onClaimLocation = (point: Position) => { setClaimAt(point); setClaimSuccess(false); setSelectingLocation(false); setLocationMessage(null); };
  const joinSelectedKingdom = async () => {
    if (!selected || selected.isSample || memberKingdomIds.has(selected._id) || joining) return;
    setJoining(true);
    setJoinError(null);
    setJoinMessage(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Your sign-in session is unavailable. Please sign in again.");
      await apiFetch(`/kingdoms/${encodeURIComponent(selected._id)}/join`, token, {
        method: "POST",
      });
      setMemberKingdomIds((current) => new Set(current).add(selected._id));
      setJoinMessage(`You joined ${selected.name} as a Member.`);
      window.dispatchEvent(new Event("fitness-messer-account-updated"));
    } catch (error) {
      setJoinError(errorMessage(error));
    } finally {
      setJoining(false);
    }
  };

  return (
    <main className="space-y-4 text-gray-100">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-xs font-semibold uppercase tracking-[0.22em] text-royalbright">Explore · establish · rule</p><h1 className="mt-1 font-display text-2xl font-bold">World Map</h1><p className="mt-1 text-sm text-gray-400">Discover kingdoms across the real world. Verified borders come from saved game territory.</p></div>
        <div className="flex gap-2"><button className="btn-ghost text-sm" onClick={refresh} disabled={loading} aria-label="Refresh kingdoms"><RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh</button><button className="btn-royal text-sm" onClick={() => { setCreateAt(null); setClaimAt(null); setSelectingLocation(true); setLocationMessage("Click the map to choose where your kingdom will be founded."); }}><Crown size={16} /> Found Kingdom</button><button className="btn-royal text-sm" onClick={() => { setCreateAt(null); setSelectingLocation(false); setClaimAt([center[0], center[1]]); setClaimSuccess(false); setLocationMessage("Click the map to claim unclaimed territory."); }}><ShieldCheck size={16} /> Claim Territory</button></div>
      </header>
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="relative h-[68vh] min-h-[430px] overflow-hidden rounded-xl border-white/10 bg-[#111923] shadow-2xl" aria-label="Interactive world map">
          <MapContainer center={center} zoom={initialZoom} minZoom={2} className="h-full w-full" zoomControl={false} scrollWheelZoom>
            <MapRef assign={(map) => { mapRef.current = map; }} />
            <MapClickPicker enabled={selectingLocation && !claimAt} mode="create" onPick={onPickLocation} />
            <MapClickPicker enabled={Boolean(claimAt) && !selectingLocation} mode="claim" onPick={onClaimLocation} />
            <TileLayer key={`${hybrid}-${Boolean(apiKey)}-${tileError}`} url={tileUrl(apiKey, hybrid && !tileError)} attribution={apiKey && hybrid && !tileError ? '&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>' : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'} eventHandlers={{ tileerror: () => { if (hybrid && !tileError) setTileError(true); } }} />
            {validKingdoms.map((kingdom) => <Marker key={kingdom._id} position={[kingdom.center!.coordinates[1], kingdom.center!.coordinates[0]]} eventHandlers={{ click: () => setSelectedId(kingdom._id) }}><Popup><strong>{kingdom.name}</strong>{kingdom.isSample && <div>Sample kingdom</div>}</Popup></Marker>)}
            {validKingdoms.filter((kingdom) => safeTerritory(kingdom.territory)).map((kingdom) => <GeoJSON key={`${kingdom._id}-${selectedId}`} data={{ type: "Feature", properties: { kingdomId: kingdom._id }, geometry: kingdom.territory! } as any} style={styles} eventHandlers={{ click: () => setSelectedId(kingdom._id) }} />)}
            {userCoords && <Marker position={userCoords} icon={currentLocationIcon}><Popup>Your current location{locationAccuracy !== null ? ` · approximately ${Math.round(locationAccuracy)} m accuracy` : ""}</Popup></Marker>}
            {userCoords && locationAccuracy !== null && Number.isFinite(locationAccuracy) && locationAccuracy > 0 && (
              <Circle center={userCoords} radius={Math.min(locationAccuracy, 2000)} pathOptions={{ color: '#22d3ee', weight: 1, fillColor: '#22d3ee', fillOpacity: 0.12 }} />
            )}
          </MapContainer>
          <div className="absolute left-3 top-3 z-[1000] flex max-w-[calc(100%-5rem)] flex-col gap-2">
            <form className="flex items-center gap-2 rounded-lg border-white/10 bg-[#0b1018]/90 p-2 shadow-lg backdrop-blur" onSubmit={(event) => { event.preventDefault(); void searchPlace(); }}><Search size={15} className="shrink-0 text-royalbright"/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search a real place" aria-label="Search geographical location" className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-gray-500 sm:w-52"/><button type="submit" disabled={searching} className="text-xs text-royalbright disabled:opacity-50">{searching ? "…" : "Go"}</button></form>
            {(searchError || locationMessage || loadError || (tileError && hybrid)) && <div role="status" className="max-w-sm rounded-lg border-amber-300/20 bg-[#111923]/95 px-3 py-2 text-xs text-amber-100">{searchError || locationMessage || (tileError && hybrid ? "Satellite tiles unavailable. Showing the standard road map instead." : loadError)}</div>}
            {userCoords && !locationMessage && <div className="max-w-sm rounded-lg border-lime/20 bg-[#111923]/95 px-3 py-2 text-xs text-lime">Map centered on your current location{locationAccuracy !== null ? ` · approximately ${Math.round(locationAccuracy)} m accuracy` : ""}. Location is used for discovery only.</div>}
            {userCoords && (
              <div className="max-w-sm rounded-lg border-cyan-300/20 bg-[#111923]/95 px-3 py-2 text-xs text-cyan-100">
                <div>My location: {userCoords[0].toFixed(5)}, {userCoords[1].toFixed(5)}{locationAccuracy !== null ? ` (±${Math.round(locationAccuracy)} m)` : ""}</div>
                <button
                  className="mt-1 btn-royal text-xs px-2 py-1"
                  onClick={() => {
                    setCreateAt(userCoords);
                    setSelectingLocation(false);
                    setClaimAt(null);
                    setLocationMessage("Adjust the founding point by clicking the map if desired.");
                  }}
                >
                  <Crown size={14} /> Found Kingdom Here
                </button>
              </div>
            )}
            {loading && <div className="rounded-md bg-black/70 px-2 py-1 text-xs text-gray-300">Loading kingdoms…</div>}
          </div>
          <div className="absolute right-3 top-3 z-[1000] flex-col gap-1.5">
            <button className="rounded-lg border-white/10 bg-[#0b1018]/90 p-2.5 text-gray-200 hover:text-royalbright" onClick={() => mapRef.current?.zoomIn()} aria-label="Zoom in"><Plus size={16}/></button><button className="rounded-lg border-white/10 bg-[#0b1018]/90 p-2.5 text-gray-200 hover:text-royalbright" onClick={() => mapRef.current?.zoomOut()} aria-label="Zoom out"><Minus size={16}/></button>            <button className="rounded-lg border-white/10 bg-[#0b1018]/90 p-2.5 text-gray-200 hover:text-royalbright" onClick={locateMe} disabled={locating} aria-label="Request my current location" title="My Location">{locating ? <RefreshCw size={16} className="animate-spin" /> : <LocateFixed size={16}/>}</button><button className="rounded-lg border-white/10 bg-[#0b1018]/90 p-2.5 text-gray-200 hover:text-royalbright" onClick={() => mapRef.current?.setView(mapContext.current.center, mapContext.current.zoom)} aria-label="Return to previous map view"><RefreshCw size={15}/></button>
          </div>
          <div className="absolute bottom-3 left-3 z-[1000] flex gap-2"><button className="rounded-lg border-white/10 bg-[#0b1018]/90 px-3 py-2 text-xs text-gray-200 disabled:cursor-not-allowed disabled:opacity-70" onClick={() => { if (!apiKey) return; setTileError(false); setHybrid((value) => !value); }} disabled={!apiKey} title={!apiKey ? "Configure VITE_MAPTILER_KEY to enable satellite imagery." : undefined}>{apiKey ? (hybrid ? "Satellite + labels" : "Road map") : "Satellite unavailable — configure map key"}</button>{selectingLocation && <span className="rounded-lg bg-amber-400/90 px-3 py-2 text-xs font-semibold text-[#111]">Click to pick founding location</span>}{claimAt && <span className="rounded-lg bg-royalbright/90 px-3 py-2 text-xs font-semibold text-[#111]">Click to pick claim location</span>}{claimSuccess && <span className="rounded-lg bg-emerald-500/90 px-3 py-2 text-xs font-semibold text-[#111]">Territory claimed!</span>}</div>
          <div className="absolute bottom-2 right-2 z-[500] rounded bg-black/60 px-2 py-1 text-[10px] text-gray-300">{apiKey && hybrid && !tileError ? "MapTiler · OpenStreetMap" : "OpenStreetMap"}</div>
        </section>
        <aside className="space-y-4">
          <Card>
            <SectionTitle right={loading ? <span className="text-xs text-gray-500">Syncing</span> : <span className="text-xs text-gray-500">{validKingdoms.length} nearby</span>}>{selected ? "Kingdom intelligence" : "Territory intel"}</SectionTitle>
            {loadError && <div className="space-y-3"><p className="text-sm text-red-300">Could not load kingdom data: {loadError}</p><button className="btn-ghost w-full text-sm" onClick={refresh}>Retry</button></div>}
            {!loadError && !selected && <div className="space-y-3"><p className="text-sm text-gray-400">Select a kingdom marker or saved border to inspect its verified details.</p>{!loading && validKingdoms.length === 0 && <p className="rounded-lg bg-white/5 p-3 text-xs text-gray-500">No kingdoms are recorded near this map view. Search a place or explore elsewhere.</p>}</div>}
            {selected && <div className="space-y-3">
              <div className="flex items-start justify-between gap-2"><div className="flex items-center gap-2"><Crown size={19} className={selected.isSample ? "text-gray-400" : "text-royalbright"}/><h2 className="font-display text-xl font-bold">{selected.name}</h2></div><button aria-label="Deselect kingdom" onClick={() => setSelectedId(null)} className="text-gray-500 hover:text-white"><X size={16}/></button></div>
              {selected.description && <p className="text-sm text-gray-400">{selected.description}</p>}
              {selected.isSample && <p className="rounded border-white/10 bg-white/5 px-2 py-1.5 text-xs text-gray-400">Development sample kingdom · not a player-created realm and cannot be joined.</p>}
              <div className="space-y-1 text-xs text-gray-400"><p>Ruler: <span className="text-gray-200">{selected.isSample ? "Fictional demo ruler" : selected.kingClerkUserId ? "Player ruler" : "Not provided"}</span></p><p>Territory: <span className="text-gray-200">{safeTerritory(selected.territory) ? "Persisted polygon border" : "Center marker only — no saved boundary"}</span></p>{selected.createdAt && <p>Founded: <span className="text-gray-200">{new Date(selected.createdAt).toLocaleDateString()}</span></p>}</div>
              {joinError && <p className="text-sm text-red-300" role="alert">{joinError}</p>}
              {joinMessage && <p className="text-sm text-lime" role="status">{joinMessage}</p>}
              {!selected.isSample && (
                <button className="btn-ghost w-full" onClick={() => void joinSelectedKingdom()} disabled={membershipLoading || joining || memberKingdomIds.has(selected._id)}>
                  {membershipLoading ? "Checking membership…" : joining ? "Joining…" : memberKingdomIds.has(selected._id) ? "You are a member" : "Join this kingdom as Member"}
                </button>
              )}
              <button className="btn-royal w-full" onClick={() => enterKingdom(selected._id)}><Castle size={16}/> Enter 3D Kingdom</button>
            </div>}
          </Card>
          <Card><SectionTitle>Map key</SectionTitle><div className="space-y-2 text-xs text-gray-400"><p className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-royalbright"/> Saved player territory</p><p className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-gray-500"/> Fictional development sample</p><p className="mt-2 border-t border-white/10 pt-2">Only persisted kingdom geometry is drawn. Markers indicate stored kingdom centers.</p></div></Card>
          <Card><SectionTitle>Found a kingdom</SectionTitle><p className="text-sm text-gray-400">Choose a location on the map to submit a founding request. The server decides whether it can be saved.</p><button className="btn-royal mt-3 w-full" onClick={() => { setSelectingLocation(true); setLocationMessage("Click the map to choose where your kingdom will be founded."); }}>Choose map location</button>{userCoords && <button className="btn-ghost mt-2 w-full text-xs" onClick={() => { setCreateAt(userCoords); setSelectingLocation(false); }}>Use my current location</button>}</Card>
          <Card><SectionTitle>Claim territory</SectionTitle><p className="text-sm text-gray-400">Found a kingdom on unclaimed territory. The server validates ownership and rejects overlapping claims.</p><button className="btn-royal mt-3 w-full" onClick={() => { setClaimAt([center[0], center[1]]); setClaimSuccess(false); setLocationMessage("Click the map to claim unclaimed territory."); }}>Choose map location</button>{userCoords && <button className="btn-ghost mt-2 w-full text-xs" onClick={() => { setClaimAt(userCoords); setSelectingLocation(false); setClaimSuccess(false); }}>Use my current location</button>}{claimSuccess && <p role="status" className="mt-2 text-xs text-emerald-300">Territory claimed successfully.</p>}</Card>
        </aside>
      </div>
      {createAt && <CreateKingdomModal center={createAt} onClose={() => setCreateAt(null)} onCreated={(kingdom) => { const id = String(kingdom?._id ?? ""); if (id) void fetchKingdomDetails(id); setCreateAt(null); refresh(); }} />}
      {claimAt && <ClaimKingdomModal center={claimAt} onClose={() => { setClaimAt(null); setClaimSuccess(false); }} onClaimed={(kingdom) => { const id = String(kingdom?._id ?? ""); if (id) void fetchKingdomDetails(id); setClaimAt(null); setClaimSuccess(true); refresh(); }} />}
    </main>
  );
}
