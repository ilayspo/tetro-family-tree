-- Apply only to the dedicated Tetro Neon project.
-- Preserve every existing explicit life status, including deceased=true.
update people set deceased=false,updated_at=now() where deceased is null;
alter table people alter column deceased set default false;
alter table people alter column deceased set not null;
