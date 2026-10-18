create table accounts (
 user_id uuid primary key, login varchar(40) not null unique,
 password_hash varchar(255) not null, created_at timestamp with time zone not null
);
create table auth_sessions (
 token_hash varchar(64) primary key, user_id uuid not null references accounts(user_id),
 expires_at timestamp with time zone not null
);
create index idx_auth_sessions_user on auth_sessions(user_id);
