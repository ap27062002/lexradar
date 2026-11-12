import "./globals.css";
import Link from "next/link";
import { currentUser } from "../lib/auth.js";
import { logoutAction } from "../lib/actions.js";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "LexRadar: law changes that matter to your practice",
  description: "Personalised tracker of new laws, amendments and judgments for Indian litigation lawyers.",
};

export default async function RootLayout({ children }) {
  const user = await currentUser().catch(() => null);
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <div className="topbar-inner">
            <Link href={user ? "/dashboard" : "/"} className="brand">
              Lex<span>Radar</span>
            </Link>
            <nav className="nav">
              {user && (
                <>
                  <Link href="/dashboard">Dashboard</Link>
                  <Link href="/matters">My matters</Link>
                  <Link href="/onboarding">Interests</Link>
                  {user.role === "editor" && (
                    <Link href="/admin" className="editor-link">
                      Review queue
                    </Link>
                  )}
                </>
              )}
            </nav>
            <div className="who">
              {user ? (
                <>
                  <span>
                    {user.name}
                    {user.role === "editor" ? " · Editor" : ""}
                  </span>
                  <form action={logoutAction}>
                    <button className="linkbtn" type="submit">
                      Log out
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <Link href="/login" style={{ color: "#d7dcea" }}>
                    Log in
                  </Link>
                  <Link href="/signup" style={{ color: "#e2c27a" }}>
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
