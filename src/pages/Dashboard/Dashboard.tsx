import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Castle, Coins, Dumbbell, Map as MapIcon } from "lucide-react";
import { useAuth } from "@clerk/clerk-react";
import { apiFetch } from "../../services/apiClient";
import { levelProgress } from "../../data/gameRules";
import { Card, EmptyState, ProgressBar, SectionTitle } from "../../components/ui/Primitives";

interface DashboardResponse {
  profile: {
    displayName: string | null;
    xp: number;
    level: number;
    strength: number;
    coins: number;
    createdAt: string;
  };
  fitness: {
    verifiedWorkoutCount: number;
    verifiedQuantity: number;
    verifiedDurationSec: number;
    unverifiedReportCount: number;
  };
  recentWorkouts: Array<{
    sessionId: string;
    exerciseId: string;
    quantity: number;
    durationSec: number;
    status: "unverified" | "verified";
    createdAt: string;
  }>;
  transactions: Array<{
    _id: string;
    amount: number;
    description: string;
    createdAt: string;
  }>;
  memberships: Array<{ _id: string; kingdomId: string; role: string }>;
  kingdoms: Array<{ _id: string; name: string; description?: string }>;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const token = await getToken();
        if (!token) {
          throw new Error("Your sign-in session is unavailable. Please sign in again.");
        }
        const result = await apiFetch("/auth/dashboard", token) as DashboardResponse;
        if (active) setDashboard(result);
      } catch (reason) {
        if (active) {
          setError(reason instanceof Error ? reason.message : "The dashboard request failed.");
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [getToken, retryCount]);

  if (loading) {
    return <div className="p-6 text-gray-300" role="status">Loading dashboard…</div>;
  }
  if (error || !dashboard) {
    return (
      <div className="m-6 rounded-xl border border-red-400/20 bg-red-950/20 p-5 text-red-200" role="alert">
        <p>{error ?? "Dashboard data is unavailable."}</p>
        <button
          type="button"
          onClick={() => setRetryCount((count) => count + 1)}
          className="mt-3 underline underline-offset-4 hover:text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  const { profile, fitness, memberships, kingdoms } = dashboard;
  const level = levelProgress(profile.xp);

  return (
    <div className="space-y-6">
      <Card>
        <SectionTitle>Warrior dashboard</SectionTitle>
        <p className="text-sm text-gray-300">
          Welcome, {profile.displayName || "Warrior"}. Values below are loaded from your saved profile.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-white/5 p-4">
            <p className="text-xs text-gray-400">Level</p>
            <p className="mt-1 text-2xl font-bold text-lime">{profile.level}</p>
          </div>
          <div className="rounded-lg bg-white/5 p-4">
            <p className="text-xs text-gray-400">Experience</p>
            <p className="mt-1 text-2xl font-bold text-gray-100">{profile.xp.toLocaleString()} XP</p>
          </div>
          <div className="rounded-lg bg-white/5 p-4">
            <p className="flex items-center gap-1 text-xs text-gray-400"><Coins size={13} /> FM balance</p>
            <p className="mt-1 text-2xl font-bold text-royalbright">{profile.coins.toLocaleString()} FM</p>
          </div>
          <div className="rounded-lg bg-white/5 p-4">
            <p className="text-xs text-gray-400">Strength</p>
            <p className="mt-1 text-2xl font-bold text-gray-100">{profile.strength.toLocaleString()}</p>
          </div>
        </div>
        <div className="mt-4">
          <ProgressBar
            pct={level.pct}
            label={`XP toward level ${Math.min(level.level + 1, 8)} · ${level.current}/${level.needed}`}
          />
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionTitle>Fitness records</SectionTitle>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-lg bg-white/5 p-3">
              <p className="text-xl font-bold text-lime">{fitness.verifiedWorkoutCount}</p>
              <p className="text-xs text-gray-400">Verified workouts</p>
            </div>
            <div className="rounded-lg bg-white/5 p-3">
              <p className="text-xl font-bold text-gray-100">{Math.floor(fitness.verifiedDurationSec / 60)} min</p>
              <p className="text-xs text-gray-400">Verified exercise time</p>
            </div>
          </div>
          {fitness.unverifiedReportCount > 0 && (
            <p className="mt-3 text-xs text-amber-300">
              {fitness.unverifiedReportCount} self-reported session(s) saved without verification or rewards.
            </p>
          )}
          {dashboard.recentWorkouts.length === 0 ? (
            <div className="mt-4"><EmptyState title="No workout records yet" body="Completed sessions will appear here with their verification status." /></div>
          ) : (
            <ul className="mt-4 space-y-2">
              {dashboard.recentWorkouts.map((workout) => (
                <li key={workout.sessionId} className="flex items-center justify-between gap-3 rounded-lg bg-white/5 p-3 text-sm">
                  <span className="text-gray-200">{workout.exerciseId} · {workout.quantity} units</span>
                  <span className={workout.status === "verified" ? "text-lime" : "text-amber-300"}>
                    {workout.status === "verified" ? "Verified" : "Unverified"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <SectionTitle>My Kingdoms</SectionTitle>
          {memberships.length === 0 ? (
            <EmptyState title="No kingdom membership" body="Your account has no saved kingdom memberships yet." />
          ) : (
            <div className="space-y-3">
              {memberships.map((membership) => {
                const kingdom = kingdoms.find((item) => item._id === String(membership.kingdomId));
                return (
                  <div key={membership._id} className="rounded-lg bg-white/5 p-3">
                    <p className="font-bold text-gray-100">{kingdom?.name ?? "Kingdom details unavailable"}</p>
                    <p className="text-xs text-gray-400">Role: {membership.role}</p>
                    {kingdom && (
                      <Link to={`/kingdom/${kingdom._id}`} className="btn-ghost mt-2 text-sm">
                        <Castle size={15} /> View kingdom
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="btn-royal" onClick={() => navigate("/map")}><MapIcon size={16} /> Open map</button>
            <button className="btn-ghost" onClick={() => navigate("/workout")}><Dumbbell size={16} /> Workout arena</button>
          </div>
        </Card>
      </div>

      <Card>
        <SectionTitle>Recent FM transactions</SectionTitle>
        {dashboard.transactions.length === 0 ? (
          <EmptyState title="No transactions yet" body="Your FM ledger is empty. Unverified workouts do not earn FM." />
        ) : (
          <ul className="space-y-2">
            {dashboard.transactions.map((transaction) => (
              <li key={transaction._id} className="flex justify-between gap-3 rounded-lg bg-white/5 p-3 text-sm">
                <span className="text-gray-300">{transaction.description}</span>
                <span className={transaction.amount >= 0 ? "text-lime" : "text-red-300"}>
                  {transaction.amount >= 0 ? "+" : ""}{transaction.amount} FM
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
