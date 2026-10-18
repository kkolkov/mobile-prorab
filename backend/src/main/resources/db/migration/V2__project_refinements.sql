create table project_refinements (
    project_id uuid primary key references projects(project_id),
    version bigint not null default 0,
    revision bigint not null default 0,
    input_json text not null,
    active_estimate_json text,
    candidate_json text,
    calculation_status varchar(30) not null default 'not_requested',
    calculation_id uuid,
    calculation_project_version bigint not null default 0
);
