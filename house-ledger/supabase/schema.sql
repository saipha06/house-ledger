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
