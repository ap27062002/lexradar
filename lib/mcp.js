// A small, dependency-free MCP server (Streamable HTTP transport, stateless, JSON responses).
// Claude calls these tools; this file contains no AI — it only validates and stores what Claude sends.

import { timingSafeEqual } from "node:crypto";
import {
  PRACTICE_AREAS,
  JURISDICTIONS,
  UPDATE_TYPES,
  ALL_INDIA,
  normalizeSections,
} from "./constants.js";
import {
  coverageMap,
  recentUpdates,
  findBySourceUrl,
  insertUpdate,
  markChecked,
} from "./queries.js";

const SERVER_INFO = { name: "lexradar", title: "LexRadar", version: "1.0.0" };
const SUPPORTED_VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];

const INSTRUCTIONS = `LexRadar is a law-change tracker for Indian litigation lawyers. You are its research desk.
Workflow for a research run:
1) Call get_coverage_map to see which practice areas and jurisdictions lawyers follow, stalest first.
2) For each pair, search for legal changes since last_checked_at (or the last 14 days if never checked):
   new statutes, amendments, rules/notifications, regulator circulars, and significant Supreme Court / High Court judgments.
3) Call list_recent_updates so you do not add something that already exists.
4) For each genuine change call add_law_update. Only use facts you found in sources; every update needs at least one source URL,
   preferably official (indiacode.nic.in, egazette.gov.in, sci.gov.in, high court sites, sebi.gov.in, rbi.org.in, etc).
5) Call mark_area_checked for every pair you researched, even when nothing changed.
Updates are saved as drafts; a human editor reviews them before lawyers see them.`;

const str = (description, extra = {}) => ({ type: "string", description, ...extra });

