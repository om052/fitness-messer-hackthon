import { apiFetch } from "./apiClient";

export async function fetchKingdomsMine(token: string | null) {
  return apiFetch("/kingdoms/mine", token);
}

export async function fetchKingdom(id: string, token?: string | null) {
  return apiFetch(`/kingdoms/${id}`, token);
}

export async function createKingdom(token: string | null, body: { name: string; description?: string; lat: number; lng: number }) {
  return apiFetch("/kingdoms", token, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

export async function claimTerritory(token: string | null, body: { name: string; description?: string; lat: number; lng: number; territoryId?: string | null }) {
  return apiFetch("/kingdoms/claim", token, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

export async function joinKingdom(token: string | null, id: string) {
  return apiFetch(`/kingdoms/${id}/join`, token, { method: "POST" });
}

export async function leaveKingdom(token: string | null, id: string) {
  return apiFetch(`/kingdoms/${id}/leave`, token, { method: "POST" });
}

export async function getKingdomMembers(id: string, token?: string | null) {
  return apiFetch(`/kingdoms/${id}/members`, token);
}
