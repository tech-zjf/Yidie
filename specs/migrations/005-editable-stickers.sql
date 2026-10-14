ALTER TABLE entries ADD COLUMN cutout_path TEXT;
ALTER TABLE entries ADD COLUMN border_color TEXT NOT NULL DEFAULT '#FFFFFF'
  CHECK(border_color IN ('#FFFFFF','#242424','#0786A8'));
ALTER TABLE entries ADD COLUMN style_revision INTEGER NOT NULL DEFAULT 0
  CHECK(style_revision >= 0);
UPDATE app_meta SET value='5' WHERE key='schema_version';
