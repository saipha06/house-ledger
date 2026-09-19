// In-memory (localStorage-backed) stand-in for the Supabase client, covering
// exactly the surface App.jsx and the tab components call: auth.getSession /
// onAuthStateChange / signInWithPassword / signUp / signOut, from(table)
// select/insert/update/delete/eq/order/single/maybeSingle, and a no-op
// channel/removeChannel pair (safe because every mutation already calls
// refresh() itself — nothing here depends on realtime to see its own writes).
//
// Lets `npm run dev` produce a fully working app with zero Supabase project,
// so UI/logic changes can be iterated on and seen immediately. Real Supabase
// is used automatically once VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are set.

const STORAGE_KEY = "casa-mock-db-v1";
const SESSION_KEY = "casa-mock-session-v1";
export const DEMO_PASSWORD = "demo1234";
export const DEMO_EMAILS = ["alex@casa.dev", "sam@casa.dev", "riley@casa.dev", "priya@casa.dev"];

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);
const now = () => new Date().toISOString();
const networkDelay = () => new Promise((resolve) => setTimeout(resolve, 15 + Math.random() * 20));

function seedDb() {
  const users = DEMO_EMAILS.map((email) => ({ id: uid(), email, password: DEMO_PASSWORD }));
  const names = ["Alex", "Sam", "Riley", "Priya"];
  const members = users.map((u, i) => ({
    id: uid(),
    auth_user_id: u.id,
    name: names[i],
    email: u.email,
    created_at: now(),
  }));
  const [alex, sam, riley, priya] = members;

  const expenses = [
    { id: uid(), description: "Costco groceries", amount: 86.4, paid_by: alex.id, split_type: "equal", category: "general", date: now(), created_at: now() },
    { id: uid(), description: "Internet bill", amount: 60, paid_by: sam.id, split_type: "equal", category: "general", date: now(), created_at: now() },
    { id: uid(), description: "Pizza night", amount: 34.5, paid_by: riley.id, split_type: "custom", category: "general", date: now(), created_at: now() },
  ];
  const expense_splits = [
    ...members.map((m) => ({ id: uid(), expense_id: expenses[0].id, member_id: m.id, share_amount: 21.6 })),
    ...members.map((m) => ({ id: uid(), expense_id: expenses[1].id, member_id: m.id, share_amount: 15 })),
    { id: uid(), expense_id: expenses[2].id, member_id: riley.id, share_amount: 11.5 },
    { id: uid(), expense_id: expenses[2].id, member_id: priya.id, share_amount: 11.5 },
    { id: uid(), expense_id: expenses[2].id, member_id: alex.id, share_amount: 11.5 },
  ];

  const settlements = [{ id: uid(), from_member: priya.id, to_member: alex.id, amount: 10, date: now() }];

  const grocery_items = [
    { id: uid(), name: "Milk", added_by: sam.id, checked: false, created_at: now() },
    { id: uid(), name: "Paper towels", added_by: priya.id, checked: false, created_at: now() },
    { id: uid(), name: "Eggs", added_by: alex.id, checked: true, created_at: now() },
  ];

  const games = [
    { id: uid(), name: "Catan", weight: 2, created_at: now() },
    { id: uid(), name: "Codenames", weight: 1, created_at: now() },
    { id: uid(), name: "Splendor", weight: 1.5, created_at: now() },
  ];

  const venueTask = { id: uid(), title: "Venue", created_at: now() };
  const cateringTask = { id: uid(), title: "Catering", created_at: now() };
  const photoTask = { id: uid(), title: "Photography", created_at: now() };
  const wedding_tasks = [venueTask, cateringTask, photoTask];

  const bookVenue = { id: uid(), task_id: venueTask.id, title: "Book venue", link: "", comments: "Need the space held by March.", due_date: "2026-03-01", done: false, created_at: now() };
  const siteVisit = { id: uid(), task_id: venueTask.id, title: "Site visit", link: "", comments: "", due_date: "2026-01-15", done: true, created_at: now() };
  const chooseCaterer = { id: uid(), task_id: cateringTask.id, title: "Choose caterer", link: "", comments: "Ask both about vegetarian options.", due_date: "2026-04-01", done: false, created_at: now() };
  const bookPhotographer = { id: uid(), task_id: photoTask.id, title: "Book photographer", link: "", comments: "", due_date: "2026-02-20", done: false, created_at: now() };
  const wedding_subtasks = [bookVenue, siteVisit, chooseCaterer, bookPhotographer];

  const wedding_vendor_options = [
    { id: uid(), subtask_id: bookVenue.id, vendor_name: "Golden Oak Venue", quote_amount: 3000, link: "goldenoak.example", notes: "Includes tables & chairs", approved: true, created_at: now() },
    { id: uid(), subtask_id: bookVenue.id, vendor_name: "Sunset Hall", quote_amount: 2500, link: "sunsethall.example", notes: "", approved: false, created_at: now() },
    { id: uid(), subtask_id: bookVenue.id, vendor_name: "Garden Views", quote_amount: 4200, link: "", notes: "Outdoor only, no rain plan", approved: false, created_at: now() },
    { id: uid(), subtask_id: chooseCaterer.id, vendor_name: "Spice Route Catering", quote_amount: 1800, link: "", notes: "Per-plate, 80 guests", approved: false, created_at: now() },
    { id: uid(), subtask_id: chooseCaterer.id, vendor_name: "Tandoor & Table", quote_amount: 2100, link: "", notes: "Includes dessert station", approved: false, created_at: now() },
    { id: uid(), subtask_id: bookPhotographer.id, vendor_name: "Jane Photo Studio", quote_amount: 2200, link: "", notes: "8hr coverage + album", approved: true, created_at: now() },
  ];

  const wedding_misc_items = [
    { id: uid(), description: "Marriage license", amount: 150, link: "", notes: "", created_at: now() },
    { id: uid(), description: "Thank-you cards", amount: 80, link: "", notes: "", created_at: now() },
  ];

  const wedding_settings = [{ id: true, budget_target: 10000, updated_at: now() }];

  return {
    users, members, expenses, expense_splits, settlements, grocery_items, games,
    wedding_tasks, wedding_subtasks, wedding_vendor_options, wedding_misc_items, wedding_settings,
  };
}

