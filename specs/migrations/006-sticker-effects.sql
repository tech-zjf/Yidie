ALTER TABLE entries ADD COLUMN sticker_effect TEXT NOT NULL DEFAULT 'outline'
  CHECK(sticker_effect IN ('original','outline','comic','dimensional','shimmer'));
UPDATE app_meta SET value='6' WHERE key='schema_version';