const TOOLS = [
  {
    name: "get_coverage_map",
    title: "Get coverage map",
    description:
      "List every (practice_area, jurisdiction) pair that LexRadar's lawyers follow, with how many lawyers follow it, when it was last researched, and how many updates were added in the last 30 days. Sorted stalest first. Start every research run here.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true },
  },
  {
    name: "list_recent_updates",
    title: "List recent updates",
    description:
      "List law updates already in LexRadar (drafts, published and rejected) so you can avoid duplicates. Returns titles, sections and source URLs.",
    inputSchema: {
      type: "object",
      properties: {
        practice_area: str("Optional filter", { enum: PRACTICE_AREAS }),
        days: { type: "integer", minimum: 1, maximum: 365, description: "Look-back window in days (default 30)" },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "add_law_update",
    title: "Add law update",
    description:
      "Save one legal change as a DRAFT for editor review. Write for a practising litigator: precise, neutral, no hype. Include the statute sections affected so LexRadar can match the update to lawyers' live matters. Rejected if a source URL is already used by an existing update.",
    inputSchema: {
      type: "object",
      required: ["title", "practice_area", "jurisdiction", "update_type", "summary", "repercussions", "sections", "sources"],
      properties: {
        title: str("Headline, e.g. 'BNSS s.482 replaces CrPC s.438: anticipatory bail'", { maxLength: 200 }),
        practice_area: str("Practice area", { enum: PRACTICE_AREAS }),
        jurisdiction: str(`'${ALL_INDIA}' for central law, Supreme Court and national regulators; otherwise the state`, {
          enum: JURISDICTIONS,
        }),
        update_type: str("Kind of change", { enum: UPDATE_TYPES }),
        effective_date: str("Date the change takes or took effect, YYYY-MM-DD, if known", { pattern: "^\\d{4}-\\d{2}-\\d{2}$" }),
        summary: str("2-4 sentence plain-English summary of what changed"),
        before: str("The position before the change (law, section text, or prevailing view)"),
        after: str("The position after the change"),
        repercussions: {
          type: "array",
          minItems: 1,
          items: { type: "string" },
          description: "Practical consequences for litigators: pending cases, limitation, procedure, strategy, client advice",
        },
        related_cases: {
          type: "array",
          items: {
            type: "object",
            required: ["name", "relevance"],
            properties: {
              name: str("Case name"),
              citation: str("Citation, e.g. (2024) 5 SCC 1, or neutral citation"),
              relevance: str("One line on how it relates to this change"),
            },
          },
          description: "Precedents this change resembles, codifies, overrules or should be read with",
        },
        sections: {
          type: "array",
          items: { type: "string" },
          description:
            "Every provision affected, formatted 'ACT SECTION', e.g. ['IPC 420', 'BNS 318(4)', 'CRPC 438', 'BNSS 482']. Include old and new numbering.",
        },
        sources: {
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            required: ["url"],
            properties: { title: str("Source title"), url: str("https URL") },
          },
          description: "Where this was found. Prefer official sources.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "mark_area_checked",
    title: "Mark area checked",
    description:
      "Record that a (practice_area, jurisdiction) pair has been researched now, even if no changes were found. Keeps the coverage map accurate.",
    inputSchema: {
      type: "object",
      required: ["practice_area", "jurisdiction"],
      properties: {
        practice_area: str("Practice area", { enum: PRACTICE_AREAS }),
        jurisdiction: str("Jurisdiction", { enum: JURISDICTIONS }),
        note: str("Optional: what was checked or found, e.g. 'No new notifications; 2 updates added'"),
      },
      additionalProperties: false,
    },
    annotations: { idempotentHint: true },
  },
];

// ---------- validation helpers ----------

class ToolInputError extends Error {}

function reqString(obj, key, { max = 20000 } = {}) {
  const v = obj?.[key];
  if (typeof v !== "string" || !v.trim()) throw new ToolInputError(`'${key}' is required and must be a non-empty string`);
  return v.trim().slice(0, max);
}
function optString(obj, key, { max = 20000 } = {}) {
  const v = obj?.[key];
  if (v == null || v === "") return "";
  if (typeof v !== "string") throw new ToolInputError(`'${key}' must be a string`);
  return v.trim().slice(0, max);
}
function oneOf(value, list, key) {
  if (!list.includes(value)) throw new ToolInputError(`'${key}' must be one of: ${list.join(", ")}`);
  return value;
}
function isHttpUrl(u) {
  try {
    const x = new URL(u);
    return x.protocol === "https:" || x.protocol === "http:";
  } catch {
    return false;
  }
}
function cleanUrl(u) {
  return u.trim().replace(/\/+$/, "");
}

// ---------- tool implementations ----------

async function callTool(name, args, ctx) {
  args = args || {};
  switch (name) {
    case "get_coverage_map": {
      const rows = await coverageMap();
      if (rows.length === 0) {
        return {
          note: "No lawyers have finished onboarding yet. Research All India for these core areas.",
          pairs: ["Criminal", "Civil & Commercial", "Arbitration", "Corporate & Securities"].map((a) => ({
            practice_area: a,
            jurisdiction: ALL_INDIA,
            lawyers: 0,
            last_checked_at: null,
          })),
        };
      }
      return { pairs: rows };
    }

    case "list_recent_updates": {
      const area = args.practice_area ? oneOf(args.practice_area, PRACTICE_AREAS, "practice_area") : null;
      const days = Number.isInteger(args.days) ? Math.min(Math.max(args.days, 1), 365) : 30;
      const rows = await recentUpdates({ area, days, limit: 100 });
      return {
        count: rows.length,
        updates: rows.map((r) => ({
          id: r.id,
          title: r.title,
          practice_area: r.practice_area,
          jurisdiction: r.jurisdiction,
          status: r.status,
          effective_date: r.effective_date,
          sections: r.sections,
          source_urls: (r.sources || []).map((s) => s.url),
        })),
      };
    }

    case "add_law_update": {
      const u = {
        title: reqString(args, "title", { max: 200 }),
        practice_area: oneOf(args.practice_area, PRACTICE_AREAS, "practice_area"),
        jurisdiction: oneOf(args.jurisdiction, JURISDICTIONS, "jurisdiction"),
        update_type: oneOf(args.update_type, UPDATE_TYPES, "update_type"),
        summary: reqString(args, "summary", { max: 4000 }),
        before_text: optString(args, "before", { max: 8000 }),
        after_text: optString(args, "after", { max: 8000 }),
        effective_date: null,
      };
      if (args.effective_date) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(args.effective_date) || isNaN(Date.parse(args.effective_date)))
          throw new ToolInputError("'effective_date' must be YYYY-MM-DD");
        u.effective_date = args.effective_date;
      }
      if (!Array.isArray(args.repercussions) || args.repercussions.length === 0)
        throw new ToolInputError("'repercussions' must be a non-empty array of strings");
      u.repercussions = args.repercussions.filter((x) => typeof x === "string" && x.trim()).map((x) => x.trim());
      if (u.repercussions.length === 0) throw new ToolInputError("'repercussions' must contain text");

      u.related_cases = (Array.isArray(args.related_cases) ? args.related_cases : [])
        .filter((c) => c && typeof c.name === "string" && c.name.trim())
        .map((c) => ({
          name: c.name.trim(),
          citation: typeof c.citation === "string" ? c.citation.trim() : "",
          relevance: typeof c.relevance === "string" ? c.relevance.trim() : "",
        }));

      if (!Array.isArray(args.sections)) throw new ToolInputError("'sections' must be an array (can be empty)");
      u.sections = normalizeSections(args.sections.filter((s) => typeof s === "string"));

      if (!Array.isArray(args.sources) || args.sources.length === 0)
        throw new ToolInputError("'sources' needs at least one {title, url}");
      u.sources = [];
      for (const s of args.sources) {
        if (!s || typeof s.url !== "string" || !isHttpUrl(s.url.trim()))
          throw new ToolInputError(`Invalid source url: ${JSON.stringify(s?.url)}`);
        u.sources.push({ title: typeof s.title === "string" ? s.title.trim() : "", url: cleanUrl(s.url) });
      }

      for (const s of u.sources) {
        // Homepage-only URLs (e.g. https://sci.gov.in) are too generic to signal a duplicate.
        if (new URL(s.url).pathname.replace(/\/+$/, "") === "") continue;
        const existing = await findBySourceUrl(s.url);
        if (existing) {
          return {
            duplicate: true,
            message: `Not added: source ${s.url} is already used by update #${existing.id} "${existing.title}" (${existing.status}).`,
            existing_id: existing.id,
          };
        }
      }

      const id = await insertUpdate(u);
      return {
        id,
        status: "draft",
        message: `Saved as draft #${id}. An editor will review it before lawyers see it.`,
        review_url: `${ctx.origin}/admin/updates/${id}`,
      };
    }

    case "mark_area_checked": {
      const area = oneOf(args.practice_area, PRACTICE_AREAS, "practice_area");
      const jur = oneOf(args.jurisdiction, JURISDICTIONS, "jurisdiction");
      const row = await markChecked(area, jur, optString(args, "note", { max: 1000 }));
      return { ok: true, ...row };
    }

    default:
      return null;
  }
}

// ---------- JSON-RPC plumbing ----------

function rpcResult(id, result) {
  return { jsonrpc: "2.0", id, result };
}
function rpcError(id, code, message) {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message } };
}

