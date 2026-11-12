import Link from "next/link";
import { notFound } from "next/navigation";
import { requireEditor } from "../../../../lib/auth.js";
import { getUpdate } from "../../../../lib/queries.js";
import { editorSaveAction } from "../../../../lib/actions.js";
import { PRACTICE_AREAS, JURISDICTIONS, UPDATE_TYPES } from "../../../../lib/constants.js";
import { casesToText, sourcesToText } from "../../../../lib/forms.js";
import { fmtDateTime } from "../../../../lib/format.js";

const STATUS_BADGE = { draft: "badge amber", published: "badge green", rejected: "badge red" };

export default async function EditUpdatePage({ params, searchParams }) {
  const { id } = await params;
  const sp = await searchParams;
  await requireEditor();
  const u = await getUpdate(id);
  if (!u) notFound();

  return (
    <main className="container mid">
      <p className="small">
        <Link href="/admin">← Review queue</Link>
      </p>
      <div className="spread">
        <div>
          <span className={STATUS_BADGE[u.status]}>{u.status}</span>{" "}
          <span className="muted small">
            #{u.id} · filed by {u.created_by} {fmtDateTime(u.created_at)}
            {u.reviewed_by_name ? ` · last edited by ${u.reviewed_by_name}` : ""}
          </span>
          <h1 style={{ marginTop: ".5rem" }}>Review update</h1>
        </div>
        <Link href={`/updates/${u.id}`} className="btn secondary small">
          Preview as lawyer
        </Link>
      </div>

      {sp?.saved && <div className="alert ok">Saved.</div>}
      {sp?.error === "fields" && <div className="alert error">Title, summary, area, jurisdiction and type are required.</div>}
      {sp?.error === "sources" && <div className="alert error">Add at least one source URL before publishing.</div>}

      <form action={editorSaveAction} className="card">
        <input type="hidden" name="id" value={u.id} />

        <div className="field">
          <label htmlFor="title">Title</label>
          <input id="title" name="title" type="text" defaultValue={u.title} required />
        </div>

        <div className="grid2">
          <div className="field">
            <label htmlFor="practice_area">Practice area</label>
            <select id="practice_area" name="practice_area" defaultValue={u.practice_area}>
              {PRACTICE_AREAS.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="jurisdiction">Jurisdiction</label>
            <select id="jurisdiction" name="jurisdiction" defaultValue={u.jurisdiction}>
              {JURISDICTIONS.map((j) => (
                <option key={j}>{j}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="update_type">Type</label>
            <select id="update_type" name="update_type" defaultValue={u.update_type}>
              {UPDATE_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="effective_date">Effective date</label>
            <input id="effective_date" name="effective_date" type="date" defaultValue={u.effective_date || ""} />
          </div>
        </div>

        <div className="field">
          <label htmlFor="summary">Summary</label>
          <textarea id="summary" name="summary" defaultValue={u.summary} required />
        </div>

        <div className="grid2">
          <div className="field">
            <label htmlFor="before_text">Before</label>
            <textarea id="before_text" name="before_text" defaultValue={u.before_text} />
          </div>
          <div className="field">
            <label htmlFor="after_text">After</label>
            <textarea id="after_text" name="after_text" defaultValue={u.after_text} />
          </div>
        </div>

        <div className="field">
          <label htmlFor="repercussions">
            Repercussions <span className="hint">one per line</span>
          </label>
          <textarea id="repercussions" name="repercussions" defaultValue={(u.repercussions || []).join("\n")} />
        </div>

        <div className="field">
          <label htmlFor="related_cases">
            Related cases <span className="hint">one per line: Name | Citation | Relevance</span>
          </label>
          <textarea id="related_cases" name="related_cases" className="mono" defaultValue={casesToText(u.related_cases)} />
        </div>

        <div className="field">
          <label htmlFor="sections">
            Provisions <span className="hint">comma-separated, e.g. IPC 420, BNS 318(4). Used to match lawyers' matters.</span>
          </label>
          <input id="sections" name="sections" type="text" defaultValue={(u.sections || []).join(", ")} />
        </div>

        <div className="field">
          <label htmlFor="sources">
            Sources <span className="hint">one per line: Title | URL</span>
          </label>
          <textarea id="sources" name="sources" className="mono" defaultValue={sourcesToText(u.sources)} />
          <div className="small" style={{ marginTop: ".4rem" }}>
            {(u.sources || []).map((s, i) => (
              <div key={i}>
                ↗{" "}
                <a href={s.url} target="_blank" rel="noopener noreferrer">
                  {s.title || s.url}
                </a>
              </div>
            ))}
          </div>
        </div>

        <div className="row" style={{ borderTop: "1px solid var(--line)", paddingTop: "1rem" }}>
          <button className="btn green" type="submit" name="intent" value="publish">
            {u.status === "published" ? "Save (stays published)" : "Save & publish"}
          </button>
          <button className="btn secondary" type="submit" name="intent" value="save">
            Save only
          </button>
          {u.status === "published" ? (
            <button className="btn red" type="submit" name="intent" value="draft">
              Unpublish
            </button>
          ) : (
            u.status !== "rejected" && (
              <button className="btn red" type="submit" name="intent" value="reject">
                Reject
              </button>
            )
          )}
          {u.status === "rejected" && (
            <button className="btn secondary" type="submit" name="intent" value="draft">
              Move back to drafts
            </button>
          )}
        </div>
      </form>
    </main>
  );
}
