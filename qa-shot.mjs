import { createRequire } from "node:module";
const require2 = createRequire(
  "C:/Users/sawan/.vscode/extensions/danielsanmedium.dscodegpt-3.24.79/standalone/",
);
const pw = require2("patchright");
const b = await pw.chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
});
// reuse persisted storage from default profile? Use fresh: register+login quickly via localStorage seed
const page = await (await b.newContext()).newPage();
await page.goto("http://localhost:5173/login");
await page.waitForTimeout(1200);
// Seed demo session directly (frontend demo state)
await page.evaluate(() => {
  const raw = localStorage.getItem("fitness-messer-v1");
  const state = raw ? JSON.parse(raw) : null;
  if (state && state.users && Object.keys(state.users).length) {
    const id = Object.keys(state.users)[0];
    if (!state.profile) {
      state.profile = {
        userId: id,
        fullName: state.users[id].fullName,
        email: state.users[id].email,
        joinedAt: new Date().toISOString(),
        xp: 820,
        strength: 164,
        coins: 420,
        kingdomId: "k-samrajya",
        role: "Member",
        mode: "kingdom",
        onboarded: true,
        exerciseHistory: {},
        achievements: [],
        weeklyConsistency: [0, 0, 0, 0, 0, 0, 0],
        contributions: [],
        avatarSeed: "w1",
      };
    }
    state.sessionUserId = id;
    state.profile.onboarded = true;
    state.profile.kingdomId = "k-samrajya";
    state.profile.mode = "kingdom";
    localStorage.setItem("fitness-messer-v1", JSON.stringify(state));
  }
});
await page.goto("http://localhost:5173/kingdom/k-samrajya");
await page.waitForTimeout(6000);
await page.screenshot({ path: "d:/kurukshetra/shot-kingdom.png" });
await b.close();
