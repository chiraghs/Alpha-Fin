"use client";

import { ActivityItem } from "@/lib/types";
import { Bolt } from "./Icons";

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <div className="card flex min-h-0 flex-1 flex-col p-4">
      <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink-muted">
        <Bolt width={13} height={13} className="text-accent" /> Live event stream
      </h3>
      {items.length === 0 ? (
        <p className="text-xs text-ink-muted">
          No events yet — trigger a customer action above and the pipeline will light up here.
        </p>
      ) : (
        <ul className="flex max-h-56 flex-col gap-2 overflow-y-auto pr-1">
          {items.map((item) => (
            <li key={item.id} className="rise-in flex items-start gap-2.5 text-xs">
              <span className="mt-px shrink-0 text-sm leading-none">{item.icon}</span>
              <span className="flex-1 leading-snug text-ink-secondary">{item.text}</span>
              <span className="shrink-0 tabular-nums text-[10px] text-ink-muted">{item.at}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
