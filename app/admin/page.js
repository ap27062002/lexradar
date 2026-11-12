import Link from "next/link";
import { headers } from "next/headers";
import { requireEditor } from "../../lib/auth.js";
import { editorQueue, statusCounts, coverageMap } from "../../lib/queries.js";
import { loadSamplesAction } from "../../lib/actions.js";
import { fmtDate, fmtDateTime } from "../../lib/format.js";

const TABS = [
  ["draft", "Needs review"],
  ["published", "Published"],
  ["rejected", "Rejected"],
];

export default async function AdminPage({ searchParams }) {
  const sp = await searchParams;
  await requireEditor();
  const status = TABS.some(([s]) => s === sp?.status) ? sp.status : "draft";
  const [rows, counts, coverage] = await Promise.all([editorQueue(status), statusCounts(), coverageMap()]);
  const total = counts.draft + counts.published + counts.rejected;

  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host");
  const proto = h.get("x-forwarded-proto") || (host?.startsWith("localhost") ? "http" : "https");
  const mcpUrl = `${proto}://${host}/api/mcp?key=${process.env.MCP_KEY || "SET_MCP_KEY"}`;

  return (
    <main className="container">
      <h1>Editorial review</h1>
      <p className="lede">Claude's research desk files drafts here. Check them against the sources, edit, then publish.</p>

      {sp?.done === "published" && <div className="alert ok">Published. It's now on matching lawyers' dashboards.</div>}
      {sp?.done === "rejected" && <div className="alert info">Rejected. Lawyers won't see it.</div>}

      <div className="tabs">
        {TABS.map(([s, label]) => (
          <Link key={s} href={`/admin?status=${s}`} className={`tab ${status === s ? "active" : ""}`}>
            {label} ({counts[s]})
          </Link>
        ))}
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Update</th>
              <th>Area</th>
              <th>Jurisdiction</th>
              <th>Effective</th>
              <th>Sources</th>
              <th>Filed</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="muted" style={{ padding: "1.2rem" }}>
                  Nothing here.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="muted">{r.id}</td>
                <td>
                  <Link href={`/admin/updates/${r.id}`}>{r.title}</Link>
                  <div className="small muted">{r.update_type}{r.created_by !== "claude" ? ` · ${r.created_by}` : ""}</div>
                </td>
                <td className="small">{r.practice_area}</td>
                <td className="small">{r.jurisdiction}</td>
                <td className="small">{fmtDate(r.effective_date) || "—"}</td>
                <td className="small">{r.source_count}</td>
                <td className="small muted">{fmtDateTime(r.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Coverage</h2>
      <p className="muted small">What lawyers follow, and when Claude last researched it. Stalest first.</p>
      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th>Practice area</th>
              <th>Jurisdiction</th>
              <th>Lawyers</th>
              <th>Last checked</th>
              <th>Updates (30d)</th>
            </tr>
          </thead>
          <tbody>
            {coverage.length === 0 && (
              <tr>
                <td colSpan={5} className="muted" style={{ padding: "1.2rem" }}>
                  No lawyers have onboarded yet.
                </td>
              </tr>
            )}
            {coverage.map((c) => (
              <tr key={`${c.practice_area}|${c.jurisdiction}`}>
                <td>{c.practice_area}</td>
                <td>{c.jurisdiction}</td>
                <td>{c.lawyers}</td>
                <td className={c.last_checked_at ? "" : "muted"}>{fmtDateTime(c.last_checked_at)}</td>
                <td>{c.updates_last_30_days}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Connect Claude</h2>
      <div className="card stack">
        <p style={{ margin: 0 }}>
          In Claude, open <b>Settings → Connectors → Add custom connector</b>, name it <b>LexRadar</b> and paste this URL:
        </p>
        <details>
          <summary className="small">Show connector URL (contains your secret key)</summary>
          <div className="codebox" style={{ marginTop: ".5rem" }}>
            {mcpUrl}
          </div>
        </details>
        <p className="muted small" style={{ margin: 0 }}>
          Then ask Claude: <i>“Run today's LexRadar research: check coverage, find new legal changes, and file drafts.”</i> Or
          set that up as a daily scheduled task.
        </p>
      </div>

      {total === 0 && (
        <>
          <h2>Starter content</h2>
          <form action={loadSamplesAction} className="card row">
            <p style={{ margin: 0, flex: 1 }} className="muted">
              Empty database? Load 4 sample published updates (new criminal laws and an arbitration ruling) for demos.
            </p>
            <button className="btn secondary" type="submit">
              Load samples
            </button>
          </form>
        </>
      )}
    </main>
  );
}
