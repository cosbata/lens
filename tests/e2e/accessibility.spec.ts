import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { startFullStackTestServer } from "../helpers/full-stack";
import { buildServer } from "../../src/server/app";
import { LensStore } from "../../src/server/store";

const routes = [
  ["#briefing", "The world, selected"],
  ["#categories", "Ten lenses"],
  ["#method", "Why this event"],
  ["#compare", "Watch the world change, hour by hour"],
  ["#event/quake-a", "Major earthquake strikes Example region"],
] as const;

for (const [hash, heading] of routes) {
  test(`${hash} has a named main view and no serious accessibility violations`, async ({
    page,
  }) => {
    await page.goto(`/${hash}`);
    await expect(page.getByRole("heading", { level: 1, name: new RegExp(heading, "i") })).toBeVisible();
    await expect(page.locator("main")).toHaveCount(1);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      results.violations.filter(({ impact }) => impact === "serious" || impact === "critical"),
    ).toEqual([]);
  });
}

test("keyboard navigation exposes and activates the skip link", async ({ page }) => {
  await page.goto("/#briefing");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main-content$/);
});

test("live briefing falls back to polling when the stream is unavailable", async ({ page }) => {
  await page.goto("/#briefing");
  await expect(page.getByText(/Updating · Polling|Last update/, { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("monitor filters events, updates detail, and controls map layers", async ({ page }) => {
  await page.route("**/api/v1/briefing", (route) => route.abort());
  await page.route("**/api/v1/stream", (route) => route.abort());
  await page.goto("/#briefing");
  await page.getByRole("button", { name: /World watchlist/ }).click();
  const feed = page.getByRole("list", { name: "Current event feed" });
  await expect(feed.getByRole("button")).toHaveCount(3);

  await page.getByRole("searchbox", { name: "Search current events" }).fill("central bank");
  await expect(feed.getByRole("button")).toHaveCount(1);
  await feed.getByRole("button").click();
  await expect(page.getByRole("complementary", { name: "Selected event details" })
    .getByRole("heading", { level: 2, name: "Unexpected regional market shock" }))
    .toBeVisible();
  await expect(page.getByRole("article", { name: "Active world event" })).toHaveCount(0);

  await page.getByRole("checkbox", { name: "Selected events" }).uncheck();
  await expect(page.locator(".world-map")).toHaveAttribute("data-events-visible", "false");
  await page.getByRole("checkbox", { name: "Selected events" }).check();
  await expect(page.locator(".world-map")).toHaveAttribute("data-events-visible", "true");

  await page.getByRole("button", { name: "Borders" }).click();
  await expect(page.locator(".world-map")).toHaveAttribute("data-basemap", "boundaries");
  await expect(page.locator(".map-status")).toHaveCount(0);
  await page.getByRole("button", { name: "Satellite" }).click();
  await expect(page.locator(".world-map")).toHaveAttribute("data-basemap", "satellite");
  await expect(page.locator(".map-status")).toHaveCount(0);
});

test("full stack loads SQLite data and applies an SSE briefing update", async ({ page }) => {
  const api = await startFullStackTestServer();
  try {
    await page.route("**/api/**", (route) => {
      const requestUrl = new URL(route.request().url());
      return route.continue({ url: `${api.baseUrl}${requestUrl.pathname}${requestUrl.search}` });
    });
    await page.goto("/#briefing");
    const activeEvent = page.getByRole("article", { name: "Active world event" });
    await expect(page.getByText("Updating · Live", { exact: true })).toBeVisible();
    await expect(activeEvent.getByRole("heading", { name: "Initial live briefing" })).toBeVisible();

    api.publishUpdate();

    await expect(activeEvent.getByRole("heading", { name: "SSE update reached the map" })).toBeVisible();
    await expect(activeEvent.getByRole("heading", { name: "Initial live briefing" })).toHaveCount(0);
  } finally {
    await api.close();
  }
});

test("watchlist renders fifty stored events on the map", async ({ page }) => {
  const api = await startFullStackTestServer({ watchlistCount: 50 });
  try {
    await page.route("**/api/**", (route) => {
      const requestUrl = new URL(route.request().url());
      return route.continue({ url: `${api.baseUrl}${requestUrl.pathname}${requestUrl.search}` });
    });
    await page.goto("/#briefing");
    await expect(page.getByText("50 attributable events are visible across the curated world watchlist."))
      .toBeVisible();
    await page.getByRole("button", { name: /World watchlist/ }).click();
    await expect(page.getByRole("list", { name: "Current event feed" })
      .getByRole("button")).toHaveCount(50);
    await expect(page.locator(".world-map")).toHaveAttribute("data-event-count", "50");
    await expect(page.locator(".world-map")).toHaveAttribute("data-camera-mode", "world");
    await page.getByRole("list", { name: "Current event feed" }).getByRole("button").nth(10).click();
    await expect(page.locator(".world-map")).toHaveAttribute("data-camera-mode", "event");
  } finally {
    await api.close();
  }
});

test("self-hosted world briefing opens an image-rich detail panel on first selection", async ({ page }) => {
  const detail = {
    event: {
      id: "event:rss:suez",
      title: "Shipping disruption at the Suez Canal",
      description: "Two independent publishers report a material port closure.",
      primaryCategory: "supply-chains",
      geometry: { type: "Point", coordinates: [32.3, 30.5] },
      lastMaterialUpdateAt: "2026-07-26T09:00:00Z",
      sourceFamilies: ["Reuters", "BBC World"],
      measurements: {
        locationPrecision: "named_hub",
        locationDisplayName: "Suez Canal",
      },
    },
    scores: [{
      finalScore: 74,
      version: "wm-lens-news-v1",
      reasons: ["severity.medium.50", "source_tier.1.100", "distinct_sources.2.40"],
    }],
    evidence: [{
      publishedAt: "2026-07-26T08:50:00Z",
      sourceFamily: "Reuters",
      title: "Shipping disruption at the Suez Canal",
      url: "https://example.com/report",
      imageUrl: "https://images.example.com/world-briefing.jpg",
      imageAlt: "Newsroom image for the selected world event",
      imageCredit: "Example Newsroom",
    }],
  };
  await page.route("**/api/v1/briefing", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({
      meta: { state: "fresh", dataTime: "2026-07-26T09:00:00Z" },
      data: { events: [detail], watchlist: [detail] },
    }),
  }));
  await page.route("**/api/v1/stream", (route) => route.abort());
  await page.goto("/#briefing");
  await page.getByRole("button", { name: /World watchlist/ }).click();
  await page.getByRole("list", { name: "Current event feed" }).getByRole("button").first().click();
  const panel = page.getByRole("complementary", { name: "Selected event details" });
  await expect(panel).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "The world, selected." })).toHaveCount(0);
  await expect(page.getByRole("article", { name: "Active world event" })).toHaveCount(0);
  await expect(panel.getByRole("img", { name: "Newsroom image for the selected world event" }))
    .toHaveAttribute("src", "https://images.example.com/world-briefing.jpg");
  await expect(panel.getByText("◎ Suez Canal", { exact: true })).toBeVisible();
  await expect(panel.getByText("named hub")).toBeVisible();
  await expect(panel.getByText("2", { exact: true })).toBeVisible();
  await panel.getByText("Why this score").click();
  await expect(panel.getByText("wm-lens-news-v1")).toBeVisible();
});