async function handleMessage(msg, ctx) {
  const isRequest = msg && typeof msg === "object" && "id" in msg && msg.id !== null && typeof msg.method === "string";
  if (!isRequest) return null; // notifications and responses get no reply

  const { id, method, params } = msg;
  switch (method) {
    case "initialize": {
      const asked = params?.protocolVersion;
      const protocolVersion = SUPPORTED_VERSIONS.includes(asked) ? asked : SUPPORTED_VERSIONS[0];
      return rpcResult(id, {
        protocolVersion,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions: INSTRUCTIONS,
      });
    }
    case "ping":
      return rpcResult(id, {});
    case "tools/list":
      return rpcResult(id, { tools: TOOLS });
    case "tools/call": {
      const name = params?.name;
      if (!TOOLS.some((t) => t.name === name)) return rpcError(id, -32602, `Unknown tool: ${name}`);
      try {
        const out = await callTool(name, params?.arguments, ctx);
        return rpcResult(id, {
          content: [{ type: "text", text: JSON.stringify(out, null, 2) }],
          structuredContent: out,
        });
      } catch (e) {
        const text = e instanceof ToolInputError ? `Invalid input: ${e.message}` : `Server error: ${e.message}`;
        if (!(e instanceof ToolInputError)) console.error("MCP tool error", name, e);
        return rpcResult(id, { content: [{ type: "text", text }], isError: true });
      }
    }
    case "resources/list":
      return rpcResult(id, { resources: [] });
    case "prompts/list":
      return rpcResult(id, { prompts: [] });
    default:
      return rpcError(id, -32601, `Method not found: ${method}`);
  }
}

function keyMatches(given) {
  const expected = process.env.MCP_KEY;
  if (!expected || !given) return false;
  const a = Buffer.from(String(given));
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

const JSON_HEADERS = { "content-type": "application/json", "cache-control": "no-store" };

export async function handleMcpRequest(req) {
  const url = new URL(req.url);
  const bearer = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!keyMatches(url.searchParams.get("key") || bearer)) {
    return new Response(JSON.stringify(rpcError(null, -32001, "Unauthorized: add ?key=YOUR_MCP_KEY to the connector URL")), {
      status: 401,
      headers: JSON_HEADERS,
    });
  }

  if (req.method !== "POST") {
    // Stateless server: no server-initiated SSE stream and no sessions to delete.
    return new Response(null, { status: 405, headers: { allow: "POST" } });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify(rpcError(null, -32700, "Parse error")), { status: 400, headers: JSON_HEADERS });
  }

  const ctx = { origin: url.origin };
  const batch = Array.isArray(body);
  const replies = (await Promise.all((batch ? body : [body]).map((m) => handleMessage(m, ctx)))).filter(Boolean);

  if (replies.length === 0) return new Response(null, { status: 202 });
  return new Response(JSON.stringify(batch ? replies : replies[0]), { status: 200, headers: JSON_HEADERS });
}

export { TOOLS };
