import { useEffect, useRef, useState, type CSSProperties } from "react";
import { TripsLayer } from "@deck.gl/geo-layers";
import { MapboxOverlay } from "@deck.gl/mapbox";
import * as maplibregl from "maplibre-gl";
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import type {
  GeoJSONSource,
  IControl,
  ExpressionSpecification,
  MapLayerMouseEvent,
  MapLibreMap,
  StyleSpecification,
} from "maplibre-gl";
import type { FeatureCollection, MultiPolygon, Polygon } from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";
import "./map.css";
import type { TodayEvent } from "./briefing-fixture";
import {
  temporalMapState,
  tripPlayback,
  tripPosition,
  tripTrace,
} from "./temporal";

maplibregl.setWorkerUrl(maplibreWorkerUrl);

const farFuture = new Date(8.64e15).toISOString();
const feature = (geometry: ReturnType<typeof temporalMapState>["geometry"]) => ({
  type: "Feature" as const,
  properties: {},
  geometry,
});
const geometryData = (
  state: ReturnType<typeof temporalMapState>,
  playback: ReturnType<typeof tripPlayback>,
) => ({
  type: "FeatureCollection" as const,
  features: [
    ...(playback
      ? tripTrace(playback) ? [feature(tripTrace(playback)!)] : []
      : state.geometry.type !== "Point"
        ? [feature(state.geometry)]
        : []),
    ...(playback
      ? [feature({ type: "Point", coordinates: tripPosition(playback) })]
      : state.trace?.type === "LineString"
        ? state.trace.coordinates.map((coordinates) => feature({ type: "Point", coordinates }))
      : []),
  ],
});
export function monitoringGeometryData(
  events: readonly TodayEvent[],
  temporalAt: string,
) {
  const features = events.flatMap((event) => {
    const state = temporalMapState(event, temporalAt);
    const geometry = state.geometry.type === "Polygon"
      ? state.geometry
      : state.trace?.type === "LineString"
        ? state.trace
        : state.geometry.type === "LineString"
          ? state.geometry
          : null;
    if (!geometry) return [];
    const appearance = eventAppearance(event);
    return [{
      type: "Feature" as const,
      properties: {
        id: event.id,
        title: event.title,
        category: event.category,
        color: appearance.color,
      },
      geometry,
    }];
  });
  return {
    type: "FeatureCollection" as const,
    features,
  };
}

export function monitoringGeometryCounts(
  events: readonly TodayEvent[],
  temporalAt = farFuture,
) {
  return monitoringGeometryData(events, temporalAt).features.reduce(
    (counts, item) => {
      if (item.geometry.type === "Polygon") counts.areas += 1;
      else counts.routes += 1;
      return counts;
    },
    { routes: 0, areas: 0 },
  );
}
const SATELLITE_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    satellite: {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution: "Imagery © Esri",
    },
  },
  layers: [{ id: "satellite", type: "raster", source: "satellite" }],
};
const BOUNDARIES_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const CATEGORY_COLORS: Record<string, string> = {
  conflict: "#f05d5e",
  "politics-diplomacy": "#b58ad6",
  security: "#ed8b4a",
  disasters: "#f2b84b",
  "climate-environment": "#65b985",
  economy: "#5798d1",
  energy: "#dfb54a",
  "supply-chains": "#8d86d8",
  health: "#dc7ca3",
  "technology-infrastructure": "#4db7ae",
};
const categoryKey = (category: string) => category.trim().toLowerCase().replaceAll(" ", "-");
const MAP_TYPES = [
  { key: "wildfire", label: "Wildfire", color: "#ff715b" },
  { key: "storm", label: "Storm", color: "#4fa7d1" },
  { key: "flood", label: "Flood", color: "#5ca8a8" },
  { key: "earthquake", label: "Earthquake", color: "#e0a458" },
  { key: "volcano", label: "Volcano", color: "#bd6952" },
] as const;
const MAP_COLORS = {
  ...CATEGORY_COLORS,
  ...Object.fromEntries(MAP_TYPES.map(({ key, color }) => [key, color])),
};
const EVENT_CLUSTER_MAX_ZOOM = 12;
const EVENT_HIT_LAYER_IDS = [
  "lens-event-clusters",
  "lens-event-points",
  "lens-activity-clusters",
  "lens-activity-points",
  "lens-alert-clusters",
  "lens-alert-points",
];
const MONITORING_HIT_LAYER_IDS = ["lens-monitored-routes", "lens-monitored-areas"];
const COUNTRIES_GEOJSON_URL =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson";
const COUNTRY_CODE_OVERRIDES: Record<string, string> = {
  Somaliland: "SO",
};

