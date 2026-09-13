"use client";

import { useEffect, useMemo, useState } from "react";
import { Customer, LoanType } from "@/lib/types";
import { inr, inrCompact, timeHM } from "@/lib/format";
import { IdbiMark } from "./Logo";
import {
  Alert,
  Battery,
  Calculator,
  Car,
  Chart,
  Chevron,
  House,
  Send,
  Sofa,
  TrendUp,
  User,
  Building,
  Wifi,
} from "./Icons";
import { Avatar } from "./Avatar";

const PRODUCTS: { loan: LoanType; page: string; label: string; Icon: typeof Car }[] = [
  { loan: "Auto Loan", page: "/auto-loan", label: "Auto", Icon: Car },
  { loan: "Home Loan", page: "/home-loan", label: "Home", Icon: House },
  { loan: "Personal Loan", page: "/personal-loan", label: "Personal", Icon: User },
  { loan: "Mortgage Loan", page: "/mortgage-loan", label: "Mortgage", Icon: Building },
];

const RATES: Record<LoanType, number> = {
  "Auto Loan": 9.5,
  "Home Loan": 8.5,
  "Personal Loan": 12.0,
  "Mortgage Loan": 10.0,
};

export interface SimulatorActions {
  logClick: (pageUrl: string, action: string) => void;
  salaryHike: () => void;
  autoJourney: () => void;
  decorSpend: () => void;
  ccPenalty: () => void;
}

