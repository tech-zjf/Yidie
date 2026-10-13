ALTER TABLE processing_jobs ADD COLUMN pause_reason TEXT
  CHECK(pause_reason IN ('user','background','interrupted','storage'));
UPDATE processing_jobs SET pause_reason='interrupted' WHERE state='paused';
CREATE INDEX jobs_by_state ON processing_jobs(state, created_at, id);
UPDATE app_meta SET value='3' WHERE key='schema_version';
