export function fmtDate(v) {
  if (!v) return "";
  // "YYYY-MM-DD" strings: format without timezone shifts
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const [y, m, d] = v.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  }
  const d = new Date(v);
  if (isNaN(d)) return "";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
}

export function fmtDateTime(v) {
  if (!v) return "never";
  const d = new Date(v);
  if (isNaN(d)) return "";
  return d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });
}

export function typeBadgeClass(t) {
  if (/judgment/i.test(t)) return "badge navy";
  if (/bill/i.test(t)) return "badge amber";
  return "badge gold";
}
