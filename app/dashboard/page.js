import Link from "next/link";
import { requireUser } from "../../lib/auth.js";
import { dashboardFeed } from "../../lib/queries.js";
import { toggleBookmarkAction } from "../../lib/actions.js";
import { fmtDate, typeBadgeClass } from "../../lib/format.js";

const VIEWS = [
  ["all", "All updates"],
  ["affecting", "Affects my matters"],
  ["bookmarked", "Bookmarked"],
];

function qs(area, view) {
  const p = new URLSearchParams();
  if (area) p.set("area", area);
  if (view && view !== "all") p.set("view", view);
  const s = p.toString();
  return s ? `/dashboard?${s}` : "/dashboard";
}

export default async function Dashboard({ searchParams }) {
  const sp = await searchParams;
  const user = await requireUser();
  const areas = user.practice_areas || [];
  const area = areas.includes(sp?.area) ? sp.area : null;
  const view = VIEWS.some(([v]) => v === sp?.view) ? sp.view : "all";
  const feed = user.onboarded ? await dashboardFeed(user.id, { area, view }) : [];
  const here = qs(area, view);

  return (
    <main className="container">
      <div className="spread">
        <div>
          <h1>Your law radar</h1>
          <p className="muted small" style={{ margin: 0 }}>
            {areas.length ? areas.join(" · ") : "No practice areas yet"}
            {(user.jurisdictions || []).length ? ` · ${user.jurisdictions.join(", ")}` : ""} · All India
          </p>
        </div>
        <Link href="/matters" className="btn secondary small">
          Manage matters
        </Link>
      </div>

      {sp?.welcome && (
        <div className="alert ok" style={{ marginTop: "1rem" }}>
          Dashboard ready. Add your live matters with their sections so LexRadar can flag changes that affect them.
        </div>
      )}
      {!user.onboarded && (
        <div className="alert info" style={{ marginTop: "1rem" }}>
          <Link href="/onboarding">Choose your practice areas</Link> to see your feed.
        </div>
      )}

      <div className="tabs">
        {VIEWS.map(([v, label]) => (
          <Link key={v} href={qs(area, v)} className={`tab ${view === v ? "active" : ""}`}>
            {label}
          </Link>
        ))}
      </div>
      {areas.length > 1 && (
        <div className="tabs" style={{ marginTop: "-.4rem" }}>
          <Link href={qs(null, view)} className={`tab ${!area ? "active" : ""}`}>
            All areas
          </Link>
          {areas.map((a) => (
            <Link key={a} href={qs(a, view)} className={`tab ${area === a ? "active" : ""}`}>
              {a}
            </Link>
          ))}
        </div>
      )}

      {feed.length === 0 && user.onboarded && (
        <div className="card muted">
          {view === "affecting"
            ? "No published update touches your matters yet. Make sure your matters list the sections involved (e.g. IPC 420)."
            : view === "bookmarked"
            ? "Nothing bookmarked yet."
            : "No published updates in your areas yet. LexRadar's research desk checks for changes every day."}
        </div>
      )}

      <div className="feed">
        {feed.map((u) => (
          <article key={u.id} className={`card update-card ${u.affected_matters ? "affects" : ""}`}>
            <div className="spread">
              <div className="meta">
                <span className={typeBadgeClass(u.update_type)}>{u.update_type}</span>
                <span className="badge">{u.practice_area}</span>
                <span className="badge">{u.jurisdiction}</span>
                {u.effective_date && <span className="muted small">Effective {fmtDate(u.effective_date)}</span>}
              </div>
              <form action={toggleBookmarkAction}>
                <input type="hidden" name="update_id" value={u.id} />
                <input type="hidden" name="back" value={here} />
                <button className="linkbtn" style={{ color: u.bookmarked ? "#a8842f" : "#7a8295", textDecoration: "none" }} title="Bookmark">
                  {u.bookmarked ? "★ Saved" : "☆ Save"}
                </button>
              </form>
            </div>
            <h3>
              <Link href={`/updates/${u.id}`}>{u.title}</Link>
            </h3>
            <p>{u.summary}</p>
            {u.affected_matters > 0 && (
              <p style={{ marginTop: ".6rem" }}>
                <span className="badge gold">
                  ⚑ Affects {u.affected_matters} of your matter{u.affected_matters > 1 ? "s" : ""}
                </span>
              </p>
            )}
          </article>
        ))}
      </div>
    </main>
  );
}
