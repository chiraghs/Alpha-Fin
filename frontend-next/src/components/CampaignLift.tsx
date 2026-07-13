"use client";

// Campaign efficacy — emphasis form (dataviz): the Treated series is the
// story and wears the brand hue; Control is context in the de-emphasis
// gray. Every value is direct-labeled; lift is the stat headline.
import { PerformanceStats } from "@/lib/types";
import { Check, Sparkles } from "./Icons";

export function CampaignLift({ perf }: { perf: PerformanceStats | null }) {
  const treated = perf?.treated ?? { rate: 0, converted: 0, total: 0 };
  const control = perf?.control ?? { rate: 0, converted: 0, total: 0 };
  const lift = Math.round((treated.rate - control.rate) * 10) / 10;
  const targetMet = lift >= 15;

  return (
    <div className="card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold text-ink">
          <Sparkles width={15} height={15} className="text-accent" />
          Campaign efficacy & conversion lift
        </h3>
        <span className="text-[11px] font-medium text-ink-muted">A/B cohorts · real-time impact assessment</span>
      </div>

      <div className="grid gap-5 sm:grid-cols-[1fr_1fr_auto]">
        <CohortBar
          label="Treated · AI-personalized"
          rate={treated.rate}
          converted={treated.converted}
          total={treated.total}
          emphasized
        />
        <CohortBar label="Control · generic blast" rate={control.rate} converted={control.converted} total={control.total} />

        <div className="flex flex-col items-start justify-center gap-1 border-t border-hairline pt-4 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Conversion lift</span>
          <span className="text-3xl font-extrabold leading-none text-ink">
            {lift >= 0 ? "+" : ""}
            {lift.toFixed(1)}%
          </span>
          <span
            className={`mt-1 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide ${
              targetMet ? "bg-brand-soft text-good-text" : "bg-accent-soft text-accent-strong"
            }`}
          >
            {targetMet ? <Check width={11} height={11} /> : null}
            {targetMet ? "Target met (≥15%)" : "Building toward 15%"}
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
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-medium text-ink-secondary">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ background: emphasized ? "var(--series-green)" : "var(--series-deemph)" }}
          />
          {label}
        </span>
        <span className="text-sm font-bold tabular-nums text-ink">
          {rate.toFixed(1)}%
          <span className="ml-1.5 text-[10.5px] font-medium text-ink-muted">
            {converted}/{total} conv
          </span>
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-3">
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