type CountryBoundaryCollection = FeatureCollection<
  Polygon | MultiPolygon,
  Record<string, unknown>
>;

let countryBoundariesPromise: Promise<CountryBoundaryCollection> | undefined;

function loadCountryBoundaries() {
  countryBoundariesPromise ??= fetch(COUNTRIES_GEOJSON_URL).then(async (response) => {
    if (!response.ok) throw new Error(`country_boundaries_http_${response.status}`);
    return await response.json() as CountryBoundaryCollection;
  });
  return countryBoundariesPromise;
}

export function eventAppearance(event: Pick<TodayEvent, "category" | "eventType">) {
  const subtype = MAP_TYPES.find(({ key }) => key === event.eventType);
  if (subtype) return subtype;
  const key = categoryKey(event.category);
  return {
    key,
    label: event.category,
    color: CATEGORY_COLORS[key] ?? "#9c9a93",
  };
}

export function spreadCoincidentPoints(
  points: readonly {
    id: string;
    coordinates: [number, number];
    locationPrecision?: string;
  }[],
) {
  const groups = new Map<string, typeof points>();
  points.forEach((point) => {
    const key = point.coordinates.join(",");
    groups.set(key, [...(groups.get(key) ?? []), point]);
  });
  const spread = new Map<string, [number, number]>();
  groups.forEach((group) => {
    const sorted = [...group].sort((a, b) => a.id.localeCompare(b.id));
    sorted.forEach((point, index) => {
      if (index === 0) {
        spread.set(point.id, [...point.coordinates]);
        return;
      }
      const angle = index * Math.PI * (3 - Math.sqrt(5));
      const radius = 0.012 * Math.sqrt(index);
      const latitudeScale = Math.max(0.2, Math.cos(point.coordinates[1] * Math.PI / 180));
      spread.set(point.id, [
        point.coordinates[0] + Math.cos(angle) * radius / latitudeScale,
        point.coordinates[1] + Math.sin(angle) * radius,
      ]);
    });
  });
  return spread;
}

export function countrySurfaceData(
  boundaries: CountryBoundaryCollection,
  events: readonly TodayEvent[],
) {
  const grouped = new Map<string, TodayEvent[]>();
  events
    .filter(({ locationPrecision }) => locationPrecision === "country_approximate")
    .forEach((event) => event.countryCodes?.forEach((code) => {
      grouped.set(code, [...(grouped.get(code) ?? []), event]);
    }));

  return {
    type: "FeatureCollection" as const,
    features: boundaries.features.flatMap((boundary) => {
      const name = String(boundary.properties.NAME ?? boundary.properties.name ?? "");
      const sourceCode = String(
        boundary.properties.ISO_A2_EH
        ?? boundary.properties["ISO3166-1-Alpha-2"]
        ?? "",
      );
      const countryCode = sourceCode === "-99" ? COUNTRY_CODE_OVERRIDES[name] : sourceCode;
      const countryEvents = countryCode ? grouped.get(countryCode) : undefined;
      if (!countryEvents?.length) return [];
      const categories = new Map<string, number>();
      countryEvents.forEach((event) => {
        const key = eventAppearance(event).key;
        categories.set(key, (categories.get(key) ?? 0) + 1);
      });
      const dominantKey = [...categories]
        .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0][0];
      return [{
        ...boundary,
        properties: {
          ...boundary.properties,
          name,
          countryCode,
          eventIds: JSON.stringify(countryEvents.map(({ id }) => id)),
          eventCount: countryEvents.length,
          label: `${name} · ${countryEvents.length}`,
          color: MAP_COLORS[dominantKey] ?? "#9c9a93",
        },
      }];
    }),
  };
}

export function countryLabelData(events: readonly TodayEvent[]) {
  const grouped = new Map<string, TodayEvent[]>();
  events
    .filter(({ locationPrecision, countryCodes }) =>
      locationPrecision === "country_approximate" && countryCodes?.length)
    .forEach((event) => {
      const code = event.countryCodes![0];
      grouped.set(code, [...(grouped.get(code) ?? []), event]);
    });
  return {
    type: "FeatureCollection" as const,
    features: [...grouped].map(([countryCode, countryEvents]) => ({
      type: "Feature" as const,
      properties: {
        countryCode,
        name: countryEvents[0].locationDisplayName ?? countryCode,
        eventIds: JSON.stringify(countryEvents.map(({ id }) => id)),
        eventCount: countryEvents.length,
        label: `${countryEvents[0].locationDisplayName ?? countryCode} · ${countryEvents.length}`,
      },
      geometry: {
        type: "Point" as const,
        coordinates: countryEvents[0].coordinates,
      },
    })),
  };
}