function loadDb() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* fall through to reseed */
  }
  const fresh = seedDb();
  persist(fresh);
  return fresh;
}

function persist(db) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    /* dev-only convenience; ignore quota/availability errors */
  }
}

class QueryBuilder {
  constructor(table, db, save) {
    this.table = table;
    this.db = db;
    this.save = save;
    this.filters = [];
    this.op = { type: "select" };
    this.singleMode = null; // null | "single" | "maybeSingle"
    this.selectCols = "*";
  }

  select(cols) {
    this.selectCols = cols || "*";
    return this;
  }
  order(col, opts) {
    this.orderBy = { col, ascending: opts?.ascending !== false };
    return this;
  }
  eq(col, val) {
    this.filters.push([col, val]);
    return this;
  }
  insert(payload) {
    this.op = { type: "insert", payload };
    return this;
  }
  update(payload) {
    this.op = { type: "update", payload };
    return this;
  }
  upsert(payload, opts) {
    this.op = { type: "upsert", payload, conflictCol: opts?.onConflict || "id" };
    return this;
  }
  delete() {
    this.op = { type: "delete" };
    return this;
  }
  single() {
    this.singleMode = "single";
    return this._exec();
  }
  maybeSingle() {
    this.singleMode = "maybeSingle";
    return this._exec();
  }
  then(onFulfilled, onRejected) {
    return this._exec().then(onFulfilled, onRejected);
  }

  _rows() {
    return this.db[this.table] || (this.db[this.table] = []);
  }
  _matches(row) {
    return this.filters.every(([col, val]) => row[col] === val);
  }

  async _exec() {
    // Mutate synchronously — like a real database, which commits a write
    // server-side immediately, regardless of how long the response takes to
    // reach the client. Only THEN delay what the caller sees resolve. Doing
    // the delay first (mutate-after-await) would let a concurrent read that
    // starts later still observe pre-mutation state if its own delay happened
    // to elapse first — a read-before-write-commits bug real Postgres doesn't
    // have, and that a naive "just add setTimeout" mock would.
    const result = this._execSync();
    // A real Supabase call is a network round trip (tens of ms, at least).
    // Resolving in the same microtask instead of a later macrotask is
    // observably different to React/framer-motion's scheduling — it caused
    // a real, reproducible one-cycle-delayed render on the first mutation
    // after login (see git history). This delay isn't cosmetic: it makes
    // the mock behave enough like real I/O to avoid that class of bug.
    await networkDelay();
    return result;
  }

