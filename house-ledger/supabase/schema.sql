-- House Ledger schema
-- Run this once in Supabase SQL Editor (Project > SQL Editor > New query)

create extension if not exists "pgcrypto";

create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete cascade,
  name text not null,
  email text,
  created_at timestamptz default now()
);

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  amount numeric not null check (amount > 0),
  paid_by uuid not null references members(id),
  split_type text not null default 'equal',
  category text default 'general',
  date timestamptz default now(),
  created_at timestamptz default now()
);

create table if not exists expense_splits (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references expenses(id) on delete cascade,
  member_id uuid not null references members(id),
  share_amount numeric not null
);

create table if not exists settlements (
  id uuid primary key default gen_random_uuid(),
  from_member uuid not null references members(id),
  to_member uuid not null references members(id),
  amount numeric not null check (amount > 0),
  date timestamptz default now()
);

-- Groceries and Games (added later)
create table if not exists grocery_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  added_by uuid references members(id),
  checked boolean not null default false,
  created_at timestamptz default now()
);

create table if not exists games (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  weight numeric not null default 1 check (weight >= 0),
  created_at timestamptz default now()
);

create index if not exists idx_splits_expense on expense_splits(expense_id);
create index if not exists idx_splits_member on expense_splits(member_id);
create index if not exists idx_expenses_date on expenses(date desc);

-- Row Level Security: any logged-in household member (there are only 4 of you,
-- and everyone shares the ledger) can read/write everything.
alter table members enable row level security;
alter table expenses enable row level security;
alter table expense_splits enable row level security;
alter table settlements enable row level security;
alter table grocery_items enable row level security;
alter table games enable row level security;

create policy "authenticated all members" on members
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "authenticated all expenses" on expenses
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "authenticated all expense_splits" on expense_splits
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "authenticated all settlements" on settlements
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "authenticated all grocery_items" on grocery_items
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "authenticated all games" on games
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Enable realtime updates on these tables (safe to run even if already enabled)
alter publication supabase_realtime add table members, expenses, expense_splits, settlements, grocery_items, games;

-- Wedding planner (added later) — visible to every table row the same way as
-- the rest of the app, but RLS below restricts read/write to Phani + Anila's
-- auth accounts specifically, by email. Unlike the tables above, this is not
-- "any authenticated housemate" — the other two housemates' authenticated
-- queries against these tables return zero rows, enforced in Postgres, not
-- just hidden in the UI.
--
-- Shape: high-level tasks (Venue, Catering, ...) each hold subtasks; a
-- subtask that costs money gets one or more vendor options, and approving
-- one sets its quote as that subtask's cost. Misc items are standalone costs
-- not tied to any task. Total spend = sum of approved option quotes + misc.
create table if not exists wedding_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  created_at timestamptz default now()
);

create table if not exists wedding_subtasks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references wedding_tasks(id) on delete cascade,
  title text not null,
  link text,
  comments text,
  due_date date,
  done boolean not null default false,
  created_at timestamptz default now()
);

create table if not exists wedding_vendor_options (
  id uuid primary key default gen_random_uuid(),
  subtask_id uuid not null references wedding_subtasks(id) on delete cascade,
  vendor_name text not null,
  quote_amount numeric,
  link text,
  notes text,
  approved boolean not null default false,
  created_at timestamptz default now()
);

-- Enforces "at most one approved option per subtask" in the database itself —
-- not just a UI convention. Approving a new option must first un-approve the
-- old one, or this insert/update fails.
create unique index if not exists idx_one_approved_option_per_subtask
  on wedding_vendor_options(subtask_id) where approved;

create table if not exists wedding_misc_items (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  amount numeric not null,
  link text,
  notes text,
  created_at timestamptz default now()
);

-- Single shared row holding the overall budget target, so both planners see
-- the same "remaining" figure rather than each having their own local number.
create table if not exists wedding_settings (
  id boolean primary key default true check (id),
  budget_target numeric,
  wedding_date date,
  updated_at timestamptz default now()
);
-- wedding_date was added after this table already existed in production —
-- kept as an explicit idempotent alter so this file stays re-runnable.
alter table wedding_settings add column if not exists wedding_date date;

