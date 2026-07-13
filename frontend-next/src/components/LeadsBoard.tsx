"use client";

import { useMemo, useState } from "react";
import { Lead, LeadStatus, LoanType, LOAN_TYPES } from "@/lib/types";
import { inr, inrCompact } from "@/lib/format";
import { Bolt, Chevron, Flame, Search, Sparkles, X } from "./Icons";
import { Avatar } from "./Avatar";
import { ScoreRing } from "./charts/ScoreRing";

// Column sort keys — built to stay useful as the book grows to hundreds of leads.
type SortKey = "lri" | "name" | "product" | "disposable" | "cibil" | "eligible";
type SortDir = "asc" | "desc";

const SORTERS: Record<SortKey, (a: Lead, b: Lead) => number> = {
  lri: (a, b) => a.propensity_score - b.propensity_score,
  name: (a, b) => a.customer.name.localeCompare(b.customer.name),
  product: (a, b) => a.loan_type.localeCompare(b.loan_type),
  disposable: (a, b) => a.calculated_disposable_income - b.calculated_disposable_income,
  cibil: (a, b) => a.customer.credit_score - b.customer.credit_score,
  eligible: (a, b) => a.eligible_loan_amount - b.eligible_loan_amount,
};

const STATUS_OPTIONS: (LeadStatus | "All")[] = ["All", "New", "Contacted", "Converted", "Rejected"];
const INTENT_OPTIONS = ["All", "Hot", "Warm", "Cold"] as const;

