-- Run on a fresh, dedicated Neon project. Never run against the Rubin database.
create extension if not exists pgcrypto;
create table if not exists people (
 id text primary key, name_he text not null check (length(trim(name_he)) between 2 and 180),
 name_ru text, birth_date text, death_date text, deceased boolean,
 photo_key text, is_visible boolean not null default false,
 updated_at timestamptz not null default now(),
 constraint birth_format check (birth_date is null or birth_date ~ '^[0-9]{4}(-[0-9]{2}(-[0-9]{2})?)?$'),
 constraint death_format check (death_date is null or death_date ~ '^[0-9]{4}(-[0-9]{2}(-[0-9]{2})?)?$')
);
create table if not exists family_units (
 id uuid primary key default gen_random_uuid(),
 relationship_status text not null default 'unknown' check (relationship_status in ('unknown','married','partnered','divorced','separated','former')),
 is_current boolean,
 updated_at timestamptz not null default now()
);
create table if not exists family_members (
 unit_id uuid not null references family_units(id) on delete cascade,
 person_id text not null references people(id) on delete cascade,
 role text not null check (role in ('parent','child')),
 primary key(unit_id,person_id,role)
);
create unique index if not exists one_origin_per_child on family_members(person_id) where role='child';
create index if not exists family_members_person on family_members(person_id);
create table if not exists tree_admins(user_id text primary key, created_at timestamptz not null default now());
-- Only server functions with DATABASE_URL access these tables. No Data API or public SQL grants.
revoke all on all tables in schema public from public;
insert into people(id,name_he,is_visible) values
 ('tetro-tsipora','ציפורה טטרואשוילי',true),('tetro-michael','מיכאל טטרואשוילי',true)
on conflict (id) do nothing;
insert into family_units(id,relationship_status) values ('00000000-0000-4000-8000-000000000001','married') on conflict do nothing;
insert into family_members(unit_id,person_id,role) values
 ('00000000-0000-4000-8000-000000000001','tetro-tsipora','parent'),
 ('00000000-0000-4000-8000-000000000001','tetro-michael','parent') on conflict do nothing;
