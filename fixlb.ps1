\ = 'D:\\kurukshetra\\src\\features\\store\\useAppStore.ts';
\ = [System.IO.File]::ReadAllText(\);
\ = \.IndexOf('export function leaderboardOf');
if (\ -ge 0) {
  \ = \"export function leaderboardOf(\n  kingdoms: Record<string, Kingdom>,\n  profile: PlayerProfile | null,\n) {\n  const all = Object.values(kingdoms).flatMap((k) =>\n    k.members.map((m) => ({\n      name: m.name,\n      strength: m.strength,\n      kingdom: k.name,\n      role: m.role,\n    })),\n  );\n  if (profile) {\n    all.push({\n      name: (profile.fullName || '') + ' (you)',\n      strength: profile.strength,\n      kingdom: profile.kingdomId\n        ? (kingdoms[profile.kingdomId]?.name ?? '-')\n        : 'Independent',\n      role: profile.role ?? 'Member',\n    });\n  }\n  return all.sort((a, b) => b.strength - a.strength);\n}\n\";
  \ = \.Substring(0, \) + \;
  [System.IO.File]::WriteAllText(\, \);
  Write-Output 'ok';
} else {
  Write-Output 'no';
}
