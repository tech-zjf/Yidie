-- A deleted DB row and its pending file cleanup must commit together.
-- IDs are app-owned UUIDs; no arbitrary paths are stored or accepted here.
CREATE TABLE file_deletions (
  entry_id TEXT PRIMARY KEY NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX entries_by_import_order ON entries(sort_key DESC, id DESC);
UPDATE app_meta SET value='2' WHERE key='schema_version';
