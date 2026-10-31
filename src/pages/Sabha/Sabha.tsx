import { useCallback, useEffect, useRef, useState } from "react";
import { Castle, Megaphone, RefreshCw, Swords, Users } from "lucide-react";
import { useAuth } from "@clerk/clerk-react";
import { Card, SectionTitle } from "../../components/ui/Primitives";
import { RoleBadge } from "../../components/ui/CrownLogo";
import { EXERCISES, getExercise } from "../../data/exercises";
import { apiFetch } from "../../services/apiClient";

type Kingdom = {
  _id: string;
  name: string;
  population?: number;
  strength?: number;
  treasury?: number;
};
type Membership = {
  clerkUserId: string;
  role: "King" | "Mantri" | "Senapati" | "Member";
  createdAt: string;
};
type Announcement = {
  requestId: string;
  clerkUserId: string;
  authorRole: Membership["role"];
  title: string;
  body: string;
  createdAt: string;
};
type Challenge = {
  _id: string;
  challengerId: string;
  defenderId: string;
  type: "leadership" | "training" | "senapati";
  exerciseId: string;
  timeLimitMin: number;
  agreedExercise?: string;
  agreedTimeLimitMin?: number;
  status: "pending" | "active" | "agreed" | "resolved" | "cancelled";
  challengerAcceptedAt?: string;
  defenderAcceptedAt?: string;
  result?: string;
  verifiedResult?: { result: string; verifiedAt: string };
  rules?: string;
};

function accountLabel(id: string): string {
  return `Account …${id.slice(-6)}`;
}

function displayNumber(value: number | undefined): string {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toLocaleString()
    : "Not recorded";
}

