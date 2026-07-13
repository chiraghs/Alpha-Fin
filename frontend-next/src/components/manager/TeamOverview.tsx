"use client";

// The landing moment of the Manager cockpit: team target attainment as the hero
// on the brand gradient, with animated roll-up counters and a month-end forecast.
import { TeamConsolidated, TeamForecast } from "@/lib/types";
import { inrCompact } from "@/lib/format";
import { useCountUp } from "@/lib/useCountUp";
import { Check, Bolt, Users, Wallet, Target, TrendUp } from "../Icons";

export function TeamOverview({ c, forecast }: { c: TeamConsolidated; forecast: TeamForecast }) {
  const attain = useCountUp(c.disbursal_attainment, 800);
  const convAnim = useCountUp(c.total_converted, 700);
  const rateAnim = useCountUp(c.conversion_rate, 700);
  const liftAnim = useCountUp(c.lift, 700);

  const onTrack = c.disbursal_attainment >= 85;
  const monthPct = Math.round((forecast.days_elapsed / forecast.days_in_month) * 100);

  const paceMeta = {
    ahead: { label: "Ahead of plan", className: "bg-white/15 text-white" },
    on_track: { label: "On pace", className: "bg-white/15 text-white" },
    behind: { label: "Trailing plan", className: "bg-black/25 text-white/85" },
  }[forecast.pace];

  return (
    <div className="flex flex-col gap-4">
      <div className="gradient-pan relative overflow-hidden rounded-3xl p-5 text-white sm:p-6" style={{ backgroundImage: "var(--hero-gradient)" }}>
        <div className="brand-arcs" />
        <div className="relative grid gap-5 lg:grid-cols-[auto_1fr] lg:items-center">
          {/* hero figure: disbursal attainment */}
          <div className="lg:pr-8">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/65">Team disbursal vs target</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-5xl font-extrabold leading-none sm:text-6xl">
                {Math.round(attain)}
                <span className="text-3xl sm:text-4xl">%</span>
              </span>
            </div>
            <div className="mt-3 h-2 w-full max-w-[280px] overflow-hidden rounded-full bg-white/20">
              <div className="h-full rounded-full bg-white transition-all duration-1000 ease-out" style={{ width: `${Math.min(100, c.disbursal_attainment)}%` }} />
            </div>
            <span className="mt-2.5 block text-[12px] font-semibold text-white/80">
              {inrCompact(c.total_disbursed)} disbursed of {inrCompact(c.total_target_disbursal)} target
            </span>
            <span className={`mt-2.5 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${onTrack ? "bg-white/15 text-white" : "bg-black/20 text-white/85"}`}>
              {onTrack ? <Check width={12} height={12} /> : <Bolt width={12} height={12} />}
              {onTrack ? "Team tracking to plan" : "Below plan — coaching needed"}
            </span>
          </div>

          {/* roll-up counters */}
          <div className="grid grid-cols-2 gap-3 border-t border-white/15 pt-4 sm:grid-cols-4 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
            <Stat icon={<Users width={13} height={13} className="text-white/70" />} value={c.total_converted} anim={Math.round(convAnim)} label={`Conversions · ${c.active_rms} RMs`} />
            <Stat icon={<TrendUp width={13} height={13} className="text-white/70" />} value={`${c.conversion_rate}%`} anim={`${rateAnim.toFixed(1)}%`} label="Team conversion" />
            <Stat icon={<Bolt width={13} height={13} className="text-[#ffb469]" />} value={`+${c.lift}`} anim={`+${liftAnim.toFixed(0)}`} label="AI lift (pts)" />
            <Stat icon={<Wallet width={13} height={13} className="text-white/70" />} value={inrCompact(c.total_disbursed)} label="Disbursed" />
          </div>
        </div>
      </div>

      {/* month-end AI forecast */}
      <div className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-strong">
            <Target width={17} height={17} />
          </span>
          <div>
            <h3 className="text-sm font-extrabold text-ink">AI month-end forecast</h3>
            <p className="text-[11px] text-ink-muted">Run-rate projection · day {forecast.days_elapsed} of {forecast.days_in_month} ({monthPct}% elapsed)</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <ForecastStat label="Projected conversions" value={`${forecast.projected_conversions}`} sub={`target ${forecast.target_conversions}`} good={forecast.projected_conversions >= forecast.target_conversions} />
          <ForecastStat label="Projected disbursal" value={inrCompact(forecast.projected_disbursal)} sub={`target ${inrCompact(forecast.target_disbursal)}`} good={forecast.projected_disbursal >= forecast.target_disbursal} />
          <span className={`inline-flex items-center gap-1.5 self-center rounded-full px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wide ${paceMeta.className === "bg-black/25 text-white/85" ? "bg-accent-soft text-accent-strong" : "bg-brand-soft text-good-text"}`}>
            {paceMeta.label}
          </span>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, value, anim, label }: { icon: React.ReactNode; value: number | string; anim?: number | string; label: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-2xl font-extrabold leading-none">{anim ?? value}</span>
      </div>
      <span className="mt-1 block text-[10px] font-semibold uppercase tracking-wide text-white/60">{label}</span>
    </div>
  );
}

function ForecastStat({ label, value, sub, good }: { label: string; value: string; sub: string; good: boolean }) {
  return (
    <div>
      <span className="block text-[10px] font-semibold uppercase tracking-wide text-ink-muted">{label}</span>
      <span className={`text-lg font-extrabold tabular-nums ${good ? "text-good-text" : "text-ink"}`}>{value}</span>
      <span className="ml-1.5 text-[11px] font-medium text-ink-muted">{sub}</span>
    </div>
  );
}
