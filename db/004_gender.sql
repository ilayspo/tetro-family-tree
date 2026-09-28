-- Optional administrative gender field. Unknown remains NULL until the manager supplies it.
alter table people add column if not exists gender text;
alter table people drop constraint if exists people_gender_check;
alter table people add constraint people_gender_check check (gender is null or gender in ('male','female'));
