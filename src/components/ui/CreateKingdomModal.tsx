import { useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { apiFetch } from "../../services/apiClient";
import { Card } from "../../components/ui/Primitives";

function errorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "The kingdom could not be created.";
  if (message.includes("401") || message.toLowerCase().includes("unauthorized")) return "Your session has expired. Please sign in again.";
  if (message.includes("409") || message.toLowerCase().includes("overlap")) {
    return "This location overlaps an existing claim. Please choose a different location on the map.";
  }
  if (message.toLowerCase().includes("invalid territory") || message.toLowerCase().includes("geometry")) {
    return "That location cannot be used to form a valid territory. Please choose a different spot.";
  }
  if (message.toLowerCase().includes("invalid coordinates") || message.toLowerCase().includes("valid map location")) {
    return "Choose a valid map location.";
  }
  // Strip API status prefix if present
  const stripped = message.replace(/^API request failed \(\d+\):\s*/i, "");
  if (stripped.length > 200) return "The kingdom could not be created. Please try again.";
  return stripped || "The kingdom could not be created. Please try again.";
}

export default function CreateKingdomModal({ center, onClose, onCreated }: { center: [number, number]; onClose: () => void; onCreated: (k: any) => void }) {
  const { getToken } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (loading) return;
    if (!name.trim() || name.trim().length > 80) { setError("Enter a kingdom name between 1 and 80 characters."); return; }
    if (description.trim().length > 300) { setError("Description must be 300 characters or fewer."); return; }
    if (!Number.isFinite(center[0]) || Math.abs(center[0]) > 90 || !Number.isFinite(center[1]) || Math.abs(center[1]) > 180) { setError("Choose a valid map location."); return; }
    setLoading(true); setError(null);
    try {
      const token = await getToken();
      const res = await apiFetch("/kingdoms", token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined, lat: center[0], lng: center[1] }),
      });
      if (!res?.kingdom?._id) throw new Error("The server did not confirm a saved kingdom.");
      onCreated(res.kingdom);
    } catch (e: unknown) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/70 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !loading) onClose(); }}>
      <div className="panel w-full max-w-md space-y-3 p-5" role="dialog" aria-modal="true" aria-labelledby="create-kingdom-title">
        <h3 id="create-kingdom-title" className="font-display text-lg font-bold text-gray-100">Create Your Kingdom</h3>
        <label className="block text-xs text-gray-400" htmlFor="kingdom-name">Kingdom name</label>
        <input id="kingdom-name" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="Kingdom name" className="w-full rounded bg-white/5 p-2 text-sm text-gray-200" />
        <label className="block text-xs text-gray-400" htmlFor="kingdom-description">Description (optional)</label>
        <textarea id="kingdom-description" maxLength={300} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe your kingdom" className="w-full rounded bg-white/5 p-2 text-sm text-gray-200" />
        <p className="text-xs text-gray-400">Map coordinates [latitude, longitude]: {center[0].toFixed(5)}, {center[1].toFixed(5)}</p>
        {error && <p role="alert" className="text-xs text-red-300">{error}</p>}
        <div className="flex gap-2">
          <button className="btn-royal" onClick={submit} disabled={loading}>{loading ? "Creating…" : "Confirm founding"}</button>
          <button className="btn-primary" onClick={onClose} disabled={loading}>Cancel</button>
        </div>
      </div>
    </div>
  );
}