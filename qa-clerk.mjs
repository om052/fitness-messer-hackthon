export default async function run(page, ui) {
  const result = {};
  result.clerkGlobal = await page.evaluate(() => {
    const w = window;
    if (!w.Clerk && !w.__clerk) return "no global Clerk instance";
    const c = w.Clerk || w.__clerk;
    return JSON.stringify({
      loaded: c.loaded,
      hasSession: !!c.session,
      hasUser: !!c.user,
    });
  });
  // Check for ClerkJS script load
  result.clerkScriptTags = await page.evaluate(() =>
    Array.from(document.querySelectorAll("script[src]"))
      .map((s) => s.src)
      .filter((s) => s.includes("clerk")),
  );
  // React tree — check what ClerkProvider rendered
  result.rootHasContent = await page.evaluate(
    () => document.getElementById("root")?.innerHTML.length,
  );
  return result;
}
