"use client";

// The landing moment of the RM Hub: conversion lift as the hero number on
// the brand gradient, with animated pipeline counters beside it.
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
      className="gradient-pan relative overflow-hidden rounded-3xl p-5 text-white sm:p-6"
      style={{ backgroundImage: "var(--hero-gradient)" }}
    >
      <div className="brand-arcs" />

      <div className="relative grid gap-5 sm:grid-cols-[auto_1fr] sm:items-center">
        {/* hero figure */}
        <div className="sm:pr-8">
          <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/65">
            AI conversion lift vs control
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-5xl font-extrabold leading-none sm:text-6xl">
              {lift >= 0 ? "+" : ""}
              {liftAnim.toFixed(1)}
              <span className="text-3xl sm:text-4xl">%</span>
            </span>
          </div>
          <span
            className={`mt-2.5 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${
              targetMet ? "bg-white/15 text-white" : "bg-black/20 text-white/85"
            }`}
          >
            {targetMet ? <Check width={12} height={12} /> : <Bolt width={12} height={12} />}
            {targetMet ? `Treated ${treatedAnim.toFixed(0)}% — beats the 30% track target` : "Building toward the 30% target"}
          </span>
        </div>

        {/* pipeline counters */}
        <div className="grid grid-cols-3 gap-3 border-t border-white/15 pt-4 sm:border-l sm:border-t-0 sm:pl-8 sm:pt-0">
          <HeroStat value={Math.round(qualifiedAnim)} label={`Qualified ≥ ${Math.round(threshold * 100)}%`} />
          <HeroStat
            value={Math.round(hotAnim)}
            label="Hot leads"
            icon={<Flame width={13} height={13} className="pulse-dot text-[#ffb469]" />}
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
        <span className="text-2xl font-extrabold leading-none sm:text-3xl">{value}</span>
      </div>
      <span className="mt-1 block text-[10.5px] font-semibold uppercase tracking-wide text-white/60">{label}</span>
    </div>
  );
}
