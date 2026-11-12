import Link from "next/link";

export default function NotFound() {
  return (
    <main className="container narrow">
      <h1>Not found</h1>
      <p className="muted">That page doesn't exist or isn't published yet.</p>
      <Link href="/dashboard" className="btn secondary">
        Back to dashboard
      </Link>
    </main>
  );
}
