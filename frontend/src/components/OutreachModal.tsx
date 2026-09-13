"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Lead, LeadStatus, OutreachChannel } from "@/lib/types";
import { inr } from "@/lib/format";
import { Alert, Check, Copy, Mail, MessageCircle, PhoneCall, X } from "./Icons";
import { useToast } from "./Toast";
import { Avatar } from "./Avatar";
import { ScoreRing } from "./charts/ScoreRing";

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
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Outreach campaign"
    >
      <div
        className="card rise-in flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-b-none rounded-t-3xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header with customer context */}
        <div className="flex items-center gap-3 border-b border-hairline px-5 py-4">
          <Avatar name={lead.customer.name} size={40} />
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-extrabold text-ink">{lead.customer.name}</h3>
            <span className="text-[11px] text-ink-muted">
              {lead.loan_type} · up to <strong className="text-brand">{inr(lead.eligible_loan_amount)}</strong> · EMI{" "}
              {inr(lead.max_eligible_emi)}/mo
            </span>
          </div>
          {twin && <ScoreRing value={twin.lead_score} size={44} label="Loan readiness index" />}
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-ink-muted transition hover:bg-surface-2 hover:text-ink">
            <X width={16} height={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {lead.cohort === "Control" && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-warning/40 bg-accent-soft px-3 py-2.5 text-xs text-accent-strong">
              <Alert width={14} height={14} className="mt-px shrink-0" />
              <span>
                <strong>Control group case:</strong> this customer receives the generic template instead of behavioral AI
                copy — that contrast is exactly what the lift dashboard measures.
              </span>
            </div>
          )}

          {twin && (
            <div className="mb-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
              <TwinChip label="Repayment" value={`${twin.repayment_capacity.toFixed(0)}%`} />
              <TwinChip label="Intent" value={twin.intent_score.toFixed(0)} />
              <TwinChip label="Discipline" value={twin.financial_discipline.toFixed(0)} />
              <TwinChip label="Stability" value={twin.spending_stability.toFixed(0)} />
              <TwinChip label="Acceptance" value={`${twin.offer_acceptance.toFixed(0)}%`} />
            </div>
          )}

          {lead.reasons && lead.reasons.length > 0 && (
            <ul className="mb-4 flex flex-col gap-1.5 rounded-xl border border-hairline bg-surface-2 p-3.5">
              <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-ink-muted">
                Why the engine picked this lead
              </span>
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
          <div className="flex gap-1 rounded-2xl bg-surface-2 p-1">
            {CHANNELS.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setChannel(id)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-extrabold transition ${
                  channel === id ? "bg-surface-1 text-brand shadow-sm" : "text-ink-muted hover:text-ink"
                }`}
              >
                <Icon width={13} height={13} /> {label}
              </button>
            ))}
          </div>

          {/* channel-authentic preview */}
          <div className="mt-3">
            {loading ? (
              <div className="flex min-h-36 items-center justify-center gap-2 rounded-2xl border border-hairline bg-surface-2 text-xs text-ink-muted">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand border-t-transparent" />
                Personalizing {channel === "call_script" ? "call script" : channel} copy…
              </div>
            ) : channel === "whatsapp" ? (
              <WhatsAppPreview content={content} />
            ) : channel === "email" ? (
              <EmailPreview content={content} customer={lead.customer.name} />
            ) : (
              <CallScriptPreview content={content} />
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline px-5 py-4">
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-2 rounded-full border border-hairline bg-surface-2 px-4 py-2 text-xs font-extrabold text-ink-secondary transition hover:border-brand/50 hover:text-brand"
          >
            <Copy width={13} height={13} /> Copy
          </button>

          <div className="flex items-center gap-2">
            <span className="hidden text-[10.5px] font-bold uppercase tracking-wide text-ink-muted sm:inline">
              Log result:
            </span>
            <button
              onClick={() => onOutcome(lead, "Converted")}
              className="lift flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-extrabold text-white"
              style={{ background: "var(--brand-gradient)" }}
            >
              <Check width={13} height={13} /> Converted
            </button>
            <button
              onClick={() => onOutcome(lead, "Rejected")}
              className="flex items-center gap-1.5 rounded-full border border-critical/50 px-4 py-2 text-xs font-extrabold text-critical transition hover:bg-critical/10"
            >
              <X width={13} height={13} /> Rejected
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* WhatsApp: green outgoing bubble on a dotted chat surface */
function WhatsAppPreview({ content }: { content: string }) {
  return (
    <div className="chat-surface rounded-2xl border border-hairline p-4">
      <div className="ml-auto max-w-[92%] rounded-2xl rounded-tr-sm bg-brand-soft px-4 py-3 shadow-sm">
        <pre className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-ink">{content}</pre>
        <div className="mt-1.5 flex items-center justify-end gap-1 text-[10px] text-ink-muted">
          now
          <Check width={11} height={11} className="text-brand" />
          <Check width={11} height={11} className="-ml-2 text-brand" />
        </div>
      </div>
    </div>
  );
}

/* Email: letter card with sender header */
function EmailPreview({ content, customer }: { content: string; customer: string }) {
  const [subjectLine, ...rest] = content.split("\n");
  const isSubject = subjectLine.toLowerCase().startsWith("subject:");
  return (
    <div className="overflow-hidden rounded-2xl border border-hairline">
      <div className="flex items-center gap-3 border-b border-hairline bg-surface-2 px-4 py-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full text-white" style={{ background: "var(--brand-gradient)" }}>
          <Mail width={15} height={15} />
        </span>
        <div className="min-w-0">
          <span className="block text-xs font-extrabold text-ink">IDBI Bank Retail Lending &lt;offers@idbibank.in&gt;</span>
          <span className="block truncate text-[11px] text-ink-muted">
            to {customer.split(" ")[0].toLowerCase()}@… · {isSubject ? subjectLine.replace(/^subject:\s*/i, "") : "Pre-approved offer"}
          </span>
        </div>
      </div>
      <pre className="whitespace-pre-wrap bg-surface-1 px-4 py-3.5 font-sans text-[13px] leading-relaxed text-ink-secondary">
        {isSubject ? rest.join("\n").trimStart() : content}
      </pre>
    </div>
  );
}

/* Call script: teleprompter-style transcript */
function CallScriptPreview({ content }: { content: string }) {
  return (
    <div className="rounded-2xl border border-hairline bg-surface-2 p-4">
      <div className="mb-2.5 flex items-center gap-2 text-[10.5px] font-extrabold uppercase tracking-wider text-ink-muted">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-soft text-brand">
          <PhoneCall width={12} height={12} />
        </span>
        RM teleprompter
        <span className="pulse-dot ml-auto flex items-center gap-1 normal-case text-critical">
          <span className="h-1.5 w-1.5 rounded-full bg-critical" /> ready to dial
        </span>
      </div>
      <pre className="whitespace-pre-wrap border-l-2 border-brand pl-3 font-sans text-[13px] leading-relaxed text-ink-secondary">
        {content}
      </pre>
    </div>
  );
}

function TwinChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-hairline bg-surface-2 px-2 py-2 text-center">
      <span className="block text-[9px] font-extrabold uppercase tracking-wide text-ink-muted">{label}</span>
      <span className="text-sm font-extrabold tabular-nums text-ink">{value}</span>
    </div>
  );
}
