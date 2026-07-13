// Labeled meter (dataviz spec): thin fill, rounded data end, track is a
// lighter step of the same ramp; value always direct-labeled beside it.
export function Meter({
  label,
  value,
  display,
  tone = "brand",
}: {
  label: string;
  value: number; // 0-100
  display?: string;
  tone?: "brand" | "accent" | "deemph";
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const fill =
    tone === "brand" ? "var(--series-green)" : tone === "accent" ? "var(--series-orange)" : "var(--series-deemph)";
  const track =
    tone === "brand"
      ? "var(--brand-green-soft)"
      : tone === "accent"
        ? "var(--brand-orange-soft)"
        : "var(--surface-3)";

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-ink-secondary">{label}</span>
        <span className="text-sm font-bold tabular-nums text-ink">{display ?? `${Math.round(clamped)}`}</span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full"
        style={{ background: track }}
        role="meter"
        aria-valuenow={Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${clamped}%`, background: fill }}
        />
      </div>
    </div>
  );
}
