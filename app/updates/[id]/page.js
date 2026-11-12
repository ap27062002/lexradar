import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "../../../lib/auth.js";
import { getUpdate, getNote, mattersAffectedBy } from "../../../lib/queries.js";
import { saveNoteAction, toggleBookmarkAction } from "../../../lib/actions.js";
import { fmtDate, typeBadgeClass } from "../../../lib/format.js";

export default async function UpdatePage({ params, searchParams }) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireUser();
  const u = await getUpdate(id);
  const isEditor = user.role === "editor";
  if (!u || (u.status !== "published" && !isEditor)) notFound();

  const [note, affected] = await Promise.all([getNote(user.id, u.id), mattersAffectedBy(user.id, u.id)]);
  const hits = new Set(affected.flatMap((m) => m.shared_sections || []));

  return (
    <main className="container mid">
      <p className="small">
        <Link href="/dashboard">← Dashboard</Link>
      </p>

      {u.status !== "published" && (
        <div className={`alert ${u.status === "rejected" ? "error" : "info"}`}>
          This update is <b>{u.status}</b> and not visible to lawyers. <Link href={`/admin/updates/${u.id}`}>Review it →</Link>
        </div>
      )}

      <div className="row" style={{ marginBottom: ".6rem" }}>
        <span className={typeBadgeClass(u.update_type)}>{u.update_type}</span>
        <span className="badge">{u.practice_area}</span>
        <span className="badge">{u.jurisdiction}</span>
        {u.effective_date && <span className="muted small">Effective {fmtDate(u.effective_date)}</span>}
      </div>
      <div className="spread">
        <h1 style={{ flex: 1 }}>{u.title}</h1>
        <form action={toggleBookmarkAction}>
          <input type="hidden" name="update_id" value={u.id} />
          <button className="btn secondary small">{note.bookmarked ? "★ Bookmarked" : "☆ Bookmark"}</button>
        </form>
      </div>
      <p className="lede">{u.summary}</p>

      {affected.length > 0 && (
        <div className="card affects" style={{ marginTop: "1rem" }}>
          <h3>⚑ Affects your matters</h3>
          <ul className="tight">
            {affected.map((m) => (
              <li key={m.id}>
                <b>{m.title}</b>
                {m.court ? <span className="muted"> · {m.court}</span> : null} — shares{" "}
                {(m.shared_sections || []).map((s) => (
                  <span key={s} className="chip hit">
                    {s}
                  </span>
                ))}
              </li>
            ))}
          </ul>
        </div>
      )}

      {(u.before_text || u.after_text) && (
        <>
          <h2>What changed</h2>
          <div className="compare">
            <div className="card">
              <h3>Before</h3>
              <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{u.before_text || "—"}</p>
            </div>
            <div className="card after">
              <h3>After</h3>
              <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{u.after_text || "—"}</p>
            </div>
          </div>
        </>
      )}

      <h2>Repercussions for litigators</h2>
      <ul className="tight">
        {(u.repercussions || []).map((r, i) => (
          <li key={i}>{r}</li>
        ))}
      </ul>

      {(u.related_cases || []).length > 0 && (
        <>
          <h2>Related cases</h2>
          <div className="card" style={{ padding: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Case</th>
                  <th>Citation</th>
                  <th>Why it matters</th>
                </tr>
              </thead>
              <tbody>
                {u.related_cases.map((c, i) => (
                  <tr key={i}>
                    <td>
                      <i>{c.name}</i>
                    </td>
                    <td className="small">{c.citation || "—"}</td>
                    <td className="small">{c.relevance}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {(u.sections || []).length > 0 && (
        <>
          <h2>Provisions</h2>
          <div>
            {u.sections.map((s) => (
              <span key={s} className={`chip ${hits.has(s) ? "hit" : ""}`}>
                {s}
              </span>
            ))}
          </div>
        </>
      )}

      <h2>Sources</h2>
      <ul className="tight">
        {(u.sources || []).map((s, i) => (
          <li key={i}>
            <a href={s.url} target="_blank" rel="noopener noreferrer">
              {s.title || s.url}
            </a>
          </li>
        ))}
      </ul>

      <h2>Your notes</h2>
      {sp?.saved && <div className="alert ok">Note saved.</div>}
      <form action={saveNoteAction} className="card">
        <input type="hidden" name="update_id" value={u.id} />
        <div className="field">
          <textarea name="body" defaultValue={note.body} placeholder="Private to you: how this affects your strategy, clients to inform…" />
        </div>
        <button className="btn small" type="submit">
          Save note
        </button>
      </form>

      <p className="disclaimer">
        Researched by LexRadar's research desk
        {u.reviewed_by_name ? `, reviewed by ${u.reviewed_by_name}` : ""}
        {u.created_by === "sample" ? " (sample entry)" : ""}. A research aid, not legal advice; always verify against the sources.
        {isEditor && (
          <>
            {" "}
            <Link href={`/admin/updates/${u.id}`}>Edit this update</Link>
          </>
        )}
      </p>
    </main>
  );
}
