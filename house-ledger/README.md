# The House Ledger

A shared expense tracker for a 4-person household. React + Vite PWA, backed by Supabase (Postgres + auth + realtime).

## 1. Set up Supabase

1. Open your Supabase project → **SQL Editor** → New query.
2. Paste the contents of `supabase/schema.sql` and run it. This creates the `members`, `expenses`, `expense_splits`, and `settlements` tables with row-level security enabled.
3. Go to **Authentication → Providers** and make sure **Email** is enabled. Turn **off** "Confirm email" if you want the magic link to work with zero friction (optional — it works either way).
4. Go to **Authentication → URL Configuration** and set:
   - **Site URL**: your deployed URL (you'll get this in step 3 below — you can come back and update it after deploying)
   - **Redirect URLs**: add both `http://localhost:5173` (for local testing) and your deployed URL
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

1. Each housemate opens the Vercel URL, enters their email, and taps the magic link sent to their inbox.
2. First time in, they'll be asked their name — this creates their row in the shared `members` table, linked to their login.
3. On iPhone: Share button → **Add to Home Screen**. It opens full-screen, no browser bar, like a real app.

## How it works

- **Balances**: computed live from `expenses` + `expense_splits` + `settlements` — no stored balance to go stale.
- **Simplified settle-up**: a greedy min-cash-flow pass reduces however many debts exist down to the fewest payments needed.
- **Realtime**: any change one person makes (add expense, settle up, rename) pushes to everyone else's screen within a second or two, no refresh needed.
- **Security**: only signed-in users (your 4 emails) can read or write anything, enforced by Postgres row-level security — not just hidden by an obscure URL.

## Extending it later

The schema already has a `category` column on `expenses` and each split is its own row, so itemized/receipt splitting, spending-by-category charts, or recurring expenses can all be added without changing the core structure.
