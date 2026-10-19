ALTER TABLE projects ADD COLUMN rooms_count integer CHECK (rooms_count >= 1);
