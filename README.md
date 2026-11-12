# LexRadar

**Law changes that matter to your practice, and your live matters.**

LexRadar is a personalised tracker of new statutes, amendments, notifications and judgments for Indian litigation lawyers. Lawyers pick their practice areas and courts, list their live matters with the sections involved, and get a feed of reviewed updates. Each update shows what changed (before → after), the practical consequences, related precedents and sources, and flags when it touches one of their matters.

**There is no AI inside this app.** Claude does the research and writing on a schedule, through an MCP connector, using the operator's own Claude plan. The app validates and stores what Claude sends, routes it through human review, and serves it to lawyers. You can check this yourself: `grep -ri "openai\|anthropic" .` finds nothing in the code.

```
Claude (scheduled daily run, operator's plan)
   │  MCP tools: get_coverage_map → list_recent_updates → add_law_update → mark_area_checked
   ▼
/api/mcp ──► Postgres ──► Editor review queue (/admin) ──► publish
                                                             │
Lawyers: onboarding → dashboard (filtered by area + court) → update detail → my matters (section matching)
```

## Deploy (about 10 minutes)

1. **Push to GitHub.** Create a new repo and push this folder.
2. **Import into Vercel.** Go to vercel.com → Add New → Project → select the repo. Don't deploy yet.
3. **Add a database.** In the Vercel project, open Storage → Create → Neon (Postgres) → connect it to the project. This sets `DATABASE_URL`. Tables are created automatically on first request.
4. **Set environment variables** (Settings → Environment Variables):

   | Name | Value |
   |---|---|
   | `SESSION_SECRET` | any long random string (e.g. output of `openssl rand -hex 32`) |
   | `MCP_KEY` | another long random string; this protects the Claude connector |
   | `ADMIN_EMAILS` | comma-separated emails that become Editors when they sign up, e.g. `you@gmail.com,reviewer@lexradar.in` |

5. **Deploy.** Then sign up with an email from `ADMIN_EMAILS`. You'll land on the Review queue. Click **Load samples** for demo content.

Run locally with `npm install`, a `.env.local` copied from `.env.example`, then `npm run dev`. Run `npm run build` once locally before your first deploy to catch any build error early.

## Connect Claude

1. In Claude: **Settings → Connectors → Add custom connector**.
2. Name: `LexRadar`. URL: `https://YOUR-APP.vercel.app/api/mcp?key=YOUR_MCP_KEY` (the Review queue page shows the exact URL).
3. In a chat, enable the connector and ask:
   > Run today's LexRadar research: check coverage, find new legal changes in each area since it was last checked, and file drafts.

Claude needs web search turned on for research runs.

### Tools Claude gets

| Tool | Purpose |
|---|---|
| `get_coverage_map` | Every practice area × jurisdiction that lawyers follow, with lawyer counts and when it was last checked, stalest first |
| `list_recent_updates` | Existing updates and their source URLs, to avoid duplicates |
| `add_law_update` | Files one change as a **draft**: summary, before/after, repercussions, related cases, sections, sources (at least one required). Rejects reused source URLs |
| `mark_area_checked` | Records that a pair was researched, even when nothing changed |

## The daily scheduled task

Create a daily scheduled task in Claude (or ask Claude to set one up) with this prompt:

```
You are LexRadar's research desk. Use the LexRadar connector.
1. Call get_coverage_map. Work through the pairs in order (stalest first), up to 8 pairs per run.
2. For each pair, search the web for legal changes in that practice area and jurisdiction since last_checked_at
   (or the last 14 days if never checked): new Acts, amendments, rules and notifications, regulator circulars
   (SEBI, RBI, IBBI, etc.), and significant Supreme Court or High Court judgments.
3. Call list_recent_updates for that area and skip anything already filed.
4. For each genuine change, call add_law_update. Use only facts from your sources, cite official sources where
   possible (indiacode.nic.in, egazette.gov.in, sci.gov.in, High Court sites, regulator sites), list every affected
   provision in 'ACT SECTION' form including old and new numbering (e.g. IPC 420, BNS 318(4)), and write the
   repercussions for a practising litigator.
5. Call mark_area_checked for every pair you researched, with a one-line note.
Finish with a short summary of what you filed.
```

## Demo script (for the 2-minute demo)

1. **Lawyer view (20s).** Log in as a lawyer who follows Criminal + Arbitration in Delhi, with the matter *State v. Sharma* (IPC 420, CrPC 438). The dashboard shows updates, some flagged "Affects 1 of your matters".
2. **Claude (40s).** In Claude, with the connector on: *"Check for any new Supreme Court rulings on anticipatory bail this month and file them to LexRadar."* Claude researches and calls `add_law_update`, then replies with a review link.
3. **Editor (40s).** Open the link → Review queue → fix a line, add a provision, click **Save & publish**.
4. **Back to the lawyer (20s).** Refresh the dashboard. The new update is at the top, flagged against *State v. Sharma*. Open it to show before/after, related cases, sources, and a private note.

## What to send

- **Live app:** `https://YOUR-APP.vercel.app`
- **Test logins:** create one lawyer account and one editor account (an email in `ADMIN_EMAILS`) and share both.
- **MCP link:** `https://YOUR-APP.vercel.app/api/mcp?key=...` plus the "Connect Claude" steps above. Consider a separate `MCP_KEY` for reviewers that you rotate afterwards.

## Code map

| Path | What |
|---|---|
| `lib/mcp.js` | Dependency-free MCP server (Streamable HTTP, stateless JSON-RPC), tool schemas and validation |
| `lib/queries.js` | All SQL: feed filtering, section matching, review queue, coverage |
| `lib/db.js` | Neon client and auto-created schema |
| `lib/actions.js` | Server actions: auth, onboarding, matters, notes, editor save/publish/reject |
| `lib/constants.js` | Practice areas, jurisdictions, update types, section normalisation (`s. 420 ipc` → `IPC 420`) |
| `app/dashboard` | Lawyer feed with area / affects-my-matters / bookmarked filters |
| `app/updates/[id]` | Update detail, affected matters, notes, bookmark |
| `app/matters` | Live matters with sections and linked changes |
| `app/admin` | Review queue, coverage table, connector URL, sample loader |
| `app/admin/updates/[id]` | Editor form: edit everything, publish / reject / unpublish |

Sample entries are illustrative demo content. Every update is a research aid, not legal advice.
