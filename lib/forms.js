// Pure helpers that turn editor textareas into structured data (and back).
import { normalizeSections } from "./constants.js";

const lines = (text) =>
  String(text || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

export function parseList(text) {
  return lines(text);
}

export function parseSections(text) {
  return normalizeSections(String(text || "").split(/[,\n]/));
}

/** "Name | Citation | Relevance" per line */
export function parseCases(text) {
  return lines(text).map((l) => {
    const [name = "", citation = "", ...rest] = l.split("|").map((x) => x.trim());
    return { name, citation, relevance: rest.join(" | ") };
  }).filter((c) => c.name);
}

export function casesToText(cases) {
  return (cases || []).map((c) => [c.name, c.citation || "", c.relevance || ""].join(" | ")).join("\n");
}

/** "Title | URL" or just "URL" per line; non-http lines are dropped */
export function parseSources(text) {
  return lines(text)
    .map((l) => {
      const parts = l.split("|").map((x) => x.trim());
      const url = parts.find((p) => /^https?:\/\//i.test(p)) || "";
      const title = parts.filter((p) => p !== url).join(" ").trim();
      return { title, url: url.replace(/\/+$/, "") };
    })
    .filter((s) => s.url);
}

export function sourcesToText(sources) {
  return (sources || []).map((s) => (s.title ? `${s.title} | ${s.url}` : s.url)).join("\n");
}

export function validDate(v) {
  return /^\d{4}-\d{2}-\d{2}$/.test(v || "") && !isNaN(Date.parse(v)) ? v : null;
}
