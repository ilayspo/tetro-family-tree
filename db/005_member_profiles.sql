-- Personal profile accounts and introductions. Apply after 004_gender.sql.
-- Authentication data and email mappings remain private and are never exposed by /api/tree.
alter table people add column if not exists about_me text;
alter table people add column if not exists hobbies text;
alter table people add column if not exists workplace text;
alter table people add column if not exists favorite_food text;
alter table people add column if not exists interesting_story text;

create table if not exists site_owner (
 singleton boolean primary key default true check(singleton=true),
 user_id text not null unique,
 created_at timestamptz not null default now()
);
insert into site_owner(singleton,user_id)
select true,user_id from tree_admins order by created_at limit 1
on conflict(singleton) do nothing;

create table if not exists profile_accounts (
 person_id text primary key references people(id) on delete cascade,
 user_id text not null unique,
 email text not null,
 claimed_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint profile_accounts_email_normalized check (email=lower(trim(email)))
);
create unique index if not exists profile_accounts_email_unique on profile_accounts(lower(email));

create table if not exists profile_invitations (
 id uuid primary key default gen_random_uuid(),
 person_id text not null references people(id) on delete cascade,
 email text not null,
 token_hash text not null unique,
 expires_at timestamptz not null,
 used_at timestamptz,
 revoked_at timestamptz,
 created_by text not null,
 created_at timestamptz not null default now(),
 constraint profile_invitations_email_normalized check (email=lower(trim(email)))
);
create index if not exists profile_invitations_active on profile_invitations(person_id,expires_at) where used_at is null and revoked_at is null;

create table if not exists profile_editor_grants (
 editor_person_id text not null references people(id) on delete cascade,
 target_person_id text not null references people(id) on delete cascade,
 granted_by text not null,
 created_at timestamptz not null default now(),
 primary key(editor_person_id,target_person_id),
 constraint profile_editor_grants_not_self check(editor_person_id<>target_person_id)
);

create table if not exists profile_audit_log (
 id bigserial primary key,
 target_person_id text references people(id) on delete set null,
 actor_user_id text not null,
 actor_person_id text references people(id) on delete set null,
 action text not null,
 changes jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
create index if not exists profile_audit_target_time on profile_audit_log(target_person_id,created_at desc);

create table if not exists notification_outbox (
 id bigserial primary key,
 recipient text not null,
 subject text not null,
 text_body text not null,
 html_body text not null,
 status text not null default 'pending' check(status in ('pending','sent','failed')),
 attempts integer not null default 0,
 last_error text,
 created_at timestamptz not null default now(),
 sent_at timestamptz
);

revoke all on site_owner,profile_accounts,profile_invitations,profile_editor_grants,profile_audit_log,notification_outbox from public;
