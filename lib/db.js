import { neon } from "@neondatabase/serverless";

// Tables are created automatically on first use, so a fresh Neon database needs no setup step.
const SCHEMA = [
  `create table if not exists users (
     id serial primary key,
     email text unique not null,
     name text not null,
     password_hash text not null,
     role text not null default 'lawyer',
     practice_areas jsonb not null default '[]'::jsonb,
     jurisdictions jsonb not null default '[]'::jsonb,
     onboarded boolean not null default false,
     created_at timestamptz not null default now()
   )`,
  `create table if not exists law_updates (
     id serial primary key,
     title text not null,
     practice_area text not null,
     jurisdiction text not null,
     update_type text not null,
     effective_date date,
     summary text not null,
     before_text text not null default '',
     after_text text not null default '',
     repercussions jsonb not null default '[]'::jsonb,
     related_cases jsonb not null default '[]'::jsonb,
     sections jsonb not null default '[]'::jsonb,
     sources jsonb not null default '[]'::jsonb,
     status text not null default 'draft',
     created_by text not null default 'claude',
     reviewed_by integer references users(id) on delete set null,
     published_at timestamptz,
     created_at timestamptz not null default now(),
     updated_at timestamptz not null default now()
   )`,
  `create index if not exists law_updates_status_idx on law_updates (status, published_at desc)`,
  `create table if not exists matters (
     id serial primary key,
     user_id integer not null references users(id) on delete cascade,
     title text not null,
     court text not null default '',
     sections jsonb not null default '[]'::jsonb,
     created_at timestamptz not null default now()
   )`,
  `create table if not exists user_notes (
     user_id integer not null references users(id) on delete cascade,
     update_id integer not null references law_updates(id) on delete cascade,
     body text not null default '',
     bookmarked boolean not null default false,
     updated_at timestamptz not null default now(),
     primary key (user_id, update_id)
   )`,
  `create table if not exists coverage_checks (
     practice_area text not null,
     jurisdiction text not null,
     last_checked_at timestamptz not null default now(),
     note text not null default '',
     primary key (practice_area, jurisdiction)
   )`,
];

let _client;
function client() {
  if (!_client) {
    const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    _client = neon(url);
  }
  return _client;
}

function runRaw(c, text) {
  if (typeof c.query === "function") return c.query(text);
  const t = [text];
  t.raw = [text];
  return c(t);
}

let schemaReady;
export function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const c = client();
      for (const stmt of SCHEMA) {
        try {
          await runRaw(c, stmt);
        } catch (e) {
          // Two cold starts racing on CREATE ... IF NOT EXISTS can collide; that's harmless.
          if (!/already exists|duplicate key/i.test(String(e?.message))) throw e;
        }
      }
    })().catch((e) => {
      schemaReady = null;
      throw e;
    });
  }
  return schemaReady;
}

/** Tagged template: await sql`select * from users where id = ${id}` -> rows[] */
export async function sql(strings, ...values) {
  await ensureSchema();
  return client()(strings, ...values);
}
