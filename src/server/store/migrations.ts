export const MIGRATIONS = [
  {
    version: 1,
    sql: `
      CREATE TABLE provider_runs (
        id TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        started_at TEXT NOT NULL,
        completed_at TEXT,
        state TEXT NOT NULL,
        item_count INTEGER NOT NULL,
        stale INTEGER NOT NULL,
        payload TEXT NOT NULL
      ) STRICT;

      CREATE TABLE observations (
        id TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        source_family TEXT NOT NULL,
        occurred_at TEXT NOT NULL,
        fetched_at TEXT NOT NULL,
        primary_category TEXT NOT NULL,
        min_lng REAL,
        min_lat REAL,
        max_lng REAL,
        max_lat REAL,
        payload TEXT NOT NULL
      ) STRICT;

      CREATE TABLE events (
        id TEXT PRIMARY KEY,
        primary_category TEXT NOT NULL,
        phase TEXT NOT NULL,
        last_seen_at TEXT NOT NULL,
        last_material_update_at TEXT NOT NULL,
        min_lng REAL,
        min_lat REAL,
        max_lng REAL,
        max_lat REAL,
        payload TEXT NOT NULL
      ) STRICT;

      CREATE TABLE event_evidence (
        id TEXT PRIMARY KEY,
        observation_id TEXT NOT NULL REFERENCES observations(id),
        source_family TEXT NOT NULL,
        published_at TEXT NOT NULL,
        url TEXT NOT NULL,
        payload TEXT NOT NULL
      ) STRICT;

      CREATE TABLE event_scores (
        event_id TEXT NOT NULL REFERENCES events(id),
        version TEXT NOT NULL,
        calculated_at TEXT NOT NULL,
        final_score REAL NOT NULL,
        payload TEXT NOT NULL,
        PRIMARY KEY (event_id, version, calculated_at)
      ) STRICT;

      CREATE TABLE briefing_snapshots (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        ranking_version TEXT NOT NULL,
        signature TEXT NOT NULL,
        payload TEXT NOT NULL
      ) STRICT;

      CREATE TABLE briefing_snapshot_items (
        snapshot_id TEXT NOT NULL REFERENCES briefing_snapshots(id),
        position INTEGER NOT NULL,
        event_id TEXT NOT NULL REFERENCES events(id),
        PRIMARY KEY (snapshot_id, position),
        UNIQUE (snapshot_id, event_id)
      ) STRICT;

      CREATE TRIGGER briefing_snapshots_no_update
      BEFORE UPDATE ON briefing_snapshots
      BEGIN SELECT RAISE(ABORT, 'briefing_snapshot_immutable'); END;

      CREATE TRIGGER briefing_snapshots_no_delete
      BEFORE DELETE ON briefing_snapshots
      BEGIN SELECT RAISE(ABORT, 'briefing_snapshot_immutable'); END;

      CREATE TRIGGER briefing_snapshot_items_no_update
      BEFORE UPDATE ON briefing_snapshot_items
      BEGIN SELECT RAISE(ABORT, 'briefing_snapshot_immutable'); END;

      CREATE TRIGGER briefing_snapshot_items_no_delete
      BEFORE DELETE ON briefing_snapshot_items
      BEGIN SELECT RAISE(ABORT, 'briefing_snapshot_immutable'); END;
    `,
  },
  {
    version: 2,
    sql: `
      CREATE INDEX provider_runs_provider_started
        ON provider_runs(provider, started_at DESC);
      CREATE INDEX observations_category_occurred
        ON observations(primary_category, occurred_at DESC);
      CREATE INDEX events_category_material
        ON events(primary_category, last_material_update_at DESC);
      CREATE INDEX evidence_observation
        ON event_evidence(observation_id);
      CREATE INDEX event_scores_latest
        ON event_scores(event_id, calculated_at DESC);
      CREATE INDEX briefing_snapshots_created
        ON briefing_snapshots(created_at DESC);
      CREATE UNIQUE INDEX briefing_snapshots_signature
        ON briefing_snapshots(signature);
    `,
  },
  {
    version: 3,
    sql: `
      CREATE TABLE story_aliases (
        member_hash TEXT PRIMARY KEY,
        canonical_hash TEXT NOT NULL,
        expires_at TEXT NOT NULL
      ) STRICT;
      CREATE INDEX story_aliases_expires
        ON story_aliases(expires_at);
    `,
  },
  {
    version: 4,
    sql: `
      CREATE TABLE feed_state (
        feed_id TEXT PRIMARY KEY,
        etag TEXT,
        last_modified TEXT,
        last_checked_at TEXT NOT NULL,
        last_success_at TEXT,
        failure_count INTEGER NOT NULL,
        item_count INTEGER NOT NULL,
        error_class TEXT
      ) STRICT;
      CREATE INDEX feed_state_checked
        ON feed_state(last_checked_at DESC);
    `,
  },
  {
    version: 5,
    sql: `
      ALTER TABLE observations
        ADD COLUMN event_type TEXT NOT NULL DEFAULT 'unknown';
      ALTER TABLE events
        ADD COLUMN event_type TEXT NOT NULL DEFAULT 'unknown';
      CREATE INDEX observations_event_type_occurred
        ON observations(event_type, occurred_at DESC);
      CREATE INDEX events_event_type_material
        ON events(event_type, last_material_update_at DESC);
    `,
  },
] as const;
