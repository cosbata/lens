import { DatabaseSync } from "node:sqlite";
import {
  parseBriefingSnapshot,
  parseEvidence,
  parseEventCluster,
  parseEventScore,
  parseObservation,
  parseProviderRun,
  type BriefingSnapshot,
  type Evidence,
  type EventCluster,
  type EventScore,
  type Geometry,
  type Observation,
  type ProviderRun,
} from "../../core/model";
import { MIGRATIONS } from "./migrations";

type Row = Record<string, string | number | null>;
type Parser<T> = (value: unknown) => T;

export interface FeedState {
  feedId: string;
  etag?: string;
  lastModified?: string;
  lastCheckedAt: string;
  lastSuccessAt?: string;
  failureCount: number;
  itemCount: number;
  errorClass?: string;
}

function payload<T>(row: unknown, parser: Parser<T>): T | null {
  if (!row) return null;
  return parser(JSON.parse((row as Row).payload as string));
}

function payloads<T>(rows: unknown[], parser: Parser<T>): T[] {
  return rows.map((row) => payload(row, parser) as T);
}

function bounds(geometry: Geometry | null) {
  if (!geometry) return [null, null, null, null] as const;
  const positions =
    geometry.type === "Point"
      ? [geometry.coordinates]
      : geometry.type === "LineString"
        ? geometry.coordinates
        : geometry.coordinates.flat();
  const longitude = positions.map(([value]) => value);
  const latitude = positions.map(([, value]) => value);
  return [
    Math.min(...longitude),
    Math.min(...latitude),
    Math.max(...longitude),
    Math.max(...latitude),
  ] as const;
}

export class LensStore {
  readonly database: DatabaseSync;

