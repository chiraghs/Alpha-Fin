"use client";

// Consolidated team band — hero attainment figure, roll-up counters and the
// AI month-end forecast compressed into one slim strip so the cockpit fits a
// single screen.
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

  const paceMeta = {
    ahead: { label: "Ahead of plan", cls: "bg-white/15 text-white" },
    on_track: { label: "On pace", cls: "bg-white/15 text-white" },
    behind: { label: "Trailing plan", cls: "bg-black/25 text-white/85" },
  }[forecast.pace];

  return (
    <div
      className="gradient-pan relative overflow-hidden rounded-2xl px-4 py-3 text-white sm:px-5"
      style={{ backgroundImage: "var(--hero-gradient)" }}
    >
      <div className="brand-arcs" />

      <div className="relative flex flex-wrap items-center gap-x-6 gap-y-2.5">
        {/* hero figure: disbursal attainment */}
        <div className="flex items-center gap-3 sm:pr-4">
          <span className="text-4xl font-extrabold leading-none">
            {Math.round(attain)}
            <span className="text-2xl">%</span>
          </span>
          <div className="leading-tight">
            <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-white/65">
              Team disbursal vs target
            </span>
            <div className="mt-1 h-1.5 w-36 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-white transition-all duration-1000 ease-out"
                style={{ width: `${Math.min(100, c.disbursal_attainment)}%` }}
              />
            </div>
            <span className="mt-1 block text-[10px] font-semibold text-white/75">
              {inrCompact(c.total_disbursed)} of {inrCompact(c.total_target_disbursal)}
              <span
                className={`ml-2 inline-flex items-center gap-1 rounded-full px-1.5 py-px text-[9px] font-bold uppercase tracking-wide ${
                  onTrack ? "bg-white/15" : "bg-black/20 text-white/85"
                }`}
              >
                {onTrack ? <Check width={9} height={9} /> : <Bolt width={9} height={9} />}
                {onTrack ? "On plan" : "Coaching"}
              </span>
            </span>
          </div>
        </div>

        {/* roll-up counters */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/15 pt-2 sm:gap-x-7 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
          <Stat icon={<Users width={12} height={12} className="text-white/70" />} value={Math.round(convAnim)} label={`Conversions · ${c.active_rms} RMs`} />
          <Stat icon={<TrendUp width={12} height={12} className="text-white/70" />} value={`${rateAnim.toFixed(1)}%`} label="Team conversion" />
          <Stat icon={<Bolt width={12} height={12} className="text-[#ffb469]" />} value={`+${liftAnim.toFixed(0)}`} label="AI lift (pts)" />
          <Stat icon={<Wallet width={12} height={12} className="text-white/70" />} value={inrCompact(c.total_disbursed)} label="Disbursed" />
        </div>

        {/* AI month-end forecast */}
        <div className="flex flex-1 flex-wrap items-center justify-start gap-x-4 gap-y-1.5 border-t border-white/15 pt-2 lg:justify-end lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-white/65">
            <Target width={12} height={12} /> Forecast · day {forecast.days_elapsed}/{forecast.days_in_month}
          </span>
          <span className="text-[12px] font-bold tabular-nums">
            {forecast.projected_conversions}
            <span className="ml-1 text-[9.5px] font-semibold text-white/60">proj conv (tgt {forecast.target_conversions})</span>
          </span>
          <span className="text-[12px] font-bold tabular-nums">
            {inrCompact(forecast.projected_disbursal)}
            <span className="ml-1 text-[9.5px] font-semibold text-white/60">proj disb</span>
          </span>
          <span className={`rounded-full px-2 py-0.5 text-[9.5px] font-extrabold uppercase tracking-wide ${paceMeta.cls}`}>
            {paceMeta.label}
          </span>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: number | string; label: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-xl font-extrabold leading-none">{value}</span>
      </div>
      <span className="mt-0.5 block text-[9px] font-semibold uppercase tracking-wide text-white/60">{label}</span>
    </div>
  );
}