const clusterProperties = Object.fromEntries(
  Object.keys(MAP_COLORS).map((key) => [
    key,
    ["+", ["case", ["==", ["get", "visualKey"], key], 1, 0]],
  ]),
);
const dominantClusterColor = [
  "case",
  ...Object.entries(MAP_COLORS).flatMap(([key, color]) => [
    [">", ["get", key], ["/", ["get", "point_count"], 2]],
    color,
  ]),
  "#b8a996",
] as ExpressionSpecification;
const eventData = (
  events: readonly TodayEvent[],
  activeId: string,
  temporalAt: string,
  hiddenId?: string,
) => ({
  type: "FeatureCollection" as const,
  features: (() => {
    const points = events
      .filter(({ locationPrecision }) => locationPrecision !== "country_approximate")
      .map((event) => {
      const state = temporalMapState(event, temporalAt);
      const coordinates = state.geometry.type === "Point"
        ? state.geometry.coordinates
        : state.geometry.type === "LineString"
          ? state.geometry.coordinates.at(-1)!
          : state.geometry.coordinates[0][0];
      return {
        event,
        coordinates: coordinates as [number, number],
      };
    });
    const displayCoordinates = spreadCoincidentPoints(points.map(({ event, coordinates }) => ({
      id: event.id,
      coordinates,
      locationPrecision: event.locationPrecision,
    })));
    return points.map(({ event, coordinates }) => {
    const appearance = eventAppearance(event);
    return {
      type: "Feature" as const,
      properties: {
        id: event.id,
        title: event.title,
        category: event.category,
        visualKey: appearance.key,
        visualLabel: appearance.label,
        color: appearance.color,
        locationPrecision: event.locationPrecision ?? "",
        locationDisplayName: event.locationDisplayName ?? "",
        active: event.id === activeId,
        visible: event.id !== hiddenId,
      },
      geometry: {
        type: "Point" as const,
        coordinates: displayCoordinates.get(event.id) ?? coordinates,
      },
    };
    });
  })(),
});
const popupContent = (eyebrow: string, title: string) => {
  const content = document.createElement("div");
  const label = document.createElement("small");
  const heading = document.createElement("strong");
  label.textContent = eyebrow;
  heading.textContent = title;
  content.append(label, heading);
  return content;
};
const uniqueEvents = (...collections: readonly (readonly TodayEvent[])[]) =>
  [...new Map(collections.flat().map((event) => [event.id, event])).values()];

export async function clusterExpansionCamera(
  source: Pick<GeoJSONSource, "getClusterExpansionZoom">,
  clusterId: number,
  center: [number, number],
) {
  return { center, zoom: await source.getClusterExpansionZoom(clusterId) };
}

export function hasRenderedLayerAtPoint(
  map: Pick<MapLibreMap, "queryRenderedFeatures">,
  point: MapLayerMouseEvent["point"],
  layers: readonly string[],
) {
  return map.queryRenderedFeatures(point, { layers: [...layers] }).length > 0;
}

export function MapLegend({ events }: { events: readonly TodayEvent[] }) {
  return (
    <div className="map-legend" aria-label="Event category colours">
      <span>Event type</span>
      {[...new Map(events.map((event) => {
        const appearance = eventAppearance(event);
        return [appearance.key, appearance];
      })).values()].sort((a, b) => a.label.localeCompare(b.label)).map((appearance) => (
        <i key={appearance.key}>
          <b style={{ "--event-colour": appearance.color } as CSSProperties} />
          {appearance.label}
        </i>
      ))}
    </div>
  );
}

