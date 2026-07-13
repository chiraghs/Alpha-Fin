"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DEMO_CREDENTIALS, getSession, login } from "@/lib/auth";
import { IdbiMark } from "@/components/Logo";
import { Alert, Bolt, Brain, Chart, Check, Moon, Sparkles, Sun } from "@/components/Icons";
import { useTheme } from "@/components/ThemeProvider";

export default function LoginPage() {
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // already signed in → straight to the hub
  useEffect(() => {
    if (getSession()) router.replace("/");
  }, [router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    // small delay so the transition reads as a real sign-in
    setTimeout(() => {
      try {
        login(email, password);
        router.replace("/");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Sign-in failed.");
        setSubmitting(false);
      }
    }, 400);
  };

  const fillDemo = () => {
    setEmail(DEMO_CREDENTIALS.email);
    setPassword(DEMO_CREDENTIALS.password);
    setError("");
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* brand panel */}
      <div className="relative hidden flex-col justify-between p-10 text-white lg:flex" style={{ background: "var(--brand-gradient)" }}>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white">
            <IdbiMark size={34} />
          </div>
          <div className="leading-tight">
            <span className="block text-xl font-extrabold tracking-wide">IDBI BANK</span>
            <span className="block text-[11px] font-medium uppercase tracking-[0.2em] text-white/70">
              Prospect Assist AI
            </span>
          </div>
        </div>

        <div className="max-w-md">
          <span className="mb-4 inline-block rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider">
            IDBI Innovate 2026 · Track 02
          </span>
          <h1 className="text-3xl font-extrabold leading-tight">
            Behavioral credit intelligence for hyper-targeted retail lending.
          </h1>
          <ul className="mt-6 flex flex-col gap-3.5 text-sm text-white/90">
            <Feature Icon={Brain} text="Five-model decision engine — cash-flow income, GBDT intent, risk gate, blended conversion, historical propensity" />
            <Feature Icon={Bolt} text="Real-time clickstream & transaction triggers with intent-velocity surge alerts" />
            <Feature Icon={Chart} text="A/B campaign lift tracking against the >30% conversion benchmark" />
            <Feature Icon={Sparkles} text="AI-personalized outreach across WhatsApp, email and RM call scripts" />
          </ul>
        </div>

        <p className="text-[11px] text-white/60">
          Prototype for hackathon evaluation · syncs with the FastAPI sandbox or runs fully in-browser.
        </p>
      </div>

      {/* form panel */}
      <div className="relative flex items-center justify-center p-6">
        <button
          onClick={toggle}
          aria-label="Toggle color theme"
          className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full border border-hairline bg-surface-2 text-ink-secondary transition hover:text-accent"
        >
          {theme === "dark" ? <Sun width={15} height={15} /> : <Moon width={15} height={15} />}
        </button>

        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <IdbiMark size={36} />
            <div className="leading-tight">
              <span className="block text-lg font-extrabold text-ink">IDBI BANK</span>
              <span className="block text-[10px] font-medium uppercase tracking-[0.18em] text-ink-muted">
                Prospect Assist AI
              </span>
            </div>
          </div>

          <h2 className="text-2xl font-extrabold text-ink">Relationship Manager sign-in</h2>
          <p className="mt-1 text-sm text-ink-muted">Access the lead intelligence hub and customer simulator.</p>

          <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-secondary">
                Work email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@idbibank.in"
                className="w-full rounded-xl border border-hairline bg-surface-2 px-4 py-3 text-sm font-medium text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-(--ring)"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-secondary">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-hairline bg-surface-2 px-4 py-3 text-sm font-medium text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-(--ring)"
              />
            </div>

            {error && (
              <p className="flex items-start gap-2 rounded-lg border border-critical/40 bg-critical/10 px-3 py-2.5 text-xs font-medium text-critical" role="alert">
                <Alert width={14} height={14} className="mt-px shrink-0" /> {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-1 flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
              style={{ background: "var(--brand-gradient)" }}
            >
              {submitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Signing in…
                </>
              ) : (
                "Sign in to RM Hub"
              )}
            </button>
          </form>

          {/* demo access */}
          <div className="mt-6 rounded-xl border border-dashed border-accent/50 bg-accent-soft p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="block text-[11px] font-bold uppercase tracking-wide text-accent-strong">
                  Judge / demo access
                </span>
                <span className="mt-1 block text-xs text-ink-secondary">
                  {DEMO_CREDENTIALS.email}
                  <br />
                  password: <code className="font-bold">{DEMO_CREDENTIALS.password}</code>
                </span>
              </div>
              <button
                onClick={fillDemo}
                className="flex shrink-0 items-center gap-1.5 rounded-full border border-accent/60 px-3 py-1.5 text-xs font-bold text-accent-strong transition hover:bg-accent hover:text-white"
              >
                <Check width={12} height={12} /> Autofill
              </button>
            </div>
          </div>

          <p className="mt-6 text-center text-[11px] text-ink-muted">
            Client-side demo authentication — swaps for IDBI SSO when connected to the bank sandbox.
          </p>
        </div>
      </div>
    </div>
  );
}

function Feature({ Icon, text }: { Icon: typeof Brain; text: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/15">
        <Icon width={14} height={14} />
      </span>
      {text}
    </li>
  );
}