  _execSync() {
    const rows = this._rows();

    if (this.op.type === "insert") {
      const items = (Array.isArray(this.op.payload) ? this.op.payload : [this.op.payload]).map((p) => ({
        id: uid(),
        created_at: now(),
        ...p,
      }));
      rows.push(...items);
      this.save();
      const data = this.singleMode ? items[0] || null : items;
      return { data, error: null };
    }

    if (this.op.type === "upsert") {
      const items = Array.isArray(this.op.payload) ? this.op.payload : [this.op.payload];
      const written = items.map((p) => {
        const existing = rows.find((r) => r[this.op.conflictCol] === p[this.op.conflictCol]);
        if (existing) {
          Object.assign(existing, p);
          return existing;
        }
        const created = { id: uid(), created_at: now(), ...p };
        rows.push(created);
        return created;
      });
      this.save();
      return { data: this.singleMode ? written[0] || null : written, error: null };
    }

    if (this.op.type === "update") {
      const matched = rows.filter((r) => this._matches(r));
      matched.forEach((r) => Object.assign(r, this.op.payload));
      this.save();
      return { data: this.singleMode ? matched[0] || null : matched, error: null };
    }

    if (this.op.type === "delete") {
      const keep = rows.filter((r) => !this._matches(r));
      const removed = rows.length - keep.length;
      this.db[this.table] = keep;
      if (removed) this.save();
      return { data: null, error: null };
    }

    // select
    let result = rows.filter((r) => this._matches(r));
    if (this.table === "expenses" && typeof this.selectCols === "string" && this.selectCols.includes("expense_splits")) {
      const splits = this.db.expense_splits || [];
      result = result.map((exp) => ({ ...exp, expense_splits: splits.filter((s) => s.expense_id === exp.id) }));
    }
    if (this.orderBy) {
      const { col, ascending } = this.orderBy;
      result = [...result].sort((a, b) => (a[col] > b[col] ? 1 : a[col] < b[col] ? -1 : 0) * (ascending ? 1 : -1));
    }
    if (this.singleMode) {
      return { data: result[0] || null, error: null };
    }
    return { data: result, error: null };
  }
}

function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function persistSession(session) {
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* dev-only convenience; ignore quota/availability errors */
  }
}

export function createMockClient() {
  const db = loadDb();
  const save = () => persist(db);
  // Mirrors real supabase-js's default persistSession: true — without this,
  // a page reload would silently sign the dev out, unlike the real backend.
  let session = loadSession();
  const listeners = new Set();
  const notify = (event) => listeners.forEach((cb) => cb(event, session));

  return {
    __mock: true,
    __db: db,
    auth: {
      async getSession() {
        await networkDelay();
        return { data: { session } };
      },
      onAuthStateChange(cb) {
        listeners.add(cb);
        return { data: { subscription: { unsubscribe: () => listeners.delete(cb) } } };
      },
      async signInWithPassword({ email, password }) {
        await networkDelay();
        const user = db.users.find((u) => u.email === email.trim());
        if (!user || user.password !== password) {
          return { error: { message: "Invalid login credentials" } };
        }
        session = { user: { id: user.id, email: user.email } };
        persistSession(session);
        notify("SIGNED_IN");
        return { error: null };
      },
      async signUp({ email, password }) {
        await networkDelay();
        const trimmed = email.trim();
        if (db.users.find((u) => u.email === trimmed)) {
          return { error: { message: "User already registered" } };
        }
        const user = { id: uid(), email: trimmed, password };
        db.users.push(user);
        save();
        session = { user: { id: user.id, email: user.email } };
        persistSession(session);
        notify("SIGNED_IN");
        return { error: null };
      },
      async signOut() {
        await networkDelay();
        session = null;
        persistSession(null);
        notify("SIGNED_OUT");
        return { error: null };
      },
    },
    from(table) {
      return new QueryBuilder(table, db, save);
    },
    channel() {
      return {
        on() {
          return this;
        },
        subscribe() {
          return this;
        },
      };
    },
    removeChannel() {},
  };
}

export function resetMockDb() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
  window.location.reload();
}