export function PhoneSimulator({
  customers,
  selected,
  onSelect,
  actions,
}: {
  customers: Customer[];
  selected: Customer | null;
  onSelect: (id: number) => void;
  actions: SimulatorActions;
}) {
  const [calcOpen, setCalcOpen] = useState(false);
  const [calcProduct, setCalcProduct] = useState<LoanType>("Auto Loan");
  const [amount, setAmount] = useState(800000);
  const [tenure, setTenure] = useState(60);

  // client-only clock: rendering the build-time value would mismatch on hydration
  const [clock, setClock] = useState("");
  useEffect(() => {
    setClock(timeHM());
    const t = setInterval(() => setClock(timeHM()), 30_000);
    return () => clearInterval(t);
  }, []);

  const emi = useMemo(() => {
    const r = RATES[calcProduct] / 12 / 100;
    return Math.round((amount * r * Math.pow(1 + r, tenure)) / (Math.pow(1 + r, tenure) - 1));
  }, [calcProduct, amount, tenure]);

  const balance = selected ? selected.gross_monthly_income * 1.5 : 0;

  const openCalculator = () => {
    const next = !calcOpen;
    setCalcOpen(next);
    if (next) actions.logClick(`/${calcProduct.toLowerCase().replace(" ", "-")}/emi-calculator`, "CALCULATE_EMI");
  };

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-4">
      {/* customer switcher — dropdown: an RM book can hold hundreds of customers */}
      <div className="card shrink-0 p-3.5">
        <label htmlFor="sim-customer" className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wider text-ink-muted">
          Acting as customer
        </label>
        <div className="flex items-center gap-2.5">
          {selected && <Avatar name={selected.name} size={36} />}
          <div className="relative min-w-0 flex-1">
            <select
              id="sim-customer"
              value={selected?.id ?? ""}
              onChange={(e) => onSelect(Number(e.target.value))}
              className="w-full appearance-none rounded-xl border border-hairline bg-surface-2 py-2.5 pl-3 pr-9 text-sm font-bold text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-(--ring)"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {c.account_number} · CIBIL {c.credit_score}
                </option>
              ))}
            </select>
            <Chevron
              width={13}
              height={13}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-ink-muted"
            />
          </div>
        </div>
        {selected && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-bold text-brand-strong">
              {inrCompact(selected.gross_monthly_income)}/mo income
            </span>
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-bold text-ink-secondary">
              CIBIL {selected.credit_score}
            </span>
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-bold text-ink-secondary">
              {selected.account_number}
            </span>
          </div>
        )}
      </div>

      {/* device — flexes to the remaining column height; app content scrolls inside */}
      <div className="mx-auto flex min-h-0 w-full max-w-[350px] flex-1">
        <div className="flex w-full flex-col rounded-[2.8rem] dark:bg-[#1a2d26] bg-[#0b0f0e] p-[9px] shadow-[0_30px_60px_-20px_rgba(1,40,33,0.5)]">
          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[2.3rem] bg-surface-1">
            {/* dynamic island */}
            <div className="absolute left-1/2 top-2 z-10 h-[22px] w-[86px] -translate-x-1/2 rounded-full dark:bg-[#1a2d26] bg-[#0b0f0e]" />

            {/* status bar */}
            <div className="flex shrink-0 items-center justify-between px-7 pb-1 pt-3 text-[11px] font-bold text-ink-secondary">
              <span className="tabular-nums">{clock}</span>
              <span className="flex items-center gap-1.5">
                <Wifi width={12} height={12} />
                <Battery width={14} height={14} />
              </span>
            </div>

            <div className="flex max-h-[600px] min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-16 pt-2 lg:max-h-none">
              {/* greeting */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <IdbiMark size={26} />
                  <div className="leading-tight">
                    <span className="block text-[10px] font-semibold uppercase tracking-wide text-ink-muted">IDBI Go Mobile+</span>
                    <span className="block text-sm font-extrabold text-ink">Hi, {selected?.name.split(" ")[0] ?? "…"} 👋</span>
                  </div>
                </div>
                {selected && <Avatar name={selected.name} size={30} />}
              </div>

              {/* balance card */}
              <div
                className="gradient-pan relative shrink-0 overflow-hidden rounded-3xl p-4 text-white"
                style={{ backgroundImage: "var(--brand-gradient)" }}
              >
                <div className="brand-arcs" />
                <div className="relative">
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/70">Savings A/C</span>
                  <div className="mt-0.5 font-mono text-[11px] tracking-[0.18em] text-white/90">{selected?.account_number ?? "—"}</div>
                  <div className="mt-4 flex items-end justify-between">
                    <div>
                      <span className="block text-[9.5px] uppercase tracking-wide text-white/65">Available balance</span>
                      <span className="text-[22px] font-extrabold leading-tight">{inr(balance, 2)}</span>
                    </div>
                    <span className="rounded-lg bg-white/15 px-2 py-1 text-[9px] font-extrabold uppercase tracking-wide">
                      Salaried
                    </span>
                  </div>
                </div>
              </div>

              {/* loan products */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-ink-muted">Loans for you</h4>
                  <span className="text-[10px] font-bold text-brand">View all</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {PRODUCTS.map(({ loan, page, label, Icon }) => (
                    <button
                      key={loan}
                      onClick={() => actions.logClick(page, "VIEW")}
                      className="group flex flex-col items-center gap-1.5 rounded-2xl border border-hairline bg-surface-2 px-1 py-3 transition hover:border-brand/50 hover:bg-brand-soft active:scale-95"
                      title={`Log a VIEW event on ${page}`}
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-1 text-brand shadow-sm transition group-hover:scale-110">
                        <Icon width={16} height={16} />
                      </span>
                      <span className="text-[9.5px] font-bold text-ink-secondary">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* EMI calculator */}
              <div className="shrink-0 overflow-hidden rounded-2xl border border-hairline bg-surface-2">
                <button onClick={openCalculator} className="flex w-full items-center gap-3 p-3.5 text-left">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent-strong">
                    <Calculator width={17} height={17} />
                  </span>
                  <span className="flex-1">
                    <span className="block text-[13px] font-extrabold text-ink">EMI Calculator</span>
                    <span className="block text-[10.5px] text-ink-muted">Plan your monthly instalments</span>
                  </span>
                  <Chevron width={14} height={14} className={`text-ink-muted transition ${calcOpen ? "rotate-90" : ""}`} />
                </button>

                {calcOpen && (
                  <div className="rise-in flex flex-col gap-3 border-t border-hairline p-3.5">
                    <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                      {PRODUCTS.map((p) => (
                        <button
                          key={p.loan}
                          onClick={() => setCalcProduct(p.loan)}
                          className={`shrink-0 rounded-full border px-3 py-1.5 text-[10.5px] font-bold transition ${
                            calcProduct === p.loan
                              ? "border-brand bg-brand text-white"
                              : "border-hairline bg-surface-1 text-ink-secondary"
                          }`}
                        >
                          {p.label} · {RATES[p.loan]}%
                        </button>
                      ))}
                    </div>
                    <div>
                      <div className="mb-1 flex justify-between text-[10.5px] font-bold text-ink-secondary">
                        <span>Loan amount</span>
                        <span className="tabular-nums">{inr(amount)}</span>
                      </div>
                      <input
                        type="range"
                        min={100000}
                        max={5000000}
                        step={50000}
                        value={amount}
                        onChange={(e) => setAmount(Number(e.target.value))}
                        className="brand-range w-full"
                        style={{ "--fill": `${((amount - 100000) / 4900000) * 100}%` } as React.CSSProperties}
                      />
                    </div>
                    <div>
                      <div className="mb-1 flex justify-between text-[10.5px] font-bold text-ink-secondary">
                        <span>Tenure</span>
                        <span className="tabular-nums">{tenure} months</span>
                      </div>
                      <input
                        type="range"
                        min={12}
                        max={240}
                        step={12}
                        value={tenure}
                        onChange={(e) => setTenure(Number(e.target.value))}
                        className="brand-range w-full"
                        style={{ "--fill": `${((tenure - 12) / 228) * 100}%` } as React.CSSProperties}
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-brand-soft px-3.5 py-2.5">
                      <span className="text-[10px] font-extrabold uppercase tracking-wide text-brand-strong">Monthly EMI</span>
                      <span className="text-lg font-extrabold text-brand-strong">{inr(emi)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* simulation triggers */}
              <div>
                <h4 className="mb-1 text-[11px] font-extrabold uppercase tracking-wider text-ink-muted">
                  ⚡ Simulation triggers
                </h4>
                <p className="mb-2 text-[10.5px] leading-snug text-ink-muted">
                  Fire live behaviors and watch the RM board react in real time.
                </p>
                <div className="flex flex-col gap-2">
                  <TriggerButton onClick={actions.salaryHike} Icon={TrendUp} label="15% salary increment" sub="Income surge → promotion life event" />
                  <TriggerButton onClick={actions.autoJourney} Icon={Car} label="Auto-loan browse journey" sub="VIEW → CALCULATE_EMI → CLICK_APPLY" />
                  <TriggerButton onClick={actions.decorSpend} Icon={Sofa} label="₹65,000 IKEA spend" sub="Home-decor debit → home-loan intent" />
                  <TriggerButton onClick={actions.ccPenalty} Icon={Alert} label="Credit-card late fee" sub="Penalty debit → risk gate reacts" danger />
                </div>
              </div>
            </div>

            {/* app tab bar (decorative) */}
            <div className="absolute inset-x-0 bottom-0 border-t border-hairline bg-surface-1/95 px-6 pb-3.5 pt-2 backdrop-blur">
              <div className="flex items-center justify-between text-ink-muted">
                <House width={17} height={17} className="text-brand" />
                <Chart width={17} height={17} />
                <span
                  className="-mt-5 flex h-11 w-11 items-center justify-center rounded-full text-white shadow-lg"
                  style={{ background: "var(--brand-gradient)" }}
                >
                  <Send width={16} height={16} />
                </span>
                <Calculator width={17} height={17} />
                <User width={17} height={17} />
              </div>
              <div className="mx-auto mt-2 h-1 w-24 rounded-full bg-ink-muted/40" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TriggerButton({
  onClick,
  Icon,
  label,
  sub,
  danger,
}: {
  onClick: () => void;
  Icon: typeof Car;
  label: string;
  sub: string;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`group flex items-center gap-3 rounded-2xl border p-3 text-left transition active:scale-[0.98] ${
        danger
          ? "border-critical/25 bg-surface-2 hover:border-critical/60"
          : "border-hairline bg-surface-2 hover:border-brand/60"
      }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition group-hover:scale-110 ${
          danger ? "bg-critical/10 text-critical" : "bg-brand-soft text-brand"
        }`}
      >
        <Icon width={16} height={16} />
      </span>
      <span>
        <span className="block text-xs font-extrabold text-ink">{label}</span>
        <span className="block text-[10px] text-ink-muted">{sub}</span>
      </span>
    </button>
  );
}
