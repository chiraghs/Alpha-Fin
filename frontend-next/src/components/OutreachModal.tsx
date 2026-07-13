"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Lead, LeadStatus, OutreachChannel } from "@/lib/types";
import { inr } from "@/lib/format";
import { Alert, Check, Copy, Mail, MessageCircle, PhoneCall, Send, X } from "./Icons";
import { useToast } from "./Toast";

const CHANNELS: { id: OutreachChannel; label: string; Icon: typeof Mail }[] = [
  { id: "whatsapp", label: "WhatsApp", Icon: MessageCircle },
  { id: "email", label: "Email", Icon: Mail },
  { id: "call_script", label: "RM Script", Icon: PhoneCall },
];

export function OutreachModal({
  lead,
  onClose,
  onOutcome,
}: {
  lead: Lead;
  onClose: () => void;
  onOutcome: (lead: Lead, status: LeadStatus) => void;
}) {
  const [channel, setChannel] = useState<OutreachChannel>("whatsapp");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const showToast = useToast();

  const generate = useCallback(
    async (ch: OutreachChannel) => {
      setLoading(true);
      setContent("");
      try {
        const res = await api.generateOutreach(lead.id, ch);
        setContent(res.content);
      } catch {
        setContent("Failed to generate outreach copy. Please retry.");
      } finally {
        setLoading(false);
      }
    },
    [lead.id],
  );

  useEffect(() => {
    generate(channel);
  }, [channel, generate]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const copyToClipboard = async () => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      showToast("Campaign copy copied to clipboard");
    } catch {
      showToast("Failed to copy text", true);
    }
  };

  const twin = lead.financial_twin;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Outreach campaign"
    >
      <div className="card rise-in flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
          <h3 className="flex items-center gap-2 text-sm font-bold text-ink">
            <Send width={14} height={14} className="text-brand" /> Outreach campaign
          </h3>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-ink-muted transition hover:bg-surface-2 hover:text-ink">
            <X width={15} height={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <p className="text-[13px] text-ink-secondary">
            Generating campaign for <strong className="text-ink">{lead.customer.name}</strong> — {" "}
            <strong className="text-ink">{lead.loan_type}</strong> up to{" "}
            <strong className="text-brand">{inr(lead.eligible_loan_amount)}</strong> (EMI {inr(lead.max_eligible_emi)}/mo).
          </p>

          {lead.cohort === "Control" && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-warning/40 bg-accent-soft px-3 py-2.5 text-xs text-accent-strong">
              <Alert width={14} height={14} className="mt-px shrink-0" />
              <span>
                <strong>Control group case:</strong> this customer receives the generic pre-approved template instead of
                hyper-personalized behavioral AI copy — that contrast is what the lift dashboard measures.
              </span>
            </div>
          )}

          {twin && (
            <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
              <TwinChip label="Repayment" value={`${twin.repayment_capacity.toFixed(0)}%`} />
              <TwinChip label="Intent" value={twin.intent_score.toFixed(0)} />
              <TwinChip label="Discipline" value={twin.financial_discipline.toFixed(0)} />
              <TwinChip label="Stability" value={twin.spending_stability.toFixed(0)} />
              <TwinChip label="Income" value={twin.income_confidence.toFixed(0)} />
              <TwinChip label="LRI" value={`${twin.lead_score.toFixed(0)}%`} highlight />
            </div>
          )}

          {lead.reasons && lead.reasons.length > 0 && (
            <ul className="mt-4 flex flex-col gap-1.5 rounded-lg border border-hairline bg-surface-2 p-3">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">Decision checklist</span>
              {lead.reasons.map((reason, i) => {
                const warn = /irregular|bounced|tight/i.test(reason);
                return (
                  <li key={i} className="flex items-start gap-2 text-xs text-ink-secondary">
                    {warn ? (
                      <Alert width={12} height={12} className="mt-0.5 shrink-0 text-serious" />
                    ) : (
                      <Check width={12} height={12} className="mt-0.5 shrink-0 text-good-text" />
                    )}
                    {reason}
                  </li>
                );
              })}
            </ul>
          )}

          {/* channel tabs */}
          <div className="mt-5 flex gap-1 rounded-xl bg-surface-2 p-1">
            {CHANNELS.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setChannel(id)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition ${
                  channel === id ? "bg-surface-1 text-brand shadow-sm" : "text-ink-muted hover:text-ink"
                }`}
              >
                <Icon width={13} height={13} /> {label}
              </button>
            ))}
          </div>

          <div className="mt-3 min-h-36 rounded-xl border border-hairline bg-surface-2 p-4">
            {loading ? (
              <div className="flex items-center gap-2 text-xs text-ink-muted">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand border-t-transparent" />
                Generating personalized script…
              </div>
            ) : (
              <pre className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-ink-secondary">{content}</pre>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline px-5 py-4">
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-2 rounded-full border border-hairline bg-surface-2 px-4 py-2 text-xs font-bold text-ink-secondary transition hover:border-brand/50 hover:text-brand"
          >
            <Copy width={13} height={13} /> Copy to clipboard
          </button>

          <div className="flex items-center gap-2">
            <span className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-muted">Log result:</span>
            <button
              onClick={() => onOutcome(lead, "Converted")}
              className="flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-xs font-bold text-white transition hover:opacity-90"
            >
              <Check width={13} height={13} /> Converted
            </button>
            <button
              onClick={() => onOutcome(lead, "Rejected")}
              className="flex items-center gap-1.5 rounded-full border border-critical/50 px-4 py-2 text-xs font-bold text-critical transition hover:bg-critical/10"
            >
              <X width={13} height={13} /> Rejected
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TwinChip({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border px-2 py-2 text-center ${highlight ? "border-brand/50 bg-brand-soft" : "border-hairline bg-surface-2"}`}>
      <span className="block text-[9.5px] font-semibold uppercase tracking-wide text-ink-muted">{label}</span>
      <span className={`text-sm font-extrabold tabular-nums ${highlight ? "text-brand-strong" : "text-ink"}`}>{value}</span>
    </div>
  );
}
