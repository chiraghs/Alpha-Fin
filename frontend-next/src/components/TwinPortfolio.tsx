"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Customer, CustomerTwinProfile, LoanType, LOAN_TYPES, ProductTwin } from "@/lib/types";
import { inr, pct } from "@/lib/format";
import { Meter } from "./charts/Meter";
import { TwinRadar } from "./charts/TwinRadar";
import { ScoreRing } from "./charts/ScoreRing";
import { Alert, Brain, Check } from "./Icons";
import { useToast } from "./Toast";
import { Avatar } from "./Avatar";

const PRODUCT_EMOJI: Record<LoanType, string> = {
  "Auto Loan": "🚗",
  "Home Loan": "🏠",
  "Personal Loan": "💰",
  "Mortgage Loan": "🏢",
};

export function TwinPortfolio({ customers }: { customers: Customer[] }) {
  const [profile, setProfile] = useState<CustomerTwinProfile | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [product, setProduct] = useState<LoanType>("Auto Loan");
  const [loading, setLoading] = useState(false);
  const showToast = useToast();

  const loadProfile = useCallback(
    async (id: number) => {
      setSelectedId(id);
      setLoading(true);
      try {
        setProfile(await api.getCustomerTwin(id));
      } catch {
        showToast("Error retrieving twin scorecard", true);
      } finally {
        setLoading(false);
      }
    },
    [showToast],
  );

  useEffect(() => {
    if (customers.length > 0 && selectedId === null) {
      loadProfile(customers[0].id);
    }
  }, [customers, selectedId, loadProfile]);

  const twin = profile?.twins[product];

  return (
    <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
      {/* customer list */}
      <div className="card h-fit p-3">
        <h4 className="px-2 pb-2 pt-1 text-[11px] font-bold uppercase tracking-wider text-ink-muted">
          Customer profiles
        </h4>
        <div className="flex flex-col gap-1">
          {customers.map((c) => (
            <button
              key={c.id}
              onClick={() => loadProfile(c.id)}
              className={`flex items-center gap-2.5 rounded-2xl px-3 py-2.5 text-left transition ${
                selectedId === c.id ? "bg-brand-soft" : "hover:bg-surface-2"
              }`}
            >
              <Avatar name={c.name} size={32} />
              <span className="min-w-0">
                <span className={`block truncate text-sm font-bold ${selectedId === c.id ? "text-brand-strong" : "text-ink"}`}>
                  {c.name}
                </span>
                <span className="block text-[10.5px] text-ink-muted">
                  CIBIL {c.credit_score} · {inr(c.gross_monthly_income)}/mo
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* detail */}
      <div className={`card p-5 transition-opacity ${loading ? "opacity-60" : ""}`}>
        {!profile || !twin ? (
          <p className="py-10 text-center text-xs text-ink-muted">Select a customer to inspect their Behavioral Financial Twin.</p>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <Avatar name={profile.name} size={44} />
                <div>
                  <h3 className="text-lg font-extrabold text-ink">{profile.name}</h3>
                  <span className="text-xs text-ink-muted">A/C {profile.account_number} · CIBIL {profile.credit_score}</span>
                </div>
              </div>
              <RiskBadge tier={twin.risk_evaluation.risk_tier} />
            </div>

            <div className="mb-5 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-ink-secondary">Inspect product twin:</span>
              {LOAN_TYPES.map((p) => (
                <button
                  key={p}
                  onClick={() => setProduct(p)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                    product === p
                      ? "border-brand bg-brand-soft text-brand-strong"
                      : "border-hairline bg-surface-2 text-ink-secondary hover:border-brand/40"
                  }`}
                >
                  {PRODUCT_EMOJI[p]} {p}
                </button>
              ))}
            </div>

            <div className="grid gap-6 xl:grid-cols-[300px_1fr]">
              {/* fingerprint + LRI hero */}
              <div className="flex flex-col items-center gap-3">
                <TwinRadar twin={twin.financial_twin} />
                <div className="flex items-center gap-3 rounded-2xl border border-hairline bg-surface-2 px-4 py-3">
                  <ScoreRing value={twin.composite_lead_score * 100} size={56} label="Loan readiness index" />
                  <div>
                    <span className="block text-[11px] font-extrabold uppercase tracking-wide text-ink-muted">
                      Loan Readiness
                    </span>
                    <span className="block text-[11px] text-ink-muted">
                      Index for {product.toLowerCase()} outreach
                    </span>
                  </div>
                </div>
              </div>

              {/* six component meters (exact values; radar is redundant) */}
              <div className="grid content-start gap-x-6 gap-y-4 sm:grid-cols-2">
                <Meter label="Repayment capacity" value={twin.repayment_capacity_score} display={pct(twin.repayment_capacity_score, 0)} />
                <Meter label="Intent score (GBDT)" value={twin.intent_score} display={`${Math.round(twin.intent_score)}/100`} />
                <Meter label="Financial discipline" value={twin.discipline_score} display={`${Math.round(twin.discipline_score)}/100`} />
                <Meter label="Spending stability" value={twin.spending_stability_score} display={`${Math.round(twin.spending_stability_score)}/100`} />
                <Meter label="Income confidence" value={twin.income_confidence_score} display={`${Math.round(twin.income_confidence_score)}/100`} />
                <Meter label="Offer acceptance" value={twin.offer_acceptance_probability * 100} display={pct(twin.offer_acceptance_probability * 100, 0)} tone="accent" />
              </div>
            </div>

            {/* narrative */}
            <div className="mt-6 rounded-xl border border-hairline bg-surface-2 p-4">
              <h4 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink-muted">
                <Brain width={14} height={14} className="text-brand" /> Explainable AI narrative
              </h4>
              <p className="text-[13px] leading-relaxed text-ink-secondary">{buildNarrative(twin, product)}</p>

              {twin.reasons.length > 0 && (
                <ul className="mt-3 flex flex-col gap-1.5 border-t border-dashed border-hairline pt-3">
                  {twin.reasons.map((reason, i) => {
                    const warn = /irregular|bounced|tight/i.test(reason);
                    return (
                      <li key={i} className="flex items-start gap-2 text-xs text-ink-secondary">
                        {warn ? (
                          <Alert width={13} height={13} className="mt-px shrink-0 text-serious" />
                        ) : (
                          <Check width={13} height={13} className="mt-px shrink-0 text-good-text" />
                        )}
                        {reason}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* underwriting limits */}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-hairline bg-surface-2 px-4 py-3">
                <span className="block text-[10.5px] font-semibold uppercase tracking-wide text-ink-muted">
                  Eligible limit · {product}
                </span>
                <span className="text-lg font-extrabold text-brand">{inr(twin.risk_evaluation.max_eligible_limit)}</span>
              </div>
              <div className="rounded-xl border border-hairline bg-surface-2 px-4 py-3">
                <span className="block text-[10.5px] font-semibold uppercase tracking-wide text-ink-muted">
                  Debt headroom (FOIR)
                </span>
                <span className="text-lg font-extrabold text-ink">{(twin.risk_evaluation.foir_limit * 100).toFixed(0)}% of disposable</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function RiskBadge({ tier }: { tier: string }) {
  const isHigh = tier.includes("High");
  const isMedium = tier.includes("Medium");
  const cls = isHigh
    ? "bg-critical/10 text-critical"
    : isMedium
      ? "bg-warning/15 text-ink-secondary"
      : "bg-brand-soft text-good-text";
  return (
    <span className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${cls}`}>
      {isHigh ? <Alert width={12} height={12} /> : <Check width={12} height={12} />}
      {tier}
    </span>
  );
}

function buildNarrative(twin: ProductTwin, product: LoanType): string {
  const headroom = twin.repayment_capacity_score.toFixed(0);
  const intentStatus =
    twin.intent_score > 60 ? "highly active digital browsing signals" : "moderate or passive digital interest";
  let text = `This customer shows a repayment capacity score of ${headroom}%, signifying ${
    Number(headroom) >= 40 ? "healthy" : "tight"
  } cash headroom after debt obligations. The GBDT intent engine registers ${intentStatus} for ${product} limits. `;
  text +=
    twin.discipline_score < 100
      ? `Statement bounces or late fees have trimmed their financial discipline to ${twin.discipline_score.toFixed(0)}/100. `
      : "Financial discipline is pristine with zero statement alerts. ";
  const acceptance = twin.offer_acceptance_probability * 100;
  if (acceptance < 50 && twin.intent_score > 65) {
    text += "Although digital intent runs high, historical offer rejections temper the final conversion outlook. ";
  } else if (acceptance >= 75) {
    text += `A strong historical campaign conversion rate (${acceptance.toFixed(0)}%) makes them a premium prospect. `;
  }
  text += `Overall they qualify for targeted outreach with a Loan Readiness Index of ${(twin.composite_lead_score * 100).toFixed(0)}%.`;
  return text;
}
