import { Crown } from "lucide-react";

/** Royal emblem — gold crown mark used across the app. */
export function CrownLogo({ size = 32 }: { size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-xl border border-royal/50 bg-gradient-to-b from-royal/25 to-transparent"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <Crown
        size={size * 0.55}
        className="text-royalbright"
        strokeWidth={2.2}
      />
    </div>
  );
}

export function RoleBadge({ role }: { role: string | null }) {
  if (!role) return null;
  const styles: Record<string, string> = {
    King: "border-royal/60 bg-royal/15 text-royalbright",
    Mantri: "border-sky-400/50 bg-sky-400/10 text-sky-300",
    Senapati: "border-red-400/50 bg-red-400/10 text-red-300",
    Member: "border-lime/50 bg-lime/10 text-lime",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${styles[role] ?? styles.Member}`}
    >
      {role === "King" && <Crown size={11} />}
      {role}
    </span>
  );
}
