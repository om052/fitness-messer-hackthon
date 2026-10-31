import type {
  KingdomActivity,
  KingdomAnnouncement,
  KingdomChallenge,
} from "../types";

const now = Date.now();
const h = (n: number) => new Date(now - n * 3600_000).toISOString();

export const MOCK_ACTIVITY: KingdomActivity[] = [
  {
    id: "a1",
    kingdomId: "k-samrajya",
    actorName: "Warrior Ishaan",
    action: "completed a workout",
    outcome: "120 push-ups · +480 XP",
    timestamp: h(1),
    category: "workout",
  },
  {
    id: "a2",
    kingdomId: "k-samrajya",
    actorName: "Warrior Meera",
    action: "contributed to construction",
    outcome: "Barracks +45 progress",
    timestamp: h(3),
    category: "construction",
  },
  {
    id: "a3",
    kingdomId: "k-samrajya",
    actorName: "King Veerendra",
    action: "recruited a worker",
    outcome: "Treasury −250 FM",
    timestamp: h(6),
    category: "governance",
  },
  {
    id: "a4",
    kingdomId: "k-samrajya",
    actorName: "Warrior Kabir",
    action: "joined the kingdom",
    outcome: "Population 1,240",
    timestamp: h(9),
    category: "membership",
  },
  {
    id: "a5",
    kingdomId: "k-samrajya",
    actorName: "Training Yard",
    action: "reached level 4",
    outcome: "Kingdom strength +120",
    timestamp: h(14),
    category: "construction",
  },
  {
    id: "a6",
    kingdomId: "k-samrajya",
    actorName: "Senapati Rudra",
    action: "initiated a leadership challenge",
    outcome: "Push-up duel · 15 min",
    timestamp: h(22),
    category: "challenge",
  },
  {
    id: "a7",
    kingdomId: "k-samrajya",
    actorName: "Warrior Anaya",
    action: "completed a workout",
    outcome: "Plank 300s · +105 XP",
    timestamp: h(26),
    category: "workout",
  },
  {
    id: "a8",
    kingdomId: "k-samrajya",
    actorName: "King Veerendra",
    action: "resolved a leadership challenge",
    outcome: "Crown retained · one King rule preserved",
    timestamp: h(30),
    category: "challenge",
  },
];

export const MOCK_ANNOUNCEMENTS: KingdomAnnouncement[] = [
  {
    id: "n1",
    kingdomId: "k-samrajya",
    authorName: "King Veerendra",
    authorRole: "King",
    title: "The Great Push of Samrajya",
    body: "This week every warrior is called to the push-up grounds. Every repetition feeds the Barracks. Show the empire what Samrajya is made of.",
    timestamp: h(2),
  },
  {
    id: "n2",
    kingdomId: "k-samrajya",
    authorName: "Mantri Ashok",
    authorRole: "Mantri",
    title: "Join requests & treasury notice",
    body: "Join requests will be reviewed each evening. The treasury stands at 3,400 FM — construction will be funded from it, so warriors, keep earning.",
    timestamp: h(8),
  },
  {
    id: "n3",
    kingdomId: "k-samrajya",
    authorName: "Senapati Rudra",
    authorRole: "Senapati",
    title: "Dawn drill — defense towers",
    body: "Squats build walls. The Defense Towers need 60 more progress points. Morning drills are open to all members in the Training Yard.",
    timestamp: h(12),
  },
];

export const MOCK_CHALLENGES: KingdomChallenge[] = [
  {
    id: "c1",
    kingdomId: "k-samrajya",
    challengerId: "m-senapati",
    challengerName: "Senapati Rudra",
    defenderId: "m-king",
    defenderName: "King Veerendra",
    type: "leadership",
    exerciseId: "pushup",
    timeLimitMin: 15,
    status: "active",
    rules:
      "Fair challenge: both participants agree the exercise and time limit in advance. Maximum push-ups in 15 minutes. A King cannot reject a permitted Senapati challenge under current demo rules. Leadership changes only on a resolved result — one King per kingdom, always.",
    createdAt: h(22),
  },
  {
    id: "c2",
    kingdomId: "k-samrajya",
    challengerId: "m-2",
    challengerName: "Warrior Meera",
    defenderId: "m-1",
    defenderName: "Warrior Ishaan",
    type: "training",
    exerciseId: "goblet-squat",
    timeLimitMin: 10,
    status: "resolved",
    result: "Warrior Ishaan wins 86–74 (demo result, not verified measurement)",
    rules:
      "Friendly training duel. Most goblet squats in 10 minutes. Demo result — not a verified fitness measurement.",
    createdAt: h(48),
  },
];