-- Wedding-day schedule — deliberately a separate table from wedding_tasks,
-- which tracks budget/vendor decisions (Venue, Catering, ...), not events.
-- An event has a date/time/place; it never has a cost or vendor options.
create table if not exists wedding_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_date date,
  start_time time,
  end_time time,
  location text,
  notes text,
  created_at timestamptz default now()
);

create table if not exists wedding_guests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  side text, -- 'bride' | 'groom' | 'shared'
  rsvp text not null default 'pending', -- 'pending' | 'confirmed' | 'declined'
  plus_one boolean not null default false,
  group_name text,
  contact text,
  notes text,
  created_at timestamptz default now()
);

alter table wedding_tasks enable row level security;
alter table wedding_subtasks enable row level security;
alter table wedding_vendor_options enable row level security;
alter table wedding_misc_items enable row level security;
alter table wedding_settings enable row level security;
alter table wedding_events enable row level security;
alter table wedding_guests enable row level security;

create policy "wedding planners only" on wedding_tasks
  for all using (lower(auth.jwt() ->> 'email') in ('phani@gmail.com', 'anila1211@gmail.com'))
  with check (lower(auth.jwt() ->> 'email') in ('phani@gmail.com', 'anila1211@gmail.com'));

create policy "wedding planners only" on wedding_subtasks
  for all using (lower(auth.jwt() ->> 'email') in ('phani@gmail.com', 'anila1211@gmail.com'))
  with check (lower(auth.jwt() ->> 'email') in ('phani@gmail.com', 'anila1211@gmail.com'));

create policy "wedding planners only" on wedding_vendor_options
  for all using (lower(auth.jwt() ->> 'email') in ('phani@gmail.com', 'anila1211@gmail.com'))
  with check (lower(auth.jwt() ->> 'email') in ('phani@gmail.com', 'anila1211@gmail.com'));

create policy "wedding planners only" on wedding_misc_items
  for all using (lower(auth.jwt() ->> 'email') in ('phani@gmail.com', 'anila1211@gmail.com'))
  with check (lower(auth.jwt() ->> 'email') in ('phani@gmail.com', 'anila1211@gmail.com'));

create policy "wedding planners only" on wedding_settings
  for all using (lower(auth.jwt() ->> 'email') in ('phani@gmail.com', 'anila1211@gmail.com'))
  with check (lower(auth.jwt() ->> 'email') in ('phani@gmail.com', 'anila1211@gmail.com'));

create policy "wedding planners only" on wedding_events
  for all using (lower(auth.jwt() ->> 'email') in ('phani@gmail.com', 'anila1211@gmail.com'))
  with check (lower(auth.jwt() ->> 'email') in ('phani@gmail.com', 'anila1211@gmail.com'));

create policy "wedding planners only" on wedding_guests
  for all using (lower(auth.jwt() ->> 'email') in ('phani@gmail.com', 'anila1211@gmail.com'))
  with check (lower(auth.jwt() ->> 'email') in ('phani@gmail.com', 'anila1211@gmail.com'));

alter publication supabase_realtime add table wedding_tasks, wedding_subtasks, wedding_vendor_options, wedding_misc_items, wedding_settings;
alter publication supabase_realtime add table wedding_events, wedding_guests;

-- Splitwise integration (added later) — each housemate can independently
-- connect their own Splitwise account to send individual Casa expenses
-- over. One row per connected member; RLS restricts everyone to their own
-- row only (both read and write) — nobody can see or use another
-- housemate's Splitwise connection. The access_token here is only ever
-- read by Edge Functions using the service-role key; it's fine for the
-- owning member's own client to read their own row (it's their own
-- account), just not anyone else's.
create table if not exists splitwise_connections (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade unique,
  access_token text not null,
  splitwise_user_id bigint,
  splitwise_user_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table splitwise_connections enable row level security;

create policy "own connection only" on splitwise_connections
  for all using (member_id in (select id from members where auth_user_id = auth.uid()))
  with check (member_id in (select id from members where auth_user_id = auth.uid()));
