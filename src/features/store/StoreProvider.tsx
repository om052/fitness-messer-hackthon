import { createContext, useContext, type ReactNode } from "react";
import { useAppStore, leaderboardOf } from "./useAppStore";
export { leaderboardOf };
import type { AppStore, AppState } from "./StoreContext";

const Ctx = createContext<{ store: AppStore; state: AppState } | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const value = useAppStore();
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): { store: AppStore; state: AppState } {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp outside StoreProvider");
  return ctx;
}
