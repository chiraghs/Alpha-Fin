"use client";

import { Lead } from "@/lib/types";
import { inr, inrCompact } from "@/lib/format";
import { Bolt, Flame, Sparkles } from "./Icons";

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
        <h3 className="text-sm font-bold text-ink">Prioritized leads</h3>
        <div className="flex items-center gap-3">
          <label htmlFor="threshold" className="text-xs font-medium text-ink-secondary">
            Min LRI score <strong className="tabular-nums text-ink">{sliderPct}%</strong>
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
          <p className="py-6 text-center text-xs text-ink-muted">
            No active leads clear the {sliderPct}% threshold. Slide the filter down to inspect colder prospects.
          </p>
        ) : (
          filtered.map((lead) => (
            <div
              key={lead.id}
              className={`rounded-xl border border-hairline bg-surface-2 p-3.5 ${flashIds.has(lead.id) ? "flash-row" : ""}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="block text-sm font-bold text-ink">{lead.customer.name}</span>
                  <span className="text-[11px] text-ink-muted">
                    {lead.loan_type} · CIBIL {lead.customer.credit_score}
                  </span>
                </div>
                <IntentBadge level={lead.intent_level} score={lead.propensity_score} />
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                    lead.cohort === "Treated" ? "bg-brand-soft text-brand-strong" : "bg-surface-3 text-ink-muted"
                  }`}
                >
                  {lead.cohort}
                </span>
                {(lead.intent_velocity ?? 0) >= 15 && (
                  <span className="flex items-center gap-1 rounded-full bg-critical/10 px-2 py-0.5 text-[10px] font-bold uppercase text-critical">
                    <Bolt width={10} height={10} /> Call now
                  </span>
                )}
                {lead.life_events && lead.life_events.length > 0 && (
                  <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-semibold text-accent-strong">
                    {lead.life_events[0].icon} {lead.life_events[0].label.split(" (")[0]}
                  </span>
                )}
              </div>

              <div className="mt-3 flex items-end justify-between gap-2">
                <div className="flex gap-4">
                  <div>
                    <span className="block text-[9.5px] font-semibold uppercase tracking-wide text-ink-muted">Disposable</span>
                    <span className="text-xs font-bold tabular-nums text-ink">{inr(lead.calculated_disposable_income)}</span>
                  </div>
                  <div>
                    <span className="block text-[9.5px] font-semibold uppercase tracking-wide text-ink-muted">Eligible</span>
                    <span className="text-xs font-bold tabular-nums text-brand">{inrCompact(lead.eligible_loan_amount)}</span>
                  </div>
                </div>
                <button
                  onClick={() => onOutreach(lead)}
                  className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold text-white"
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
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead>
            <tr className="text-[10.5px] uppercase tracking-wider text-ink-muted">
              {["Customer", "Target product", "Disposable income", "CIBIL", "Readiness (LRI)", "Cohort", "Eligible limit", ""].map((h, i) => (
                <th key={i} className="px-5 py-3 font-bold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-10 text-center text-xs text-ink-muted">
                  No active leads clear the {sliderPct}% qualification threshold. Slide the filter down to inspect
                  colder prospects.
                </td>
              </tr>
            ) : (
              filtered.map((lead) => (
                <tr
                  key={lead.id}
                  className={`border-t border-hairline transition hover:bg-surface-2 ${flashIds.has(lead.id) ? "flash-row" : ""}`}
                >
                  <td className="px-5 py-3.5">
                    <span className="font-bold text-ink">{lead.customer.name}</span>
                    <span className="block text-[10.5px] text-ink-muted">{lead.customer.account_number}</span>
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
                  <td className="px-5 py-3.5 tabular-nums font-semibold text-ink-secondary">{lead.customer.credit_score}</td>
                  <td className="px-5 py-3.5">
                    <IntentBadge level={lead.intent_level} score={lead.propensity_score} />
                    {(lead.intent_velocity ?? 0) >= 15 && (
                      <span
                        className="mt-1 flex w-fit items-center gap-1 rounded-full bg-critical/10 px-2 py-0.5 text-[10px] font-bold uppercase text-critical"
                        title={`Intent velocity +${lead.intent_velocity}% in 7 days`}
                      >
                        <Bolt width={10} height={10} /> Call now
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide ${
                        lead.cohort === "Treated" ? "bg-brand-soft text-brand-strong" : "bg-surface-3 text-ink-muted"
                      }`}
                    >
                      {lead.cohort}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-bold tabular-nums text-brand" title={inr(lead.eligible_loan_amount)}>
                    {inrCompact(lead.eligible_loan_amount)}
                  </td>
                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => onOutreach(lead)}
                      className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold text-white transition hover:opacity-90"
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

function IntentBadge({ level, score }: { level: "Hot" | "Warm" | "Cold"; score: number }) {
  const pctVal = Math.round(score * 100);
  if (level === "Hot") {
    return (
      <span className="flex w-fit items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-bold text-accent-strong">
        <Flame width={11} height={11} className="pulse-dot" /> Hot · {pctVal}%
      </span>
    );
  }
  if (level === "Warm") {
    return (
      <span className="w-fit rounded-full bg-warning/15 px-2.5 py-1 text-[11px] font-bold text-ink-secondary">
        Warm · {pctVal}%
      </span>
    );
  }
  return <span className="w-fit rounded-full bg-surface-3 px-2.5 py-1 text-[11px] font-bold text-ink-muted">Cold · {pctVal}%</span>;
}
