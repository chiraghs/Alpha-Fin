"use client";

// Behavioral Financial Twin fingerprint — single-series radar.
// Dataviz compliance: 2px line, ~10% area wash, hairline grid, labels in
// text tokens. Exact values are never gated behind the shape — the six
// meters beside it carry every number, so this is a redundant fingerprint.
import { useId, useState } from "react";
import { FinancialTwin } from "@/lib/types";

const AXES: { key: keyof FinancialTwin; label: string }[] = [
  { key: "repayment_capacity", label: "Repayment" },
  { key: "intent_score", label: "Intent" },
  { key: "financial_discipline", label: "Discipline" },
  { key: "spending_stability", label: "Stability" },
  { key: "income_confidence", label: "Income" },
  { key: "offer_acceptance", label: "Acceptance" },
];

const CX = 130;
const CY = 120;
const R = 78;

function point(i: number, value: number): [number, number] {
  const angle = (Math.PI * 2 * i) / AXES.length - Math.PI / 2;
  const r = (Math.max(0, Math.min(100, value)) / 100) * R;
  return [CX + r * Math.cos(angle), CY + r * Math.sin(angle)];
}

export function TwinRadar({ twin }: { twin: FinancialTwin }) {
  const [hover, setHover] = useState<number | null>(null);
  const gradId = useId();

  const values = AXES.map((a) => twin[a.key]);
  const poly = values.map((v, i) => point(i, v).join(",")).join(" ");

  return (
    <div className="relative">
      <svg viewBox="0 0 260 240" className="h-auto w-full" role="img" aria-label="Behavioral twin score fingerprint">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--series-green)" stopOpacity="0.16" />
            <stop offset="100%" stopColor="var(--series-green)" stopOpacity="0.06" />
          </linearGradient>
        </defs>

        {/* hairline rings */}
        {[25, 50, 75, 100].map((ring) => (
          <polygon
            key={ring}
            points={AXES.map((_, i) => point(i, ring).join(",")).join(" ")}
            fill="none"
            stroke="var(--grid)"
            strokeWidth="1"
          />
        ))}
        {/* spokes */}
        {AXES.map((_, i) => {
          const [x, y] = point(i, 100);
          return <line key={i} x1={CX} y1={CY} x2={x} y2={y} stroke="var(--grid)" strokeWidth="1" />;
        })}

        {/* data */}
        <polygon points={poly} fill={`url(#${gradId})`} stroke="var(--series-green)" strokeWidth="2" strokeLinejoin="round" />
        {values.map((v, i) => {
          const [x, y] = point(i, v);
          return (
            <g key={i}>
              {/* 2px surface ring keeps markers legible over the line */}
              <circle cx={x} cy={y} r="5.5" fill="var(--surface-1)" />
              <circle cx={x} cy={y} r="4" fill="var(--series-green)" />
              {/* generous hover target */}
              <circle
                cx={x}
                cy={y}
                r="13"
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
            </g>
          );
        })}

        {/* axis labels — text tokens, never series color */}
        {AXES.map((a, i) => {
          const [x, y] = point(i, 128);
          return (
            <text
              key={a.key}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="10"
              fontWeight={hover === i ? 700 : 500}
              fill={hover === i ? "var(--ink-primary)" : "var(--ink-secondary)"}
            >
              {a.label}
            </text>
          );
        })}
      </svg>

      {hover !== null && (
        <div className="card pointer-events-none absolute left-1/2 top-1 -translate-x-1/2 px-3 py-1.5 text-xs font-semibold">
          {AXES[hover].label}: <span className="tabular-nums">{Math.round(values[hover])}/100</span>
        </div>
      )}
    </div>
  );
}
