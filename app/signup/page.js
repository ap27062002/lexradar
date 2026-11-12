import Link from "next/link";
import { signupAction } from "../../lib/actions.js";

const ERRORS = {
  missing: "Please enter your name and a valid email.",
  short: "Password must be at least 8 characters.",
  exists: "An account with that email already exists. Log in instead.",
};

export default async function SignupPage({ searchParams }) {
  const sp = await searchParams;
  return (
    <main className="container narrow">
      <h1>Create your account</h1>
      <p className="muted">Takes a minute. Next, you'll choose your practice areas.</p>
      {sp?.error && <div className="alert error">{ERRORS[sp.error] || "Something went wrong."}</div>}
      <form action={signupAction} className="card">
        <div className="field">
          <label htmlFor="name">Full name</label>
          <input id="name" name="name" type="text" required placeholder="Adv. Priya Rao" />
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div className="field">
          <label htmlFor="password">
            Password <span className="hint">(8+ characters)</span>
          </label>
          <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
        </div>
        <button className="btn" type="submit">
          Create account
        </button>
      </form>
      <p className="muted small" style={{ marginTop: "1rem" }}>
        Already have an account? <Link href="/login">Log in</Link>
      </p>
    </main>
  );
}
