import { apiFetch } from "./apiClient";

export async function fetchMe(token: string | null) {
  return apiFetch("/auth/me", token);
}
