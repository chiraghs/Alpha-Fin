"use client";

// Ranked RM leaderboard — sorted by target attainment. Each row is selectable
// and drives the detail panel. Attainment is a direct-labeled bar (dataviz).
import { RMPerformance } from "@/lib/types";
import { inrCompact } from "@/lib/format";
import { Trophy } from "../Icons";
import { RMAvatar, StatusBadge, TrendArrow, TrendSpark } from "./parts";

export function RMLeaderboard({
  rms,
  selectedId,
  onSelect,
}: {
  rms: RMPerformance[];
  selectedId: number;
  onSelect: (id: number) => void;
}) {
  return (
    <div className="card shrink-0 p-3.5 sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-extrabold text-ink">
          <Trophy width={15} height={15} className="text-accent" />
          RM performance leaderboard
        </h3>
        <span className="text-[11px] font-medium text-ink-muted">Ranked by target attainment</span>
      </div>

      <ul className="flex flex-col gap-2">
        {rms.map((rm, i) => {
          const selected = rm.id === selectedId;
          return (
            <li key={rm.id}>
              <button
                onClick={() => onSelect(rm.id)}
                aria-pressed={selected}
                className={`w-full rounded-2xl border p-3 text-left transition ${
                  selected
                    ? "border-brand/60 bg-brand-soft/50 shadow-sm"
                    : "border-hairline bg-surface-1 hover:border-brand/40 hover:bg-surface-2"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-4 shrink-0 text-center text-sm font-extrabold tabular-nums text-ink-muted">{i + 1}</span>
                  <RMAvatar id={rm.id} initials={rm.initials} size={38} live={rm.is_live} />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-bold text-ink">{rm.name}</span>
                      {rm.is_live && (
                        <span className="shrink-0 rounded-full bg-brand px-1.5 py-0.5 text-[8.5px] font-extrabold uppercase tracking-wide text-white">Live</span>
                      )}
                    </div>
                    <span className="block truncate text-[11px] text-ink-muted">{rm.region} · {rm.converted}/{rm.target_conversions} conv · {rm.conversion_rate}% rate</span>
                  </div>

                  <div className="hidden shrink-0 sm:block">
                    <TrendSpark data={rm.weekly_trend} dir={rm.trend_direction} />
                  </div>

                  {/* attainment */}
                  <div className="w-24 shrink-0 sm:w-32">
                    <div className="mb-1 flex items-baseline justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Attain</span>
                      <span className="flex items-center gap-1 text-sm font-extrabold tabular-nums text-ink">
                        <TrendArrow dir={rm.trend_direction} />
                        {Math.round(rm.attainment)}%
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-3">
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{
                          width: `${Math.min(100, rm.attainment)}%`,
                          background: rm.status === "behind" ? "var(--series-orange)" : "var(--series-green)",
                        }}
                      />
                    </div>
                  </div>

                  <div className="hidden w-24 shrink-0 text-right md:block">
                    <span className="block text-sm font-bold tabular-nums text-ink">{inrCompact(rm.disbursed_amount)}</span>
                    <span className="block text-[10px] text-ink-muted">disbursed</span>
                  </div>

                  <div className="hidden shrink-0 lg:block">
                    <StatusBadge status={rm.status} compact />
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
