export const APP_NAME = "LexRadar";

export const PRACTICE_AREAS = [
  "Criminal",
  "Civil & Commercial",
  "Arbitration",
  "Corporate & Securities",
  "Insolvency (IBC)",
  "Banking & Finance",
  "Tax",
  "Intellectual Property",
  "Labour & Employment",
  "Constitutional & Administrative",
  "Family",
  "Real Estate & RERA",
  "Consumer",
  "Environmental",
  "Data Protection & IT",
];

// "All India" covers central legislation, the Supreme Court and nationwide regulators.
// Every lawyer sees All India updates for their practice areas.
export const ALL_INDIA = "All India";

export const JURISDICTIONS = [
  ALL_INDIA,
  "Delhi",
  "Maharashtra",
  "Karnataka",
  "Tamil Nadu",
  "Telangana",
  "Andhra Pradesh",
  "Kerala",
  "Gujarat",
  "Rajasthan",
  "Uttar Pradesh",
  "Madhya Pradesh",
  "West Bengal",
  "Punjab & Haryana",
  "Bihar",
  "Odisha",
];

export const UPDATE_TYPES = [
  "New statute",
  "Amendment",
  "Rules / Notification",
  "Regulator circular",
  "Supreme Court judgment",
  "High Court judgment",
  "Bill / Proposal",
];

export const STATUSES = ["draft", "published", "rejected"];

/**
 * Canonical form for statute references so matter-matching is a plain string compare.
 * "s. 420 ipc" / "IPC Sec 420" / "IPC 420" -> "IPC 420"
 * "BNS 318(4)" stays "BNS 318(4)"
 */
export function normalizeSection(raw) {
  if (!raw) return "";
  let s = String(raw).toUpperCase().replace(/\./g, " ").replace(/\s+/g, " ").trim();
  s = s.replace(/\b(SECTION|SECTIONS|SEC|S|U\/S)\b/g, " ").replace(/\s+/g, " ").trim();
  // If written "420 IPC", flip to "IPC 420"
  const m = s.match(/^(\d+[A-Z]?(?:\(\w+\))*)\s+([A-Z][A-Z&]*)$/);
  if (m) s = `${m[2]} ${m[1]}`;
  return s;
}

export function normalizeSections(list) {
  const out = [];
  for (const item of list || []) {
    const n = normalizeSection(item);
    if (n && !out.includes(n)) out.push(n);
  }
  return out;
}
