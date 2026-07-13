"use client";

import { useTheme } from "./ThemeProvider";
import { IdbiLogo } from "./Logo";
import { Alert, LogOut, Moon, Reset, Sun } from "./Icons";
import { ConnectionMode } from "@/lib/types";
import { Session } from "@/lib/auth";

export function Header({
  mode,
  onReset,
  resetting,
  session,
  onLogout,
}: {
  mode: ConnectionMode;
  onReset: () => void;
  resetting: boolean;
  session: Session;
  onLogout: () => void;
}) {
  const { theme, toggle } = useTheme();

  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-surface-1/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1700px] items-center justify-between gap-2 px-3 py-3 sm:gap-3 sm:px-6">
        <div className="flex items-center gap-4">
          <IdbiLogo />
          <div className="hidden items-center gap-2 border-l border-hairline pl-4 md:flex">
            <span className="rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-accent-strong">
              IDBI Innovate 2026
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
              Track 02 · Retail Lending Intelligence
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <span
            title={
              mode === "live"
                ? "Connected to the FastAPI sandbox backend"
                : "Backend unreachable — running the full decision engine in your browser"
            }
            className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
              mode === "live"
                ? "border-brand/40 bg-brand-soft text-brand-strong"
                : "border-warning/50 bg-accent-soft text-accent-strong"
            }`}
          >
            {mode === "live" ? (
              <span className="pulse-dot inline-block h-2 w-2 rounded-full bg-brand" />
            ) : (
              <Alert width={13} height={13} />
            )}
            <span className="hidden sm:inline">{mode === "live" ? "Live API" : "Standalone Mode"}</span>
          </span>

          <button
            onClick={onReset}
            disabled={resetting}
            className="flex items-center gap-2 rounded-full border border-hairline bg-surface-2 px-3 py-1.5 text-xs font-semibold text-ink-secondary transition hover:border-brand/50 hover:text-brand disabled:opacity-50"
          >
            <Reset width={13} height={13} className={resetting ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Reset Sandbox</span>
          </button>

          <button
            onClick={toggle}
            aria-label="Toggle color theme"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-hairline bg-surface-2 text-ink-secondary transition hover:border-accent/60 hover:text-accent"
          >
            {theme === "dark" ? <Sun width={15} height={15} /> : <Moon width={15} height={15} />}
          </button>

          <div className="ml-0.5 flex items-center gap-1.5 border-l border-hairline pl-2 sm:ml-1 sm:gap-2 sm:pl-3">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-extrabold text-white"
              style={{ background: "var(--brand-gradient)" }}
              title={session.email}
            >
              {session.name
                .split(" ")
                .slice(0, 2)
                .map((w) => w[0]?.toUpperCase())
                .join("")}
            </span>
            <div className="hidden leading-tight xl:block">
              <span className="block max-w-36 truncate text-xs font-bold text-ink">{session.name}</span>
              <span className="block text-[10px] text-ink-muted">{session.role}</span>
            </div>
            <button
              onClick={onLogout}
              aria-label="Sign out"
              title="Sign out"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-hairline bg-surface-2 text-ink-secondary transition hover:border-critical/60 hover:text-critical"
            >
              <LogOut width={14} height={14} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
