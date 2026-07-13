"use client";

import { Lead } from "@/lib/types";
import { inr, inrCompact } from "@/lib/format";
import { Bolt, Flame, Sparkles } from "./Icons";
import { Avatar } from "./Avatar";
import { ScoreRing } from "./charts/ScoreRing";

export function LeadsBoard({
  leads,
  threshold,
  onThreshold,
  onOutreach,
  flashIds,
}: {
  leads: Lead[];
  threshold: number; // 0-1
  onThreshold: (v: number) => void;
  onOutreach: (lead: Lead) => void;
  flashIds: Set<number>;
}) {
  const filtered = leads.filter((l) => l.propensity_score >= threshold);
  const sliderPct = Math.round(threshold * 100);

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-5 py-4">
        <div>
          <h3 className="text-sm font-extrabold text-ink">Prioritized leads</h3>
          <span className="text-[11px] text-ink-muted">Ranked by Loan Readiness Index · risk-gated</span>
        </div>
        <div className="flex items-center gap-3">
          <label htmlFor="threshold" className="text-xs font-semibold text-ink-secondary">
            Min LRI <strong className="tabular-nums text-ink">{sliderPct}%</strong>
          </label>
          <input
            id="threshold"
            type="range"
            min={35}
            max={95}
            step={5}
            value={sliderPct}
            onChange={(e) => onThreshold(Number(e.target.value) / 100)}
            className="brand-range w-36"
            style={{ "--fill": `${((sliderPct - 35) / 60) * 100}%` } as React.CSSProperties}
          />
        </div>
      </div>

      {/* mobile: stacked lead cards */}
      <div className="flex flex-col gap-3 p-4 md:hidden">
        {filtered.length === 0 ? (
          <EmptyState pct={sliderPct} />
        ) : (
          filtered.map((lead) => (
            <div
              key={lead.id}
              className={`rounded-2xl border border-hairline bg-surface-2 p-4 ${flashIds.has(lead.id) ? "flash-row" : ""}`}
            >
              <div className="flex items-center gap-3">
                <ScoreRing value={lead.propensity_score * 100} size={48} label={`LRI for ${lead.customer.name}`} />
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-extrabold text-ink">{lead.customer.name}</span>
                  <span className="text-[11px] text-ink-muted">
                    {lead.loan_type} · CIBIL {lead.customer.credit_score}
                  </span>
                </div>
                <IntentChip level={lead.intent_level} />
              </div>

              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <CohortChip cohort={lead.cohort} />
                {(lead.intent_velocity ?? 0) >= 15 && <VelocityChip velocity={lead.intent_velocity!} />}
                {lead.life_events && lead.life_events.length > 0 && (
                  <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-semibold text-accent-strong">
                    {lead.life_events[0].icon} {lead.life_events[0].label.split(" (")[0]}
                  </span>
                )}
              </div>

              <div className="mt-3 flex items-end justify-between gap-2 border-t border-dashed border-hairline pt-3">
                <div className="flex gap-5">
                  <div>
                    <span className="block text-[9.5px] font-bold uppercase tracking-wide text-ink-muted">Disposable</span>
                    <span className="text-xs font-extrabold tabular-nums text-ink">{inr(lead.calculated_disposable_income)}</span>
                  </div>
                  <div>
                    <span className="block text-[9.5px] font-bold uppercase tracking-wide text-ink-muted">Eligible</span>
                    <span className="text-xs font-extrabold tabular-nums text-brand">{inrCompact(lead.eligible_loan_amount)}</span>
                  </div>
                </div>
                <button
                  onClick={() => onOutreach(lead)}
                  className="flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-extrabold text-white active:scale-95"
                  style={{ background: "var(--brand-gradient)" }}
                >
                  <Sparkles width={12} height={12} /> Outreach
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* desktop: full table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead>
            <tr className="text-[10.5px] uppercase tracking-wider text-ink-muted">
              {["Customer", "Target product", "Disposable income", "CIBIL", "Readiness (LRI)", "Cohort", "Eligible limit", ""].map((h, i) => (
                <th key={i} className="px-5 py-3 font-extrabold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <EmptyState pct={sliderPct} />
                </td>
              </tr>
            ) : (
              filtered.map((lead) => (
                <tr
                  key={lead.id}
                  className={`border-t border-hairline transition hover:bg-surface-2 ${flashIds.has(lead.id) ? "flash-row" : ""}`}
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar name={lead.customer.name} size={36} />
                      <div>
                        <span className="block font-extrabold text-ink">{lead.customer.name}</span>
                        <span className="block text-[10.5px] text-ink-muted">{lead.customer.account_number}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="font-semibold text-ink-secondary">{lead.loan_type}</span>
                    {lead.life_events && lead.life_events.length > 0 && (
                      <span
                        className="mt-1 block w-fit rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-semibold text-accent-strong"
                        title={`${lead.life_events[0].label} — confidence ${lead.life_events[0].confidence}%`}
                      >
                        {lead.life_events[0].icon} {lead.life_events[0].label.split(" (")[0]}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 tabular-nums text-ink-secondary">{inr(lead.calculated_disposable_income)}</td>
                  <td className="px-5 py-3.5 tabular-nums font-bold text-ink-secondary">{lead.customer.credit_score}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <ScoreRing value={lead.propensity_score * 100} size={44} label={`LRI for ${lead.customer.name}`} />
                      <div className="flex flex-col gap-1">
                        <IntentChip level={lead.intent_level} />
                        {(lead.intent_velocity ?? 0) >= 15 && <VelocityChip velocity={lead.intent_velocity!} />}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <CohortChip cohort={lead.cohort} />
                  </td>
                  <td className="px-5 py-3.5 font-extrabold tabular-nums text-brand" title={inr(lead.eligible_loan_amount)}>
                    {inrCompact(lead.eligible_loan_amount)}
                  </td>
                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => onOutreach(lead)}
                      className="lift flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-extrabold text-white"
                      style={{ background: "var(--brand-gradient)" }}
                    >
                      <Sparkles width={12} height={12} /> Outreach
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EmptyState({ pct }: { pct: number }) {
  return (
    <p className="px-5 py-10 text-center text-xs text-ink-muted">
      No active leads clear the {pct}% qualification threshold. Slide the filter down to inspect colder prospects.
    </p>
  );
}

function IntentChip({ level }: { level: "Hot" | "Warm" | "Cold" }) {
  if (level === "Hot") {
    return (
      <span className="flex w-fit items-center gap-1 rounded-full bg-accent-soft px-2.5 py-0.5 text-[10.5px] font-extrabold text-accent-strong">
        <Flame width={10} height={10} className="pulse-dot" /> Hot
      </span>
    );
  }
  if (level === "Warm") {
    return <span className="w-fit rounded-full bg-warning/15 px-2.5 py-0.5 text-[10.5px] font-extrabold text-ink-secondary">Warm</span>;
  }
  return <span className="w-fit rounded-full bg-surface-3 px-2.5 py-0.5 text-[10.5px] font-extrabold text-ink-muted">Cold</span>;
}

function CohortChip({ cohort }: { cohort: "Treated" | "Control" }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide ${
        cohort === "Treated" ? "bg-brand-soft text-brand-strong" : "bg-surface-3 text-ink-muted"
      }`}
    >
      {cohort}
    </span>
  );
}

function VelocityChip({ velocity }: { velocity: number }) {
  return (
    <span
      className="flex w-fit items-center gap-1 rounded-full bg-critical/10 px-2 py-0.5 text-[10px] font-extrabold uppercase text-critical"
      title={`Intent velocity +${velocity}% in 7 days`}
    >
      <Bolt width={10} height={10} /> Call now
    </span>
  );
}
