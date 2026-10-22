CREATE TABLE stage_photos (
 id UUID PRIMARY KEY,
 project_id UUID NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
 image BYTEA NOT NULL
);
CREATE INDEX stage_photos_project ON stage_photos(project_id);
