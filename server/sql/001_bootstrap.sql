-- Minimal bootstrap for the dashboard to function.
-- Extensible later to full accounting schema.

create extension if not exists "pgcrypto";
create extension if not exists "btree_gist";

-- Auth (minimal)
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  email text null unique,
  password_hash text not null,
  role text not null default 'admin',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  token text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days')
);

create index if not exists idx_sessions_token on sessions (token);
create index if not exists idx_sessions_user_id on sessions (user_id);

-- Default credential for fresh setups
-- Login: InDev
-- Password: admin1234
insert into users (username, email, password_hash, role)
select
  'InDev',
  'indev@local',
  crypt('admin1234', gen_salt('bf')),
  'admin'
where not exists (select 1 from users limit 1);

-- Classes (minimal)
create table if not exists classes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_classes_status on classes (status);

create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  account_master_id uuid null,
  alternate_phone text null,
  aadhar text null,
  guardian_name text null,
  address text null,
  admission_type text null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- If the table existed from a previous bootstrap, ensure new columns exist.
alter table students add column if not exists account_master_id uuid;
alter table students add column if not exists alternate_phone text;
alter table students add column if not exists aadhar text;
alter table students add column if not exists guardian_name text;
alter table students add column if not exists address text;

create index if not exists idx_students_full_name on students (full_name);
create index if not exists idx_students_phone on students (phone);
create index if not exists idx_students_account_master_id on students (account_master_id);

