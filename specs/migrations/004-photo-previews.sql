ALTER TABLE entries ADD COLUMN photo_preview_path TEXT;
ALTER TABLE entries ADD COLUMN photo_width INTEGER CHECK(photo_width > 0);
ALTER TABLE entries ADD COLUMN photo_height INTEGER CHECK(photo_height > 0);
UPDATE app_meta SET value='4' WHERE key='schema_version';
