# Casa

A shared household app for a 4-person house: expenses with debt-simplification, a shared grocery list, and a weighted spin-the-wheel game picker. React + Vite PWA, styled with Tailwind CSS v4, animated with Framer Motion, backed by Supabase (Postgres + auth + realtime).

**No extra setup for this version** — push to GitHub as usual and Vercel installs the new dependencies (`tailwindcss`, `@tailwindcss/vite`, `framer-motion`) automatically from `package.json` on the next build. Nothing changes on the Supabase side.


## 1. Set up Supabase

**Already ran the schema before and just adding Groceries/Games?** Skip to step 1a below and run only that snippet — no need to touch anything else.

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
