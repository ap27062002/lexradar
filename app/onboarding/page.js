import { requireUser } from "../../lib/auth.js";
import { saveInterestsAction } from "../../lib/actions.js";
import { PRACTICE_AREAS, JURISDICTIONS, ALL_INDIA } from "../../lib/constants.js";

export default async function OnboardingPage({ searchParams }) {
  const sp = await searchParams;
  const user = await requireUser({ allowUnonboarded: true });
  const areas = new Set(user.practice_areas || []);
  const jurs = new Set(user.jurisdictions || []);
  const states = JURISDICTIONS.filter((j) => j !== ALL_INDIA);

  return (
    <main className="container mid">
      <h1>{user.onboarded ? "Your interests" : `Welcome, ${user.name.split(" ")[0]}`}</h1>
      <p className="lede">Choose what you practise and where. Your dashboard will only show changes that match.</p>
      {sp?.error && <div className="alert error">Pick at least one practice area.</div>}

      <form action={saveInterestsAction} className="stack">
        <section className="card">
          <h2 style={{ marginTop: 0 }}>Practice areas</h2>
          <div className="checks">
            {PRACTICE_AREAS.map((a) => (
              <label key={a} className="check">
                <input type="checkbox" name="areas" value={a} defaultChecked={areas.has(a)} />
                {a}
              </label>
            ))}
          </div>
        </section>

        <section className="card">
          <h2 style={{ marginTop: 0 }}>Courts / states you appear in</h2>
          <p className="muted small">
            Central legislation, Supreme Court judgments and national regulators ({ALL_INDIA}) are always included.
          </p>
          <div className="checks">
            {states.map((j) => (
              <label key={j} className="check">
                <input type="checkbox" name="jurisdictions" value={j} defaultChecked={jurs.has(j)} />
                {j}
              </label>
            ))}
          </div>
        </section>

        <div>
          <button className="btn" type="submit">
            {user.onboarded ? "Save interests" : "Build my dashboard"}
          </button>
        </div>
      </form>
    </main>
  );
}