export function LeadsBoard({
  leads,
  threshold,
  onThreshold,
  onOutreach,
  onInspect,
  flashIds,
}: {
  leads: Lead[];
  threshold: number; // 0-1
  onThreshold: (v: number) => void;
  onOutreach: (lead: Lead) => void;
  onInspect: (customerId: number, loanType: LoanType) => void; // open the customer's twin on this product
  flashIds: Set<number>;
}) {
  const [query, setQuery] = useState("");
  const [product, setProduct] = useState<string>("All");
  const [intent, setIntent] = useState<(typeof INTENT_OPTIONS)[number]>("All");
  const [status, setStatus] = useState<LeadStatus | "All">("All");
  const [sortKey, setSortKey] = useState<SortKey>("lri");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const sliderPct = Math.round(threshold * 100);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = leads.filter((l) => {
      if (l.propensity_score < threshold) return false;
      if (product !== "All" && l.loan_type !== product) return false;
      if (intent !== "All" && l.intent_level !== intent) return false;
      if (status !== "All" && l.status !== status) return false;
      if (q) {
        const hay = `${l.customer.name} ${l.customer.account_number} ${l.loan_type}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    const sorter = SORTERS[sortKey];
    list.sort((a, b) => (sortDir === "asc" ? sorter(a, b) : sorter(b, a)));
    return list;
  }, [leads, threshold, product, intent, status, query, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" || key === "product" ? "asc" : "desc");
    }
  };

  const filtersActive = product !== "All" || intent !== "All" || status !== "All" || query.trim() !== "";

  return (
    <div className="card flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* toolbar: search · filters · threshold — everything the RM needs at scale */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-hairline px-3.5 py-2.5">
        <div className="flex items-baseline gap-2">
          <h3 className="text-sm font-extrabold text-ink">Prioritized leads</h3>
          <span className="rounded-full bg-surface-3 px-2 py-0.5 text-[10px] font-bold tabular-nums text-ink-secondary">
            {filtered.length}/{leads.length}
          </span>
        </div>

        {/* search */}
        <label className="relative min-w-32 flex-1 sm:max-w-56">
          <Search width={12} height={12} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name / account / product"
            aria-label="Search leads"
            className="w-full rounded-full border border-hairline bg-surface-2 py-1.5 pl-7 pr-7 text-[11.5px] font-medium text-ink outline-none transition focus:border-brand"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-ink-muted hover:text-ink"
            >
              <X width={11} height={11} />
            </button>
          )}
        </label>

        <FilterSelect label="Product" value={product} onChange={setProduct} options={["All", ...LOAN_TYPES]} />
        <FilterSelect label="Intent" value={intent} onChange={(v) => setIntent(v as typeof intent)} options={[...INTENT_OPTIONS]} />
        <FilterSelect label="Status" value={status} onChange={(v) => setStatus(v as typeof status)} options={STATUS_OPTIONS} />

        <div className="flex items-center gap-2">
          <label htmlFor="threshold" className="text-[11px] font-semibold text-ink-secondary">
            LRI ≥ <strong className="tabular-nums text-ink">{sliderPct}%</strong>
          </label>
          <input
            id="threshold"
            type="range"
            min={35}
            max={95}
            step={5}
            value={sliderPct}
            onChange={(e) => onThreshold(Number(e.target.value) / 100)}
            className="brand-range w-24"
            style={{ "--fill": `${((sliderPct - 35) / 60) * 100}%` } as React.CSSProperties}
          />
        </div>
      </div>

      {/* mobile: stacked lead cards — the list scrolls, the toolbar stays */}
      <div className="inner-scroll flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto p-3 md:hidden">
        {filtered.length === 0 ? (
          <EmptyState pct={sliderPct} filtersActive={filtersActive} />
        ) : (
          filtered.map((lead) => (
            <div
              key={lead.id}
              className={`shrink-0 rounded-2xl border border-hairline bg-surface-2 p-3.5 ${flashIds.has(lead.id) ? "flash-row" : ""}`}
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onInspect(lead.customer_id, lead.loan_type)}
                  className="group flex min-w-0 flex-1 items-center gap-3 text-left"
                  title={`Inspect ${lead.customer.name}'s Behavioral Twin`}
                >
                  <ScoreRing value={lead.propensity_score * 100} size={44} label={`LRI for ${lead.customer.name}`} />
                  <div className="min-w-0 flex-1">
                    <span className="flex items-center gap-1 truncate text-sm font-extrabold text-ink transition group-hover:text-brand">
                      {lead.customer.name}
                      <Chevron width={12} height={12} className="shrink-0 text-ink-muted transition group-hover:text-brand" />
                    </span>
                    <span className="text-[11px] text-ink-muted">
                      {lead.loan_type} · CIBIL {lead.customer.credit_score}
                    </span>
                  </div>
                </button>
                <IntentChip level={lead.intent_level} />
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <StatusChip status={lead.status} />
                <CohortChip cohort={lead.cohort} />
                {(lead.intent_velocity ?? 0) >= 15 && <VelocityChip velocity={lead.intent_velocity!} />}
                {lead.life_events && lead.life_events.length > 0 && (
                  <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-semibold text-accent-strong">
                    {lead.life_events[0].icon} {lead.life_events[0].label.split(" (")[0]}
                  </span>
                )}
              </div>

              <div className="mt-2.5 flex items-end justify-between gap-2 border-t border-dashed border-hairline pt-2.5">
                <div className="flex gap-4">
                  <div>
                    <span className="block text-[9px] font-bold uppercase tracking-wide text-ink-muted">Disposable</span>
                    <span className="text-xs font-extrabold tabular-nums text-ink">{inr(lead.calculated_disposable_income)}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-bold uppercase tracking-wide text-ink-muted">Eligible</span>
                    <span className="text-xs font-extrabold tabular-nums text-brand">{inrCompact(lead.eligible_loan_amount)}</span>
                  </div>
                </div>
                <button
                  onClick={() => onOutreach(lead)}
                  className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-extrabold text-white active:scale-95"
                  style={{ background: "var(--brand-gradient)" }}
                >
                  <Sparkles width={12} height={12} /> Outreach
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* desktop: dense table — header sticks while rows scroll internally */}
      <div className="inner-scroll hidden min-h-0 flex-1 overflow-auto md:block">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="sticky top-0 z-10 bg-surface-1 shadow-[inset_0_-1px_0_var(--hairline)]">
            <tr className="text-[10px] uppercase tracking-wider text-ink-muted">
              <SortableTh label="Customer" k="name" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <SortableTh label="Product" k="product" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <SortableTh label="Readiness (LRI)" k="lri" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <SortableTh label="CIBIL" k="cibil" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <SortableTh label="Disposable" k="disposable" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <SortableTh label="Eligible" k="eligible" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <th className="px-3.5 py-2.5 font-extrabold">Status</th>
              <th className="px-3.5 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <EmptyState pct={sliderPct} filtersActive={filtersActive} />
                </td>
              </tr>
            ) : (
              filtered.map((lead) => (
                <tr
                  key={lead.id}
                  className={`border-t border-hairline transition hover:bg-surface-2 ${flashIds.has(lead.id) ? "flash-row" : ""}`}
                >
                  <td className="px-3.5 py-2">
                    <button
                      onClick={() => onInspect(lead.customer_id, lead.loan_type)}
                      className="group flex items-center gap-2.5 text-left"
                      title={`Inspect ${lead.customer.name}'s Behavioral Twin`}
                    >
                      <Avatar name={lead.customer.name} size={30} />
                      <div className="min-w-0">
                        <span className="flex items-center gap-1 truncate text-[13px] font-extrabold text-ink transition group-hover:text-brand">
                          {lead.customer.name}
                          <Chevron width={11} height={11} className="shrink-0 text-ink-muted opacity-0 transition group-hover:text-brand group-hover:opacity-100" />
                        </span>
                        <span className="block text-[10px] text-ink-muted">{lead.customer.account_number}</span>
                      </div>
                    </button>
                  </td>
                  <td className="px-3.5 py-2">
                    <span className="text-[12px] font-semibold text-ink-secondary">{lead.loan_type}</span>
                    {lead.life_events && lead.life_events.length > 0 && (
                      <span
                        className="mt-0.5 block w-fit rounded-full bg-accent-soft px-1.5 py-px text-[9.5px] font-semibold text-accent-strong"
                        title={`${lead.life_events[0].label} — confidence ${lead.life_events[0].confidence}%`}
                      >
                        {lead.life_events[0].icon} {lead.life_events[0].label.split(" (")[0]}
                      </span>
                    )}
                  </td>
                  <td className="px-3.5 py-2">
                    <div className="flex items-center gap-2">
                      <ScoreRing value={lead.propensity_score * 100} size={38} label={`LRI for ${lead.customer.name}`} />
                      <div className="flex flex-col gap-0.5">
                        <IntentChip level={lead.intent_level} />
                        {(lead.intent_velocity ?? 0) >= 15 && <VelocityChip velocity={lead.intent_velocity!} />}
                      </div>
                    </div>
                  </td>
                  <td className="px-3.5 py-2 text-[12.5px] font-bold tabular-nums text-ink-secondary">{lead.customer.credit_score}</td>
                  <td className="px-3.5 py-2 text-[12.5px] tabular-nums text-ink-secondary">{inr(lead.calculated_disposable_income)}</td>
                  <td className="px-3.5 py-2 text-[12.5px] font-extrabold tabular-nums text-brand" title={inr(lead.eligible_loan_amount)}>
                    {inrCompact(lead.eligible_loan_amount)}
                  </td>
                  <td className="px-3.5 py-2">
                    <div className="flex flex-col items-start gap-1">
                      <StatusChip status={lead.status} />
                      <CohortChip cohort={lead.cohort} />
                    </div>
                  </td>
                  <td className="px-3.5 py-2">
                    <button
                      onClick={() => onOutreach(lead)}
                      className="lift flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11.5px] font-extrabold text-white"
                      style={{ background: "var(--brand-gradient)" }}
                    >
                      <Sparkles width={11} height={11} /> Outreach
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  const active = value !== "All";
  return (
    <label className="flex items-center gap-1">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={`Filter by ${label.toLowerCase()}`}
        className={`cursor-pointer rounded-full border py-1.5 pl-2.5 pr-6 text-[11px] font-bold outline-none transition focus:border-brand ${
          active ? "border-brand/60 bg-brand-soft text-brand-strong" : "border-hairline bg-surface-2 text-ink-secondary"
        }`}
        style={{ WebkitAppearance: "none", appearance: "none", backgroundImage: "none" }}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o === "All" ? `${label}: All` : o}
          </option>
        ))}
      </select>
      <Chevron width={10} height={10} className="-ml-5 pointer-events-none text-ink-muted" />
    </label>
  );
}

