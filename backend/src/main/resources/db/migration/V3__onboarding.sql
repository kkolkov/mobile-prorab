create table access_allocation (id integer primary key, next_number bigint not null);
insert into access_allocation values (1, 0);
create table user_access (
 user_id uuid primary key, user_group varchar(1) not null, assignment_source varchar(30) not null,
 first_project_id uuid not null, assigned_at timestamp with time zone not null,
 offer_shown boolean not null default false,
 questionnaire_shown boolean not null default false, questionnaire_version varchar(20),
 first_renovation boolean, renovation_manager varchar(40), renovation_stage varchar(30),
 questionnaire_completed_at timestamp with time zone,
 freemium_started_at timestamp with time zone, freemium_ends_at timestamp with time zone,
 subscription_status varchar(20) not null default 'not_connected', version bigint not null default 0
);
alter table projects add column owner_id uuid;
create index idx_projects_owner on projects(owner_id);
create table onboarding_events (
 id uuid primary key, user_id uuid not null, project_id uuid, event_name varchar(80) not null,
 occurred_at timestamp with time zone not null, details text not null
);
