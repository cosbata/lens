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
import "maplibre-gl/dist/maplibre-gl.css";
import "./map.css";
import type { TodayEvent } from "./briefing-fixture";
import {
  temporalMapState,
  tripPlayback,
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
  showObservedPoints = true,
) => ({
  type: "FeatureCollection" as const,
  features: [
    ...(state.geometry.type !== "Point"
      ? [feature(state.geometry)]
      : []),
    ...(showObservedPoints && state.trace?.type === "LineString"
      ? state.trace.coordinates.map((coordinates) => feature({ type: "Point", coordinates }))
      : []),
  ],
});

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
  { key: "wildfire", label: "Wildfire", color: "#ff715b", pattern: /wildfire|incident complex/i },
  { key: "storm", label: "Storm", color: "#4fa7d1", pattern: /hurricane|typhoon|storm|cyclone/i },
  { key: "ice", label: "Ice", color: "#72c7cf", pattern: /iceberg|glacier|sea ice/i },
  { key: "earthquake", label: "Earthquake", color: "#e0a458", pattern: /earthquake|quake/i },
  { key: "volcano", label: "Volcano", color: "#bd6952", pattern: /volcano|eruption/i },
] as const;
const MAP_COLORS = {
  ...CATEGORY_COLORS,
  ...Object.fromEntries(MAP_TYPES.map(({ key, color }) => [key, color])),
};

