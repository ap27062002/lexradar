import { sql } from "./db.js";
import { ALL_INDIA } from "./constants.js";

// ---------- Users ----------

export async function getUserById(id) {
  const rows = await sql`
    select id, email, name, role, practice_areas, jurisdictions, onboarded
    from users where id = ${id}`;
  return rows[0] || null;
}

export async function getUserWithPasswordByEmail(email) {
  const rows = await sql`select id, password_hash from users where email = ${email}`;
  return rows[0] || null;
}

export async function createUser({ email, name, passwordHash, role }) {
  const rows = await sql`
    insert into users (email, name, password_hash, role)
    values (${email}, ${name}, ${passwordHash}, ${role})
    on conflict (email) do nothing
    returning id`;
  return rows[0]?.id || null;
}

export async function saveInterests(userId, areas, jurisdictions) {
  await sql`
    update users
    set practice_areas = ${JSON.stringify(areas)}::jsonb,
        jurisdictions = ${JSON.stringify(jurisdictions)}::jsonb,
        onboarded = true
    where id = ${userId}
    returning id`;
}

// ---------- Lawyer dashboard ----------

/**
 * Published updates in the lawyer's areas, for their jurisdictions plus All India.
 * affected_matters = how many of the lawyer's matters share a statute section with the update.
 */
export async function dashboardFeed(userId, { area = null, view = "all" } = {}) {
  return sql`
    select u.id, u.title, u.practice_area, u.jurisdiction, u.update_type,
           to_char(u.effective_date, 'YYYY-MM-DD') as effective_date,
           u.summary, u.sections, coalesce(u.published_at, u.created_at) as published_at,
           (select count(*)::int from matters m
             where m.user_id = me.id
               and exists (select 1 from jsonb_array_elements_text(m.sections) ms
                           where ms in (select jsonb_array_elements_text(u.sections)))) as affected_matters,
           coalesce(n.bookmarked, false) as bookmarked
    from law_updates u
    join users me on me.id = ${userId}
    left join user_notes n on n.update_id = u.id and n.user_id = me.id
    where u.status = 'published'
      and me.practice_areas ? u.practice_area
      and (u.jurisdiction = ${ALL_INDIA} or me.jurisdictions ? u.jurisdiction)
      and (${area}::text is null or u.practice_area = ${area}::text)
      and (${view}::text <> 'bookmarked' or coalesce(n.bookmarked, false))
    order by coalesce(u.published_at, u.created_at) desc
    limit 200`.then((rows) =>
    view === "affecting" ? rows.filter((r) => r.affected_matters > 0) : rows
  );
}

export async function getUpdate(id) {
  const n = Number(id);
  if (!Number.isInteger(n)) return null;
  const rows = await sql`
    select u.id, u.title, u.practice_area, u.jurisdiction, u.update_type,
           to_char(u.effective_date, 'YYYY-MM-DD') as effective_date,
           u.summary, u.before_text, u.after_text, u.repercussions, u.related_cases,
           u.sections, u.sources, u.status, u.created_by, u.published_at, u.created_at, u.updated_at,
           r.name as reviewed_by_name
    from law_updates u
    left join users r on r.id = u.reviewed_by
    where u.id = ${n}`;
  return rows[0] || null;
}

export async function getNote(userId, updateId) {
  const rows = await sql`
    select body, bookmarked from user_notes where user_id = ${userId} and update_id = ${updateId}`;
  return rows[0] || { body: "", bookmarked: false };
}

export async function saveNote(userId, updateId, body) {
  await sql`
    insert into user_notes (user_id, update_id, body)
    values (${userId}, ${updateId}, ${body})
    on conflict (user_id, update_id) do update set body = excluded.body, updated_at = now()
    returning update_id`;
}

export async function toggleBookmark(userId, updateId) {
  await sql`
    insert into user_notes (user_id, update_id, bookmarked)
    values (${userId}, ${updateId}, true)
    on conflict (user_id, update_id)
      do update set bookmarked = not user_notes.bookmarked, updated_at = now()
    returning update_id`;
}

// ---------- Matters ----------

export async function listMatters(userId) {
  return sql`
    select m.id, m.title, m.court, m.sections, m.created_at,
           (select coalesce(json_agg(json_build_object('id', u.id, 'title', u.title) order by u.published_at desc), '[]'::json)
              from law_updates u
             where u.status = 'published'
               and exists (select 1 from jsonb_array_elements_text(m.sections) ms
                           where ms in (select jsonb_array_elements_text(u.sections)))) as linked_updates
    from matters m
    where m.user_id = ${userId}
    order by m.created_at desc`;
}

export async function mattersAffectedBy(userId, updateId) {
  return sql`
    select m.id, m.title, m.court,
           (select coalesce(json_agg(ms), '[]'::json)
              from jsonb_array_elements_text(m.sections) ms
             where ms in (select jsonb_array_elements_text(u.sections))) as shared_sections
    from matters m
    join law_updates u on u.id = ${updateId}
    where m.user_id = ${userId}
      and exists (select 1 from jsonb_array_elements_text(m.sections) ms
                  where ms in (select jsonb_array_elements_text(u.sections)))`;
}

