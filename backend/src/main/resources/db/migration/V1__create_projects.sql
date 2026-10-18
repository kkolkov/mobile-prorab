create table projects (
    project_id uuid primary key,
    status varchar(20) not null,
    completed_step integer not null,
    name varchar(100) not null,
    name_source varchar(20) not null,
    area_m2 numeric(10,1) not null,
    address varchar(250),
    current_state varchar(30),
    target_state varchar(30),
    kitchens_count integer,
    bathrooms_count integer,
    redevelopment boolean,
    finish_level varchar(30),
    estimate_status varchar(30) not null,
    budget_min_rub integer,
    budget_max_rub integer,
    duration_min_days integer,
    duration_max_days integer,
    updated_at timestamp with time zone not null,
    version bigint not null default 0
);
create index idx_projects_status on projects(status);
