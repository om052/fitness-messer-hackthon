export default async function run(page) {
  const out = {};
  await page.goto("http://localhost:5173/register", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  out.inputs = await page.locator("input").count();
  const ins = await page.locator("input").all();
  await ins[0].fill("Arjun Tester");
  await ins[1].fill("arjun@test.fm");
  await ins[2].fill("warrior123");
  await ins[3].fill("warrior123");
  await page.getByRole("button", { name: "Create My Account" }).click();
  await page.waitForTimeout(1500);
  out.urlAfterRegister = page.url();
  await page.goto("http://localhost:5173/login");
  await page.waitForTimeout(1200);
  const lins = await page.locator("input").all();
  await lins[0].fill("arjun@test.fm");
  await lins[1].fill("warrior123");
  await page.getByRole("button", { name: "Login" }).click();
  await page.waitForTimeout(1500);
  out.urlAfterLogin = page.url();
  await page.getByRole("button", { name: "Continue without location" }).click();
  await page.waitForTimeout(1500);
  out.urlAfterLocation = page.url();
  return out;
}
