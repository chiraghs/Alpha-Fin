"use client";

// Campaign efficacy — emphasis form (dataviz) compressed into one slim strip:
// Treated wears the brand hue, Control the de-emphasis gray, every value
// direct-labeled, lift as the stat headline.
import { PerformanceStats } from "@/lib/types";
import { Check, Sparkles } from "./Icons";

export function CampaignLift({ perf }: { perf: PerformanceStats | null }) {
  const treated = perf?.treated ?? { rate: 0, converted: 0, total: 0 };
  const control = perf?.control ?? { rate: 0, converted: 0, total: 0 };
  const lift = Math.round((treated.rate - control.rate) * 10) / 10;
  const targetMet = lift >= 15;

  return (
    <div className="card shrink-0 px-4 py-2.5">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <h3 className="flex shrink-0 items-center gap-1.5 text-xs font-bold text-ink" title="A/B cohorts · real-time impact assessment">
          <Sparkles width={13} height={13} className="text-accent" />
          <span className="hidden xl:inline">Campaign efficacy</span>
          <span className="xl:hidden">A/B</span>
        </h3>

        <div className="grid min-w-0 flex-1 grid-cols-2 gap-4">
          <CohortBar label="Treated · AI" rate={treated.rate} converted={treated.converted} total={treated.total} emphasized />
          <CohortBar label="Control · generic" rate={control.rate} converted={control.converted} total={control.total} />
        </div>

        <div className="flex shrink-0 items-center gap-2 border-l border-hairline pl-4">
          <span className="text-lg font-extrabold leading-none tabular-nums text-ink">
            {lift >= 0 ? "+" : ""}
            {lift.toFixed(1)}%
          </span>
          <span
            className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide ${
              targetMet ? "bg-brand-soft text-good-text" : "bg-accent-soft text-accent-strong"
            }`}
          >
            {targetMet ? <Check width={10} height={10} /> : null}
            {targetMet ? "≥15% lift" : "<15% lift"}
          </span>
        </div>
      </div>
    </div>
  );
}

function CohortBar({
  label,
  rate,
  converted,
  total,
  emphasized,
}: {
  label: string;
  rate: number;
  converted: number;
  total: number;
  emphasized?: boolean;
}) {
  return (
    <div className="min-w-0">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5 text-[10.5px] font-medium text-ink-secondary">
          <span
            className="inline-block h-2 w-2 shrink-0 rounded-sm"
            style={{ background: emphasized ? "var(--series-green)" : "var(--series-deemph)" }}
          />
          <span className="truncate">{label}</span>
        </span>
        <span className="shrink-0 text-xs font-bold tabular-nums text-ink">
          {rate.toFixed(1)}%
          <span className="ml-1 hidden text-[9.5px] font-medium text-ink-muted sm:inline">
            {converted}/{total}
          </span>
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${Math.min(100, rate)}%`,
            background: emphasized ? "var(--series-green)" : "var(--series-deemph)",
          }}
        />
      </div>
    </div>
  );
}
