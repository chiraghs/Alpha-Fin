"use client";

import { useEffect, useMemo, useState } from "react";
import { Customer, LoanType } from "@/lib/types";
import { inr, timeHM } from "@/lib/format";
import { IdbiMark } from "./Logo";
import { Alert, Battery, Calculator, Car, Chevron, House, Sofa, TrendUp, User, Building, Wifi } from "./Icons";

const PRODUCTS: { loan: LoanType; page: string; label: string; Icon: typeof Car }[] = [
  { loan: "Auto Loan", page: "/auto-loan", label: "Auto Loan", Icon: Car },
  { loan: "Home Loan", page: "/home-loan", label: "Home Loan", Icon: House },
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
  // client-only clock: rendering the build-time value would mismatch on hydration
  const [clock, setClock] = useState("");
  useEffect(() => {
    setClock(timeHM());
    const t = setInterval(() => setClock(timeHM()), 30_000);
    return () => clearInterval(t);
  }, []);
  const [calcProduct, setCalcProduct] = useState<LoanType>("Auto Loan");
  const [amount, setAmount] = useState(800000);
  const [tenure, setTenure] = useState(60);

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
    <section className="flex flex-col gap-4">
      <div className="card p-4">
        <label htmlFor="customer-select" className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-ink-muted">
          Acting as customer
        </label>
        <select
          id="customer-select"
          value={selected?.id ?? ""}
          onChange={(e) => onSelect(Number(e.target.value))}
          className="w-full rounded-lg border border-hairline bg-surface-2 px-3 py-2.5 text-sm font-semibold text-ink outline-none focus:ring-2 focus:ring-(--ring)"
        >
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} · {c.account_number} · CIBIL {c.credit_score}
            </option>
          ))}
        </select>
      </div>

      {/* phone frame */}
      <div className="mx-auto w-full max-w-[360px]">
        <div className="rounded-[2.4rem] border border-hairline bg-surface-3 p-2.5 shadow-xl">
          <div className="overflow-hidden rounded-[2rem] border border-hairline bg-surface-1">
            {/* status bar */}
            <div className="flex items-center justify-between px-5 pb-1 pt-2.5 text-[11px] font-semibold text-ink-secondary">
              <span className="tabular-nums">{clock}</span>
              <span className="flex items-center gap-1.5">
                <Wifi width={12} height={12} />
                <Battery width={14} height={14} />
              </span>
            </div>

            {/* app header */}
            <div className="flex items-center justify-between px-5 py-3" style={{ background: "var(--brand-gradient)" }}>
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-white/90 p-1">
                  <IdbiMark size={20} />
                </div>
                <span className="text-sm font-bold text-white">IDBI Go Mobile+</span>
              </div>
              <span className="text-xs font-medium text-white/85">Hi, {selected?.name.split(" ")[0] ?? "…"}</span>
            </div>

            <div className="flex max-h-[560px] flex-col gap-4 overflow-y-auto p-4">
              {/* account card */}
              <div className="rounded-2xl p-4 text-white" style={{ background: "var(--brand-gradient)" }}>
                <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/75">Primary Savings</span>
                <div className="mt-0.5 font-mono text-sm tracking-wider text-white/95">{selected?.account_number ?? "—"}</div>
                <div className="mt-3 flex items-end justify-between">
                  <div>
                    <span className="block text-[10px] uppercase tracking-wide text-white/70">Available balance</span>
                    <span className="text-xl font-bold">{inr(balance, 2)}</span>
                  </div>
                  <span className="rounded-md bg-white/15 px-2 py-1 text-[10px] font-bold uppercase">Salaried</span>
                </div>
              </div>

              {/* products */}
              <div>
                <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-muted">Explore loans</h4>
                <div className="grid grid-cols-4 gap-2">
                  {PRODUCTS.map(({ loan, page, label, Icon }) => (
                    <button
                      key={loan}
                      onClick={() => actions.logClick(page, "VIEW")}
                      className="group flex flex-col items-center gap-1.5 rounded-xl border border-hairline bg-surface-2 px-1 py-2.5 transition hover:border-brand/50 hover:bg-brand-soft"
                      title={`Log a VIEW event on ${page}`}
                    >
                      <Icon width={17} height={17} className="text-brand transition group-hover:scale-110" />
                      <span className="text-[9.5px] font-semibold text-ink-secondary">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* EMI calculator */}
              <div className="rounded-xl border border-hairline bg-surface-2">
                <button onClick={openCalculator} className="flex w-full items-center gap-3 p-3 text-left">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft text-accent-strong">
                    <Calculator width={16} height={16} />
                  </span>
                  <span className="flex-1">
                    <span className="block text-xs font-bold text-ink">EMI Calculator</span>
                    <span className="block text-[10.5px] text-ink-muted">Logs a CALCULATE_EMI intent signal</span>
                  </span>
                  <Chevron width={14} height={14} className={`text-ink-muted transition ${calcOpen ? "rotate-90" : ""}`} />
                </button>

                {calcOpen && (
                  <div className="rise-in flex flex-col gap-3 border-t border-hairline p-3">
                    <select
                      value={calcProduct}
                      onChange={(e) => setCalcProduct(e.target.value as LoanType)}
                      className="rounded-lg border border-hairline bg-surface-1 px-2.5 py-2 text-xs font-semibold text-ink outline-none"
                    >
                      {PRODUCTS.map((p) => (
                        <option key={p.loan} value={p.loan}>
                          {p.loan} · {RATES[p.loan]}% p.a.
                        </option>
                      ))}
                    </select>
                    <div>
                      <div className="mb-1 flex justify-between text-[10.5px] font-semibold text-ink-secondary">
                        <span>Amount</span>
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
                      <div className="mb-1 flex justify-between text-[10.5px] font-semibold text-ink-secondary">
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
                    <div className="flex items-center justify-between rounded-lg bg-brand-soft px-3 py-2">
                      <span className="text-[10.5px] font-bold uppercase tracking-wide text-brand-strong">Monthly EMI</span>
                      <span className="text-base font-extrabold text-brand-strong">{inr(emi)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* simulation triggers */}
              <div>
                <h4 className="mb-1 text-[11px] font-bold uppercase tracking-wider text-ink-muted">Simulation triggers</h4>
                <p className="mb-2 text-[10.5px] leading-snug text-ink-muted">
                  Push live behaviors into the pipeline and watch the RM board react instantly.
                </p>
                <div className="flex flex-col gap-2">
                  <TriggerButton onClick={actions.salaryHike} Icon={TrendUp} label="Simulate 15% salary increment" sub="Income surge → promotion life event" />
                  <TriggerButton onClick={actions.autoJourney} Icon={Car} label="Run auto-loan browse journey" sub="VIEW → CALCULATE_EMI → CLICK_APPLY" />
                  <TriggerButton onClick={actions.decorSpend} Icon={Sofa} label="Spend ₹65,000 at IKEA" sub="Home-decor debit → home-loan intent" />
                  <TriggerButton onClick={actions.ccPenalty} Icon={Alert} label="Hit credit-card late fee" sub="Penalty debit → risk gate reacts" danger />
                </div>
              </div>
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
      className={`group flex items-center gap-3 rounded-xl border p-2.5 text-left transition ${
        danger
          ? "border-critical/25 bg-surface-2 hover:border-critical/60"
          : "border-hairline bg-surface-2 hover:border-brand/60"
      }`}
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
          danger ? "bg-critical/10 text-critical" : "bg-brand-soft text-brand"
        }`}
      >
        <Icon width={15} height={15} />
      </span>
      <span>
        <span className="block text-xs font-bold text-ink">{label}</span>
        <span className="block text-[10px] text-ink-muted">{sub}</span>
      </span>
    </button>
  );
}
