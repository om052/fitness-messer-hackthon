import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth, useClerk, useUser } from "@clerk/clerk-react";
import { Castle, Coins, Flame, LogOut, Save, ShieldCheck } from "lucide-react";
import { Card, EmptyState, ProgressBar, SectionTitle } from "../../components/ui/Primitives";
import { CrownLogo } from "../../components/ui/CrownLogo";
import { levelProgress } from "../../data/gameRules";
import { apiFetch } from "../../services/apiClient";

const AVATARS = ["w1", "w2", "w3", "w4", "w5", "w6"] as const;
type AvatarSeed = (typeof AVATARS)[number];

const AVATAR_TONES: Record<AvatarSeed, string> = {
  w1: "from-lime/60 to-lime/10",
  w2: "from-royal/60 to-royal/10",
  w3: "from-sky-500/60 to-sky-500/10",
  w4: "from-red-500/60 to-red-500/10",
  w5: "from-purple-500/60 to-purple-500/10",
  w6: "from-amber-500/60 to-amber-500/10",
};

interface ProfileData {
  profile: {
    displayName: string | null;
    xp: number;
    level: number;
    strength: number;
    coins: number;
    avatarSeed: AvatarSeed;
  };
  fitness: {
    verifiedWorkoutCount: number;
    verifiedDurationSec: number;
    unverifiedReportCount: number;
  };
  transactions: Array<{
    _id: string;
    amount: number;
    description: string;
    createdAt: string;
  }>;
  memberships: Array<{ _id: string; kingdomId: string; role: string }>;
  kingdoms: Array<{ _id: string; name: string }>;
}

