"use client";

import { ActivityItem } from "@/lib/types";
import { Bolt } from "./Icons";

const KIND_COLOR: Record<ActivityItem["kind"], string> = {
  click: "var(--brand-green)",
  transaction: "var(--brand-orange)",
  system: "var(--ink-muted)",
  outcome: "var(--status-good)",
};

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <div className="card flex min-h-0 flex-1 flex-col p-4">
      <h3 className="mb-3 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-ink-muted">
        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-accent-soft text-accent-strong">
          <Bolt width={12} height={12} />
        </span>
        Live pipeline stream
        <span className="pulse-dot ml-auto h-1.5 w-1.5 rounded-full bg-brand" />
      </h3>
      {items.length === 0 ? (
        <p className="text-xs text-ink-muted">
          Quiet for now — trigger a customer action above and watch the decision pipeline light up here.
        </p>
      ) : (
        <ul className="relative flex max-h-60 flex-col gap-0 overflow-y-auto pr-1">
          {/* timeline spine */}
          <span aria-hidden className="absolute bottom-1 left-[7px] top-1 w-px bg-hairline" />
          {items.map((item) => (
            <li key={item.id} className="rise-in relative flex items-start gap-3 py-1.5 pl-0.5">
              <span
                className="relative z-10 mt-1 h-3.5 w-3.5 shrink-0 rounded-full border-[3px] border-surface-1"
                style={{ background: KIND_COLOR[item.kind] }}
              />
              <span className="flex-1 text-xs leading-snug text-ink-secondary">
                <span className="mr-1">{item.icon}</span>
                {item.text}
              </span>
              <span className="shrink-0 tabular-nums text-[10px] text-ink-muted">{item.at}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