export function eventAppearance(event: Pick<TodayEvent, "category" | "title">) {
  const subtype = MAP_TYPES.find(({ pattern }) => pattern.test(event.title));
  if (subtype) return subtype;
  const key = categoryKey(event.category);
  return {
    key,
    label: event.category,
    color: CATEGORY_COLORS[key] ?? "#9c9a93",
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
  features: events.map((event) => {
    const appearance = eventAppearance(event);
    const state = temporalMapState(event, temporalAt);
    const coordinates = state.geometry.type === "Point"
      ? state.geometry.coordinates
      : state.geometry.type === "LineString"
        ? state.geometry.coordinates.at(-1)!
        : state.geometry.coordinates[0][0];
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
      geometry: { type: "Point" as const, coordinates },
    };
  }),
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

export type ClusterDrilldownEvent = {
  id: string;
  title: string;
  category: string;
  visualLabel: string;
  color: string;
  locationPrecision: string;
  locationDisplayName: string;
};

type ClusterLeaf = {
  geometry?: { type?: string; coordinates?: unknown };
  properties?: Record<string, unknown> | null;
};

const pointCoordinates = (leaf: ClusterLeaf) => (
  leaf.geometry?.type === "Point" && Array.isArray(leaf.geometry.coordinates)
    ? leaf.geometry.coordinates as [number, number]
    : undefined
);

export function clusterDrilldownEvents(leaves: readonly ClusterLeaf[]): ClusterDrilldownEvent[] {
  const coordinates = leaves.map(pointCoordinates).filter((value): value is [number, number] => Boolean(value));
  if (coordinates.length !== leaves.length) return [];
  if (new Set(coordinates.map((coordinate) => coordinate.join(","))).size !== 1) return [];
  return leaves.flatMap(({ properties }) => {
    if (typeof properties?.id !== "string") return [];
    return [{
      id: properties.id,
      title: String(properties.title ?? ""),
      category: String(properties.category ?? ""),
      visualLabel: String(properties.visualLabel ?? properties.category ?? ""),
      color: String(properties.color ?? "#b8a996"),
      locationPrecision: String(properties.locationPrecision ?? ""),
      locationDisplayName: String(properties.locationDisplayName ?? ""),
    }];
  });
}

export function WorldMap({
  events,
  activityEvents = [],
  activeId,
  onActivate,
  styleUrl,
  focus,
  temporalAt,
  showEvents = true,
  showActivity = true,
  focusActive = true,
}: {
  events: readonly TodayEvent[];
  activityEvents?: readonly TodayEvent[];
  activeId: string;
  onActivate: (id: string) => void;
  styleUrl?: string;
  focus?: { coordinates: [number, number]; zoom: number };
  temporalAt?: string;
  showEvents?: boolean;
  showActivity?: boolean;
  focusActive?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const deckRef = useRef<MapboxOverlay | null>(null);
  const cameraKeyRef = useRef<string | null>(null);
  const suppressNextFocusRef = useRef<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready">("loading");
  const [basemap, setBasemap] = useState<"satellite" | "boundaries">("satellite");
  const [drilldown, setDrilldown] = useState<{
    coordinates: [number, number];
    events: ClusterDrilldownEvent[];
    index: number;
  } | null>(null);
  const mapStyle = styleUrl ?? (basemap === "boundaries" ? BOUNDARIES_STYLE : SATELLITE_STYLE);
  const allEvents = [
    ...events,
    ...activityEvents.filter(({ id }) => !events.some((event) => event.id === id)),
  ];

  useEffect(() => {
    if (!containerRef.current) return;
    setStatus("loading");
    setDrilldown(null);
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
      map.addSource("lens-events", {
        type: "geojson",
        data: eventData(
          events,
          activeId,
          temporalAt ?? farFuture,
          initialPlayback ? initialEvent.id : undefined,
        ),
        cluster: true,
        clusterMaxZoom: 5,
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
        clusterMaxZoom: 6,
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
        data: geometryData(initialState, initialPlayback === null),
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
        paint: { "line-color": "#f0ede5", "line-width": 2, "line-dasharray": [2, 2] },
      });
      map.addLayer({
        id: "lens-observed-points",
        type: "circle",
        source: "lens-active-geometry",
        filter: ["==", ["geometry-type"], "Point"],
        paint: {
          "circle-color": "#ff9d00",
          "circle-radius": 9,
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
      const openLocationEvents = (
        coordinates: [number, number],
        locationEvents: ClusterDrilldownEvent[],
      ) => {
        const first = locationEvents[0];
        if (!first) return false;
        suppressNextFocusRef.current = first.id;
        setDrilldown({ coordinates, events: locationEvents, index: 0 });
        onActivate(first.id);
        return true;
      };
      map.on("mouseenter", "lens-event-points", showEvent);
      map.on("mouseleave", "lens-event-points", hidePopup);
      map.on("click", "lens-event-points", (event) => {
        setDrilldown(null);
        const id = event.features?.[0]?.properties?.id;
        if (typeof id === "string") onActivate(id);
      });
      map.on("mouseenter", "lens-activity-points", showEvent);
      map.on("mouseleave", "lens-activity-points", hidePopup);
      map.on("click", "lens-activity-points", (event) => {
        setDrilldown(null);
        const id = event.features?.[0]?.properties?.id;
        if (typeof id === "string") onActivate(id);
      });
      map.on("click", "lens-activity-clusters", async (event) => {
        const item = event.features?.[0];
        if (item?.geometry.type !== "Point") return;
        const source = map.getSource("lens-activity") as GeoJSONSource;
        const clusterId = Number(item.properties?.cluster_id);
        const pointCount = Number(item.properties?.point_count);
        const leaves = await source.getClusterLeaves(clusterId, pointCount, 0);
        const eventsHere = clusterDrilldownEvents(leaves);
        if (openLocationEvents(item.geometry.coordinates as [number, number], eventsHere)) return;
        map.easeTo({
          center: item.geometry.coordinates as [number, number],
          zoom: await source.getClusterExpansionZoom(clusterId),
        });
      });
      map.on("mouseenter", "lens-activity-clusters", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "lens-activity-clusters", hidePopup);
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
        hidePopup();
        const item = event.features?.[0];
        if (item?.geometry.type !== "Point") return;
        const source = map.getSource("lens-events") as GeoJSONSource;
        const clusterId = Number(item.properties?.cluster_id);
        const pointCount = Number(item.properties?.point_count);
        const leaves = await source.getClusterLeaves(clusterId, pointCount, 0);
        const eventsHere = clusterDrilldownEvents(leaves);
        if (openLocationEvents(item.geometry.coordinates as [number, number], eventsHere)) return;
        const zoom = await source.getClusterExpansionZoom(clusterId);
        setDrilldown(null);
        map.easeTo({ center: item.geometry.coordinates as [number, number], zoom });
      });
      map.on("click", (event) => {
        const interactive = map.queryRenderedFeatures(event.point, {
          layers: [
            "lens-event-clusters",
            "lens-event-points",
            "lens-activity-clusters",
            "lens-activity-points",
          ],
        });
        if (interactive.length === 0) setDrilldown(null);
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
  }, [events, activityEvents, mapStyle, onActivate]);

  useEffect(() => {
    if (!drilldown) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrilldown(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [drilldown]);

  useEffect(() => {
    const event = allEvents.find(({ id }) => id === activeId);
    if (!event || !mapRef.current) return;
    const state = temporalMapState(
      event,
      temporalAt ?? farFuture,
    );
    const geometrySource = mapRef.current.getSource("lens-active-geometry") as GeoJSONSource | undefined;
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
    geometrySource?.setData(geometryData(state, playback === null));
    for (const layerId of [
      "lens-area",
      "lens-route",
      "lens-observed-points",
      "lens-activity-clusters",
      "lens-activity-cluster-count",
      "lens-activity-points",
    ]) {
      if (mapRef.current.getLayer(layerId)) {
        mapRef.current.setLayoutProperty(layerId, "visibility", showActivity ? "visible" : "none");
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
      layers: showActivity && playback ? [
        new TripsLayer({
          id: `lens-trip-base-${event.id}`,
          data: [playback],
          getPath: (trip) => trip.path,
          getTimestamps: (trip) => trip.timestamps,
          currentTime: playback.currentTime,
          fadeTrail: false,
          capRounded: true,
          jointRounded: true,
          widthUnits: "pixels",
          getWidth: 2,
          getColor: [255, 157, 0, 125],
          pickable: false,
        }),
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
    if (suppressNextFocusRef.current === activeId) {
      cameraKeyRef.current = cameraKey;
      suppressNextFocusRef.current = null;
      return;
    }
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
    focus,
    focusActive,
    showActivity,
    showEvents,
    status,
    temporalAt,
  ]);

  const selectLocationEvent = (offset: number) => {
    if (!drilldown) return;
    const index = (drilldown.index + offset + drilldown.events.length) % drilldown.events.length;
    const event = drilldown.events[index];
    setDrilldown({ ...drilldown, index });
    suppressNextFocusRef.current = event.id;
    onActivate(event.id);
  };

  return (
    <div
      className="world-map"
      data-basemap={basemap}
      data-camera-mode={focusActive ? "event" : "world"}
      data-event-count={events.length}
      data-events-visible={showEvents}
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
      <div className="map-legend" aria-label="Event category colours">
        <span>Event type</span>
        {[...new Map(allEvents.map((event) => {
          const appearance = eventAppearance(event);
          return [appearance.key, appearance];
        })).values()].sort((a, b) => a.label.localeCompare(b.label)).map((appearance) => (
          <i key={appearance.key}>
            <b style={{ "--event-colour": appearance.color } as CSSProperties} />
            {appearance.label}
          </i>
        ))}
        <small>Clusters show nearby event totals. Hover to preview; select to expand.</small>
      </div>
      {status !== "ready" && (
        <p className="map-status" role="status">
          Loading world map…
        </p>
      )}
      {drilldown && (
        <section className="cluster-drilldown" aria-label="Events at this location">
          <header>
            <p>
              {drilldown.events.every(({ locationPrecision }) => locationPrecision === "country_approximate")
                ? `${drilldown.events.length} reports in this country`
                : `${drilldown.events.length} events here`}
            </p>
            <button type="button" aria-label="Close location events" onClick={() => setDrilldown(null)}>×</button>
          </header>
          <p className="cluster-drilldown__place">
            {drilldown.events.find(({ locationDisplayName }) => locationDisplayName)?.locationDisplayName
              ?? `${drilldown.coordinates[1].toFixed(2)}, ${drilldown.coordinates[0].toFixed(2)}`}
          </p>
          {(() => {
            const event = drilldown.events[drilldown.index];
            return (
              <>
                <button
                  className="cluster-drilldown__event"
                  type="button"
                  aria-label={`Show details for ${event.title}`}
                  onClick={() => selectLocationEvent(0)}
                >
                  <b style={{ "--event-colour": event.color } as CSSProperties} />
                  <span>
                    <small>
                      {event.visualLabel}
                      {event.locationPrecision === "country_approximate" ? " · country approximate" : ""}
                    </small>
                    <strong>{event.title}</strong>
                  </span>
                </button>
                <nav aria-label="Events at this location pagination">
                  <button
                    type="button"
                    aria-label="Previous location event"
                    onClick={() => selectLocationEvent(-1)}
                  >
                    ←
                  </button>
                  <span>{drilldown.index + 1} / {drilldown.events.length}</span>
                  <button
                    type="button"
                    aria-label="Next location event"
                    onClick={() => selectLocationEvent(1)}
                  >
                    →
                  </button>
                </nav>
              </>
            );
          })()}
        </section>
      )}
    </div>
  );
}
