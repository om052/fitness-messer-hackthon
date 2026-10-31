import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Dumbbell,
  Map,
  Castle,
  ScrollText,
  UserRound,
  Coins,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useAuth, useClerk, useUser } from "@clerk/clerk-react";
import { apiFetch } from "../../services/apiClient";
import { levelProgress } from "../../data/gameRules";
import { CrownLogo } from "../ui/CrownLogo";

interface DashboardSnapshot {
  profile: {
    displayName: string | null;
    xp: number;
    level: number;
    coins: number;
  };
  memberships: Array<{ _id: string; kingdomId: string; role: string }>;
  kingdoms: Array<{ _id: string; name: string }>;
}

export default function AppLayout() {
  const { getToken } = useAuth();
  const { signOut } = useClerk();
  const { user } = useUser();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dashboard, setDashboard] = useState<DashboardSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let active = true;
    const reloadAccount = () => setRetryCount((count) => count + 1);
    window.addEventListener("fitness-messer-account-updated", reloadAccount);
    void (async () => {
      setError(null);
      try {
        const token = await getToken();
        if (!token) throw new Error("Your sign-in session is unavailable. Please sign in again.");
        const result = await apiFetch("/auth/dashboard", token) as DashboardSnapshot;
        if (active) setDashboard(result);
      } catch (reason) {
        if (active) {
          setError(reason instanceof Error ? reason.message : "Account data could not be loaded.");
        }
      }
    })();
    return () => {
      active = false;
      window.removeEventListener("fitness-messer-account-updated", reloadAccount);
    };
  }, [getToken, retryCount]);

  useEffect(() => setMenuOpen(false), [location.pathname]);

  const profile = dashboard?.profile;
  const progress = levelProgress(profile?.xp ?? 0);
  const membership = dashboard?.memberships[0];
  const kingdom = membership
    ? dashboard?.kingdoms.find((item) => item._id === String(membership.kingdomId))
    : undefined;
  const displayName = profile?.displayName || user?.fullName || "Warrior";
  const nav = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/workout", label: "Workout Arena", icon: Dumbbell },
    { to: "/map", label: "World Map", icon: Map },
    ...(membership
      ? [{ to: `/kingdom/${encodeURIComponent(String(membership.kingdomId))}`, label: "My Kingdom", icon: Castle, match: "/kingdom" }]
      : []),
    { to: "/sabha", label: "Sabha", icon: ScrollText },
    { to: "/profile", label: "Profile", icon: UserRound },
  ];

  const navLinks = nav.map(({ to, label, icon: Icon, ...entry }) => (
    <NavLink
      key={label}
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
          isActive || (entry.match && location.pathname.startsWith(entry.match))
            ? "bg-lime/15 text-lime"
            : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
        }`
      }
    >
      <Icon size={18} /> {label}
    </NavLink>
  ));

  const signOutFromApp = async () => {
    try {
      await signOut({ redirectUrl: "/login" });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Sign out failed.");
    }
  };

  const topbar = (
    <header className="flex items-center justify-between gap-4 border-b border-white/10 bg-graphite/70 px-4 py-3 backdrop-blur md:px-6">
      <button
        className="text-gray-300 md:hidden"
        onClick={() => setMenuOpen((value) => !value)}
        aria-label="Toggle menu"
      >
        {menuOpen ? <X size={22} /> : <Menu size={22} />}
      </button>
      <div className="hidden items-center gap-3 md:flex">
        <CrownLogo size={30} />
        <div>
          <div className="gold-text font-display text-sm font-bold tracking-wide">
            FITNESS MESSER
          </div>
          <div className="text-[10px] uppercase tracking-widest text-gray-500">
            {kingdom?.name ?? "Persistent player profile"}
          </div>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-end gap-3 md:gap-5">
        <div className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-gray-300">
          <span className="text-gray-500">LV </span>
          <span className="font-bold text-lime">{profile ? progress.level : "—"}</span>
          {profile && (
            <span className="ml-2 hidden text-gray-500 sm:inline">
              {progress.pct}% to next
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-royal/40 bg-royal/10 px-3 py-1.5">
          <Coins size={15} className="text-royal" />
          <span className="text-sm font-bold text-royalbright">
            {profile ? profile.coins.toLocaleString() : "—"}
          </span>
          <span className="hidden text-[10px] uppercase tracking-wide text-royal/70 sm:inline">
            FM
          </span>
        </div>
        <button
          className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-sm text-gray-300 hover:bg-white/5"
          onClick={() => void signOutFromApp()}
        >
          <LogOut size={15} />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>
    </header>
  );

  const sidebar = (
    <nav className="flex flex-col gap-1 p-3">
      <div className="mb-4 flex items-center gap-3 px-2 pt-2">
        <CrownLogo size={38} />
        <div>
          <div className="gold-text font-display text-base font-bold">
            FITNESS MESSER
          </div>
          <div className="text-[10px] uppercase tracking-widest text-gray-500">
            Build empire with exercise
          </div>
        </div>
      </div>
      {navLinks}
      <div className="mt-auto rounded-xl border border-white/10 bg-graphite p-3">
        <div className="text-xs font-semibold text-gray-300">{displayName}</div>
        <div className="mt-1 text-[11px] text-gray-500">
          {membership ? `${membership.role} · ${kingdom?.name ?? "Kingdom details unavailable"}` : "Independent warrior"}
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-lime"
            style={{ width: `${profile ? progress.pct : 0}%` }}
          />
        </div>
        <div className="mt-1 text-[10px] text-gray-500">
          {profile ? `${progress.current}/${progress.needed} XP to level ${progress.level + 1}` : "Progress unavailable"}
        </div>
      </div>
    </nav>
  );

  return (
    <div className="flex h-full">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-white/10 bg-graphite/60 md:flex">
        {sidebar}
      </aside>
      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/60"
            onClick={() => setMenuOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-72 border-r border-white/10 bg-graphite">
            {sidebar}
          </aside>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        {topbar}
        {error && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-red-400/20 bg-red-950/20 px-4 py-3 text-sm text-red-200 md:px-6" role="alert">
            <span>{error}</span>
            <button type="button" className="underline underline-offset-4" onClick={() => setRetryCount((count) => count + 1)}>
              Retry account data
            </button>
          </div>
        )}
        <main className="flex-1 overflow-y-auto p-4 pb-20 md:p-6 md:pb-6">
          <div className="animate-fade-up mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
