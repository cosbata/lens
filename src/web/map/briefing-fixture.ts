export type EvidenceKind = "official" | "reporting";

export type EvidenceRecord = {
  time: string;
  kind: EvidenceKind;
  source: string;
  fact: string;
  url: string;
};

export type StoryChapter = {
  id: "overview" | "spread" | "change" | "impact" | "watch";
  eyebrow: string;
  title: string;
  body: string;
  mapNote: string;
  coordinates: [number, number];
  zoom: number;
};

export type TodayEvent = {
  id: string;
  category: string;
  eventType?: string;
  chapter: string;
  title: string;
  summary: string;
  whyItMatters: string;
  whatChanged: string;
  affected: string;
  source: string;
  updatedAt: string;
  coordinates: [number, number];
  geometry?: Geometry;
  geometryHistory?: readonly TimedGeometry[];
  timelineSource?: "live" | "fixture";
  traceLabel?: string;
  media?: {
    src: string;
    alt: string;
    credit: string;
    href?: string;
    kind: "source" | "location";
  };
  score: number;
  scoreVersion?: string;
  scoreReasons?: readonly string[];
  sourceCount?: number;
  locationPrecision?: string;
  locationDisplayName?: string;
  countryCodes?: readonly string[];
  selectionReason: string;
  evidence: readonly EvidenceRecord[];
  storyChapters: readonly StoryChapter[];
};

export function locationMedia(
  title: string,
  [longitude, latitude]: [number, number],
): NonNullable<TodayEvent["media"]> {
  const bbox = [
    Math.max(-180, longitude - 3),
    Math.max(-85, latitude - 2),
    Math.min(180, longitude + 3),
    Math.min(85, latitude + 2),
  ].join(",");
  return {
    src: `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${bbox}&bboxSR=4326&imageSR=4326&size=640,360&format=jpg&f=image`,
    alt: `Satellite view around ${title}`,
    credit: "Location imagery · Esri",
    kind: "location",
  };
}

