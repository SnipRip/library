-- Minimal bootstrap for the dashboard to function.
-- Extensible later to full accounting schema.

create extension if not exists "pgcrypto";

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

create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
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
alter table students add column if not exists alternate_phone text;
alter table students add column if not exists aadhar text;
alter table students add column if not exists guardian_name text;
alter table students add column if not exists address text;

create index if not exists idx_students_full_name on students (full_name);
create index if not exists idx_students_phone on students (phone);
