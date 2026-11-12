"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  hashPassword,
  verifyPassword,
  startSession,
  endSession,
  requireUser,
  requireEditor,
  isAdminEmail,
} from "./auth.js";
import * as Q from "./queries.js";
import { PRACTICE_AREAS, JURISDICTIONS, UPDATE_TYPES, STATUSES } from "./constants.js";
import { parseList, parseSections, parseCases, parseSources, validDate } from "./forms.js";
import { SAMPLE_UPDATES } from "./samples.js";

const text = (fd, k, max = 10000) => String(fd.get(k) ?? "").trim().slice(0, max);
const intOf = (fd, k) => {
  const n = Number(fd.get(k));
  return Number.isInteger(n) && n > 0 ? n : null;
};

// ---------- Auth ----------

export async function signupAction(fd) {
  const email = text(fd, "email", 200).toLowerCase();
  const name = text(fd, "name", 120);
  const password = String(fd.get("password") || "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !name) redirect("/signup?error=missing");
  if (password.length < 8) redirect("/signup?error=short");
  const id = await Q.createUser({
    email,
    name,
    passwordHash: hashPassword(password),
    role: isAdminEmail(email) ? "editor" : "lawyer",
  });
  if (!id) redirect("/signup?error=exists");
  await startSession(id);
  redirect("/onboarding");
}

export async function loginAction(fd) {
  const email = text(fd, "email", 200).toLowerCase();
  const password = String(fd.get("password") || "");
  const row = await Q.getUserWithPasswordByEmail(email);
  if (!row || !verifyPassword(password, row.password_hash)) redirect("/login?error=1");
  await startSession(row.id);
  redirect("/dashboard");
}

export async function logoutAction() {
  await endSession();
  redirect("/");
}

// ---------- Lawyer ----------

export async function saveInterestsAction(fd) {
  const user = await requireUser({ allowUnonboarded: true });
  const areas = fd.getAll("areas").filter((a) => PRACTICE_AREAS.includes(a));
  const jurisdictions = fd.getAll("jurisdictions").filter((j) => JURISDICTIONS.includes(j));
  if (areas.length === 0) redirect("/onboarding?error=areas");
  await Q.saveInterests(user.id, areas, jurisdictions);
  revalidatePath("/dashboard");
  redirect("/dashboard?welcome=1");
}

export async function addMatterAction(fd) {
  const user = await requireUser();
  const title = text(fd, "title", 200);
  const sections = parseSections(text(fd, "sections", 2000));
  if (!title) redirect("/matters?error=title");
  await Q.addMatter(user.id, { title, court: text(fd, "court", 200), sections });
  revalidatePath("/matters");
  redirect("/matters");
}

export async function deleteMatterAction(fd) {
  const user = await requireUser();
  const id = intOf(fd, "id");
  if (id) await Q.deleteMatter(user.id, id);
  revalidatePath("/matters");
  redirect("/matters");
}

export async function saveNoteAction(fd) {
  const user = await requireUser();
  const id = intOf(fd, "update_id");
  if (!id) redirect("/dashboard");
  await Q.saveNote(user.id, id, text(fd, "body", 10000));
  redirect(`/updates/${id}?saved=1`);
}

export async function toggleBookmarkAction(fd) {
  const user = await requireUser();
  const id = intOf(fd, "update_id");
  if (!id) redirect("/dashboard");
  await Q.toggleBookmark(user.id, id);
  const back = text(fd, "back", 300);
  redirect(back.startsWith("/") ? back : `/updates/${id}`);
}

// ---------- Editor ----------

export async function editorSaveAction(fd) {
  const editor = await requireEditor();
  const id = intOf(fd, "id");
  if (!id) redirect("/admin");

  const f = {
    title: text(fd, "title", 200),
    practice_area: text(fd, "practice_area"),
    jurisdiction: text(fd, "jurisdiction"),
    update_type: text(fd, "update_type"),
    effective_date: validDate(text(fd, "effective_date")),
    summary: text(fd, "summary", 4000),
    before_text: text(fd, "before_text", 8000),
    after_text: text(fd, "after_text", 8000),
    repercussions: parseList(text(fd, "repercussions", 8000)),
    related_cases: parseCases(text(fd, "related_cases", 8000)),
    sections: parseSections(text(fd, "sections", 2000)),
    sources: parseSources(text(fd, "sources", 4000)),
  };
  const bad =
    !f.title ||
    !f.summary ||
    !PRACTICE_AREAS.includes(f.practice_area) ||
    !JURISDICTIONS.includes(f.jurisdiction) ||
    !UPDATE_TYPES.includes(f.update_type);
  if (bad) redirect(`/admin/updates/${id}?error=fields`);

  const intent = text(fd, "intent");
  if (intent === "publish" && f.sources.length === 0) redirect(`/admin/updates/${id}?error=sources`);

  await Q.editUpdate(id, f, editor.id);
  const nextStatus = { publish: "published", reject: "rejected", draft: "draft" }[intent];
  if (nextStatus && STATUSES.includes(nextStatus)) await Q.setStatus(id, nextStatus, editor.id);

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath(`/updates/${id}`);
  if (intent === "publish") redirect(`/admin?status=draft&done=published`);
  if (intent === "reject") redirect(`/admin?status=draft&done=rejected`);
  redirect(`/admin/updates/${id}?saved=1`);
}

export async function loadSamplesAction() {
  await requireEditor();
  const existing = await Q.recentUpdates({ days: 3650, limit: 1000 });
  const titles = new Set(existing.map((u) => u.title));
  for (const s of SAMPLE_UPDATES) {
    if (titles.has(s.title)) continue;
    const id = await Q.insertUpdate({ ...s, sections: parseSections(s.sections.join(",")), status: "draft", created_by: "sample" });
    await Q.setStatus(id, "published", null);
  }
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  redirect("/admin?status=published");
}
