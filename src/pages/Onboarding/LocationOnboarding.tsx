import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  LoaderCircle,
  MapPin,
  MapPinOff,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { useApp } from "../../features/store/StoreProvider";
import { CrownLogo } from "../../components/ui/CrownLogo";
import type { OnboardingState } from "../../types";

type Coordinates = { lat: number; lng: number; accuracy: number };

export default function LocationOnboarding() {
  const { state, store } = useApp();
  const navigate = useNavigate();
  const [requesting, setRequesting] = useState(false);
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [status, setStatus] = useState<OnboardingState["locationStatus"]>("unset");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!state.profile) return null;

  const requestLocation = () => {
    setError(null);
    if (!navigator.geolocation || !window.isSecureContext) {
      setStatus("unavailable");
      store.setLocationStatus("unavailable");
      setError("Location access is unavailable in this browser context. You can still browse the map and choose a location manually.");
      return;
    }

    setRequesting(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coordinates = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
        setLocation(coordinates);
        setStatus("granted");
        store.setLocationStatus("granted");
        setRequesting(false);
      },
      (reason) => {
        const status = reason.code === reason.PERMISSION_DENIED
          ? "denied"
          : "unavailable";
        setStatus(status);
        store.setLocationStatus(status);
        setError(
          reason.code === reason.PERMISSION_DENIED
            ? "Location permission was denied. Your location was not guessed or replaced. You can browse the map manually."
            : reason.code === reason.TIMEOUT
              ? "The location request timed out. Try again or continue to the map and choose a location manually."
              : "Your location could not be determined. You can continue with manual map navigation.",
        );
        setRequesting(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  };

  const continueTo = async (path: "/dashboard" | "/map") => {
    setSaving(true);
    setError(null);
    try {
      await store.finishOnboarding();
      if (path === "/map" && location) {
        navigate("/map", {
          state: {
            initialCenter: [location.lat, location.lng],
            locationAccuracy: location.accuracy,
          },
        });
      } else {
        navigate(path);
      }
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
              Welcome, {state.profile.fullName.split(" ")[0]}
            </h1>
            <p className="text-sm text-gray-500">
              Choose whether to explore nearby saved kingdoms or begin solo.
            </p>
          </div>
        </div>

        <section className="panel p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="rounded-xl border border-royal/40 bg-royal/10 p-3">
              <MapPin className="text-royalbright" size={26} />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-gray-100">
                Use your current location
              </h2>
              <p className="mt-2 text-sm text-gray-400">
                Location permission centers the map and lets it request nearby saved kingdoms. It does not prove land ownership, and your coordinates are not saved to your profile.
              </p>
              <div className="mt-3 flex items-start gap-2 text-xs text-gray-500">
                <ShieldAlert size={14} className="mt-0.5 shrink-0" />
                <span>You may deny permission and navigate the real map manually. No simulated region will be presented as your location.</span>
              </div>
            </div>
          </div>

          {!location && (
            <button className="btn-primary mt-6" onClick={requestLocation} disabled={requesting}>
              {requesting ? <LoaderCircle className="animate-spin" size={17} /> : <MapPin size={17} />}
              {requesting ? "Getting location…" : "Allow location"}
            </button>
          )}

          {location && (
            <div className="mt-5 flex items-start gap-2 rounded-lg border border-lime/20 bg-lime/5 p-3 text-sm text-lime" role="status">
              <CheckCircle2 size={17} className="mt-0.5 shrink-0" />
              <span>
                Location received with approximately {Math.round(location.accuracy)} m accuracy. It will be used to center your map for this navigation only.
              </span>
            </div>
          )}

          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300" role="alert">
              <XCircle size={17} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {(status === "denied" || status === "unavailable" || status === "skipped") && (
            <p className="mt-3 flex items-center gap-2 text-xs text-gray-500">
              <MapPinOff size={14} /> Manual map navigation remains available.
            </p>
          )}

          <div className="mt-7 flex flex-wrap gap-3 border-t border-white/10 pt-5">
            <button className="btn-royal" onClick={() => void continueTo("/map")} disabled={saving}>
              {saving ? "Saving…" : "Explore map / create kingdom"}
            </button>
            <button className="btn-ghost" onClick={() => void continueTo("/dashboard")} disabled={saving}>
              {saving ? "Saving…" : "Practice independently"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
