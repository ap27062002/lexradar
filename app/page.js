import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "../lib/auth.js";

export default async function Home() {
  const user = await currentUser().catch(() => null);
  if (user) redirect("/dashboard");

  return (
    <main className="container">
      <section className="hero">
        <span className="badge gold">For litigation lawyers in India</span>
        <h1 style={{ marginTop: "1rem" }}>Every law change that touches your practice, and your live matters.</h1>
        <p className="lede" style={{ maxWidth: 640 }}>
          New statutes, amendments, notifications and judgments, researched daily, checked by a legal editor, and filtered to
          your practice areas and courts. LexRadar tells you what changed, what it means for your cases, and which precedents
          to read with it.
        </p>
        <div className="row" style={{ marginTop: "1.5rem" }}>
          <Link href="/signup" className="btn">
            Create free account
          </Link>
          <Link href="/login" className="btn secondary">
            Log in
          </Link>
        </div>
      </section>

      <section className="features">
        <div className="card">
          <h3>Your areas only</h3>
          <p className="muted">Pick practice areas and High Court jurisdictions once. Your feed skips everything else.</p>
        </div>
        <div className="card">
          <h3>Flags your live matters</h3>
          <p className="muted">
            Tag matters with the sections they involve (IPC 420, CrPC 438…). When a change touches them, you see it first.
          </p>
        </div>
        <div className="card">
          <h3>Before → after, with precedent</h3>
          <p className="muted">Each update shows the old and new position, practical consequences, related cases and sources.</p>
        </div>
      </section>
    </main>
  );
}
