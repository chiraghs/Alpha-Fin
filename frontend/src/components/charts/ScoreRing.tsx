"use client";

// Circular LRI gauge — banking-scorecard staple. Track is a lighter step of
// the same ramp (meter spec); the exact value sits in the center so the
// ring is never the only way to read it.
export function ScoreRing({
  value, // 0-100
  size = 52,
  stroke = 5,
  label,
  tone,
}: {
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
  tone?: "brand" | "accent" | "critical";
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const resolvedTone = tone ?? (clamped >= 70 ? "brand" : clamped >= 35 ? "accent" : "critical");
  const color =
    resolvedTone === "brand"
      ? "var(--series-green)"
      : resolvedTone === "accent"
        ? "var(--series-orange)"
        : "var(--status-critical)";
  const track =
    resolvedTone === "brand"
      ? "var(--brand-green-soft)"
      : resolvedTone === "accent"
        ? "var(--brand-orange-soft)"
        : "color-mix(in srgb, var(--status-critical) 15%, transparent)";

  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - clamped / 100);

  return (
    <div
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
      role="meter"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? "score"}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          className="ring-anim"
          style={{ "--ring-circ": circ } as React.CSSProperties}
        />
      </svg>
      <span
        className="absolute font-extrabold tabular-nums text-ink"
        style={{ fontSize: size * 0.28 }}
      >
        {Math.round(clamped)}
      </span>
    </div>
  );
}
