"use client";

// Full individual scorecard for the selected RM — every KPI the manager needs:
// attainment, pipeline funnel, weekly momentum, A/B cohort split, product mix,
// and an AI coaching recommendation derived from the numbers.
import { RMPerformance } from "@/lib/types";
import { inrCompact } from "@/lib/format";
import { Meter } from "../charts/Meter";
import { Brain, Wallet, Users, TrendUp, Sparkles } from "../Icons";
import { RMAvatar, StatusBadge, TrendArrow, TrendSpark } from "./parts";

const PRODUCTS = ["Auto Loan", "Home Loan", "Personal Loan", "Mortgage Loan"];

export function RMDetailPanel({ rm }: { rm: RMPerformance }) {
  const maxMix = Math.max(...Object.values(rm.product_mix), 1);
  const coachTint = rm.status === "behind" ? "border-accent/40 bg-accent-soft" : "border-brand/30 bg-brand-soft/60";
  const coachIcon = rm.status === "behind" ? "text-accent-strong" : "text-brand-strong";

  return (
    <div className="card flex flex-col gap-5 p-5">
      {/* header */}
      <div className="flex items-start gap-3">
        <RMAvatar id={rm.id} initials={rm.initials} size={46} live={rm.is_live} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-extrabold text-ink">{rm.name}</h3>
            {rm.is_live && (
              <span className="rounded-full bg-brand px-1.5 py-0.5 text-[8.5px] font-extrabold uppercase tracking-wide text-white">Live book</span>
            )}
          </div>
          <p className="text-[11.5px] text-ink-muted">{rm.region} · {rm.tenure_years} yrs tenure</p>
        </div>
        <StatusBadge status={rm.status} />
      </div>

      {/* AI coaching */}
      <div className={`rounded-2xl border p-3.5 ${coachTint}`}>
        <div className="mb-1 flex items-center gap-1.5">
          <Brain width={14} height={14} className={coachIcon} />
          <span className={`text-[11px] font-extrabold uppercase tracking-wide ${coachIcon}`}>AI coaching</span>
          <Sparkles width={12} height={12} className="text-accent" />
        </div>
        <p className="text-[12.5px] leading-relaxed text-ink-secondary">{rm.coaching}</p>
      </div>

      {/* headline KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <Kpi icon={<Users width={13} height={13} />} label="Conversions" value={`${rm.converted}`} sub={`of ${rm.target_conversions} target`} />
        <Kpi icon={<Wallet width={13} height={13} />} label="Disbursed" value={inrCompact(rm.disbursed_amount)} sub={`of ${inrCompact(rm.target_disbursal)}`} />
        <Kpi icon={<TrendUp width={13} height={13} />} label="Conversion rate" value={`${rm.conversion_rate}%`} sub={`${rm.avg_propensity}% avg propensity`} />
        <Kpi
          icon={<TrendArrow dir={rm.trend_direction} />}
          label="Weekly momentum"
          value=""
          spark={<TrendSpark data={rm.weekly_trend} dir={rm.trend_direction} width={92} height={26} />}
          sub={rm.trend_direction === "up" ? "trending up" : rm.trend_direction === "down" ? "slipping" : "steady"}
        />
      </div>

      {/* attainment bars */}
      <div className="flex flex-col gap-3">
        <Meter label="Conversion target attainment" value={rm.conv_attainment} display={`${Math.round(rm.conv_attainment)}%`} tone={rm.conv_attainment >= 95 ? "brand" : rm.conv_attainment >= 70 ? "brand" : "accent"} />
        <Meter label="Disbursal target attainment" value={rm.disbursal_attainment} display={`${Math.round(rm.disbursal_attainment)}%`} tone={rm.disbursal_attainment >= 70 ? "brand" : "accent"} />
      </div>

      {/* pipeline funnel */}
      <div>
        <span className="mb-2 block text-[11px] font-extrabold uppercase tracking-wide text-ink-muted">Pipeline · {rm.assigned} assigned leads</span>
        <div className="grid grid-cols-4 gap-2">
          <Funnel label="New" value={rm.new} />
          <Funnel label="Contacted" value={rm.contacted} />
          <Funnel label="Converted" value={rm.converted} good />
          <Funnel label="Rejected" value={rm.rejected} />
        </div>
      </div>

      {/* A/B cohort split */}
      <div>
        <span className="mb-2 block text-[11px] font-extrabold uppercase tracking-wide text-ink-muted">AI vs generic outreach</span>
        <div className="flex flex-col gap-2.5">
          <CohortRow label="AI-personalized" stat={rm.treated} emphasized />
          <CohortRow label="Generic control" stat={rm.control} />
        </div>
      </div>

      {/* product mix */}
      <div>
        <span className="mb-2 block text-[11px] font-extrabold uppercase tracking-wide text-ink-muted">Product mix</span>
        <div className="flex flex-col gap-2.5">
          {PRODUCTS.map((p) => (
            <Meter key={p} label={p} value={((rm.product_mix[p] || 0) / maxMix) * 100} display={`${rm.product_mix[p] || 0}`} tone="brand" />
          ))}
        </div>
      </div>
    </div>
  );
}

function Kpi({ icon, label, value, sub, spark }: { icon: React.ReactNode; label: string; value: string; sub: string; spark?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-hairline bg-surface-2 p-3">
      <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
        <span className="text-brand">{icon}</span>
        {label}
      </span>
      {spark ? <div className="mt-1.5">{spark}</div> : <span className="mt-1 block text-lg font-extrabold tabular-nums text-ink">{value}</span>}
      <span className="mt-0.5 block text-[10.5px] text-ink-muted">{sub}</span>
    </div>
  );
}

function Funnel({ label, value, good }: { label: string; value: number; good?: boolean }) {
  return (
    <div className="rounded-xl border border-hairline bg-surface-2 py-2 text-center">
      <span className={`block text-lg font-extrabold tabular-nums ${good ? "text-good-text" : "text-ink"}`}>{value}</span>
      <span className="block text-[9.5px] font-semibold uppercase tracking-wide text-ink-muted">{label}</span>
    </div>
  );
}

function CohortRow({ label, stat, emphasized }: { label: string; stat: { total: number; converted: number; rate: number }; emphasized?: boolean }) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-medium text-ink-secondary">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: emphasized ? "var(--series-green)" : "var(--series-deemph)" }} />
          {label}
        </span>
        <span className="text-sm font-bold tabular-nums text-ink">
          {stat.rate}%<span className="ml-1.5 text-[10px] font-medium text-ink-muted">{stat.converted}/{stat.total}</span>
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-3">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, stat.rate)}%`, background: emphasized ? "var(--series-green)" : "var(--series-deemph)" }} />
      </div>
    </div>
  );
}
