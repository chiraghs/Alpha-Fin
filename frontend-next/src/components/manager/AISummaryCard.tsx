"use client";

// AI executive briefing — a natural-language roll-up generated from the team
// analytics (best/weak performer, cohort lift, forecast pace).
import { TeamConsolidated } from "@/lib/types";
import { Brain, Trophy, Alert, Sparkles } from "../Icons";

export function AISummaryCard({ summary, c }: { summary: string; c: TeamConsolidated }) {
  return (
    <div className="card relative shrink-0 overflow-hidden p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-soft text-brand-strong">
          <Brain width={16} height={16} />
        </span>
        <div className="flex-1">
          <h3 className="flex items-center gap-1.5 text-sm font-extrabold text-ink">
            AI executive briefing
            <Sparkles width={13} height={13} className="text-accent" />
          </h3>
          <p className="text-[11px] text-ink-muted">Generated from live team analytics</p>
        </div>
      </div>

      <p className="text-[13.5px] leading-relaxed text-ink-secondary">{summary}</p>

      <div className="mt-4 flex flex-wrap gap-2.5">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1.5 text-[11px] font-bold text-good-text">
          <Trophy width={13} height={13} /> Top: {c.best_performer}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1.5 text-[11px] font-bold text-accent-strong">
          <Alert width={13} height={13} /> Attention: {c.needs_attention}
        </span>
      </div>
    </div>
  );
}