  constructor(path = ":memory:") {
    this.database = new DatabaseSync(path, { timeout: 5_000 });
    this.database.exec("PRAGMA foreign_keys = ON");
    this.database.exec("PRAGMA journal_mode = WAL");
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL
      ) STRICT
    `);
    this.applyMigrations();
  }

  close() {
    this.database.close();
  }

  migrationVersions() {
    return (this.database.prepare(
      "SELECT version FROM schema_migrations ORDER BY version",
    ).all() as Row[]).map(({ version }) => Number(version));
  }

  saveProviderRun(value: ProviderRun) {
    const item = parseProviderRun(value);
    this.database.prepare(`
      INSERT INTO provider_runs
        (id, provider, started_at, completed_at, state, item_count, stale, payload)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        completed_at = excluded.completed_at,
        state = excluded.state,
        item_count = excluded.item_count,
        stale = excluded.stale,
        payload = excluded.payload
    `).run(
      item.id,
      item.provider,
      item.startedAt,
      item.completedAt ?? null,
      item.state,
      item.itemCount,
      item.stale ? 1 : 0,
      JSON.stringify(item),
    );
  }

  providerRun(id: string) {
    return payload(
      this.database.prepare("SELECT payload FROM provider_runs WHERE id = ?").get(id),
      parseProviderRun,
    );
  }

  providerRuns() {
    return payloads(
      this.database.prepare("SELECT payload FROM provider_runs ORDER BY started_at DESC").all(),
      parseProviderRun,
    );
  }

  saveFeedState(value: FeedState) {
    this.database.prepare(`
      INSERT INTO feed_state
        (feed_id, etag, last_modified, last_checked_at, last_success_at,
         failure_count, item_count, error_class)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(feed_id) DO UPDATE SET
        etag = excluded.etag,
        last_modified = excluded.last_modified,
        last_checked_at = excluded.last_checked_at,
        last_success_at = excluded.last_success_at,
        failure_count = excluded.failure_count,
        item_count = excluded.item_count,
        error_class = excluded.error_class
    `).run(
      value.feedId,
      value.etag ?? null,
      value.lastModified ?? null,
      value.lastCheckedAt,
      value.lastSuccessAt ?? null,
      value.failureCount,
      value.itemCount,
      value.errorClass ?? null,
    );
  }

  feedState(feedId: string): FeedState | undefined {
    const row = this.database.prepare(
      "SELECT * FROM feed_state WHERE feed_id = ?",
    ).get(feedId) as Row | undefined;
    if (!row) return undefined;
    return {
      feedId: String(row.feed_id),
      etag: row.etag === null ? undefined : String(row.etag),
      lastModified: row.last_modified === null ? undefined : String(row.last_modified),
      lastCheckedAt: String(row.last_checked_at),
      lastSuccessAt: row.last_success_at === null ? undefined : String(row.last_success_at),
      failureCount: Number(row.failure_count),
      itemCount: Number(row.item_count),
      errorClass: row.error_class === null ? undefined : String(row.error_class),
    };
  }

  feedStates() {
    return (this.database.prepare(
      "SELECT feed_id FROM feed_state ORDER BY feed_id",
    ).all() as Row[]).map(({ feed_id }) => this.feedState(String(feed_id))!);
  }

  saveObservation(value: Observation) {
    const item = parseObservation(value);
    const [minLng, minLat, maxLng, maxLat] = bounds(item.geometry);
    this.database.prepare(`
      INSERT INTO observations
        (id, provider, source_family, occurred_at, fetched_at, primary_category,
         min_lng, min_lat, max_lng, max_lat, payload)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        fetched_at = excluded.fetched_at,
        primary_category = excluded.primary_category,
        min_lng = excluded.min_lng,
        min_lat = excluded.min_lat,
        max_lng = excluded.max_lng,
        max_lat = excluded.max_lat,
        payload = excluded.payload
    `).run(
      item.id,
      item.provider,
      item.sourceFamily,
      item.occurredAt,
      item.fetchedAt,
      item.primaryCategory,
      minLng,
      minLat,
      maxLng,
      maxLat,
      JSON.stringify(item),
    );
  }

  observation(id: string) {
    return payload(
      this.database.prepare("SELECT payload FROM observations WHERE id = ?").get(id),
      parseObservation,
    );
  }

  observations() {
    return payloads(
      this.database.prepare("SELECT payload FROM observations ORDER BY occurred_at DESC").all(),
      parseObservation,
    );
  }

  saveEvent(value: EventCluster) {
    const item = parseEventCluster(value);
    const [minLng, minLat, maxLng, maxLat] = bounds(item.geometry);
    this.database.prepare(`
      INSERT INTO events
        (id, primary_category, phase, last_seen_at, last_material_update_at,
         min_lng, min_lat, max_lng, max_lat, payload)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        primary_category = excluded.primary_category,
        phase = excluded.phase,
        last_seen_at = excluded.last_seen_at,
        last_material_update_at = excluded.last_material_update_at,
        min_lng = excluded.min_lng,
        min_lat = excluded.min_lat,
        max_lng = excluded.max_lng,
        max_lat = excluded.max_lat,
        payload = excluded.payload
    `).run(
      item.id,
      item.primaryCategory,
      item.phase,
      item.lastSeenAt,
      item.lastMaterialUpdateAt,
      minLng,
      minLat,
      maxLng,
      maxLat,
      JSON.stringify(item),
    );
  }

  event(id: string) {
    return payload(
      this.database.prepare("SELECT payload FROM events WHERE id = ?").get(id),
      parseEventCluster,
    );
  }

  events() {
    return payloads(
      this.database.prepare("SELECT payload FROM events ORDER BY last_material_update_at DESC").all(),
      parseEventCluster,
    );
  }

  saveEvidence(value: Evidence) {
    const item = parseEvidence(value);
    this.database.prepare(`
      INSERT INTO event_evidence
        (id, observation_id, source_family, published_at, url, payload)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET payload = excluded.payload
    `).run(
      item.id,
      item.observationId,
      item.sourceFamily,
      item.publishedAt,
      item.url,
      JSON.stringify(item),
    );
  }

  evidence(id: string) {
    return payload(
      this.database.prepare("SELECT payload FROM event_evidence WHERE id = ?").get(id),
      parseEvidence,
    );
  }

  evidenceForObservation(observationId: string) {
    return payloads(
      this.database.prepare(
        "SELECT payload FROM event_evidence WHERE observation_id = ? ORDER BY published_at",
      ).all(observationId),
      parseEvidence,
    );
  }

  appendEventScore(value: EventScore) {
    const item = parseEventScore(value);
    this.database.prepare(`
      INSERT INTO event_scores
        (event_id, version, calculated_at, final_score, payload)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      item.eventId,
      item.version,
      item.calculatedAt,
      item.finalScore,
      JSON.stringify(item),
    );
  }

  eventScores(eventId: string) {
    return payloads(
      this.database.prepare(
        "SELECT payload FROM event_scores WHERE event_id = ? ORDER BY calculated_at DESC",
      ).all(eventId),
      parseEventScore,
    );
  }

  saveStoryAliases(
    canonicalHash: string,
    memberHashes: string[],
    expiresAt: string,
  ) {
    const statement = this.database.prepare(`
      INSERT INTO story_aliases (member_hash, canonical_hash, expires_at)
      VALUES (?, ?, ?)
      ON CONFLICT(member_hash) DO UPDATE SET
        canonical_hash = excluded.canonical_hash,
        expires_at = excluded.expires_at
    `);
    this.transaction(() => {
      for (const memberHash of new Set(memberHashes)) {
        statement.run(memberHash, canonicalHash, expiresAt);
      }
    });
  }

  storyAliasTargets(memberHashes: string[], at = new Date().toISOString()) {
    const targets = new Map<string, string>();
    const statement = this.database.prepare(`
      SELECT canonical_hash FROM story_aliases
      WHERE member_hash = ? AND unixepoch(expires_at) > unixepoch(?)
    `);
    for (const memberHash of new Set(memberHashes)) {
      const row = statement.get(memberHash, at) as Row | undefined;
      if (row?.canonical_hash) targets.set(memberHash, String(row.canonical_hash));
    }
    return targets;
  }

  pruneStoryAliases(at = new Date().toISOString()) {
    return Number(this.database.prepare(`
      DELETE FROM story_aliases
      WHERE unixepoch(expires_at) <= unixepoch(?)
    `).run(at).changes);
  }

  appendSnapshot(value: BriefingSnapshot) {
    const item = parseBriefingSnapshot(value);
    const signature = JSON.stringify({
      eventIds: item.eventIds,
      categoryScores: item.categoryScores,
      rankingVersion: item.rankingVersion,
      providerHealth: item.providerHealth,
    });
    this.transaction(() => {
      this.database.prepare(`
        INSERT INTO briefing_snapshots
          (id, created_at, ranking_version, signature, payload)
        VALUES (?, ?, ?, ?, ?)
      `).run(item.id, item.createdAt, item.rankingVersion, signature, JSON.stringify(item));
      const insertItem = this.database.prepare(`
        INSERT INTO briefing_snapshot_items (snapshot_id, position, event_id)
        VALUES (?, ?, ?)
      `);
      item.eventIds.forEach((eventId, position) => insertItem.run(item.id, position, eventId));
    });
  }

  snapshot(id: string) {
    return payload(
      this.database.prepare("SELECT payload FROM briefing_snapshots WHERE id = ?").get(id),
      parseBriefingSnapshot,
    );
  }

  latestSnapshot() {
    return payload(
      this.database.prepare(
        "SELECT payload FROM briefing_snapshots ORDER BY unixepoch(created_at) DESC LIMIT 1",
      ).get(),
      parseBriefingSnapshot,
    );
  }

  snapshotAtOrBefore(at: string) {
    return payload(
      this.database.prepare(`
        SELECT payload FROM briefing_snapshots
        WHERE unixepoch(created_at) <= unixepoch(?)
        ORDER BY unixepoch(created_at) DESC
        LIMIT 1
      `).get(at),
      parseBriefingSnapshot,
    );
  }

  private applyMigrations() {
    const applied = new Set(this.migrationVersions());
    for (const migration of MIGRATIONS) {
      if (applied.has(migration.version)) continue;
      this.transaction(() => {
        this.database.exec(migration.sql);
        this.database.prepare(
          "INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)",
        ).run(migration.version, new Date().toISOString());
      });
    }
  }

  private transaction(run: () => void) {
    this.database.exec("BEGIN IMMEDIATE");
    try {
      run();
      this.database.exec("COMMIT");
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }
}
