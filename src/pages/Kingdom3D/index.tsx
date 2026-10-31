import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Castle, Coins, Hammer, RotateCcw } from "lucide-react";
import { useAuth } from "@clerk/clerk-react";
import { Card, SectionTitle, ProgressBar } from "../../components/ui/Primitives";
import { RoleBadge } from "../../components/ui/CrownLogo";
import { apiFetch } from "../../services/apiClient";
import KingdomScene from "./KingdomScene";
import type { Building, RoyalRole } from "../../types";
import { CONSTRUCTION_COIN_COST_PER_POINT, levelProgress } from "../../data/gameRules";
import {
  demoKingdomPreviewBuildings,
  demoKingdomPreviewSeed,
} from "../../data/demoKingdomPreview";

type PersistedKingdom = {
  _id: string;
  name: string;
  seedId?: string;
  description?: string;
  kingClerkUserId: string;
  treasury: number;
  population: number;
  buildings: Building[];
  isSample?: boolean;
};

type DashboardSnapshot = {
  profile: {
    displayName: string | null;
    xp: number;
    level: number;
    strength: number;
    coins: number;
  };
};

export default function Kingdom3D() {
  const { kingdomId } = useParams();
  const { getToken, userId } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const mapState = location.state as { fromMap?: boolean; mapCenter?: [number, number]; mapZoom?: number } | null;
  const [fetchedKingdom, setFetchedKingdom] = useState<PersistedKingdom | null>(null);
  const [account, setAccount] = useState<DashboardSnapshot | null>(null);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [accountLoading, setAccountLoading] = useState(true);
  const kingdom = fetchedKingdom ? {
    id: String(fetchedKingdom._id),
    name: fetchedKingdom.name,
    ownerId: fetchedKingdom.kingClerkUserId,
    treasury: fetchedKingdom.treasury ?? 0,
    population: fetchedKingdom.population ?? 0,
    buildings: fetchedKingdom.isSample
      ? demoKingdomPreviewBuildings(String(fetchedKingdom._id), fetchedKingdom.seedId)
      : fetchedKingdom.buildings ?? [],
    description: fetchedKingdom.description || "",
    isDemoPreview: fetchedKingdom.isSample === true,
    previewSeed: demoKingdomPreviewSeed(String(fetchedKingdom._id), fetchedKingdom.seedId),
  } : null;
  const isStarterPreview = Boolean(kingdom && !kingdom.isDemoPreview && kingdom.buildings.length === 0);
  const sceneBuildings = kingdom && kingdom.buildings.length > 0
    ? kingdom.buildings
    : (kingdom ? demoKingdomPreviewBuildings(kingdom.id, String(kingdom.previewSeed)) : []);
  const sceneKingdom = kingdom ? { ...kingdom, buildings: sceneBuildings } : null;
  const [viewerRole, setViewerRole] = useState<RoyalRole>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [resetSignal, setResetSignal] = useState(0);
  const [cameraPreset, setCameraPreset] = useState<"overview" | "castle" | "default">("overview");
  const [webglFailed, setWebglFailed] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savingUpgrade, setSavingUpgrade] = useState(false);
  const [confirmingUpgrade, setConfirmingUpgrade] = useState(false);

  const returnToMap = () => {
    navigate("/map", {
      state: mapState?.fromMap
        ? { initialCenter: mapState.mapCenter, initialZoom: mapState.mapZoom }
        : undefined,
    });
  };

  const loadAccount = useCallback(async (signal?: AbortSignal) => {
    setAccountLoading(true);
    setAccountError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Sign in to load your player account.");
      const result = await apiFetch("/auth/dashboard", token, { signal }) as DashboardSnapshot;
      setAccount(result);
    } catch (error) {
      if (signal?.aborted) return;
      setAccount(null);
      setAccountError(error instanceof Error ? error.message : "Player data could not be loaded.");
    } finally {
      if (!signal?.aborted) setAccountLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    const controller = new AbortController();
    void loadAccount(controller.signal);
    const refreshAccount = () => void loadAccount();
    window.addEventListener("fitness-messer-account-updated", refreshAccount);
    return () => {
      controller.abort();
      window.removeEventListener("fitness-messer-account-updated", refreshAccount);
    };
  }, [loadAccount]);

  const loadKingdom = useCallback(async (signal?: AbortSignal) => {
    if (!kingdomId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const [kingdomResponse, token] = await Promise.all([
        apiFetch(`/kingdoms/${kingdomId}`, undefined, { signal }),
        getToken(),
      ]);
      if (!kingdomResponse.kingdom) throw new Error("The server did not return this kingdom.");
      setFetchedKingdom(kingdomResponse.kingdom);
      if (token) {
        const membershipResponse = await apiFetch(
          `/kingdoms/${kingdomId}/membership`,
          token,
          { signal },
        );
        setViewerRole(membershipResponse.membership?.role ?? null);
      } else {
        setViewerRole(null);
      }
    } catch (error) {
      if (signal?.aborted) return;
      setLoadError(error instanceof Error ? error.message : "Could not load kingdom data.");
      setFetchedKingdom(null);
      setViewerRole(null);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [getToken, kingdomId]);

  useEffect(() => {
    const controller = new AbortController();
    void loadKingdom(controller.signal);
    return () => controller.abort();
  }, [loadKingdom]);

if (loading) return <Card className="text-center"><p className="text-sm text-gray-400">Loading kingdom…</p></Card>;
  if (loadError) {
    return (
      <Card className="space-y-3 text-center">
        <p className="text-sm text-red-300">Could not load this kingdom: {loadError}</p>
        <button className="btn-ghost" onClick={() => void loadKingdom()}>Retry</button>
        <button onClick={returnToMap} className="btn-primary ml-2">Back to the map</button>
      </Card>
    );
  }
  if (!kingdom) {
    return (
      <Card className="text-center">
        <Castle size={32} className="mx-auto text-royal" />
        <h1 className="mt-3 font-display text-xl font-bold">Kingdom not found</h1>
        <p className="mt-1 text-sm text-gray-500">That territory isn't on the map.</p>
        <button onClick={returnToMap} className="btn-primary mt-4">Back to the map</button>
      </Card>
    );
  }

  const isMember = viewerRole !== null;
  const selected = sceneBuildings.find((b) => b.id === selectedId) ?? null;
  const selectedUpgradeCost =
    selected && selected.progress === selected.progressRequired
      ? Math.ceil(selected.progressRequired * CONSTRUCTION_COIN_COST_PER_POINT)
      : null;
  const minimapPosition = (position: [number, number]) => {
    let [x, z] = position;
    const turns = kingdom.isDemoPreview ? kingdom.previewSeed % 4 : 0;
    for (let turn = 0; turn < turns; turn++) [x, z] = [z, -x];
    return [x, z] as const;
  };

  const runUpgrade = async () => {
    if (!selected) return;
    setSavingUpgrade(true);
    setMessage(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Sign in again to manage kingdom construction.");
      const result = await apiFetch(
        `/kingdoms/${kingdom.id}/buildings/${encodeURIComponent(selected.id)}/upgrade`,
        token,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requestId: crypto.randomUUID() }),
        },
      );
      setFetchedKingdom(result.kingdom);
      setMessage(`Construction complete. Treasury spent: ${result.operation.cost} FM.`);
      setConfirmingUpgrade(false);
      setResetSignal((signal) => signal + 1);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The upgrade could not be saved.");
    } finally {
      setSavingUpgrade(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-[26px] border border-[#d4af37]/20 bg-[linear-gradient(135deg,_rgba(26,18,10,0.85),_rgba(11,15,17,0.95))] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#d4af37]/30 bg-[#d4af37]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#f7d67a]">
            <Castle size={12} /> Kingdom command
          </div>
          <h1 className="gold-text font-display text-3xl font-bold tracking-tight">{kingdom.name}</h1>
          <p className="mt-1 text-sm text-gray-400">{fetchedKingdom?.isSample ? "Fictional demo empire · preview only" : kingdom.ownerId === userId ? "Ruler: your account" : "Ruler: another player"} · {isMember ? "member access" : "visitor access"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-ghost text-sm" onClick={() => { setCameraPreset("overview"); setResetSignal((s) => s + 1); }}><RotateCcw size={15} /> Reset camera</button>
          <button className="btn-ghost text-sm" onClick={() => { setCameraPreset("castle"); setResetSignal((s) => s + 1); }}>Focus castle</button>
          <button className="btn-ghost text-sm" onClick={() => { setCameraPreset("default"); setResetSignal((s) => s + 1); }}>View entire kingdom</button>
          <button className="btn-ghost text-sm" onClick={returnToMap}>Back to map</button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="relative min-h-[420px] lg:col-span-2 lg:min-h-[560px] overflow-hidden rounded-[28px] border border-[#d4af37]/20 bg-[radial-gradient(circle_at_top,_rgba(108,92,231,0.18),transparent_42%),linear-gradient(160deg,_rgba(11,15,17,0.96),_rgba(20,19,28,0.88))] shadow-[0_30px_80px_rgba(0,0,0,0.45)]" style={{ height: "70vh" }}>
          {webglFailed ? (
            <Card className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <Castle size={34} className="text-royal" />
              <h2 className="font-display text-lg font-bold text-gray-200">3D unavailable</h2>
              <p className="max-w-sm text-sm text-gray-500">
                Your browser couldn't initialise WebGL. The kingdom's stats remain fully functional in the panel beside you.
              </p>
            </Card>
          ) : (
            <ErrorBoundaryFallback onFail={() => setWebglFailed(true)}>
              <div className="h-full overflow-hidden rounded-[28px] border border-amber-400/40 shadow-[0_0_80px_rgba(245,158,11,0.18)]">
                <KingdomScene
                  kingdom={sceneKingdom ?? kingdom}
                  isDemoPreview={kingdom.isDemoPreview || isStarterPreview}
                  previewSeed={kingdom.previewSeed}
                  selectedBuildingId={selectedId}
                  onSelectBuilding={setSelectedId}
                  resetSignal={resetSignal}
                  cameraPreset={cameraPreset}
                />
              </div>
            </ErrorBoundaryFallback>
          )}
          {isStarterPreview && (
            <div className="pointer-events-none absolute left-3 top-3 rounded-lg border border-amber-400/30 bg-[#101820]/90 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-amber-200 shadow-xl backdrop-blur">
              Starter settlement preview
            </div>
          )}
          <div className="pointer-events-none absolute left-3 top-3 max-w-[190px] rounded-lg border border-white/10 bg-[#101820]/90 p-3 shadow-xl backdrop-blur">
            {accountLoading ? (
              <p className="text-xs text-gray-400" role="status">Loading player profile…</p>
            ) : account ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-royal/30 font-bold text-royalbright">
                    {(account.profile.displayName || "W").slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-100">{account.profile.displayName || "Warrior"}</p>
                    <p className="text-[11px] text-gray-400">Level {account.profile.level} · {account.profile.xp.toLocaleString()} XP</p>
                    <p className="text-[10px] text-gray-500">{account.profile.strength.toLocaleString()} strength</p>
                  </div>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full bg-lime" style={{ width: `${levelProgress(account.profile.xp).pct}%` }} />
                </div>
                <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-royalbright">
                  <Coins size={13} /> {account.profile.coins.toLocaleString()} FM
                </p>
              </>
            ) : (
              <p className="text-xs text-amber-200" title={accountError ?? undefined}>
                Player values unavailable{accountError ? `: ${accountError}` : ""}
              </p>
            )}
          </div>
          <div className="pointer-events-none absolute right-3 top-3 max-w-[150px] rounded-lg border border-white/10 bg-[#101820]/90 p-3 shadow-xl backdrop-blur">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-royalbright">Objectives</p>
            <p className="mt-1 text-xs text-gray-400">No active quests are available.</p>
          </div>
          <div className="pointer-events-none absolute bottom-3 left-3 w-28 rounded-lg border border-white/10 bg-[#101820]/90 p-2 shadow-xl">
            <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-gray-400">Kingdom minimap</p>
            <svg viewBox="0 0 100 100" className="w-full" role="img" aria-label="Minimap plotting saved kingdom buildings">
              <path d="M50 3 C74 4 95 26 96 48 C98 69 75 96 51 97 C27 98 4 77 3 52 C1 29 24 5 50 3Z" fill="#315744" stroke="#90ae76" strokeWidth="2" />
              {sceneBuildings.map((building) => {
                const [x, z] = minimapPosition(building.position);
                return (
                  <circle
                    key={building.id}
                    cx={Math.max(4, Math.min(96, 50 + x))}
                    cy={Math.max(4, Math.min(96, 50 + z))}
                    r={building.id === selectedId ? 3.2 : 2}
                    fill={building.id === selectedId ? "#c4f36b" : "#f2cd75"}
                    stroke="#14211b"
                    strokeWidth="1"
                  />
                );
              })}
            </svg>
          </div>
          <div className="pointer-events-none absolute bottom-3 right-3 rounded-lg bg-black/70 px-3 py-1.5 text-[11px] text-gray-400">
            drag to orbit · scroll to zoom · right-drag to pan · click buildings
          </div>
        </div>

        <div className="space-y-5">
          <Card>
            <SectionTitle>{kingdom.isDemoPreview ? "Demo empire preview" : "Persistent kingdom data"}</SectionTitle>
            {kingdom.isDemoPreview ? (
              <>
                <p className="text-sm text-gray-400">
                  Illustrative buildings and settlement scenery are generated locally from this sample&apos;s stable ID. Nothing shown here is saved, owned by a player, or usable in gameplay.
                </p>
                <div className="mt-3 rounded-lg bg-white/5 p-3 text-xs text-gray-300">
                  Fictional ruler · preview-only settlement · no spendable treasury
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2.5 text-center text-xs">
                <div className="rounded-lg bg-white/5 p-2.5"><div className="font-bold text-gray-100">{kingdom.population}</div><div className="text-gray-500">Population</div></div>
                <div className="rounded-lg bg-white/5 p-2.5"><div className="font-bold text-royalbright">{kingdom.treasury} FM</div><div className="text-gray-500">Treasury</div></div>
                <div className="rounded-lg bg-white/5 p-2.5 col-span-2"><div className="font-bold text-gray-100">{kingdom.buildings.length}</div><div className="text-gray-500">Saved buildings</div></div>
                </div>
                <div className="mt-3 flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-sm">
                  <span className="text-gray-200">{kingdom.ownerId === userId ? "You founded this kingdom" : "Current kingdom ruler"}</span>
                  <RoleBadge role={viewerRole} />
                </div>
                {isMember && (
                  <button className="btn-royal mt-4 w-full text-sm" onClick={() => navigate("/sabha")}>
                    Enter the Sabha
                  </button>
                )}
              </>
            )}
          </Card>

          <Card>
            <SectionTitle>{kingdom.isDemoPreview ? "Illustrative buildings" : "Saved buildings"}</SectionTitle>
            <div className="space-y-3">
              {kingdom.buildings.length === 0 && (
                <p className="rounded-lg bg-white/5 p-3 text-sm text-gray-400">
                  This kingdom has no saved building records yet. No structures are being substituted.
                </p>
              )}
              {kingdom.buildings.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setSelectedId(b.id)}
                  className={`w-full rounded-lg border p-3 text-left transition ${selectedId === b.id ? "border-lime/60 bg-lime/10" : "border-white/10 hover:bg-white/5"}`}
                >
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold text-gray-200">{b.type}</span>
                    <span className="text-royalbright">Lv {b.level}</span>
                  </div>
                  <div className="mt-2"><ProgressBar pct={b.progressRequired > 0 ? Math.min(100, (b.progress / b.progressRequired) * 100) : 0} tone="bg-royal" label={kingdom.isDemoPreview ? `Preview only · ${b.category}` : `${b.progress}/${b.progressRequired} progress · ${b.category}`} /></div>
                </button>
              ))}
            </div>
          </Card>

          {selected && (
            <Card>
              <SectionTitle>{selected.type}</SectionTitle>
              <p className="text-sm text-gray-400">{selected.description}</p>
              {!kingdom.isDemoPreview && selected.type.toLowerCase().includes("training") && (
                <button className="btn-ghost mt-3 w-full text-sm" onClick={() => navigate("/workout")}>
                  Open Workout Arena
                </button>
              )}
              {!kingdom.isDemoPreview && selected.type.toLowerCase().includes("palace") && (
                isMember ? (
                  <button className="btn-ghost mt-3 w-full text-sm" onClick={() => navigate("/sabha")}>
                    Open kingdom Sabha
                  </button>
                ) : (
                  <p className="mt-3 rounded-lg bg-white/5 p-3 text-xs text-gray-500">
                    Kingdom management actions are available to members only.
                  </p>
                )
              )}
              {!kingdom.isDemoPreview && ["mine", "farm", "port", "research", "housing"].some((type) => selected.type.toLowerCase().includes(type)) && (
                <p className="mt-3 rounded-lg bg-white/5 p-3 text-xs text-gray-500">
                  This building is saved, but its resource and service actions are not implemented yet.
                </p>
              )}
              <div className="mt-3 text-xs text-gray-500">Category: <span className="capitalize text-gray-300">{selected.category}</span>. Construction progress must come from verified exercise sessions; verification is not available yet.</div>
              {kingdom.isDemoPreview ? (
                <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-gray-500">
                  These sample building levels and progress are illustrative only and cannot be upgraded or saved.
                </div>
              ) : isMember ? (
                <div className="mt-4 space-y-2.5">
                  <p className="text-xs text-gray-400">Current role: <RoleBadge role={viewerRole} /></p>
                  <button className="btn-royal w-full text-sm" onClick={() => setConfirmingUpgrade(true)} disabled={savingUpgrade || selectedUpgradeCost === null || kingdom.treasury < selectedUpgradeCost}>
                    <Hammer size={15} /> {selected.progress < selected.progressRequired
                      ? `Needs ${selected.progressRequired - selected.progress} verified progress`
                      : selectedUpgradeCost === null
                        ? "Saved construction progress is invalid"
                      : kingdom.treasury < selectedUpgradeCost
                        ? "Insufficient kingdom treasury"
                        : `Upgrade to Lv ${selected.level + 1} · ${selectedUpgradeCost} FM`}
                  </button>
                </div>
              ) : (
                <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-gray-500">
                  Sign in and join this kingdom to manage saved construction. Membership is checked by the server.
                </div>
              )}
            </Card>
          )}

          {message && (
            <div className="rounded-lg border border-royal/40 bg-royal/10 px-4 py-3 text-sm text-royalbright" onClick={() => setMessage(null)}>
              {message} <span className="float-right text-gray-500">(dismiss)</span>
            </div>
          )}
        </div>
      </div>

      {confirmingUpgrade && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setConfirmingUpgrade(false)}>
          <div className="panel w-full max-w-sm p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-lg font-bold text-gray-100">
              Confirm construction
            </h3>
            <p className="mt-2 text-sm text-gray-400">
              Spend {selectedUpgradeCost ?? 0} FM from the saved kingdom treasury to raise {selected.type} to level {selected.level + 1}?
            </p>
            <div className="mt-5 flex gap-3">
              <button className="btn-ghost flex-1" onClick={() => setConfirmingUpgrade(false)}>Cancel</button>
              <button className="btn-primary flex-1" onClick={() => void runUpgrade()} disabled={savingUpgrade}>{savingUpgrade ? "Saving…" : "Confirm"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* Minimal error boundary for WebGL scene failures. */
import { Component, type ReactNode } from "react";

class ErrorBoundaryFallback extends Component<{ onFail: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFail(); }
  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}
