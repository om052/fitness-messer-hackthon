import type { Kingdom } from "../../types";

/**
 * Frontend demo authentication service.
 * Clearly NOT production authentication — replace with a server-authoritative
 * backend before ever treating accounts as secure.
 */

interface RegisterInput {
  fullName: string;
  email: string;
  password: string;
}
interface LoginInput {
  email: string;
  password: string;
}

type Result<T> =
  | ({ ok: true; userId?: string } & T)
  | { ok: false; error: string };

const DEMO_WAIT_MS = 550;
const wait = () => new Promise((r) => setTimeout(r, DEMO_WAIT_MS));

export const mockAuth = {
  async register(
    input: RegisterInput,
  ): Promise<{ ok: boolean; error?: string; userId?: string }> {
    await wait();
    const email = input.email.trim().toLowerCase();
    const users = JSON.parse(
      localStorage.getItem("fm-users") ?? "{}",
    ) as Record<
      string,
      {
        id: string;
        email: string;
        passwordHash: string;
        fullName: string;
        createdAt: string;
      }
    >;
    if (users[email])
      return {
        ok: false,
        error: "An account with this email already exists (demo).",
      };
    const id = `u-${email.replace(/[^a-z0-9]/g, "").slice(0, 12)}`;
    users[email] = {
      id,
      email,
      fullName: input.fullName.trim(),
      // NOTE: demo mirror for persistence; the store keeps hashed values only.
      passwordHash: "",
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem("fm-users", JSON.stringify(users));
    return { ok: true, userId: id };
  },

  async login(
    input: LoginInput,
  ): Promise<{ ok: boolean; error?: string; userId?: string }> {
    await wait();
    const email = input.email.trim().toLowerCase();
    const users = JSON.parse(
      localStorage.getItem("fm-users") ?? "{}",
    ) as Record<string, { id: string; email: string }>;
    if (!users[email])
      return {
        ok: false,
        error: "No demo account found for this email. Register first.",
      };
    return { ok: true, userId: users[email].id };
  },
};

export function distanceLabel(km: number | null): string {
  if (km === null) return "demo region";
  return `${km.toFixed(1)} km`;
}

/** Deterministic pseudo-distance for labelled demo kingdoms (NOT real geography). */
export function demoDistance(k: Kingdom): number {
  return Math.hypot(k.mapX, k.mapY) / 2.2 + 4;
}