-- Account master (minimal party/sub-ledger master)
create table if not exists account_master (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid null,
  name text not null,
  phone text null,
  email text null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_account_master_entity on account_master (entity_type, entity_id);
create unique index if not exists ux_account_master_entity on account_master (entity_type, entity_id)
  where entity_id is not null;

-- FK: students.account_master_id -> account_master.id (safe for re-runs)
do $$
begin
  alter table students
    add constraint fk_students_account_master
    foreign key (account_master_id)
    references account_master(id)
    on delete set null;
exception
  when duplicate_object or duplicate_table then null;
end $$;

-- Library seats (minimal)
create table if not exists library_seats (
  id uuid primary key default gen_random_uuid(),
  seat_number text not null unique,
  hall text null,
  hall_id uuid null,
  seat_type_id uuid null,
  status text not null default 'available',
  occupant_student_id uuid null references students(id) on delete set null,
  occupied_until timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- If the table existed from a previous bootstrap, ensure new columns exist.
alter table library_seats add column if not exists hall text;
alter table library_seats add column if not exists hall_id uuid;
alter table library_seats add column if not exists seat_type_id uuid;
alter table library_seats add column if not exists occupant_student_id uuid;
alter table library_seats add column if not exists occupied_until timestamptz;

create index if not exists idx_library_seats_status on library_seats (status);
create index if not exists idx_library_seats_hall_id on library_seats (hall_id);
create index if not exists idx_library_seats_seat_type_id on library_seats (seat_type_id);

-- Library shifts (minimal)
create table if not exists library_shifts (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  start_time time not null,
  end_time time not null,
  monthly_fee integer null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_library_shifts_start_time on library_shifts (start_time);

-- Library halls (minimal)
create table if not exists library_halls (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_library_halls_name on library_halls (name);

-- Seat types (e.g. General / Executive)
create table if not exists library_seat_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- FK: library_seats.seat_type_id -> library_seat_types.id (safe for re-runs)
do $$
begin
  alter table library_seats
    add constraint fk_library_seats_seat_type_id
    foreign key (seat_type_id)
    references library_seat_types(id)
    on delete set null;
exception
  when duplicate_object or duplicate_table then null;
end $$;

-- Shift pricing per seat type
create table if not exists library_shift_pricing (
  shift_id uuid not null references library_shifts(id) on delete cascade,
  seat_type_id uuid not null references library_seat_types(id) on delete cascade,
  monthly_fee integer not null check (monthly_fee >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (shift_id, seat_type_id)
);

create index if not exists idx_library_shift_pricing_shift_id on library_shift_pricing (shift_id);
create index if not exists idx_library_shift_pricing_seat_type_id on library_shift_pricing (seat_type_id);

-- Library memberships (admissions) — may optionally reserve a specific seat.
create table if not exists library_memberships (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  shift_id uuid not null references library_shifts(id) on delete restrict,
  seat_type_id uuid not null references library_seat_types(id) on delete restrict,
  start_date date not null default current_date,
  end_date date null,
  status text not null default 'active',
  reserved_seat_id uuid null references library_seats(id) on delete set null,
  reserved_fee integer null check (reserved_fee is null or reserved_fee >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_library_memberships_student_id on library_memberships (student_id);
create index if not exists idx_library_memberships_shift_id on library_memberships (shift_id);
create index if not exists idx_library_memberships_seat_type_id on library_memberships (seat_type_id);
create index if not exists idx_library_memberships_reserved_seat_id on library_memberships (reserved_seat_id);

-- Seat usage (check-in) with DB-level protection against overlapping usage.
create table if not exists library_checkins (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references library_memberships(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  shift_id uuid not null references library_shifts(id) on delete restrict,
  seat_id uuid not null references library_seats(id) on delete restrict,
  start_at timestamptz not null default now(),
  end_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_library_checkins_seat_id on library_checkins (seat_id);
create index if not exists idx_library_checkins_student_id on library_checkins (student_id);
create index if not exists idx_library_checkins_shift_id on library_checkins (shift_id);
create index if not exists idx_library_checkins_membership_id on library_checkins (membership_id);

-- Prevent two check-ins overlapping for the same seat.
do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'ex_library_checkins_seat_overlap'
  ) then
    null;
  else
    execute 'drop index if exists ex_library_checkins_seat_overlap';
    alter table library_checkins
      add constraint ex_library_checkins_seat_overlap
      exclude using gist (
        seat_id with =,
        tstzrange(start_at, end_at, '[)') with &&
      );
  end if;
exception
  when duplicate_object then null;
end $$;

-- Prevent a student from being checked into two seats at the same time.
do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'ex_library_checkins_student_overlap'
  ) then
    null;
  else
    execute 'drop index if exists ex_library_checkins_student_overlap';
    alter table library_checkins
      add constraint ex_library_checkins_student_overlap
      exclude using gist (
        student_id with =,
        tstzrange(start_at, end_at, '[)') with &&
      );
  end if;
exception
  when duplicate_object then null;
end $$;

-- FK: library_seats.hall_id -> library_halls.id (safe for re-runs)
do $$
begin
  alter table library_seats
    add constraint fk_library_seats_hall_id
    foreign key (hall_id)
    references library_halls(id)
    on delete set null;
exception
  when duplicate_object then null;
end $$;

-- Backfill from legacy text column `hall` into `library_halls` + `library_seats.hall_id`
insert into library_halls (name)
select distinct trim(hall)
from library_seats
where hall is not null and trim(hall) <> ''
on conflict (name) do nothing;

update library_seats s
set hall_id = h.id,
    updated_at = now()
from library_halls h
where s.hall_id is null
  and s.hall is not null
  and trim(s.hall) <> ''
  and trim(s.hall) = h.name;

-- Library lockers (minimal)
-- Assumptions:
-- - Lockers are numbered 1..total_lockers
-- - One active locker per student, and one active student per locker

create table if not exists library_locker_settings (
  id uuid primary key default gen_random_uuid(),
  total_lockers integer not null default 0 check (total_lockers >= 0),
  monthly_fee integer not null default 0 check (monthly_fee >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ensure a single settings row exists (safe for re-runs)
insert into library_locker_settings (total_lockers, monthly_fee)
select 0, 0
where not exists (select 1 from library_locker_settings);

create table if not exists library_locker_assignments (
  id uuid primary key default gen_random_uuid(),
  locker_number integer not null check (locker_number > 0),
  student_id uuid not null references students(id) on delete cascade,
  start_date date not null default current_date,
  end_date date null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table library_locker_assignments add column if not exists locker_number integer;
alter table library_locker_assignments add column if not exists student_id uuid;
alter table library_locker_assignments add column if not exists start_date date;
alter table library_locker_assignments add column if not exists end_date date;
alter table library_locker_assignments add column if not exists status text;

create index if not exists idx_library_locker_assignments_student_id on library_locker_assignments (student_id);
create index if not exists idx_library_locker_assignments_locker_number on library_locker_assignments (locker_number);
create index if not exists idx_library_locker_assignments_status on library_locker_assignments (status);

-- One active locker per student (end_date null) and one active student per locker.
create unique index if not exists ux_library_locker_assignments_active_student
  on library_locker_assignments (student_id)
  where status = 'active' and end_date is null;

create unique index if not exists ux_library_locker_assignments_active_locker
  on library_locker_assignments (locker_number)
  where status = 'active' and end_date is null;