export function WorldMap({
  events,
  activityEvents = [],
  alertEvents = [],
  activeId,
  onActivate,
  onCountryActivate,
  styleUrl,
  focus,
  temporalAt,
  showEvents = true,
  showActivity = true,
  showAlerts = true,
  showMonitoringGeometry = true,
  focusActive = true,
  showLegend = true,
}: {
  events: readonly TodayEvent[];
  activityEvents?: readonly TodayEvent[];
  alertEvents?: readonly TodayEvent[];
  activeId: string;
  onActivate: (id: string) => void;
  onCountryActivate?: (selection: { name: string; eventIds: string[] }) => void;
  styleUrl?: string;
  focus?: { coordinates: [number, number]; zoom: number };
  temporalAt?: string;
  showEvents?: boolean;
  showActivity?: boolean;
  showAlerts?: boolean;
  showMonitoringGeometry?: boolean;
  focusActive?: boolean;
  showLegend?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const deckRef = useRef<MapboxOverlay | null>(null);
  const cameraKeyRef = useRef<string | null>(null);
  const activateRef = useRef(onActivate);
  const activateCountryRef = useRef(onCountryActivate);
  const [status, setStatus] = useState<"loading" | "ready">("loading");
  const [basemap, setBasemap] = useState<"satellite" | "boundaries">("satellite");
  const mapStyle = styleUrl ?? (basemap === "boundaries" ? BOUNDARIES_STYLE : SATELLITE_STYLE);
  const allEvents = uniqueEvents(events, activityEvents, alertEvents);

  useEffect(() => {
    activateRef.current = onActivate;
  }, [onActivate]);
  useEffect(() => {
    activateCountryRef.current = onCountryActivate;
  }, [onCountryActivate]);

  useEffect(() => {
    if (!containerRef.current) return;
    setStatus("loading");
    const initialEvent = allEvents.find(({ id }) => id === activeId) ?? allEvents[0];
    const initialState = temporalMapState(initialEvent, temporalAt ?? farFuture);
    const initialPlayback = tripPlayback(initialEvent.geometryHistory, temporalAt ?? farFuture);
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: mapStyle,
      center: [0, 15],
      zoom: 1.1,
      attributionControl: { compact: true },
    });
    mapRef.current = map;
    cameraKeyRef.current = null;
    map.once("style.load", () => {
      map.addSource("lens-country-events", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        attribution: "Country boundaries · Natural Earth",
      });
      map.addSource("lens-country-event-label-points", {
        type: "geojson",
        data: countryLabelData(uniqueEvents(
          showEvents ? events : [],
          showActivity ? activityEvents : [],
          showAlerts ? alertEvents : [],
        )),
      });
      map.addLayer({
        id: "lens-country-event-areas",
        type: "fill",
        source: "lens-country-events",
        paint: {
          "fill-color": ["get", "color"],
          "fill-opacity": 0.2,
        },
      });
      map.addLayer({
        id: "lens-country-event-labels",
        type: "symbol",
        source: "lens-country-event-label-points",
        maxzoom: 6,
        layout: {
          "text-field": ["get", "label"],
          "text-size": 10,
          "text-allow-overlap": false,
        },
        paint: {
          "text-color": "#f0ede5",
          "text-halo-color": "#111310",
          "text-halo-width": 1.5,
        },
      });
      void loadCountryBoundaries().then((boundaries) => {
        if (mapRef.current !== map) return;
        const source = map.getSource("lens-country-events") as GeoJSONSource | undefined;
        source?.setData(countrySurfaceData(
          boundaries,
          uniqueEvents(
            showEvents ? events : [],
            showActivity ? activityEvents : [],
            showAlerts ? alertEvents : [],
          ),
        ));
      }).catch(() => undefined);
      map.addSource("lens-events", {
        type: "geojson",
        data: eventData(
          events,
          activeId,
          temporalAt ?? farFuture,
          initialPlayback ? initialEvent.id : undefined,
        ),
        cluster: true,
        clusterMaxZoom: EVENT_CLUSTER_MAX_ZOOM,
        clusterRadius: 44,
        clusterProperties,
      });
      map.addLayer({
        id: "lens-event-clusters",
        type: "circle",
        source: "lens-events",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": dominantClusterColor,
          "circle-opacity": 0.82,
          "circle-blur": 0.04,
          "circle-radius": ["step", ["get", "point_count"], 17, 10, 21, 25, 25],
        },
      });
      map.addSource("lens-activity", {
        type: "geojson",
        data: eventData(activityEvents, activeId, temporalAt ?? farFuture),
        cluster: true,
        clusterMaxZoom: EVENT_CLUSTER_MAX_ZOOM,
        clusterRadius: 38,
        clusterProperties,
      });
      map.addLayer({
        id: "lens-activity-clusters",
        type: "circle",
        source: "lens-activity",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": dominantClusterColor,
          "circle-opacity": 0.48,
          "circle-blur": 0.12,
          "circle-radius": ["step", ["get", "point_count"], 13, 10, 17, 25, 21],
        },
      });
      map.addLayer({
        id: "lens-activity-cluster-count",
        type: "symbol",
        source: "lens-activity",
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-size": 10,
          "text-allow-overlap": true,
        },
        paint: { "text-color": "#f0ede5" },
      });
      map.addLayer({
        id: "lens-activity-points",
        type: "circle",
        source: "lens-activity",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": ["get", "color"],
          "circle-opacity": 0.62,
          "circle-blur": 0.12,
          "circle-radius": 5,
        },
      });
      map.addSource("lens-alerts", {
        type: "geojson",
        data: eventData(alertEvents, activeId, temporalAt ?? farFuture),
        cluster: true,
        clusterMaxZoom: EVENT_CLUSTER_MAX_ZOOM,
        clusterRadius: 34,
        clusterProperties,
      });
      map.addLayer({
        id: "lens-alert-clusters",
        type: "circle",
        source: "lens-alerts",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": dominantClusterColor,
          "circle-opacity": 0.42,
          "circle-blur": 0.18,
          "circle-radius": ["step", ["get", "point_count"], 12, 10, 16, 25, 20],
        },
      });
      map.addLayer({
        id: "lens-alert-cluster-count",
        type: "symbol",
        source: "lens-alerts",
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-size": 9,
          "text-allow-overlap": true,
        },
        paint: { "text-color": "#f0ede5" },
      });
      map.addLayer({
        id: "lens-alert-points",
        type: "circle",
        source: "lens-alerts",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": ["get", "color"],
          "circle-opacity": 0.48,
          "circle-blur": 0.16,
          "circle-radius": 6,
        },
      });
      map.addLayer({
        id: "lens-event-cluster-count",
        type: "symbol",
        source: "lens-events",
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-size": 11,
          "text-allow-overlap": true,
        },
        paint: { "text-color": "#f0ede5" },
      });
      map.addLayer({
        id: "lens-event-points",
        type: "circle",
        source: "lens-events",
        filter: ["all", ["!", ["has", "point_count"]], ["==", ["get", "visible"], true]],
        paint: {
          "circle-color": ["get", "color"],
          "circle-opacity": ["case", ["==", ["get", "active"], true], 1, 0.82],
          "circle-blur": 0.05,
          "circle-radius": ["case", ["==", ["get", "active"], true], 10, 7],
        },
      });
      map.addLayer({
        id: "lens-event-labels",
        type: "symbol",
        source: "lens-events",
        minzoom: 4,
        filter: ["all", ["!", ["has", "point_count"]], ["==", ["get", "visible"], true]],
        layout: {
          "text-field": ["get", "title"],
          "text-size": 11,
          "text-offset": [0, 1.35],
          "text-anchor": "top",
        },
        paint: {
          "text-color": "#f0ede5",
          "text-halo-color": "#111310",
          "text-halo-width": 1.5,
        },
      });
      map.addSource("lens-active-geometry", {
        type: "geojson",
        data: geometryData(initialState, initialPlayback),
      });
      map.addSource("lens-monitoring-geometry", {
        type: "geojson",
        data: monitoringGeometryData(allEvents, temporalAt ?? farFuture),
      });
      map.addLayer({
        id: "lens-monitored-areas",
        type: "fill",
        source: "lens-monitoring-geometry",
        filter: ["==", ["geometry-type"], "Polygon"],
        paint: {
          "fill-color": ["get", "color"],
          "fill-opacity": 0.16,
        },
      });
      map.addLayer({
        id: "lens-monitored-routes",
        type: "line",
        source: "lens-monitoring-geometry",
        filter: ["==", ["geometry-type"], "LineString"],
        paint: {
          "line-color": ["get", "color"],
          "line-opacity": 0.72,
          "line-width": 2.5,
        },
      });
      map.addLayer({
        id: "lens-area",
        type: "fill",
        source: "lens-active-geometry",
        filter: ["==", ["geometry-type"], "Polygon"],
        paint: { "fill-color": "#d99a2b", "fill-opacity": 0.2 },
      });
      map.addLayer({
        id: "lens-route",
        type: "line",
        source: "lens-active-geometry",
        filter: ["==", ["geometry-type"], "LineString"],
        paint: {
          "line-color": "#d99a2b",
          "line-opacity": 0.72,
          "line-width": 2,
          "line-dasharray": [2, 2],
        },
      });
      map.addLayer({
        id: "lens-observed-points",
        type: "circle",
        source: "lens-active-geometry",
        filter: ["==", ["geometry-type"], "Point"],
        paint: {
          "circle-color": "#d99a2b",
          "circle-opacity": 0.42,
          "circle-radius": 2.5,
        },
      });
      const overlay = new MapboxOverlay({
        interleaved: false,
        layers: [],
      });
      map.addControl(overlay as unknown as IControl);
      deckRef.current = overlay;

      const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 12 });
      const showEvent = (event: MapLayerMouseEvent) => {
        map.getCanvas().style.cursor = "pointer";
        const item = event.features?.[0];
        if (item?.geometry.type !== "Point") return;
        popup
          .setLngLat(item.geometry.coordinates as [number, number])
          .setDOMContent(popupContent(String(item.properties?.category), String(item.properties?.title)))
          .addTo(map);
      };
      const hidePopup = () => {
        map.getCanvas().style.cursor = "";
        popup.remove();
      };
      const selectCountry = (event: MapLayerMouseEvent) => {
        if (hasRenderedLayerAtPoint(
          map,
          event.point,
          [...EVENT_HIT_LAYER_IDS, ...MONITORING_HIT_LAYER_IDS],
        )) return;
        event.preventDefault();
        const item = event.features?.[0];
        const properties = item?.properties;
        const rawIds = properties?.eventIds;
        if (typeof rawIds !== "string") return;
        const eventIds = JSON.parse(rawIds) as string[];
        activateCountryRef.current?.({
          name: String(properties?.name ?? "Country"),
          eventIds,
        });
      };
      for (const layerId of ["lens-country-event-areas", "lens-country-event-labels"]) {
        map.on("mouseenter", layerId, (event) => {
          map.getCanvas().style.cursor = "pointer";
          const item = event.features?.[0];
          if (!item) return;
          popup
            .setLngLat(event.lngLat)
            .setDOMContent(popupContent(
              `${String(item.properties?.eventCount)} country-level reports`,
              String(item.properties?.name),
            ))
            .addTo(map);
        });
        map.on("mouseleave", layerId, hidePopup);
        map.on("click", layerId, selectCountry);
      }
      const expandCluster = async (
        source: GeoJSONSource,
        clusterId: number,
        coordinates: [number, number],
      ) => {
        map.easeTo(await clusterExpansionCamera(source, clusterId, coordinates));
      };
      map.on("mouseenter", "lens-event-points", showEvent);
      map.on("mouseleave", "lens-event-points", hidePopup);
      map.on("click", "lens-event-points", (event) => {
        if (event.defaultPrevented) return;
        const id = event.features?.[0]?.properties?.id;
        if (typeof id === "string") activateRef.current(id);
      });
      for (const layerId of ["lens-monitored-routes", "lens-monitored-areas"]) {
        map.on("mouseenter", layerId, (event) => {
          map.getCanvas().style.cursor = "pointer";
          const item = event.features?.[0];
          if (!item) return;
          popup
            .setLngLat(event.lngLat)
            .setDOMContent(popupContent(String(item.properties?.category), String(item.properties?.title)))
            .addTo(map);
        });
        map.on("mouseleave", layerId, hidePopup);
        map.on("click", layerId, (event) => {
          if (
            event.defaultPrevented ||
            hasRenderedLayerAtPoint(map, event.point, EVENT_HIT_LAYER_IDS)
          ) return;
          event.preventDefault();
          const id = event.features?.[0]?.properties?.id;
          if (typeof id === "string") activateRef.current(id);
        });
      }
      map.on("mouseenter", "lens-activity-points", showEvent);
      map.on("mouseleave", "lens-activity-points", hidePopup);
      map.on("click", "lens-activity-points", (event) => {
        if (event.defaultPrevented) return;
        const id = event.features?.[0]?.properties?.id;
        if (typeof id === "string") activateRef.current(id);
      });
      map.on("click", "lens-activity-clusters", async (event) => {
        if (event.defaultPrevented) return;
        const item = event.features?.[0];
        if (item?.geometry.type !== "Point") return;
        const source = map.getSource("lens-activity") as GeoJSONSource;
        const clusterId = Number(item.properties?.cluster_id);
        await expandCluster(
          source,
          clusterId,
          item.geometry.coordinates as [number, number],
        );
      });
      map.on("mouseenter", "lens-activity-clusters", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "lens-activity-clusters", hidePopup);
      map.on("mouseenter", "lens-alert-points", showEvent);
      map.on("mouseleave", "lens-alert-points", hidePopup);
      map.on("click", "lens-alert-points", (event) => {
        if (event.defaultPrevented) return;
        const id = event.features?.[0]?.properties?.id;
        if (typeof id === "string") activateRef.current(id);
      });
      map.on("click", "lens-alert-clusters", async (event) => {
        if (event.defaultPrevented) return;
        const item = event.features?.[0];
        if (item?.geometry.type !== "Point") return;
        const source = map.getSource("lens-alerts") as GeoJSONSource;
        await expandCluster(
          source,
          Number(item.properties?.cluster_id),
          item.geometry.coordinates as [number, number],
        );
      });
      map.on("mouseenter", "lens-alert-clusters", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "lens-alert-clusters", hidePopup);
      map.on("mouseenter", "lens-event-clusters", async (event) => {
        map.getCanvas().style.cursor = "pointer";
        const item = event.features?.[0];
        if (item?.geometry.type !== "Point") return;
        const clusterId = Number(item.properties?.cluster_id);
        const pointCount = Number(item.properties?.point_count);
        const leaves = await (map.getSource("lens-events") as GeoJSONSource)
          .getClusterLeaves(clusterId, pointCount, 0);
        const counts = new Map<string, number>();
        leaves.forEach(({ properties }) => {
          const label = String(properties?.visualLabel);
          counts.set(label, (counts.get(label) ?? 0) + 1);
        });
        const summary = [...counts]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([category, count]) => `${category} ${count}`)
          .join(" · ");
        popup
          .setLngLat(item.geometry.coordinates as [number, number])
          .setDOMContent(popupContent(`${pointCount} nearby events`, summary))
          .addTo(map);
      });
      map.on("mouseleave", "lens-event-clusters", hidePopup);
      map.on("click", "lens-event-clusters", async (event) => {
        if (event.defaultPrevented) return;
        hidePopup();
        const item = event.features?.[0];
        if (item?.geometry.type !== "Point") return;
        const source = map.getSource("lens-events") as GeoJSONSource;
        const clusterId = Number(item.properties?.cluster_id);
        await expandCluster(
          source,
          clusterId,
          item.geometry.coordinates as [number, number],
        );
      });
      const markReady = () => {
        if (!map.isSourceLoaded("lens-events")) return;
        map.off("sourcedata", markReady);
        setStatus("ready");
      };
      map.on("sourcedata", markReady);
      markReady();
    });

    return () => {
      if (deckRef.current) map.removeControl(deckRef.current as unknown as IControl);
      deckRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, [mapStyle]);

  useEffect(() => {
    const event = allEvents.find(({ id }) => id === activeId);
    if (!event || !mapRef.current) return;
    const state = temporalMapState(
      event,
      temporalAt ?? farFuture,
    );
    const geometrySource = mapRef.current.getSource("lens-active-geometry") as GeoJSONSource | undefined;
    const monitoringSource = mapRef.current.getSource("lens-monitoring-geometry") as GeoJSONSource | undefined;
    const playback = tripPlayback(event.geometryHistory, temporalAt ?? farFuture);
    const eventsSource = mapRef.current.getSource("lens-events") as GeoJSONSource | undefined;
    eventsSource?.setData(eventData(
      events,
      activeId,
      temporalAt ?? farFuture,
      playback ? activeId : undefined,
    ));
    const activitySource = mapRef.current.getSource("lens-activity") as GeoJSONSource | undefined;
    activitySource?.setData(eventData(activityEvents, activeId, temporalAt ?? farFuture));
    const alertsSource = mapRef.current.getSource("lens-alerts") as GeoJSONSource | undefined;
    alertsSource?.setData(eventData(alertEvents, activeId, temporalAt ?? farFuture));
    geometrySource?.setData(geometryData(state, playback));
    monitoringSource?.setData(monitoringGeometryData(allEvents, temporalAt ?? farFuture));
    void loadCountryBoundaries().then((boundaries) => {
      if (!mapRef.current) return;
      const source = mapRef.current.getSource("lens-country-events") as GeoJSONSource | undefined;
      const labelSource = mapRef.current.getSource(
        "lens-country-event-label-points",
      ) as GeoJSONSource | undefined;
      const visibleCountryEvents = uniqueEvents(
        showEvents ? events : [],
        showActivity ? activityEvents : [],
        showAlerts ? alertEvents : [],
      );
      source?.setData(countrySurfaceData(
        boundaries,
        visibleCountryEvents,
      ));
      labelSource?.setData(countryLabelData(visibleCountryEvents));
    }).catch(() => undefined);
    for (const layerId of ["lens-monitored-routes", "lens-monitored-areas"]) {
      if (mapRef.current.getLayer(layerId)) {
        mapRef.current.setLayoutProperty(
          layerId,
          "visibility",
          showMonitoringGeometry ? "visible" : "none",
        );
      }
    }
    for (const layerId of [
      "lens-activity-clusters",
      "lens-activity-cluster-count",
      "lens-activity-points",
    ]) {
      if (mapRef.current.getLayer(layerId)) {
        mapRef.current.setLayoutProperty(layerId, "visibility", showActivity ? "visible" : "none");
      }
    }
    for (const layerId of [
      "lens-alert-clusters",
      "lens-alert-cluster-count",
      "lens-alert-points",
    ]) {
      if (mapRef.current.getLayer(layerId)) {
        mapRef.current.setLayoutProperty(layerId, "visibility", showAlerts ? "visible" : "none");
      }
    }
    for (const layerId of [
      "lens-event-clusters",
      "lens-event-cluster-count",
      "lens-event-points",
      "lens-event-labels",
    ]) {
      if (mapRef.current.getLayer(layerId)) {
        mapRef.current.setLayoutProperty(layerId, "visibility", showEvents ? "visible" : "none");
      }
    }
    deckRef.current?.setProps({
      layers: playback ? [
        new TripsLayer({
          id: `lens-trip-head-${event.id}`,
          data: [playback],
          getPath: (trip) => trip.path,
          getTimestamps: (trip) => trip.timestamps,
          currentTime: playback.currentTime,
          trailLength: 1.5,
          fadeTrail: true,
          capRounded: true,
          jointRounded: true,
          widthUnits: "pixels",
          getWidth: 4,
          getColor: [255, 181, 68, 220],
          pickable: false,
        }),
      ] : [],
    });

    const cameraKey = `${activeId}:${focus?.coordinates.join(",") ?? ""}:${focus?.zoom ?? ""}`;
    if (focusActive && status === "ready" && cameraKeyRef.current !== cameraKey) {
      const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 900;
      const complete = temporalMapState(event, farFuture);
      const extent = complete.trace?.type === "LineString"
        ? complete.trace.coordinates
        : complete.geometry.type === "LineString"
          ? complete.geometry.coordinates
          : complete.geometry.type === "Polygon"
            ? complete.geometry.coordinates.flat()
            : [];
      if (!focus && extent.length >= 2) {
        const bounds = extent.reduce(
          (value, coordinates) => value.extend(coordinates),
          new maplibregl.LngLatBounds(extent[0], extent[0]),
        );
        mapRef.current.fitBounds(bounds, { padding: 90, maxZoom: 5, duration });
      } else {
        mapRef.current.easeTo({
          center: focus?.coordinates ?? event.coordinates,
          zoom: Math.max(mapRef.current.getZoom(), focus?.zoom ?? 3.8),
          duration,
        });
      }
      cameraKeyRef.current = cameraKey;
    }
  }, [
    activeId,
    events,
    activityEvents,
    alertEvents,
    focus,
    focusActive,
    showActivity,
    showAlerts,
    showEvents,
    showMonitoringGeometry,
    status,
    temporalAt,
  ]);

  return (
    <div
      className="world-map"
      data-basemap={basemap}
      data-camera-mode={focusActive ? "event" : "world"}
      data-event-count={allEvents.length}
      data-events-visible={showEvents}
      data-alerts-visible={showAlerts}
      data-trip-renderer={status === "ready" ? "deck-gl" : undefined}
    >
      <div ref={containerRef} className="world-map__canvas" />
      {!styleUrl && (
        <div className="basemap-switch" role="group" aria-label="Map style">
          <button
            type="button"
            aria-pressed={basemap === "satellite"}
            onClick={() => setBasemap("satellite")}
          >
            Satellite
          </button>
          <button
            type="button"
            aria-pressed={basemap === "boundaries"}
            onClick={() => setBasemap("boundaries")}
          >
            Borders
          </button>
        </div>
      )}
      {showLegend && <MapLegend events={allEvents} />}
      {status !== "ready" && (
        <p className="map-status" role="status">
          Loading world map…
        </p>
      )}
    </div>
  );
}
