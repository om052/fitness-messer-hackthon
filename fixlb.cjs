const fs = require('fs');
const p = 'D:/kurukshetra/src/features/store/useAppStore.ts';
let s = fs.readFileSync(p, 'utf8');
const start = s.indexOf('export function leaderboardOf');
if (start >= 0) {
  const replacement = \"export function leaderboardOf(\\n  kingdoms: Record<string, Kingdom>,\\n  profile: PlayerProfile | null,\\n) {\\n  const all = Object.values(kingdoms).flatMap((k) =>\\n    k.members.map((m) => ({\\n      name: m.name,\\n      strength: m.strength,\\n      kingdom: k.name,\\n      role: m.role,\\n    })),\\n  );\\n  if (profile) {\\n    all.push({\\n      name: profile.fullName + ' (you)',\\n      strength: profile.strength,\\n      kingdom: profile.kingdomId\\n        ? (kingdoms[profile.kingdomId]?.name ?? '?')\\n        : 'Independent',\\n      role: profile.role ?? 'Member',\\n    });\\n  }\\n  return all.sort((a, b) => b.strength - a.strength);\\n}\\n\";
  s = s.slice(0, start) + replacement;
  fs.writeFileSync(p, s);
  console.log('done');
} else console.log('no');
