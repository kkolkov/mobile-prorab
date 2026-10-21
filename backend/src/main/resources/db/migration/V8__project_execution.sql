CREATE TABLE project_executions (
 project_id UUID PRIMARY KEY REFERENCES projects(project_id),
 version BIGINT NOT NULL DEFAULT 0,
 state_json TEXT NOT NULL
);
