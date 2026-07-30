const PIZZINT_URL = "https://www.pizzint.watch/api/dashboard-data";
const GDELT_URL = "https://www.pizzint.watch/api/gdelt/batch";
const TENSION_PAIRS = [
  "usa_russia",
  "russia_ukraine",
  "usa_china",
  "china_taiwan",
  "usa_iran",
  "usa_venezuela",
] as const;
const CACHE_MS = 10 * 60_000;

type Fetcher = typeof fetch;

type PizzaLocation = {
  is_spike?: unknown;
  is_closed_now?: unknown;
};

type PizzaResponse = {
  success?: unknown;
  defcon_level?: unknown;
  overall_index?: unknown;
  active_spikes?: unknown;
  data_freshness?: unknown;
  timestamp?: unknown;
  data?: unknown;
};

type TensionPoint = {
  t?: unknown;
  v?: unknown;
  sentiment?: unknown;
  conflictCount?: unknown;
  totalArticles?: unknown;
};

export type OperationalSignals = {
  state: "fresh" | "degraded";
  updatedAt: string;
  sources: {
    pizzint: "fresh" | "stale" | "unavailable";
    gdelt: "fresh" | "unavailable";
  };
  pizza: null | {
    level: number;
    activity: number;
    activeSpikes: number;
    locationsMonitored: number;
    locationsOpen: number;
  };
  tensions: Array<{
    id: string;
    label: string;
    score: number;
    trend: "rising" | "stable" | "falling";
    changePercent: number;
    conflictCount: number;
    articleCount: number;
    sentiment: number;
  }>;
  caveat: string;
};

const finite = (value: unknown, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const dateParam = (time: number) => new Date(time).toISOString().slice(0, 10).replaceAll("-", "");

function normalizePizza(raw: PizzaResponse) {
  if (raw.success !== true || !Array.isArray(raw.data)) return null;
  const locations = raw.data as PizzaLocation[];
  return {
    level: Math.min(5, Math.max(1, Math.round(finite(raw.defcon_level, 5)))),
    activity: Math.min(100, Math.max(0, finite(raw.overall_index))),
    activeSpikes: Math.max(0, Math.round(finite(raw.active_spikes,
      locations.filter(({ is_spike }) => is_spike === true).length))),
    locationsMonitored: locations.length,
    locationsOpen: locations.filter(({ is_closed_now }) => is_closed_now !== true).length,
  };
}

function normalizeTensions(raw: unknown) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
  return Object.entries(raw).flatMap(([id, value]) => {
    if (!Array.isArray(value) || value.length === 0) return [];
    const latest = value.at(-1) as TensionPoint;
    const previous = (value.at(-2) ?? latest) as TensionPoint;
    const score = finite(latest.v);
    const prior = finite(previous.v);
    const changePercent = prior === 0 ? 0 : ((score - prior) / Math.abs(prior)) * 100;
    return [{
      id,
      label: id.split("_").map((country) => country.toUpperCase()).join(" — "),
      score,
      trend: changePercent > 5 ? "rising" as const
        : changePercent < -5 ? "falling" as const
          : "stable" as const,
      changePercent: Math.round(changePercent * 10) / 10,
      conflictCount: Math.round(finite(latest.conflictCount)),
      articleCount: Math.round(finite(latest.totalArticles)),
      sentiment: finite(latest.sentiment),
    }];
  }).sort((left, right) => right.conflictCount - left.conflictCount);
}

export function createOperationalSignalsClient({
  fetcher = fetch,
  now = Date.now,
}: {
  fetcher?: Fetcher;
  now?: () => number;
} = {}) {
  let cache: { expiresAt: number; value: OperationalSignals } | undefined;

  return async () => {
    const currentTime = now();
    if (cache && cache.expiresAt > currentTime) return cache.value;
    const end = dateParam(currentTime);
    const start = dateParam(currentTime - 6 * 24 * 60 * 60_000);
    const tensionUrl = new URL(GDELT_URL);
    tensionUrl.searchParams.set("pairs", TENSION_PAIRS.join(","));
    tensionUrl.searchParams.set("method", "gpr");
    tensionUrl.searchParams.set("dateStart", start);
    tensionUrl.searchParams.set("dateEnd", end);
    const [pizzaResult, tensionResult] = await Promise.allSettled([
      fetcher(PIZZINT_URL, { headers: { accept: "application/json" } }),
      fetcher(tensionUrl, { headers: { accept: "application/json" } }),
    ]);
    const pizzaRaw = pizzaResult.status === "fulfilled" && pizzaResult.value.ok
      ? await pizzaResult.value.json() as PizzaResponse
      : null;
    const tensionRaw = tensionResult.status === "fulfilled" && tensionResult.value.ok
      ? await tensionResult.value.json() as unknown
      : null;
    const pizza = pizzaRaw ? normalizePizza(pizzaRaw) : null;
    const tensions = normalizeTensions(tensionRaw);
    const value: OperationalSignals = {
      state: pizza && tensions.length ? "fresh" : "degraded",
      updatedAt: new Date(currentTime).toISOString(),
      sources: {
        pizzint: pizza
          ? pizzaRaw?.data_freshness === "fresh" ? "fresh" : "stale"
          : "unavailable",
        gdelt: tensions.length ? "fresh" : "unavailable",
      },
      pizza,
      tensions,
      caveat: "Public proxy and media-derived signals; not an official threat level.",
    };
    if (pizza || tensions.length) cache = { expiresAt: currentTime + CACHE_MS, value };
    return value;
  };
}

export const getOperationalSignals = createOperationalSignalsClient();
