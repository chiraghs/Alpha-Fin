"use client";

// Shared building blocks for the Branch Manager cockpit.
import { RMStatus, TrendDirection } from "@/lib/types";
import { ArrowDown, ArrowUp } from "../Icons";

export const STATUS_META: Record<RMStatus, { label: string; className: string; dot: string }> = {
  ahead: { label: "Ahead of target", className: "bg-brand-soft text-good-text", dot: "var(--status-good)" },
  on_track: { label: "On track", className: "bg-surface-3 text-ink-secondary", dot: "var(--brand-green)" },
  behind: { label: "Needs attention", className: "bg-accent-soft text-accent-strong", dot: "var(--brand-orange)" },
};

export function StatusBadge({ status, compact = false }: { status: RMStatus; compact?: boolean }) {
  const m = STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-extrabold uppercase tracking-wide ${m.className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: m.dot }} />
      {compact ? m.label.split(" ")[0] : m.label}
    </span>
  );
}

export function TrendArrow({ dir, className = "" }: { dir: TrendDirection; className?: string }) {
  if (dir === "up") return <ArrowUp width={13} height={13} className={`text-good-text ${className}`} />;
  if (dir === "down") return <ArrowDown width={13} height={13} className={`text-accent-strong ${className}`} />;
  return <span className={`inline-block h-0.5 w-3 rounded bg-ink-muted ${className}`} aria-label="flat" />;
}

// Sparkline of recent weekly conversions — 2px line, direct end-dot (dataviz).
export function TrendSpark({ data, dir, width = 72, height = 24 }: { data: number[]; dir: TrendDirection; width?: number; height?: number }) {
  const stroke = dir === "down" ? "var(--series-orange)" : "var(--series-green)";
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const span = max - min || 1;
  const pad = 3;
  const pts = data.map((v, i) => {
    const x = pad + (i / Math.max(data.length - 1, 1)) * (width - pad * 2);
    const y = height - pad - ((v - min) / span) * (height - pad * 2);
    return [x, y] as const;
  });
  const d = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const [ex, ey] = pts[pts.length - 1] ?? [width - pad, height / 2];

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden className="overflow-visible">
      <path d={d} fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={ex} cy={ey} r={2.6} fill={stroke} stroke="var(--surface-1)" strokeWidth={1.5} />
    </svg>
  );
}

const AVATAR_TINTS = [
  "linear-gradient(135deg,#00594a,#00a184)",
  "linear-gradient(135deg,#b3541e,#f58220)",
  "linear-gradient(135deg,#123f6d,#2f80ed)",
  "linear-gradient(135deg,#5a2b8c,#9b51e0)",
  "linear-gradient(135deg,#0b6b5b,#1da98c)",
];

export function RMAvatar({ id, initials, size = 40, live = false }: { id: number; initials: string; size?: number; live?: boolean }) {
  return (
    <span className="relative inline-flex shrink-0">
      <span
        className="flex items-center justify-center rounded-full font-extrabold text-white"
        style={{ width: size, height: size, background: AVATAR_TINTS[id % AVATAR_TINTS.length], fontSize: size * 0.36 }}
      >
        {initials}
      </span>
      {live && (
        <span
          className="pulse-dot absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface-1"
          style={{ background: "var(--status-good)" }}
          title="Live book — updates in real time"
        />
      )}
    </span>
  );
}
