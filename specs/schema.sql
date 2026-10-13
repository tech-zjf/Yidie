-- Design contract v1. Run through an application migration; not a shipped DB.
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

CREATE TABLE days (
  record_date TEXT PRIMARY KEY NOT NULL
    CHECK(record_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  cover_entry_id TEXT REFERENCES entries(id) DEFERRABLE INITIALLY DEFERRED
);

CREATE TABLE entries (
  id TEXT PRIMARY KEY NOT NULL,
  record_date TEXT REFERENCES days(record_date),
  date_source TEXT NOT NULL CHECK(date_source IN ('user','exif','photo_library','unknown')),
  source_datetime TEXT,
  source_offset_minutes INTEGER CHECK(source_offset_minutes BETWEEN -840 AND 840),
  suggested_timezone TEXT,
  source_asset_id TEXT,
  content_hash TEXT CHECK(content_hash IS NULL OR length(content_hash)=64),
  original_path TEXT NOT NULL,
  sticker_path TEXT,
  thumbnail_path TEXT,
  sticker_width INTEGER CHECK(sticker_width > 0),
  sticker_height INTEGER CHECK(sticker_height > 0),
  display_mode TEXT NOT NULL DEFAULT 'cutout' CHECK(display_mode IN ('cutout','photo')),
  processing_state TEXT NOT NULL DEFAULT 'queued'
    CHECK(processing_state IN ('queued','running','ready','failed','paused')),
  error_code TEXT,
  rotation_deg REAL NOT NULL DEFAULT 0 CHECK(rotation_deg BETWEEN -20 AND 20),
  border_width REAL NOT NULL DEFAULT 4 CHECK(border_width BETWEEN 0 AND 8),
  layout_seed INTEGER NOT NULL,
  layout_version INTEGER NOT NULL DEFAULT 1 CHECK(layout_version > 0),
  sort_key INTEGER NOT NULL,
  revision INTEGER NOT NULL DEFAULT 0 CHECK(revision >= 0),
  imported_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK(record_date IS NULL OR date_source <> 'unknown'),
  CHECK(processing_state <> 'ready' OR display_mode='photo' OR sticker_path IS NOT NULL)
);

CREATE INDEX entries_by_day ON entries(record_date, sort_key, id);
CREATE INDEX entries_by_hash ON entries(content_hash);
CREATE INDEX entries_by_asset ON entries(source_asset_id);

CREATE TABLE processing_jobs (
  id TEXT PRIMARY KEY NOT NULL,
  entry_id TEXT NOT NULL UNIQUE REFERENCES entries(id) ON DELETE CASCADE,
  state TEXT NOT NULL CHECK(state IN ('queued','running','ready','failed','paused')),
  expected_revision INTEGER NOT NULL CHECK(expected_revision >= 0),
  attempt INTEGER NOT NULL DEFAULT 0 CHECK(attempt >= 0),
  error_code TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE app_meta (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
INSERT INTO app_meta(key,value) VALUES ('schema_version','1');

CREATE TRIGGER validate_cover_insert BEFORE INSERT ON days
WHEN NEW.cover_entry_id IS NOT NULL
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM entries WHERE id=NEW.cover_entry_id AND record_date=NEW.record_date
  ) THEN RAISE(ABORT,'cover must belong to this day') END;
END;

CREATE TRIGGER validate_cover_update BEFORE UPDATE OF cover_entry_id ON days
WHEN NEW.cover_entry_id IS NOT NULL
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM entries WHERE id=NEW.cover_entry_id AND record_date=NEW.record_date
  ) THEN RAISE(ABORT,'cover must belong to this day') END;
END;

CREATE TRIGGER day_key_is_immutable BEFORE UPDATE OF record_date ON days
WHEN OLD.record_date IS NOT NEW.record_date
BEGIN
  SELECT RAISE(ABORT,'move entries instead of changing a day key');
END;

CREATE TRIGGER clear_cover_before_delete BEFORE DELETE ON entries
BEGIN
  UPDATE days SET cover_entry_id=NULL WHERE cover_entry_id=OLD.id;
END;

CREATE TRIGGER clear_cover_before_move BEFORE UPDATE OF record_date ON entries
WHEN OLD.record_date IS NOT NEW.record_date
BEGIN
  UPDATE days SET cover_entry_id=NULL WHERE cover_entry_id=OLD.id;
END;

-- Domain validation must reject impossible dates (e.g. 2026-02-29), invalid
-- paths and unsafe file types. SQL GLOB only validates the textual shape.
-- Keep processing_jobs.state and entries.processing_state in one transaction.
-- NULL cover means use the first entry in deterministic ordering.
