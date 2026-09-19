# Casa

A shared household app for a 4-person house: expenses with debt-simplification, a shared grocery list, and a weighted spin-the-wheel game picker. React + Vite PWA, styled with Tailwind CSS v4, animated with Framer Motion, backed by Supabase (Postgres + auth + realtime).

**No extra setup for this version** — push to GitHub as usual and Vercel installs the new dependencies (`tailwindcss`, `@tailwindcss/vite`, `framer-motion`) automatically from `package.json` on the next build. Nothing changes on the Supabase side.

## 0. Local development without Supabase

`npm install && npm run dev` works with no setup: if `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` aren't set, the app automatically runs against an in-memory, localStorage-backed mock (`src/lib/mockSupabase.js`) seeded with 4 members, sample expenses, groceries, and games. Sign in with any of `alex@casa.dev` / `sam@casa.dev` / `riley@casa.dev` / `priya@casa.dev`, password `demo1234` (or "New here" to create your own) — a "Mock data" badge shows top-right whenever this is active. Data persists across reloads in that browser; run `window.__casaMockReset()` in the console to wipe and reseed. Set the two env vars (or `VITE_USE_MOCK=true` to force mock even with real creds present) to switch backends.

## 1. Set up Supabase

**Already ran the schema before and just adding Groceries/Games, or the Wedding planner?** Skip to step 1a or 1b below and run only that snippet — no need to touch anything else.

1. Open your Supabase project → **SQL Editor** → New query.
2. Paste the contents of `supabase/schema.sql` and run it. This creates the `members`, `expenses`, `expense_splits`, `settlements`, `grocery_items`, and `games` tables with row-level security enabled. (Safe to re-run in full even if you ran an earlier version — every table uses `if not exists`.)

### 1a. Incremental update (Groceries + Games only)

If your `members`/`expenses`/`settlements` tables already exist and you just want the two new features, run this instead:

```sql
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

alter table grocery_items enable row level security;
alter table games enable row level security;

create policy "authenticated all grocery_items" on grocery_items
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "authenticated all games" on games
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

alter publication supabase_realtime add table grocery_items, games;
```

### 1b. Incremental update (Wedding planner only)

Adds a Wedding tab visible **only** to the two auth accounts listed in the policies below (currently `phani@gmail.com` and `anila1211@gmail.com` — edit the emails in every `create policy` statement before running if that's not right). Everyone else's authenticated requests against these tables return zero rows, enforced by Postgres — the frontend just hides the tab for them too, for UX.

Shape: high-level tasks (Venue, Catering, ...) hold subtasks; a subtask that costs money gets one or more vendor options, and approving one sets its quote as that subtask's cost (the database enforces at most one approved option per subtask). Misc items are standalone costs not tied to any task. `wedding_settings` holds a single shared row with the overall budget target.

```sql
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

create table if not exists wedding_settings (
  id boolean primary key default true check (id),
  budget_target numeric,
  updated_at timestamptz default now()
);

alter table wedding_tasks enable row level security;
alter table wedding_subtasks enable row level security;
alter table wedding_vendor_options enable row level security;
alter table wedding_misc_items enable row level security;
alter table wedding_settings enable row level security;

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

alter publication supabase_realtime add table wedding_tasks, wedding_subtasks, wedding_vendor_options, wedding_misc_items, wedding_settings;
```

3. Go to **Authentication → Providers → Email** and turn **OFF "Confirm email"**. This is the important one — with it off, creating an account signs you in immediately with no verification email, so you never hit Supabase's email rate limits.
4. (Site URL / Redirect URLs don't matter for this flow since there's no email link to redirect from — safe to leave defaults.)
5. Go to **Project Settings → API** and copy:
   - **Project URL**
   - **anon public** key

## 2. Configure locally (optional, for testing before deploy)

```bash
npm install
cp .env.example .env
# paste your Project URL and anon key into .env
npm run dev
```

Open the local URL, sign in with your email, check your inbox for the magic link.

## 3. Deploy (free, via Vercel)

1. Push this folder to a new GitHub repo.
2. Go to [vercel.com](https://vercel.com) → New Project → import the repo.
3. Vercel will detect Vite automatically. Before deploying, add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy. You'll get a URL like `house-ledger.vercel.app`.
5. Go back to Supabase → **Authentication → URL Configuration** and update **Site URL** and **Redirect URLs** to your real Vercel URL.

## 4. Everyone joins

1. Each housemate opens the Vercel URL, clicks **Create account**, picks any email (doesn't need to be real or verified) and a password of their choosing.
2. They're signed in immediately — no email confirmation step.
3. First time in, they'll be asked their name — this creates their row in the shared `members` table, linked to their login.
4. Next time, they use **Sign in** with the same email/password.
5. On iPhone: Share button → **Add to Home Screen**. It opens full-screen, no browser bar, like a real app.

**Note:** there's no self-service "forgot password" flow set up (that requires email sending again). If someone forgets their password, go to Supabase → **Authentication → Users**, find them, and reset it manually from there.

## How it works

- **Balances**: computed live from `expenses` + `expense_splits` + `settlements` — no stored balance to go stale.
- **Simplified settle-up**: a greedy min-cash-flow pass reduces however many debts exist down to the fewest payments needed.
- **Realtime**: any change one person makes (add expense, settle up, rename) pushes to everyone else's screen within a second or two, no refresh needed.
- **Security**: only signed-in users (your 4 emails) can read or write anything, enforced by Postgres row-level security — not just hidden by an obscure URL.

## Extending it later

The schema already has a `category` column on `expenses` and each split is its own row, so itemized/receipt splitting, spending-by-category charts, or recurring expenses can all be added without changing the core structure.