export default function Sabha() {
  const { getToken, userId } = useAuth();
  const [kingdom, setKingdom] = useState<Kingdom | null>(null);
  const [role, setRole] = useState<Membership["role"] | null>(null);
  const [members, setMembers] = useState<Membership[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [expandedAnnouncement, setExpandedAnnouncement] = useState<string | null>(null);
  const [challengeType, setChallengeType] = useState<"leadership" | "training">("training");
  const [defenderId, setDefenderId] = useState("");
  const [exerciseId, setExerciseId] = useState<string>(EXERCISES[0].id);
  const [timeLimitMin, setTimeLimitMin] = useState(10);
  const announcementRetry = useRef<{ requestId: string; title: string; body: string } | null>(null);
  const challengeRetry = useRef<{
    requestId: string;
    kingdomId: string;
    defenderId: string;
    type: "leadership" | "training";
    exerciseId: string;
    timeLimitMin: number;
  } | null>(null);

  const loadSabha = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Sign in to access your kingdom Sabha.");
      const me = await apiFetch("/auth/me", token, { signal });
      if (!me.kingdomId) {
        setKingdom(null);
        setRole(null);
        setMembers([]);
        setAnnouncements([]);
        setChallenges([]);
        return;
      }

      const [kingdomResponse, membersResponse, announcementsResponse, challengesResponse] =
        await Promise.all([
          apiFetch(`/kingdoms/${me.kingdomId}`, token, { signal }),
          apiFetch(`/kingdoms/${me.kingdomId}/members`, token, { signal }),
          apiFetch(`/sabha/kingdoms/${me.kingdomId}/announcements`, token, { signal }),
          apiFetch(`/challenges/kingdom/${me.kingdomId}`, token, { signal }),
        ]);
      if (!kingdomResponse.kingdom) throw new Error("The kingdom record was not found.");
      setKingdom(kingdomResponse.kingdom);
      setRole(me.role ?? null);
      setMembers(Array.isArray(membersResponse.members) ? membersResponse.members : []);
      setAnnouncements(
        Array.isArray(announcementsResponse.announcements)
          ? announcementsResponse.announcements
          : [],
      );
      setChallenges(Array.isArray(challengesResponse.challenges) ? challengesResponse.challenges : []);
    } catch (loadError) {
      if (signal?.aborted) return;
      setError(loadError instanceof Error ? loadError.message : "Could not load Sabha data.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    const controller = new AbortController();
    void loadSabha(controller.signal);
    return () => controller.abort();
  }, [loadSabha]);

  const canAnnounce = role === "King" || role === "Mantri" || role === "Senapati";
  const eligibleDefenders = members.filter(
    (member) =>
      member.clerkUserId !== userId &&
      (challengeType !== "leadership" || member.role === "King"),
  );

  useEffect(() => {
    if (!eligibleDefenders.some((member) => member.clerkUserId === defenderId)) {
      setDefenderId(eligibleDefenders[0]?.clerkUserId ?? "");
    }
  }, [eligibleDefenders, defenderId]);

  const publishAnnouncement = async () => {
    if (!kingdom || !title.trim() || !body.trim()) {
      setError("Enter both a title and an announcement before posting.");
      return;
    }
    const payload =
      announcementRetry.current?.title === title.trim() &&
      announcementRetry.current?.body === body.trim()
        ? announcementRetry.current
        : {
            requestId: crypto.randomUUID(),
            title: title.trim(),
            body: body.trim(),
          };
    announcementRetry.current = payload;
    setSubmitting(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Your sign-in session has expired.");
      await apiFetch(`/sabha/kingdoms/${kingdom._id}/announcements`, token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      announcementRetry.current = null;
      setTitle("");
      setBody("");
      setComposing(false);
      setNotice("Announcement saved.");
      await loadSabha();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Announcement was not saved.");
    } finally {
      setSubmitting(false);
    }
  };

  const createChallenge = async () => {
    if (!kingdom || !defenderId) return;
    const sameRequest = challengeRetry.current;
    const payload =
      sameRequest?.kingdomId === kingdom._id &&
      sameRequest.defenderId === defenderId &&
      sameRequest.type === challengeType &&
      sameRequest.exerciseId === exerciseId &&
      sameRequest.timeLimitMin === timeLimitMin
        ? sameRequest
        : {
            requestId: crypto.randomUUID(),
            kingdomId: kingdom._id,
            defenderId,
            type: challengeType,
            exerciseId,
            timeLimitMin,
          };
    challengeRetry.current = payload;
    setSubmitting(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Your sign-in session has expired.");
      await apiFetch("/challenges", token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      challengeRetry.current = null;
      setNotice("Challenge saved as pending. It has no result until verified evidence exists.");
      await loadSabha();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Challenge was not saved.");
    } finally {
      setSubmitting(false);
    }
  };

  const agreeToChallenge = async (challenge: Challenge) => {
    setSubmitting(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Your sign-in session has expired.");
      await apiFetch(`/challenges/${challenge._id}/agree`, token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agreedExercise: challenge.agreedExercise ?? challenge.exerciseId,
          agreedTimeLimitMin: challenge.agreedTimeLimitMin ?? challenge.timeLimitMin,
        }),
      });
      setNotice("Your agreement was saved. Both participants must agree.");
      await loadSabha();
    } catch (agreeError) {
      setError(agreeError instanceof Error ? agreeError.message : "Agreement was not saved.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Card className="text-center text-sm text-gray-400">Loading persistent Sabha records…</Card>;
  }

  if (error && !kingdom) {
    return (
      <Card className="space-y-3 text-center">
        <p className="text-sm text-red-300">{error}</p>
        <button className="btn-ghost" onClick={() => void loadSabha()}>
          <RefreshCw size={15} /> Retry
        </button>
      </Card>
    );
  }

  if (!kingdom) {
    return (
      <Card className="text-center">
        <Castle size={34} className="mx-auto text-gray-500" />
        <h1 className="mt-3 font-display text-xl font-bold">No kingdom, no Sabha</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
          Join or found a kingdom from the World Map to access its persistent assembly.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-100">
            Sabha of {kingdom.name}
          </h1>
          <p className="text-sm text-gray-500">Persistent kingdom announcements and challenge agreements.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost text-sm" onClick={() => void loadSabha()} disabled={submitting}>
            <RefreshCw size={15} /> Refresh
          </button>
          {canAnnounce && (
            <button className="btn-royal text-sm" onClick={() => setComposing((open) => !open)}>
              <Megaphone size={16} /> {composing ? "Close" : "New announcement"}
            </button>
          )}
        </div>
      </header>

      {(error || notice) && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${error ? "border-red-400/30 bg-red-500/10 text-red-200" : "border-lime/40 bg-lime/10 text-lime"}`}>
          {error ?? notice}
          {notice && <button className="ml-2 underline" onClick={() => setNotice(null)}>Dismiss</button>}
        </div>
      )}

      <Card>
        <SectionTitle right={<span className="flex items-center gap-2 text-xs text-gray-400">Your role <RoleBadge role={role} /></span>}>
          Royal Council · saved kingdom data
        </SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-white/5 p-3 text-center"><div className="font-bold text-gray-100">{displayNumber(kingdom.population)}</div><div className="text-xs text-gray-500">Population</div></div>
          <div className="rounded-lg bg-white/5 p-3 text-center"><div className="font-bold text-lime">{displayNumber(kingdom.strength)}</div><div className="text-xs text-gray-500">Strength</div></div>
          <div className="rounded-lg bg-white/5 p-3 text-center"><div className="font-bold text-royalbright">{displayNumber(kingdom.treasury)}</div><div className="text-xs text-gray-500">FM treasury</div></div>
          <div className="rounded-lg bg-white/5 p-3 text-center"><div className="font-bold text-gray-100">{members.length}</div><div className="text-xs text-gray-500">Persisted members</div></div>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {(["King", "Mantri", "Senapati", "Member"] as const).map((councilRole) => {
            const holders = members.filter((member) => member.role === councilRole);
            return (
              <div key={councilRole} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <RoleBadge role={councilRole} />
                <p className="mt-2 text-xs text-gray-400">
                  {holders.length ? holders.map((holder) => accountLabel(holder.clerkUserId)).join(", ") : "No recorded members"}
                </p>
              </div>
            );
          })}
        </div>
      </Card>

      {composing && (
        <Card>
          <SectionTitle>New kingdom announcement</SectionTitle>
          <input className="input-field" maxLength={100} placeholder="Title" value={title} onChange={(event) => setTitle(event.target.value)} />
          <textarea className="input-field mt-3 min-h-24" maxLength={2000} placeholder="Address the kingdom…" value={body} onChange={(event) => setBody(event.target.value)} />
          <button className="btn-primary mt-3" onClick={() => void publishAnnouncement()} disabled={submitting}>
            {submitting ? "Saving…" : "Publish announcement"}
          </button>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionTitle>Persistent announcements</SectionTitle>
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {announcements.map((announcement) => (
              <article key={announcement.requestId} className="rounded-lg bg-white/5 p-3">
                <button className="w-full text-left" onClick={() => setExpandedAnnouncement(expandedAnnouncement === announcement.requestId ? null : announcement.requestId)}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-gray-200">{announcement.title}</span>
                    <RoleBadge role={announcement.authorRole} />
                  </div>
                  <p className="mt-1 text-[11px] text-gray-500">{accountLabel(announcement.clerkUserId)} · {new Date(announcement.createdAt).toLocaleString()}</p>
                </button>
                {expandedAnnouncement === announcement.requestId && <p className="mt-2 border-t border-white/10 pt-2 text-sm text-gray-400">{announcement.body}</p>}
              </article>
            ))}
            {!announcements.length && <p className="text-sm text-gray-500">No saved announcements yet.</p>}
          </div>
        </Card>

        <Card>
          <SectionTitle>Challenges · no fabricated outcomes</SectionTitle>
          <p className="mb-4 text-xs text-gray-400">
            Challenge records and agreements persist. Resolution remains disabled until a server-verified result exists.
          </p>
          {members.length > 1 && (
            <div className="mb-4 grid gap-2 sm:grid-cols-2">
              <select className="input-field" value={challengeType} onChange={(event) => setChallengeType(event.target.value as "leadership" | "training")}>
                <option value="training">Training challenge</option>
                {role === "Senapati" && <option value="leadership">Leadership challenge</option>}
              </select>
              <select className="input-field" value={defenderId} onChange={(event) => setDefenderId(event.target.value)}>
                {eligibleDefenders.map((member) => <option key={member.clerkUserId} value={member.clerkUserId}>{accountLabel(member.clerkUserId)} · {member.role}</option>)}
              </select>
              <select className="input-field" value={exerciseId} onChange={(event) => setExerciseId(event.target.value)}>
                {EXERCISES.map((exercise) => <option key={exercise.id} value={exercise.id}>{exercise.name}</option>)}
              </select>
              <input className="input-field" type="number" min={1} max={1440} value={timeLimitMin} onChange={(event) => setTimeLimitMin(Number(event.target.value))} aria-label="Challenge time limit in minutes" />
              <button className="btn-royal sm:col-span-2" onClick={() => void createChallenge()} disabled={submitting || !defenderId || (challengeType === "leadership" && role !== "Senapati")}>
                <Swords size={15} /> {submitting ? "Saving…" : "Create pending challenge"}
              </button>
            </div>
          )}
          <div className="space-y-3">
            {challenges.map((challenge) => {
              const isParticipant = challenge.challengerId === userId || challenge.defenderId === userId;
              const hasAccepted = challenge.challengerId === userId
                ? Boolean(challenge.challengerAcceptedAt)
                : Boolean(challenge.defenderAcceptedAt);
              return (
                <article key={challenge._id} className="rounded-lg border border-white/10 bg-graphite/70 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm text-gray-200">{accountLabel(challenge.challengerId)} vs {accountLabel(challenge.defenderId)}</p>
                    <span className="rounded-full border border-royal/50 px-2.5 py-0.5 text-[11px] uppercase text-royalbright">{challenge.status}</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-400">{challenge.type} · {getExercise(challenge.agreedExercise ?? challenge.exerciseId).name} · {challenge.agreedTimeLimitMin ?? challenge.timeLimitMin} min</p>
                  {challenge.verifiedResult ? (
                    <p className="mt-2 text-xs text-lime">Verified result recorded: {challenge.verifiedResult.result}</p>
                  ) : (
                    <p className="mt-2 text-xs text-gray-500">No verified result; this challenge cannot be resolved.</p>
                  )}
                  {challenge.status === "pending" && isParticipant && !hasAccepted && (
                    <button className="btn-ghost mt-3 text-xs" onClick={() => void agreeToChallenge(challenge)} disabled={submitting}>Agree to these conditions</button>
                  )}
                  {challenge.rules && <p className="mt-2 text-xs text-gray-500">{challenge.rules}</p>}
                </article>
              );
            })}
            {!challenges.length && <p className="text-sm text-gray-500">No persistent challenges yet.</p>}
          </div>
        </Card>
      </div>

      <Card>
        <SectionTitle><Users size={15} /> Member roster</SectionTitle>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((member) => (
            <div key={member.clerkUserId} className="flex items-center justify-between rounded-lg bg-white/5 p-3">
              <span className="text-sm text-gray-300">{accountLabel(member.clerkUserId)}</span>
              <RoleBadge role={member.role} />
            </div>
          ))}
          {!members.length && <p className="text-sm text-gray-500">No persisted member records.</p>}
        </div>
        <p className="mt-3 text-xs text-gray-500">Activity history and workout contributions are not yet persisted by backend services, so this Sabha does not display demo events as real.</p>
      </Card>
    </div>
  );
}
