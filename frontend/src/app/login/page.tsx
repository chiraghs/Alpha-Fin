"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DEMO_CREDENTIALS, MANAGER_CREDENTIALS, getSession, login } from "@/lib/auth";
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

  const fillDemo = (persona: "rm" | "manager") => {
    const creds = persona === "manager" ? MANAGER_CREDENTIALS : DEMO_CREDENTIALS;
    setEmail(creds.email);
    setPassword(creds.password);
    setError("");
  };

  return (
    <div
      className="gradient-pan relative flex min-h-screen items-center justify-center p-4 sm:p-6"
      style={{ backgroundImage: "var(--hero-gradient)" }}
    >
      <div className="brand-arcs" />

      <button
        onClick={toggle}
        aria-label="Toggle color theme"
        className="absolute right-5 top-5 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
      >
        {theme === "dark" ? <Sun width={15} height={15} /> : <Moon width={15} height={15} />}
      </button>

      <div className="relative grid w-full max-w-4xl overflow-hidden rounded-[2rem] shadow-[0_40px_90px_-30px_rgba(0,0,0,0.55)] lg:grid-cols-[1.05fr_1fr]">
        {/* brand story panel */}
        <div className="relative hidden flex-col justify-between bg-white/[0.06] p-9 text-white backdrop-blur-xl lg:flex">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-lg">
              <IdbiMark size={32} />
            </div>
            <div className="leading-tight">
              <span className="block text-lg font-extrabold tracking-wide">IDBI BANK</span>
              <span className="block text-[10px] font-bold uppercase tracking-[0.22em] text-white/60">
                Prospect Assist AI
              </span>
            </div>
          </div>

          <div>
            <span className="mb-4 inline-block rounded-full bg-[#f58220] px-3 py-1 text-[10.5px] font-extrabold uppercase tracking-wider text-white">
              IDBI Innovate 2026 · Track 02
            </span>
            <h1 className="text-[26px] font-extrabold leading-snug">
              Turn everyday banking signals into
              <span className="text-[#ffc38a]"> ready-to-convert </span>
              lending leads.
            </h1>
            <ul className="mt-6 flex flex-col gap-3 text-[13px] text-white/85">
              <Feature Icon={Brain} text="Five-model decision engine with explainable scores" />
              <Feature Icon={Bolt} text="Real-time clickstream & transaction intent triggers" />
              <Feature Icon={Chart} text="A/B lift tracking against the >30% conversion target" />
              <Feature Icon={Sparkles} text="Hyper-personalized outreach: WhatsApp · Email · RM call" />
            </ul>
          </div>

          <p className="text-[10.5px] text-white/50">
            Hackathon prototype · pairs with the FastAPI sandbox or runs fully in-browser.
          </p>
        </div>

        {/* sign-in card */}
        <div className="glass bg-surface-1/95 p-7 sm:p-9" style={{ background: "var(--surface-1)" }}>
          <div className="mb-7 flex items-center gap-3 lg:hidden">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-surface-2">
              <IdbiMark size={28} />
            </span>
            <div className="leading-tight">
              <span className="block text-base font-extrabold text-ink">IDBI BANK</span>
              <span className="block text-[9.5px] font-bold uppercase tracking-[0.2em] text-ink-muted">
                Prospect Assist AI
              </span>
            </div>
          </div>

          <h2 className="text-xl font-extrabold text-ink sm:text-2xl">Sign in to Prospect Assist AI</h2>
          <p className="mt-1 text-[13px] text-ink-muted">
            Relationship Managers reach the lead hub &amp; simulator; Branch Managers reach the team cockpit.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-wide text-ink-secondary">
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
                className="w-full rounded-2xl border border-hairline bg-surface-2 px-4 py-3 text-sm font-medium text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-(--ring)"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-wide text-ink-secondary">
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
                className="w-full rounded-2xl border border-hairline bg-surface-2 px-4 py-3 text-sm font-medium text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-(--ring)"
              />
            </div>

            {error && (
              <p className="flex items-start gap-2 rounded-xl border border-critical/40 bg-critical/10 px-3 py-2.5 text-xs font-medium text-critical" role="alert">
                <Alert width={14} height={14} className="mt-px shrink-0" /> {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="lift mt-1 flex items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-extrabold text-white disabled:opacity-60"
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

          {/* demo access — two personas */}
          <div className="mt-6 rounded-2xl border border-dashed border-accent/50 bg-accent-soft p-4">
            <span className="block text-[10.5px] font-extrabold uppercase tracking-wide text-accent-strong">
              Judge / demo access · one-tap autofill
            </span>
            <span className="mt-1 block text-[11px] leading-relaxed text-ink-muted">
              Shared password: <code className="font-bold text-ink-secondary">{DEMO_CREDENTIALS.password}</code>
            </span>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                onClick={() => fillDemo("rm")}
                className="flex flex-col items-start gap-0.5 rounded-xl border border-accent/50 bg-surface-1 px-3 py-2 text-left transition hover:border-accent hover:bg-accent hover:text-white"
              >
                <span className="flex items-center gap-1 text-[11px] font-extrabold">
                  <Check width={11} height={11} /> Relationship Manager
                </span>
                <span className="text-[10px] opacity-80">{DEMO_CREDENTIALS.email}</span>
              </button>
              <button
                onClick={() => fillDemo("manager")}
                className="flex flex-col items-start gap-0.5 rounded-xl border border-brand/50 bg-surface-1 px-3 py-2 text-left transition hover:border-brand hover:bg-brand hover:text-white"
              >
                <span className="flex items-center gap-1 text-[11px] font-extrabold">
                  <Chart width={11} height={11} /> Branch Manager
                </span>
                <span className="text-[10px] opacity-80">{MANAGER_CREDENTIALS.email}</span>
              </button>
            </div>
          </div>

          <p className="mt-6 text-center text-[10.5px] text-ink-muted">
            Client-side demo authentication — swaps for IDBI SSO on the bank sandbox.
          </p>
        </div>
      </div>
    </div>
  );
}

function Feature({ Icon, text }: { Icon: typeof Brain; text: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-white/12">
        <Icon width={14} height={14} />
      </span>
      {text}
    </li>
  );
}
