-- Optional private facts supplied by the family. Never include this field in the public API.
alter table people add column if not exists admin_note text;
alter table people add constraint admin_note_length check (admin_note is null or length(admin_note) <= 2000);
