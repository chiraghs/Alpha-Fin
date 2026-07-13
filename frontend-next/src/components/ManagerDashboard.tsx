"use client";

// Branch Manager cockpit — monitors the whole RM team: consolidated KPIs, an
// AI executive briefing, org-wide A/B lift, a ranked leaderboard and a full
// per-RM scorecard. No customer simulator here (not the manager's job); the
// demo RM's book updates live from RM-Hub activity via 2.5s polling.
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, detectInitialMode, getMode, onModeChange } from "@/lib/api";
import { getSession, logout, Session } from "@/lib/auth";
import { ConnectionMode, TeamPerformance } from "@/lib/types";
import { Header } from "./Header";
import { CampaignLift } from "./CampaignLift";
import { Chart } from "./Icons";
import { AISummaryCard } from "./manager/AISummaryCard";
import { RMDetailPanel } from "./manager/RMDetailPanel";
import { RMLeaderboard } from "./manager/RMLeaderboard";
import { TeamOverview } from "./manager/TeamOverview";
import { useToast } from "./Toast";

export function ManagerDashboard() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [mode, setMode] = useState<ConnectionMode>("live");
  const [team, setTeam] = useState<TeamPerformance | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [resetting, setResetting] = useState(false);
  const showToast = useToast();

  const refresh = useCallback(async () => {
    try {
      const next = await api.getTeamPerformance();
      setTeam(next);
      setSelectedId((cur) => cur ?? next.rms.find((r) => r.is_live)?.id ?? next.rms[0]?.id ?? null);
    } catch {
      // polling errors are non-fatal; the client flips to standalone automatically
    }
  }, []);

  // auth gate
  useEffect(() => {
    const s = getSession();
    if (!s) router.replace("/login");
    else setSession(s);
  }, [router]);

  const handleLogout = useCallback(() => {
    logout();
    router.replace("/login");
  }, [router]);

  // boot + mode detection
  useEffect(() => {
    detectInitialMode();
    setMode(getMode());
    const unsubscribe = onModeChange((m) => setMode(m));
    (async () => {
      await refresh();
      setMode(getMode());
    })();
    return unsubscribe;
  }, [refresh]);

  // live sync — mirrors the RM Hub cadence so the demo RM's book moves in real time
  useEffect(() => {
    const interval = setInterval(refresh, 2500);
    return () => clearInterval(interval);
  }, [refresh]);

  const handleReset = useCallback(async () => {
    setResetting(true);
    try {
      await api.reset();
      await refresh();
      showToast("Sandbox database reset and re-seeded");
    } catch {
      showToast("Error resetting database", true);
    } finally {
      setResetting(false);
    }
  }, [refresh, showToast]);

  if (!session || !team) {
    return (
      <div className="app-mesh flex min-h-screen items-center justify-center">
        <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-brand border-t-transparent" aria-label="Loading" />
      </div>
    );
  }

  const selected = team.rms.find((r) => r.id === selectedId) ?? team.rms[0];
  const teamCohort = { treated: team.consolidated.treated, control: team.consolidated.control };

  return (
    <div className="app-mesh min-h-screen">
      <Header mode={mode} onReset={handleReset} resetting={resetting} session={session} onLogout={handleLogout} />

      <main className="mx-auto flex max-w-[1700px] flex-col gap-5 px-4 pb-16 pt-5 sm:px-6">
        <div className="rise-in">
          <h2 className="flex items-center gap-2 text-base font-extrabold text-ink">
            <Chart width={16} height={16} className="text-brand" /> Branch Manager · Team Command Center
          </h2>
          <p className="mt-0.5 text-xs text-ink-muted">
            Consolidated performance, target attainment and AI coaching across {team.consolidated.active_rms} relationship managers
          </p>
        </div>

        <div className="rise-in-1">
          <TeamOverview c={team.consolidated} forecast={team.forecast} />
        </div>

        <div className="rise-in-2 grid gap-5 lg:grid-cols-2">
          <AISummaryCard summary={team.ai_summary} c={team.consolidated} />
          <CampaignLift perf={teamCohort} />
        </div>

        <div className="rise-in-3 grid items-start gap-5 lg:grid-cols-[1.35fr_1fr]">
          <RMLeaderboard rms={team.rms} selectedId={selected.id} onSelect={setSelectedId} />
          <div className="lg:sticky lg:top-[92px]">
            <RMDetailPanel rm={selected} />
          </div>
        </div>
      </main>
    </div>
  );
}
