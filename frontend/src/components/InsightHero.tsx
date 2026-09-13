"use client";

// The landing moment of the RM Hub, compressed into a single slim band:
// conversion lift as the hero figure with the pipeline counters beside it.
import { PerformanceStats } from "@/lib/types";
import { useCountUp } from "@/lib/useCountUp";
import { Bolt, Check, Flame } from "./Icons";

export function InsightHero({
  perf,
  qualified,
  hot,
  threshold,
}: {
  perf: PerformanceStats | null;
  qualified: number;
  hot: number;
  threshold: number;
}) {
  const treatedRate = perf?.treated.rate ?? 0;
  const controlRate = perf?.control.rate ?? 0;
  const lift = Math.round((treatedRate - controlRate) * 10) / 10;

  const liftAnim = useCountUp(lift);
  const qualifiedAnim = useCountUp(qualified, 600);
  const hotAnim = useCountUp(hot, 600);
  const treatedAnim = useCountUp(treatedRate, 700);

  const targetMet = treatedRate > 30;

  return (
    <div
      className="gradient-pan relative overflow-hidden rounded-2xl px-4 py-3 text-white sm:px-5"
      style={{ backgroundImage: "var(--hero-gradient)" }}
    >
      <div className="brand-arcs" />

      <div className="relative flex flex-wrap items-center gap-x-6 gap-y-2">
        {/* hero figure */}
        <div className="flex items-center gap-3 sm:pr-4">
          <span className="text-4xl font-extrabold leading-none">
            {lift >= 0 ? "+" : ""}
            {liftAnim.toFixed(1)}
            <span className="text-2xl">%</span>
          </span>
          <div className="leading-tight">
            <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-white/65">
              AI conversion lift
              <span className="hidden sm:inline"> vs control</span>
            </span>
            <span
              className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide ${
                targetMet ? "bg-white/15 text-white" : "bg-black/20 text-white/85"
              }`}
            >
              {targetMet ? <Check width={10} height={10} /> : <Bolt width={10} height={10} />}
              {targetMet ? "Beats 30% target" : "Toward 30% target"}
            </span>
          </div>
        </div>

        {/* pipeline counters — spread across the band so it reads full, not hollow */}
        <div className="flex flex-1 items-center justify-between gap-4 border-t border-white/15 pt-2 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
          <HeroStat value={Math.round(qualifiedAnim)} label={`Qualified ≥ ${Math.round(threshold * 100)}%`} />
          <HeroStat
            value={Math.round(hotAnim)}
            label="Hot leads"
            icon={<Flame width={12} height={12} className="pulse-dot text-[#ffb469]" />}
          />
          <HeroStat value={`${treatedAnim.toFixed(0)}%`} label="Treated conv." />
        </div>
      </div>
    </div>
  );
}

function HeroStat({ value, label, icon }: { value: number | string; label: string; icon?: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-xl font-extrabold leading-none">{value}</span>
      </div>
      <span className="mt-0.5 block text-[9.5px] font-semibold uppercase tracking-wide text-white/60">{label}</span>
    </div>
  );
}