function SortableTh({
  label,
  k,
  sortKey,
  sortDir,
  onSort,
}: {
  label: string;
  k: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (k: SortKey) => void;
}) {
  const active = k === sortKey;
  return (
    <th className="px-3.5 py-2.5 font-extrabold" aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : "none"}>
      <button
        onClick={() => onSort(k)}
        className={`flex items-center gap-1 uppercase tracking-wider transition hover:text-ink ${active ? "text-brand" : ""}`}
      >
        {label}
        <span className={`text-[8px] leading-none ${active ? "opacity-100" : "opacity-30"}`}>
          {active ? (sortDir === "asc" ? "▲" : "▼") : "▼"}
        </span>
      </button>
    </th>
  );
}

function EmptyState({ pct, filtersActive }: { pct: number; filtersActive: boolean }) {
  return (
    <p className="px-5 py-10 text-center text-xs text-ink-muted">
      {filtersActive
        ? "No leads match the current search or filters — clear them to widen the net."
        : `No active leads clear the ${pct}% qualification threshold. Slide the filter down to inspect colder prospects.`}
    </p>
  );
}

function StatusChip({ status }: { status: LeadStatus }) {
  const cls =
    status === "Converted"
      ? "bg-brand-soft text-good-text"
      : status === "Rejected"
        ? "bg-critical/10 text-critical"
        : status === "Contacted"
          ? "bg-warning/15 text-ink-secondary"
          : "bg-surface-3 text-ink-secondary";
  return <span className={`rounded-full px-2 py-0.5 text-[9.5px] font-extrabold uppercase tracking-wide ${cls}`}>{status}</span>;
}

function IntentChip({ level }: { level: "Hot" | "Warm" | "Cold" }) {
  if (level === "Hot") {
    return (
      <span className="flex w-fit items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-extrabold text-accent-strong">
        <Flame width={9} height={9} className="pulse-dot" /> Hot
      </span>
    );
  }
  if (level === "Warm") {
    return <span className="w-fit rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-extrabold text-ink-secondary">Warm</span>;
  }
  return <span className="w-fit rounded-full bg-surface-3 px-2 py-0.5 text-[10px] font-extrabold text-ink-muted">Cold</span>;
}

function CohortChip({ cohort }: { cohort: "Treated" | "Control" }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[9.5px] font-extrabold uppercase tracking-wide ${
        cohort === "Treated" ? "bg-brand-soft text-brand-strong" : "bg-surface-3 text-ink-muted"
      }`}
    >
      {cohort}
    </span>
  );
}

function VelocityChip({ velocity }: { velocity: number }) {
  return (
    <span
      className="flex w-fit items-center gap-1 rounded-full bg-critical/10 px-1.5 py-0.5 text-[9.5px] font-extrabold uppercase text-critical"
      title={`Intent velocity +${velocity}% in 7 days`}
    >
      <Bolt width={9} height={9} /> Call now
    </span>
  );
}