export const TODAY_EVENTS = [
  {
    id: "quake-a",
    category: "Disasters",
    chapter: "What changed",
    title: "Major earthquake strikes Example region",
    summary: "A high-impact earthquake is disrupting transport and essential services.",
    whyItMatters: "Dense population and regional transport links raise the risk of cascading disruption.",
    whatChanged: "The latest official bulletin raised the assessed impact after stronger shaking reports.",
    affected: "Residents, hospitals, road networks, and regional supply routes.",
    source: "USGS · Public agencies",
    updatedAt: "18 min ago",
    coordinates: [127.2, 37.4] as [number, number],
    media: locationMedia("Major earthquake strikes Example region", [127.2, 37.4]),
    score: 92.5,
    selectionReason: "High impact, strong official confirmation, and a material change within the last hour.",
    evidence: [
      {
        time: "09:41 UTC",
        kind: "official",
        source: "USGS",
        fact: "The official event record reports severe shaking near the affected region.",
        url: "https://earthquake.usgs.gov/",
      },
      {
        time: "09:53 UTC",
        kind: "reporting",
        source: "Reuters",
        fact: "Early reporting describes transport interruptions and emergency response activity.",
        url: "https://www.reuters.com/",
      },
    ],
    storyChapters: [
      {
        id: "overview",
        eyebrow: "What happened",
        title: "A sudden break in the ordinary.",
        body: "A high-impact earthquake is disrupting transport and essential services.",
        mapNote: "Epicentral region and first confirmed disruption reports.",
        coordinates: [127.2, 37.4] as [number, number],
        zoom: 4.2,
      },
      {
        id: "spread",
        eyebrow: "Where it is spreading",
        title: "The effects travel beyond the epicentre.",
        body: "Residents, hospitals, road networks, and regional supply routes.",
        mapNote: "Wider service and transport exposure around the affected region.",
        coordinates: [127.8, 37.1] as [number, number],
        zoom: 5.1,
      },
      {
        id: "change",
        eyebrow: "What changed",
        title: "The official picture became more severe.",
        body: "The latest official bulletin raised the assessed impact after stronger shaking reports.",
        mapNote: "New reports narrowed the highest-priority response area.",
        coordinates: [127.4, 37.3] as [number, number],
        zoom: 6,
      },
      {
        id: "impact",
        eyebrow: "Why it matters",
        title: "A local shock can become a regional interruption.",
        body: "Dense population and regional transport links raise the risk of cascading disruption.",
        mapNote: "Population and transport connections nearest the event.",
        coordinates: [126.9, 37.4] as [number, number],
        zoom: 5.4,
      },
      {
        id: "watch",
        eyebrow: "What to watch next",
        title: "Confirmation now matters more than volume.",
        body: "Watch for revised official intensity, hospital capacity, transport restoration, and additional independent measurements.",
        mapNote: "The next material update will replace this focus in place.",
        coordinates: [127.2, 37.4] as [number, number],
        zoom: 4.7,
      },
    ],
  },
  {
    id: "security-b",
    category: "Security",
    chapter: "The disruption",
    title: "Critical infrastructure disruption",
    summary: "A regional grid interruption is affecting cross-border systems.",
    whyItMatters: "Interconnected infrastructure can carry a local failure into transport, communications, and trade.",
    whatChanged: "Operators expanded the affected zone after a second cross-border system reported instability.",
    affected: "Power operators, rail services, data networks, and nearby communities.",
    source: "Official alert · Major wire",
    updatedAt: "31 min ago",
    coordinates: [139.7, 35.7] as [number, number],
    media: locationMedia("Critical infrastructure disruption", [139.7, 35.7]),
    score: 68.2,
    selectionReason: "Multiple source families confirm a cross-border impact with high public relevance.",
    evidence: [
      {
        time: "08:58 UTC",
        kind: "official",
        source: "Grid operator",
        fact: "The operator alert confirms degraded service across two connected systems.",
        url: "https://www.entsoe.eu/",
      },
      {
        time: "09:16 UTC",
        kind: "reporting",
        source: "Associated Press",
        fact: "Independent reporting confirms rail delays and local communications outages.",
        url: "https://apnews.com/",
      },
    ],
    storyChapters: [
      {
        id: "overview",
        eyebrow: "What happened",
        title: "One interruption crossed a system boundary.",
        body: "A regional grid interruption is affecting cross-border systems.",
        mapNote: "The first confirmed infrastructure disruption.",
        coordinates: [139.7, 35.7] as [number, number],
        zoom: 4.4,
      },
      {
        id: "spread",
        eyebrow: "Where it is spreading",
        title: "Connected systems carried the pressure outward.",
        body: "Power operators, rail services, data networks, and nearby communities.",
        mapNote: "Connected transport and communications exposure.",
        coordinates: [140.1, 36.2] as [number, number],
        zoom: 5.2,
      },
      {
        id: "change",
        eyebrow: "What changed",
        title: "A second system reported instability.",
        body: "Operators expanded the affected zone after a second cross-border system reported instability.",
        mapNote: "The newly expanded operating area.",
        coordinates: [139.1, 36] as [number, number],
        zoom: 5.8,
      },
      {
        id: "impact",
        eyebrow: "Why it matters",
        title: "Infrastructure failures rarely stay in one category.",
        body: "Interconnected infrastructure can carry a local failure into transport, communications, and trade.",
        mapNote: "Critical connections with the greatest cascade potential.",
        coordinates: [139.7, 35.7] as [number, number],
        zoom: 5,
      },
      {
        id: "watch",
        eyebrow: "What to watch next",
        title: "Recovery signals will show whether the disruption is contained.",
        body: "Watch restoration estimates, operator status changes, rail normalization, and any new official warning.",
        mapNote: "The monitored operating region for the next update.",
        coordinates: [139.7, 35.7] as [number, number],
        zoom: 4.5,
      },
    ],
  },
  {
    id: "economy-c",
    category: "Economy",
    chapter: "Market transmission",
    title: "Unexpected regional market shock",
    summary: "A sharp market move is beginning to transmit into the real economy.",
    whyItMatters: "Rapid repricing can tighten credit and change household and business decisions within days.",
    whatChanged: "The central bank issued an unscheduled statement after volatility crossed its intervention threshold.",
    affected: "Borrowers, importers, pension funds, and businesses exposed to the regional currency.",
    source: "Central bank · Major wire",
    updatedAt: "44 min ago",
    coordinates: [-74, 40.7] as [number, number],
    media: locationMedia("Unexpected policy move jolts markets", [-74, 40.7]),
    score: 66.1,
    selectionReason: "The move is unusual, officially acknowledged, and already affecting the real economy.",
    evidence: [
      {
        time: "08:21 UTC",
        kind: "official",
        source: "Central bank",
        fact: "An unscheduled statement acknowledges disorderly market conditions.",
        url: "https://www.bis.org/cbanks.htm",
      },
      {
        time: "08:49 UTC",
        kind: "reporting",
        source: "Financial Times",
        fact: "Market reporting links the move to tighter funding conditions for regional firms.",
        url: "https://www.ft.com/",
      },
    ],
    storyChapters: [
      {
        id: "overview",
        eyebrow: "What happened",
        title: "A market move broke from its recent range.",
        body: "A sharp market move is beginning to transmit into the real economy.",
        mapNote: "The financial centre where the move became visible.",
        coordinates: [-74, 40.7] as [number, number],
        zoom: 4.2,
      },
      {
        id: "spread",
        eyebrow: "Where it is spreading",
        title: "Funding pressure is reaching exposed businesses.",
        body: "Borrowers, importers, pension funds, and businesses exposed to the regional currency.",
        mapNote: "The wider commercial region exposed to repricing.",
        coordinates: [-75.4, 41.1] as [number, number],
        zoom: 4.8,
      },
      {
        id: "change",
        eyebrow: "What changed",
        title: "The central bank moved outside its normal schedule.",
        body: "The central bank issued an unscheduled statement after volatility crossed its intervention threshold.",
        mapNote: "The market and policy response now share one timeline.",
        coordinates: [-73.8, 40.8] as [number, number],
        zoom: 5.5,
      },
      {
        id: "impact",
        eyebrow: "Why it matters",
        title: "Prices can change decisions before data catches up.",
        body: "Rapid repricing can tighten credit and change household and business decisions within days.",
        mapNote: "The region with the strongest real-economy exposure.",
        coordinates: [-74.6, 40.3] as [number, number],
        zoom: 5,
      },
      {
        id: "watch",
        eyebrow: "What to watch next",
        title: "The next signal is transmission, not another headline.",
        body: "Watch funding spreads, official liquidity actions, business borrowing, and whether volatility persists into the next session.",
        mapNote: "The monitored market region for the next material change.",
        coordinates: [-74, 40.7] as [number, number],
        zoom: 4.4,
      },
    ],
  },
] as const satisfies readonly TodayEvent[];

