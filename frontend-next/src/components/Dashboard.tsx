"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, detectInitialMode, getMode, onModeChange } from "@/lib/api";
import { getSession, logout, Session } from "@/lib/auth";
import { timeHM } from "@/lib/format";
import {
  ActivityItem,
  ConnectionMode,
  Customer,
  Lead,
  LeadStatus,
  PerformanceStats,
} from "@/lib/types";
import { ActivityFeed } from "./ActivityFeed";
import { CampaignLift } from "./CampaignLift";
import { Header } from "./Header";
import { Chart, Flame, List, Phone, Users } from "./Icons";
import { LeadsBoard } from "./LeadsBoard";
import { OutreachModal } from "./OutreachModal";
import { PhoneSimulator, SimulatorActions } from "./PhoneSimulator";
import { useToast } from "./Toast";
import { TwinPortfolio } from "./TwinPortfolio";

type RMTab = "leads" | "portfolio";
type MobilePanel = "sim" | "rm";

export function Dashboard() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [mode, setMode] = useState<ConnectionMode>("live");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [perf, setPerf] = useState<PerformanceStats | null>(null);
  const [threshold, setThreshold] = useState(0.7);
  const [tab, setTab] = useState<RMTab>("leads");
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("sim");
  const [outreachLead, setOutreachLead] = useState<Lead | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [flashIds, setFlashIds] = useState<Set<number>>(new Set());
  const [resetting, setResetting] = useState(false);

  const showToast = useToast();
  const activityCounter = useRef(0);
  const prevLeadsRef = useRef<Map<number, number>>(new Map());

  const selected = customers.find((c) => c.id === selectedId) ?? null;

  const logActivity = useCallback((icon: string, text: string, kind: ActivityItem["kind"]) => {
    setActivity((prev) => [{ id: ++activityCounter.current, at: timeHM(), icon, text, kind }, ...prev].slice(0, 40));
  }, []);

  const refreshLeads = useCallback(async () => {
    try {
      const [nextLeads, nextPerf] = await Promise.all([api.getLeads(), api.getPerformance()]);

      // flash rows whose LRI moved since the last sync
      const prev = prevLeadsRef.current;
      const changed = new Set<number>();
      for (const lead of nextLeads) {
        const before = prev.get(lead.id);
        if (before !== undefined && before !== lead.propensity_score) changed.add(lead.id);
      }
      prevLeadsRef.current = new Map(nextLeads.map((l) => [l.id, l.propensity_score]));
      if (changed.size > 0) {
        setFlashIds(changed);
        setTimeout(() => setFlashIds(new Set()), 1500);
      }

      setLeads(nextLeads);
      setPerf(nextPerf);
    } catch {
      // polling errors are non-fatal; the client flips to standalone automatically
    }
  }, []);

  // auth gate — no session, no hub
  useEffect(() => {
    const s = getSession();
    if (!s) {
      router.replace("/login");
    } else {
      setSession(s);
    }
  }, [router]);

  const handleLogout = useCallback(() => {
    logout();
    router.replace("/login");
  }, [router]);

  // boot
  useEffect(() => {
    detectInitialMode();
    setMode(getMode());
    const unsubscribe = onModeChange((m) => {
      setMode(m);
      logActivity("🛰️", "Backend unreachable — switched to in-browser Standalone Engine.", "system");
    });

    (async () => {
      const custs = await api.getCustomers();
      setCustomers(custs);
      setMode(getMode());
      if (custs.length > 0) setSelectedId(custs[0].id);
      await refreshLeads();
    })();

    return unsubscribe;
  }, [refreshLeads, logActivity]);

  // background sync, mirroring the original 2.5s websocket-style polling
  useEffect(() => {
    const interval = setInterval(refreshLeads, 2500);
    return () => clearInterval(interval);
  }, [refreshLeads]);

  // ---------- simulator actions ----------

  const logClick = useCallback(
    async (pageUrl: string, action: string) => {
      if (!selected) return;
      await api.logClickstream({ customer_id: selected.id, page_url: pageUrl, action, duration_seconds: 15 });
      logActivity("👆", `${selected.name.split(" ")[0]} → ${action} on ${pageUrl}`, "click");
      showToast(`Logged ${action} on ${pageUrl}`);
      refreshLeads();
    },
    [selected, logActivity, showToast, refreshLeads],
  );

  const addTransaction = useCallback(
    async (amount: number, category: string, description: string, icon: string, note: string) => {
      if (!selected) return;
      await api.addTransaction({ customer_id: selected.id, amount, category, description });
      logActivity(icon, note, "transaction");
      showToast(note);
      refreshLeads();
    },
    [selected, logActivity, showToast, refreshLeads],
  );

  const actions: SimulatorActions = {
    logClick,
    salaryHike: () => {
      if (!selected) return;
      const hike = Math.round(selected.gross_monthly_income * 0.15);
      addTransaction(
        hike,
        "Salary",
        `IDBI SALARY CRED BUMP / ${selected.name.toUpperCase()}`,
        "📈",
        `Salary hike of ₹${hike.toLocaleString("en-IN")} credited for ${selected.name.split(" ")[0]}`,
      );
    },
    autoJourney: async () => {
      if (!selected) return;
      showToast("Simulating customer search journey…");
      await logClick("/auto-loan/details", "VIEW");
      setTimeout(() => logClick("/auto-loan/emi-calculator", "CALCULATE_EMI"), 450);
      setTimeout(() => logClick("/auto-loan/apply", "CLICK_APPLY"), 900);
    },
    decorSpend: () =>
      addTransaction(-65000, "Shopping", "DECORATIVE LIGHTS & FURNITURE DEBIT / IKEA MUMBAI", "🛋️", "₹65,000 IKEA home-decor spend logged — home-loan intent rising"),
    ccPenalty: () =>
      addTransaction(-1200, "Penalty", "IDBI BANK CREDIT CARD LATE PAYMENT PENALTY CHARGE", "⚠️", "Credit-card late fee penalty logged — risk gate re-evaluating"),
  };

  // ---------- outreach outcome ----------

  const handleOutcome = useCallback(
    async (lead: Lead, status: LeadStatus) => {
      try {
        await api.updateLeadStatus(lead.id, status);
        setOutreachLead(null);
        logActivity(status === "Converted" ? "✅" : "❌", `${lead.customer.name} · ${lead.loan_type} marked ${status} (${lead.cohort})`, "outcome");
        showToast(`Campaign logged: lead marked ${status}`);
        refreshLeads();
      } catch {
        showToast("Failed to update lead status", true);
      }
    },
    [logActivity, showToast, refreshLeads],
  );

  const handleReset = useCallback(async () => {
    setResetting(true);
    try {
      await api.reset();
      prevLeadsRef.current = new Map();
      setOutreachLead(null);
      const custs = await api.getCustomers();
      setCustomers(custs);
      if (custs.length > 0) setSelectedId(custs[0].id);
      await refreshLeads();
      logActivity("🔄", "Sandbox database reset & re-seeded.", "system");
      showToast("Sandbox database reset and re-seeded");
    } catch {
      showToast("Error resetting database", true);
    } finally {
      setResetting(false);
    }
  }, [refreshLeads, logActivity, showToast]);

  // ---------- derived stats ----------

  const qualified = leads.filter((l) => l.propensity_score >= threshold);
  const hotCount = qualified.filter((l) => l.intent_level === "Hot").length;

  if (!session) {
    // brief splash while the auth check runs (or redirect is in flight)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-brand border-t-transparent" aria-label="Loading" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header mode={mode} onReset={handleReset} resetting={resetting} session={session} onLogout={handleLogout} />

      <main className="mx-auto grid max-w-[1700px] gap-5 px-4 pb-24 pt-5 sm:px-6 lg:grid-cols-[minmax(340px,400px)_1fr] lg:pb-5">
        {/* LEFT: customer portal simulator (mobile: shown on the "sim" panel) */}
        <div className={`${mobilePanel === "sim" ? "flex" : "hidden"} flex-col gap-4 lg:flex`}>
          <SectionTitle
            Icon={Phone}
            title="Customer Portal Simulator"
            sub="Act on behalf of a customer and fire real-time behavioral events"
          />
          <PhoneSimulator customers={customers} selected={selected} onSelect={setSelectedId} actions={actions} />
          <ActivityFeed items={activity} />
        </div>

        {/* RIGHT: RM command center (mobile: shown on the "rm" panel) */}
        <div className={`${mobilePanel === "rm" ? "flex" : "hidden"} min-w-0 flex-col gap-4 lg:flex`}>
          <SectionTitle
            Icon={Chart}
            title="Relationship Manager Hub"
            sub="Real-time underwriting feed, propensity tracking and AI campaign triggers"
          />

          {/* KPI row */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatTile label="Qualified leads" value={String(qualified.length)} note={`≥ ${Math.round(threshold * 100)}% LRI`} />
            <StatTile
              label="Hot leads"
              value={String(hotCount)}
              note="ready for outreach"
              icon={<Flame width={14} height={14} className="text-accent" />}
            />
            <StatTile
              label="Conversion target"
              value=">30%"
              note="Track 02 benchmark"
              className="col-span-2 sm:col-span-1"
            />
          </div>

          {/* tabs */}
          <div className="flex gap-1 rounded-xl bg-surface-2 p-1">
            <TabButton active={tab === "leads"} onClick={() => setTab("leads")} Icon={List} label="Prioritized Leads & Outreach" />
            <TabButton active={tab === "portfolio"} onClick={() => setTab("portfolio")} Icon={Users} label="Customer Twin Portfolio" />
          </div>

          {tab === "leads" ? (
            <div className="flex flex-col gap-4">
              <CampaignLift perf={perf} />
              <LeadsBoard
                leads={leads}
                threshold={threshold}
                onThreshold={setThreshold}
                onOutreach={setOutreachLead}
                flashIds={flashIds}
              />
            </div>
          ) : (
            <TwinPortfolio customers={customers} />
          )}
        </div>
      </main>

      <footer className="hidden border-t border-hairline py-4 text-center text-[11px] text-ink-muted lg:block">
        Prospect Assist AI · IDBI Innovate 2026 — Track 02 prototype · Behavioral Credit & Hyper-Targeted Lead Engine
      </footer>

      {/* mobile panel switcher */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-surface-1/95 backdrop-blur-md lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Panel switcher"
      >
        <div className="grid grid-cols-2">
          <MobileNavButton
            active={mobilePanel === "sim"}
            onClick={() => setMobilePanel("sim")}
            Icon={Phone}
            label="Customer Simulator"
          />
          <MobileNavButton
            active={mobilePanel === "rm"}
            onClick={() => setMobilePanel("rm")}
            Icon={Chart}
            label="RM Hub"
            badge={hotCount > 0 ? hotCount : undefined}
          />
        </div>
      </nav>

      {outreachLead && <OutreachModal lead={outreachLead} onClose={() => setOutreachLead(null)} onOutcome={handleOutcome} />}
    </div>
  );
}

function SectionTitle({ Icon, title, sub }: { Icon: typeof Phone; title: string; sub: string }) {
  return (
    <div>
      <h2 className="flex items-center gap-2 text-base font-extrabold text-ink">
        <Icon width={16} height={16} className="text-brand" /> {title}
      </h2>
      <p className="mt-0.5 text-xs text-ink-muted">{sub}</p>
    </div>
  );
}

function StatTile({
  label,
  value,
  note,
  icon,
  className = "",
}: {
  label: string;
  value: string;
  note: string;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`card px-4 py-3.5 ${className}`}>
      <span className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">
        {icon}
        {label}
      </span>
      <span className="mt-1 block text-2xl font-extrabold leading-none text-ink">{value}</span>
      <span className="mt-1 block text-[10.5px] text-ink-muted">{note}</span>
    </div>
  );
}

function MobileNavButton({
  active,
  onClick,
  Icon,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  Icon: typeof Phone;
  label: string;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center gap-1 py-2.5 text-[10.5px] font-bold transition ${
        active ? "text-brand" : "text-ink-muted"
      }`}
    >
      <span className={`h-0.5 w-10 rounded-full ${active ? "bg-brand" : "bg-transparent"}`} />
      <Icon width={17} height={17} />
      {label}
      {badge !== undefined && (
        <span className="absolute right-[22%] top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-extrabold text-white">
          {badge}
        </span>
      )}
    </button>
  );
}

function TabButton({ active, onClick, Icon, label }: { active: boolean; onClick: () => void; Icon: typeof List; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-bold transition ${
        active ? "bg-surface-1 text-brand shadow-sm" : "text-ink-muted hover:text-ink"
      }`}
    >
      <Icon width={14} height={14} /> {label}
    </button>
  );
}
