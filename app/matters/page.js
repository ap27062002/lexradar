import Link from "next/link";
import { requireUser } from "../../lib/auth.js";
import { listMatters } from "../../lib/queries.js";
import { addMatterAction, deleteMatterAction } from "../../lib/actions.js";

export default async function MattersPage({ searchParams }) {
  const sp = await searchParams;
  const user = await requireUser();
  const matters = await listMatters(user.id);

  return (
    <main className="container mid">
      <h1>My matters</h1>
      <p className="lede">
        List the provisions each live matter turns on. When a change touches one of them, it's flagged on your dashboard.
      </p>

      {sp?.error && <div className="alert error">Give the matter a title.</div>}
      <form action={addMatterAction} className="card">
        <div className="grid2">
          <div className="field">
            <label htmlFor="title">Matter</label>
            <input id="title" name="title" type="text" required placeholder="State v. Sharma" />
          </div>
          <div className="field">
            <label htmlFor="court">Court / forum</label>
            <input id="court" name="court" type="text" placeholder="Saket District Court, Delhi" />
          </div>
        </div>
        <div className="field">
          <label htmlFor="sections">
            Sections involved <span className="hint">comma-separated, e.g. IPC 420, IPC 120B, CrPC 438</span>
          </label>
          <input id="sections" name="sections" type="text" placeholder="IPC 420, CrPC 438" />
        </div>
        <button className="btn" type="submit">
          Add matter
        </button>
      </form>

      <h2>Live matters ({matters.length})</h2>
      {matters.length === 0 && <p className="muted">No matters yet.</p>}
      <div className="feed">
        {matters.map((m) => (
          <div key={m.id} className={`card ${m.linked_updates.length ? "affects" : ""}`}>
            <div className="spread">
              <div>
                <h3 style={{ marginBottom: ".2rem" }}>{m.title}</h3>
                {m.court && <p className="muted small">{m.court}</p>}
              </div>
              <form action={deleteMatterAction}>
                <input type="hidden" name="id" value={m.id} />
                <button className="btn red small" type="submit">
                  Remove
                </button>
              </form>
            </div>
            <div>
              {(m.sections || []).length ? (
                m.sections.map((s) => (
                  <span key={s} className="chip">
                    {s}
                  </span>
                ))
              ) : (
                <span className="muted small">No sections listed, so this matter can't be matched.</span>
              )}
            </div>
            {m.linked_updates.length > 0 && (
              <div style={{ marginTop: ".6rem" }}>
                <span className="badge gold">⚑ {m.linked_updates.length} relevant change(s)</span>
                <ul className="tight small">
                  {m.linked_updates.map((u) => (
                    <li key={u.id}>
                      <Link href={`/updates/${u.id}`}>{u.title}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
