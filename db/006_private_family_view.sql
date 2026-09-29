-- Display-only household grouping and shared family-view access.
-- display_partner_id never creates a parent/child relationship. The server validates
-- that it points to an existing partner of the single parent before saving it.
alter table family_units
  add column if not exists display_partner_id text references people(id) on delete set null;

create table if not exists family_settings (
  singleton boolean primary key default true check (singleton=true),
  access_code_hash text,
  access_version integer not null default 1,
  access_code_updated_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table family_settings add column if not exists access_version integer not null default 1;

insert into family_settings(singleton) values(true)
on conflict(singleton) do nothing;

revoke all on family_settings from public;