export const TEMPORAL_DEMO_EVENTS: readonly TodayEvent[] = [
  {
    ...TODAY_EVENTS[1],
    id: "route-red-sea",
    category: "Supply chains",
    chapter: "Route change",
    title: "Commercial traffic reroutes around the Cape",
    summary: "Observed corridor positions show traffic shifting away from the Red Sea route.",
    whyItMatters: "A longer route raises delivery times, fuel use, insurance costs, and pressure across connected supply chains.",
    whatChanged: "The latest observed positions extend the alternate corridor around southern Africa.",
    affected: "Carriers, ports, manufacturers, retailers, and energy importers.",
    source: "Fixture demonstration · AIS provider required for live tracks",
    updatedAt: "2026-07-25T09:41:00Z",
    coordinates: [72.88, 18.96] as [number, number],
    media: locationMedia("Commercial traffic reroutes around the Cape", [72.88, 18.96]),
    score: 86.4,
    selectionReason: "Demonstrates the temporal-map contract without presenting fixture positions as live AIS.",
    timelineSource: "fixture",
    traceLabel: "Demonstration route",
    geometryHistory: [
      { observedAt: "2026-07-24T09:41:00Z", geometry: { type: "Point", coordinates: [43.3, 12.7] } },
      { observedAt: "2026-07-24T13:41:00Z", geometry: { type: "Point", coordinates: [48.2, 8.1] } },
      { observedAt: "2026-07-24T17:41:00Z", geometry: { type: "Point", coordinates: [51.1, -3.2] } },
      { observedAt: "2026-07-24T21:41:00Z", geometry: { type: "Point", coordinates: [55.4, -16.5] } },
      { observedAt: "2026-07-25T01:41:00Z", geometry: { type: "Point", coordinates: [64.2, -18.8] } },
      { observedAt: "2026-07-25T05:41:00Z", geometry: { type: "Point", coordinates: [70.1, -7.2] } },
      { observedAt: "2026-07-25T09:41:00Z", geometry: { type: "Point", coordinates: [72.88, 18.96] } },
    ],
  },
  TODAY_EVENTS[0],
  TODAY_EVENTS[2],
];
import type { Geometry, TimedGeometry } from "../../core/model";
