import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Castle, ChevronRight, Footprints, Map } from "lucide-react";
import { useApp } from "../../features/store/StoreProvider";
import { CrownLogo } from "../../components/ui/CrownLogo";

export default function ChoosePath() {
  const { state, store } = useApp();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!state.profile) return null;

  const continueTo = async (path: "/dashboard" | "/map") => {
    setSaving(true);
    setError(null);
    try {
      await store.finishOnboarding();
      navigate(path);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Onboarding could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-10">
      <div className="animate-fade-up w-full max-w-3xl">
        <div className="mb-6 flex items-center gap-3">
          <CrownLogo size={44} />
          <div>
            <h1 className="font-display text-2xl font-bold text-gray-100">
              Choose Your Path
            </h1>
            <p className="text-sm text-gray-500">
              Your choice is saved to your player profile.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-red-400/20 bg-red-950/20 p-4 text-sm text-red-200" role="alert">
            {error}
          </div>
        )}

        <div className="grid gap-5 md:grid-cols-2">
          <div className="panel flex flex-col p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-lime/40 bg-lime/10 p-3">
                <Footprints className="text-lime" size={24} />
              </div>
              <h2 className="font-display text-xl font-bold text-gray-100">
                Train Independently
              </h2>
            </div>
            <p className="mt-3 flex-1 text-sm text-gray-400">
              Start with your persistent player profile and explore workouts.
              Reports remain unverified and do not award progression until a
              trusted exercise verifier is available.
            </p>
            <button
              className="btn-primary mt-6 w-full"
              onClick={() => void continueTo("/dashboard")}
              disabled={saving}
            >
              {saving ? "Saving…" : "Continue to dashboard"} <ChevronRight size={17} />
            </button>
          </div>

          <div className="panel flex flex-col p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-royal/40 bg-royal/10 p-3">
                <Castle className="text-royalbright" size={24} />
              </div>
              <h2 className="font-display text-xl font-bold text-gray-100">
                Explore the World Map
              </h2>
            </div>
            <p className="mt-3 flex-1 text-sm text-gray-400">
              View saved kingdom territories and create a persistent kingdom
              where the backend confirms the area is available. Joining another
              kingdom is not available yet; no demo membership will be created.
            </p>
            <button
              className="btn-royal mt-6 w-full"
              onClick={() => void continueTo("/map")}
              disabled={saving}
            >
              <Map size={17} /> {saving ? "Saving…" : "Open world map"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