export async function addMatter(userId, { title, court, sections }) {
  await sql`
    insert into matters (user_id, title, court, sections)
    values (${userId}, ${title}, ${court}, ${JSON.stringify(sections)}::jsonb)
    returning id`;
}

export async function deleteMatter(userId, matterId) {
  await sql`delete from matters where id = ${matterId} and user_id = ${userId} returning id`;
}

// ---------- Editor ----------

export async function editorQueue(status) {
  return sql`
    select id, title, practice_area, jurisdiction, update_type, status, created_by,
           to_char(effective_date, 'YYYY-MM-DD') as effective_date, created_at,
           jsonb_array_length(sources) as source_count
    from law_updates
    where status = ${status}
    order by created_at desc
    limit 300`;
}

export async function statusCounts() {
  const rows = await sql`select status, count(*)::int as n from law_updates group by status`;
  const out = { draft: 0, published: 0, rejected: 0 };
  for (const r of rows) out[r.status] = r.n;
  return out;
}

export async function editUpdate(id, f, editorId) {
  await sql`
    update law_updates set
      title = ${f.title},
      practice_area = ${f.practice_area},
      jurisdiction = ${f.jurisdiction},
      update_type = ${f.update_type},
      effective_date = ${f.effective_date}::date,
      summary = ${f.summary},
      before_text = ${f.before_text},
      after_text = ${f.after_text},
      repercussions = ${JSON.stringify(f.repercussions)}::jsonb,
      related_cases = ${JSON.stringify(f.related_cases)}::jsonb,
      sections = ${JSON.stringify(f.sections)}::jsonb,
      sources = ${JSON.stringify(f.sources)}::jsonb,
      reviewed_by = ${editorId},
      updated_at = now()
    where id = ${id}
    returning id`;
}

export async function setStatus(id, status, editorId) {
  await sql`
    update law_updates set
      status = ${status},
      reviewed_by = ${editorId},
      published_at = case when ${status}::text = 'published' then coalesce(published_at, now()) else null end,
      updated_at = now()
    where id = ${id}
    returning id`;
}

// ---------- Coverage (used by MCP + editor screen) ----------

/** Every (practice area, jurisdiction) pair at least one lawyer follows, plus All India for each area. */
export async function coverageMap() {
  return sql`
    with followed as (
      select a.area, j.jur, count(distinct u.id)::int as lawyers
      from users u
      cross join lateral jsonb_array_elements_text(u.practice_areas) as a(area)
      cross join lateral jsonb_array_elements_text(u.jurisdictions || jsonb_build_array(${ALL_INDIA}::text)) as j(jur)
      where u.onboarded
      group by a.area, j.jur
    )
    select f.area as practice_area, f.jur as jurisdiction, f.lawyers,
           c.last_checked_at,
           (select count(*)::int from law_updates lu
             where lu.practice_area = f.area and lu.jurisdiction = f.jur
               and lu.created_at > now() - interval '30 days') as updates_last_30_days
    from followed f
    left join coverage_checks c on c.practice_area = f.area and c.jurisdiction = f.jur
    order by c.last_checked_at asc nulls first, f.lawyers desc, f.area, f.jur`;
}

export async function markChecked(area, jurisdiction, note) {
  const rows = await sql`
    insert into coverage_checks (practice_area, jurisdiction, last_checked_at, note)
    values (${area}, ${jurisdiction}, now(), ${note})
    on conflict (practice_area, jurisdiction)
      do update set last_checked_at = now(), note = excluded.note
    returning practice_area, jurisdiction, last_checked_at`;
  return rows[0];
}

export async function recentUpdates({ area = null, days = 30, limit = 50 }) {
  return sql`
    select id, title, practice_area, jurisdiction, update_type, status,
           to_char(effective_date, 'YYYY-MM-DD') as effective_date,
           sections, sources, created_at
    from law_updates
    where created_at > now() - make_interval(days => ${days}::int)
      and (${area}::text is null or practice_area = ${area}::text)
    order by created_at desc
    limit ${limit}::int`;
}

export async function findBySourceUrl(url) {
  const rows = await sql`
    select id, title, status from law_updates
    where sources @> ${JSON.stringify([{ url }])}::jsonb
    limit 1`;
  return rows[0] || null;
}

export async function insertUpdate(u) {
  const rows = await sql`
    insert into law_updates
      (title, practice_area, jurisdiction, update_type, effective_date, summary,
       before_text, after_text, repercussions, related_cases, sections, sources, status, created_by)
    values
      (${u.title}, ${u.practice_area}, ${u.jurisdiction}, ${u.update_type}, ${u.effective_date}::date, ${u.summary},
       ${u.before_text}, ${u.after_text},
       ${JSON.stringify(u.repercussions)}::jsonb, ${JSON.stringify(u.related_cases)}::jsonb,
       ${JSON.stringify(u.sections)}::jsonb, ${JSON.stringify(u.sources)}::jsonb,
       ${u.status || "draft"}, ${u.created_by || "claude"})
    returning id`;
  return rows[0].id;
}