export default function Profile() {
  const { getToken } = useAuth();
  const { signOut } = useClerk();
  const { user } = useUser();
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState<AvatarSeed>("w1");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const token = await getToken();
        if (!token) throw new Error("Your sign-in session is unavailable. Please sign in again.");
        const result = await apiFetch("/auth/dashboard", token) as ProfileData;
        if (!active) return;
        setData(result);
        setName(result.profile.displayName ?? user?.fullName ?? "");
        setAvatar(result.profile.avatarSeed);
      } catch (reason) {
        if (active) {
          setError(reason instanceof Error ? reason.message : "Profile data could not be loaded.");
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [getToken, retryCount, user?.fullName]);

  const save = async () => {
    setSaving(true);
    setSaveMessage(null);
    setSaveError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Your sign-in session is unavailable. Please sign in again.");
      const result = await apiFetch("/auth/me", token, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: name.trim(), avatarSeed: avatar }),
      }) as { profile: { displayName: string; avatarSeed: AvatarSeed } };
      setData((current) => current
        ? {
            ...current,
            profile: {
              ...current.profile,
              displayName: result.profile.displayName,
              avatarSeed: result.profile.avatarSeed,
            },
          }
        : current);
      setName(result.profile.displayName);
      setAvatar(result.profile.avatarSeed);
      setSaveMessage("Profile saved.");
    } catch (reason) {
      setSaveError(reason instanceof Error ? reason.message : "Profile changes could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut({ redirectUrl: "/login" });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Sign out failed.");
    }
  };

  if (loading) {
    return <div className="p-6 text-gray-300" role="status">Loading profile…</div>;
  }
  if (error || !data) {
    return (
      <div className="m-6 rounded-xl border border-red-400/20 bg-red-950/20 p-5 text-red-200" role="alert">
        <p>{error ?? "Profile data is unavailable."}</p>
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

  const { profile, fitness, memberships, kingdoms, transactions } = data;
  const progress = levelProgress(profile.xp);
  const displayName = profile.displayName || user?.fullName || "Warrior";
  const initials = displayName
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="space-y-6">
      <Card className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-10 -top-14 h-52 w-52 rounded-full bg-royal/10 blur-3xl" />
        <div className="flex flex-wrap items-center gap-5">
          <div className={`flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br ${AVATAR_TONES[profile.avatarSeed]} font-display text-2xl font-black text-obsidian`}>
            {initials}
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-bold text-gray-100">{displayName}</h1>
            <p className="text-sm text-gray-500">{user?.primaryEmailAddress?.emailAddress ?? "Email unavailable"}</p>
            <p className="mt-1 text-xs text-gray-500">
              {memberships.length === 0 ? "Independent warrior" : `${memberships.length} saved kingdom membership(s)`}
            </p>
          </div>
          <div className="ml-auto grid grid-cols-2 gap-2.5 text-center text-xs sm:grid-cols-4">
            <div className="rounded-lg bg-white/5 p-2.5">
              <div className="text-lg font-bold text-lime">{profile.level}</div>
              <div className="text-gray-500">Level</div>
            </div>
            <div className="rounded-lg bg-white/5 p-2.5">
              <div className="text-lg font-bold text-gray-100">{profile.strength.toLocaleString()}</div>
              <div className="text-gray-500">Strength</div>
            </div>
            <div className="rounded-lg bg-white/5 p-2.5">
              <div className="text-lg font-bold text-lime">{profile.xp.toLocaleString()}</div>
              <div className="text-gray-500">XP</div>
            </div>
            <div className="rounded-lg bg-white/5 p-2.5">
              <div className="flex items-center justify-center gap-1 text-lg font-bold text-royalbright">
                <Coins size={14} /> {profile.coins.toLocaleString()}
              </div>
              <div className="text-gray-500">FM</div>
            </div>
          </div>
        </div>
        <div className="mt-4">
          <ProgressBar
            pct={progress.pct}
            label={`XP to level ${Math.min(progress.level + 1, 8)} · ${progress.current}/${progress.needed}`}
          />
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionTitle>Edit profile</SectionTitle>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400" htmlFor="profile-name">
            Display name
          </label>
          <input
            id="profile-name"
            className="input-field mt-1.5"
            value={name}
            maxLength={60}
            onChange={(event) => setName(event.target.value)}
          />
          <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-gray-400">
            Avatar tone
          </label>
          <div className="mt-2 flex gap-2.5">
            {AVATARS.map((seed) => (
              <button
                key={seed}
                type="button"
                onClick={() => setAvatar(seed)}
                className={`h-10 w-10 rounded-xl border-2 bg-gradient-to-br ${AVATAR_TONES[seed]} transition ${avatar === seed ? "scale-110 border-lime" : "border-transparent"}`}
                aria-label={`Avatar ${seed}`}
                aria-pressed={avatar === seed}
              />
            ))}
          </div>
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-gray-500">
            <ShieldCheck size={14} className="mt-0.5 shrink-0 text-lime" />
            Only your display name and avatar tone can be edited here. Progression and FM balances are server-managed.
          </div>
          {saveError && <p className="mt-3 text-sm text-red-300" role="alert">{saveError}</p>}
          {saveMessage && <p className="mt-3 text-sm text-lime" role="status">{saveMessage}</p>}
          <button className="btn-primary mt-4 w-full" onClick={() => void save()} disabled={saving || !name.trim()}>
            <Save size={16} /> {saving ? "Saving…" : "Save changes"}
          </button>
        </Card>

        <div className="space-y-6">
          <Card>
            <SectionTitle>Verified fitness records</SectionTitle>
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
                {fitness.unverifiedReportCount} self-reported session(s) are saved without verification or rewards.
              </p>
            )}
          </Card>

          <Card>
            <SectionTitle>Kingdom membership</SectionTitle>
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
          </Card>
        </div>
      </div>

      <Card>
        <SectionTitle>Recent FM transactions</SectionTitle>
        {transactions.length === 0 ? (
          <EmptyState title="No transactions yet" body="Your saved FM ledger is empty. Unverified workouts do not earn FM." />
        ) : (
          <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
            {transactions.map((transaction) => (
              <div key={transaction._id} className="flex items-center justify-between gap-3 rounded-lg bg-white/5 px-3 py-2 text-sm">
                <span className="truncate text-gray-300">{transaction.description}</span>
                <span className={transaction.amount >= 0 ? "font-semibold text-lime" : "font-semibold text-red-400"}>
                  {transaction.amount >= 0 ? "+" : ""}{transaction.amount} FM
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <SectionTitle>Account</SectionTitle>
        <button className="btn-ghost flex items-center gap-2" onClick={() => void handleSignOut()}>
          <LogOut size={15} /> Sign out
        </button>
      </Card>

      <div className="flex items-center justify-center gap-2 text-xs text-gray-600">
        <CrownLogo size={16} /> <Flame size={13} className="text-lime" />
        &quot;Let&apos;s Build Empire With Exercise.&quot;
      </div>
    </div>
  );
}
