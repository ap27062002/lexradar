import Link from "next/link";
import { loginAction } from "../../lib/actions.js";

export default async function LoginPage({ searchParams }) {
  const sp = await searchParams;
  return (
    <main className="container narrow">
      <h1>Log in</h1>
      {sp?.error && <div className="alert error">Wrong email or password.</div>}
      <form action={loginAction} className="card">
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" required autoComplete="current-password" />
        </div>
        <button className="btn" type="submit">
          Log in
        </button>
      </form>
      <p className="muted small" style={{ marginTop: "1rem" }}>
        New here? <Link href="/signup">Create an account</Link>
      </p>
    </main>
  );
}