test("production service serves the built UI and SQLite health from one process", async ({ page }) => {
  const store = new LensStore();
  const server = buildServer({ store, webRoot: "dist" });
  const address = await server.listen({ host: "127.0.0.1", port: 0 });
  try {
    await page.goto(`${address}/#briefing`);
    await expect(page.getByRole("heading", { level: 1, name: "The world, selected." }))
      .toBeVisible();
    const health = await page.request.get(`${address}/api/health`);
    expect(health.ok()).toBe(true);
    expect(await health.json()).toMatchObject({ status: "ok", database: "ok" });
  } finally {
    await server.close();
    store.close();
  }
});

test("24-hour map playback advances and can pause", async ({ page }) => {
  await page.goto("/#compare");
  await page.getByRole("button", { name: "24 hours ago" }).click();
  const timeline = page.getByRole("slider", { name: "Time during the last 24 hours" });
  await expect(timeline).toHaveAttribute("aria-valuenow", "0");

  await expect(page.locator('[data-trip-renderer="deck-gl"]')).toHaveCount(1);
  await page.getByRole("button", { name: "Play" }).click();
  await expect.poll(async () => Number(await timeline.getAttribute("aria-valuenow")), { timeout: 2_000 })
    .toBeGreaterThan(0.5);
  await expect(page.getByText("Map unavailable. Use the event list.")).toHaveCount(0);
  await page.getByRole("button", { name: "Pause" }).click();
});

test("timeline marker synchronizes playback time and event detail", async ({ page }) => {
  await page.goto("/#compare");
  await page.getByRole("button", {
    name: /Commercial traffic reroutes around the Cape · observed 21:41 UTC/,
  }).click();

  await expect(page.getByRole("slider", { name: "Time during the last 24 hours" }))
    .toHaveAttribute("aria-valuenow", "12");
  await expect(page.getByText("4 observed positions through 21:41 UTC")).toBeVisible();
});
