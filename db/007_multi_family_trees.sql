-- Multi-tree foundation. Apply first on a Neon branch cloned from production.
-- This migration is additive: the legacy family_settings row is retained for rollback.
begin;

create table if not exists trees (
  id text primary key,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name_he text not null check (length(trim(name_he)) between 2 and 120),
  title_he text not null check (length(trim(title_he)) between 2 and 180),
  intro_he text,
  brand_mark text not null default '✦',
  accent_color text not null default '#173d53' check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into trees(id,slug,name_he,title_he,intro_he)
values
  ('tetro','tetro','משפחת טטרו','עץ המשפחה של משפחת טטרו','מתחילים מציפורה ומיכאל ומגלים את המשפחה דור אחר דור.'),
  ('pakhmanov','pakhmanov','משפחת פחמנוב','עץ המשפחה של משפחת פחמנוב',null)
on conflict(id) do nothing;

alter table people add column if not exists tree_id text references trees(id);
alter table family_units add column if not exists tree_id text references trees(id);
alter table family_members add column if not exists tree_id text references trees(id);
alter table profile_accounts add column if not exists tree_id text references trees(id);
alter table profile_invitations add column if not exists tree_id text references trees(id);
alter table profile_editor_grants add column if not exists tree_id text references trees(id);
alter table profile_audit_log add column if not exists tree_id text references trees(id);
alter table notification_outbox add column if not exists tree_id text references trees(id);

update people set tree_id='tetro' where tree_id is null;
update family_units set tree_id='tetro' where tree_id is null;
update family_members set tree_id='tetro' where tree_id is null;
update profile_accounts set tree_id='tetro' where tree_id is null;
update profile_invitations set tree_id='tetro' where tree_id is null;
update profile_editor_grants set tree_id='tetro' where tree_id is null;
update profile_audit_log set tree_id='tetro' where tree_id is null;
update notification_outbox set tree_id='tetro' where tree_id is null;

alter table people alter column tree_id set not null;
alter table family_units alter column tree_id set not null;
alter table family_members alter column tree_id set not null;
alter table profile_accounts alter column tree_id set not null;
alter table profile_invitations alter column tree_id set not null;
alter table profile_editor_grants alter column tree_id set not null;
alter table profile_audit_log alter column tree_id set not null;
alter table notification_outbox alter column tree_id set not null;

create unique index if not exists people_tree_id_id_key on people(tree_id,id);
create unique index if not exists family_units_tree_id_id_key on family_units(tree_id,id);
create index if not exists people_tree_name on people(tree_id,name_he);
create index if not exists family_units_tree on family_units(tree_id);
create index if not exists family_members_tree_person on family_members(tree_id,person_id);

alter table family_members drop constraint if exists family_members_tree_unit_fkey;
alter table family_members add constraint family_members_tree_unit_fkey foreign key(tree_id,unit_id) references family_units(tree_id,id) on delete cascade;
alter table family_members drop constraint if exists family_members_tree_person_fkey;
alter table family_members add constraint family_members_tree_person_fkey foreign key(tree_id,person_id) references people(tree_id,id) on delete cascade;
alter table family_units drop constraint if exists family_units_tree_display_partner_fkey;
alter table family_units add constraint family_units_tree_display_partner_fkey foreign key(tree_id,display_partner_id) references people(tree_id,id) on delete set null (display_partner_id);

drop index if exists one_origin_per_child;
create unique index one_origin_per_child on family_members(tree_id,person_id) where role='child';

drop index if exists profile_accounts_email_unique;
alter table profile_accounts drop constraint if exists profile_accounts_user_id_key;
create unique index if not exists profile_accounts_tree_user_key on profile_accounts(tree_id,user_id);
create unique index if not exists profile_accounts_tree_email_key on profile_accounts(tree_id,lower(email));
create index if not exists profile_accounts_user on profile_accounts(user_id);

drop index if exists profile_invitations_active;
create index profile_invitations_active on profile_invitations(tree_id,person_id,expires_at) where used_at is null and revoked_at is null;
drop index if exists profile_audit_target_time;
create index profile_audit_target_time on profile_audit_log(tree_id,target_person_id,created_at desc);
create index if not exists notification_outbox_tree_time on notification_outbox(tree_id,created_at desc);

create table if not exists tree_roots (
  tree_id text not null references trees(id) on delete cascade,
  person_id text not null,
  position smallint not null default 0,
  primary key(tree_id,person_id),
  unique(tree_id,position),
  foreign key(tree_id,person_id) references people(tree_id,id) on delete cascade
);
insert into tree_roots(tree_id,person_id,position) values
  ('tetro','tetro-tsipora',0),('tetro','tetro-michael',1)
on conflict do nothing;

create table if not exists tree_settings (
  tree_id text primary key references trees(id) on delete cascade,
  access_code_hash text,
  access_version integer not null default 1,
  access_code_updated_at timestamptz,
  updated_at timestamptz not null default now()
);
insert into tree_settings(tree_id,access_code_hash,access_version,access_code_updated_at,updated_at)
select 'tetro',access_code_hash,access_version,access_code_updated_at,updated_at from family_settings where singleton=true
on conflict(tree_id) do nothing;
insert into tree_settings(tree_id) values('pakhmanov') on conflict(tree_id) do nothing;

revoke all on trees,tree_roots,tree_settings from public;
commit;
