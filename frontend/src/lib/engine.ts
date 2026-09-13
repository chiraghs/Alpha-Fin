// ============================================================
// STANDALONE DECISION-INTELLIGENCE ENGINE
// In-browser port of backend/app/services (credit.py, scoring.py,
// ai_outreach.py). Powers the app when no FastAPI backend is
// reachable (e.g. GitHub Pages hosting) with identical math:
//   Model 1  Cash-flow income estimation
//   Model 2  GBDT intent propensity (graph sequence boost)
//   Model 3  Risk underwriting gate
//   Model 4  Blended conversion  (0.70 GBDT + 0.30 history)
//   Model 5  Historical conversion propensity
//   LRI      100 × Π(0.2 + 0.8·score/100)
// ============================================================

import {
  ClickEvent,
  Cohort,
  Customer,
  Lead,
  LeadStatus,
  LifeEvent,
  LoanType,
  LOAN_TYPES,
  OutreachChannel,
  PerformanceStats,
  ProductTwin,
  RMPerformance,
  RMStatus,
  TeamConsolidated,
  TeamForecast,
  TeamPerformance,
  Transaction,
  TrendDirection,
  TwinMap,
} from "./types";

const DAY = 24 * 60 * 60 * 1000;

interface EngineState {
  customers: Customer[];
  transactions: Transaction[];
  clicks: ClickEvent[];
  leads: Lead[];
  leadCounter: number;
}

const state: EngineState = {
  customers: [],
  transactions: [],
  clicks: [],
  leads: [],
  leadCounter: 100,
};

// ---------- seeding ----------

// Data-driven roster — kept in lockstep with backend/seed.py so live and
// standalone modes show the same customers. Each profile emits salary +
// commitments, recent trigger transactions (intent + life-event signals) and a
// clickstream journey; every lead's readiness is then computed from this engine.
type Journey = "apply" | "calc" | "view";
interface SeedProfile {
  name: string;
  email: string;
  mobile: string;
  acct: string;
  income: number;
  credit: number;
  product: LoanType;
  journey: Journey;
  promo: boolean;
  commits: [string, string, number][]; // category, description, amount
  triggers: [string, string, number, number][]; // category, description, amount, daysAgo
  second?: string; // "Product:kind"
}

const VIEW_SLUG: Record<LoanType, string> = {
  "Auto Loan": "/auto-loan",
  "Home Loan": "/home-loan",
  "Personal Loan": "/personal-loan",
  "Mortgage Loan": "/mortgage-loan",
};
const CALC_SLUG: Record<LoanType, string> = {
  "Auto Loan": "/auto-loan/emi-calculator",
  "Home Loan": "/home-loan/calculator",
  "Personal Loan": "/personal-loan/emi-calculator",
  "Mortgage Loan": "/mortgage-loan/calculator",
};

function journeyClicks(product: LoanType, kind: Journey): [string, string, number, number][] {
  const v = VIEW_SLUG[product];
  const c = CALC_SLUG[product];
  if (kind === "apply") return [[v, "VIEW", 60, 3], [c, "CALCULATE_EMI", 140, 3], [v, "CLICK_APPLY", 6, 2]];
  if (kind === "calc") return [[v, "VIEW", 55, 4], [c, "CALCULATE_EMI", 90, 3]];
  return [[v, "VIEW", 40, 5], [v, "VIEW", 50, 2]];
}

const SEED_PROFILES: SeedProfile[] = [
  { name: "Aarav Mehta", email: "aarav.mehta@example.com", mobile: "+919876543210", acct: "IDBI100892931", income: 95000, credit: 780, product: "Auto Loan", journey: "apply", promo: true,
    commits: [["Rent", "RENT TRANSFER / APARTMENT", 25000], ["SIP", "SIP DEBIT / HDFC MUTUAL FUND", 10000], ["Utility", "TATA POWER ELECTRICITY BILL", 3500]],
    triggers: [["Shopping", "MARUTI SUZUKI SHOWROOM BOOKING", 30000, 6], ["Insurance", "ICICI LOMBARD MOTORS INSURANCE", 18500, 9]], second: "Home Loan:calc" },
  { name: "Priya Sharma", email: "priya.sharma@example.com", mobile: "+919876543211", acct: "IDBI100482932", income: 150000, credit: 810, product: "Home Loan", journey: "apply", promo: true,
    commits: [["Rent", "RENT DEBIT / SOCIETY BANK", 35000], ["EMI", "HDFC CAR LOAN AUTO EMI", 15000], ["SIP", "SIP DEBIT / NIPPON INDIA FUND", 20000], ["Utility", "ACT FIBERNET & GAS UTILITY", 8000]],
    triggers: [["Shopping", "IKEA FURNITURE MUMBAI IN", 65000, 12], ["Rent", "NOBROKER RENTAL DEPOSIT & BROKERAGE", 90000, 10]], second: "Personal Loan:calc" },
  { name: "Vikram Singh", email: "vikram.singh@example.com", mobile: "+919876543212", acct: "IDBI100382933", income: 55000, credit: 640, product: "Personal Loan", journey: "calc", promo: false,
    commits: [["SIP", "SIP DEBIT / AXIS MUTUAL FUND", 5000], ["Transfer", "FAMILY TRANSFER", 15000], ["Utility", "PHONE & BROADBAND BILLS", 2200]],
    triggers: [["Penalty", "IDBI CC BILL LATE FEE CHARGE", 1200, 8], ["Penalty", "CHEQUE BOUNCE CHG", 500, 5], ["Shopping", "FLIPKART INTERNET DEBIT", 18000, 14]] },
  { name: "Ananya Desai", email: "ananya.desai@example.com", mobile: "+919812300001", acct: "IDBI200100001", income: 120000, credit: 730, product: "Home Loan", journey: "apply", promo: false,
    commits: [["SIP", "SIP DEBIT / SBI BLUECHIP FUND", 12000], ["Utility", "BESCOM ELECTRICITY BILL", 4000], ["Rent", "RENT TRANSFER / WHITEFIELD", 30000]],
    triggers: [["Rent", "NOBROKER RENTAL DEPOSIT", 80000, 7], ["Shopping", "ASIAN PAINTS HOME DECOR", 25000, 11]], second: "Auto Loan:view" },
  { name: "Rohan Kapoor", email: "rohan.kapoor@example.com", mobile: "+919812300002", acct: "IDBI200100002", income: 180000, credit: 800, product: "Auto Loan", journey: "apply", promo: true,
    commits: [["SIP", "SIP DEBIT / PARAG PARIKH FUND", 18000], ["Utility", "TATA POWER & GAS BILL", 5000]],
    triggers: [["Shopping", "TATA MOTORS SHOWROOM BOOKING", 40000, 5], ["Insurance", "HDFC ERGO MOTORS INSURANCE", 22000, 9]] },
  { name: "Sneha Reddy", email: "sneha.reddy@example.com", mobile: "+919812300003", acct: "IDBI200100003", income: 85000, credit: 760, product: "Personal Loan", journey: "apply", promo: false,
    commits: [["SIP", "SIP DEBIT / MIRAE ASSET FUND", 8000], ["Utility", "TSSPDCL ELECTRICITY BILL", 3000], ["Rent", "RENT DEBIT / GACHIBOWLI", 20000]],
    triggers: [["Shopping", "TANISHQ JEWELLERS WEDDING", 120000, 6], ["Shopping", "BANQUET HALL BOOKING MARRIAGE", 45000, 10]] },
  { name: "Karthik Nair", email: "karthik.nair@example.com", mobile: "+919812300004", acct: "IDBI200100004", income: 250000, credit: 790, product: "Mortgage Loan", journey: "calc", promo: true,
    commits: [["SIP", "SIP DEBIT / AXIS BLUECHIP", 25000], ["Utility", "ADANI ELECTRICITY BILL", 7000]],
    triggers: [["Shopping", "PRESTIGE BUILDER PART PAYMENT", 150000, 8], ["Shopping", "ARCHITECT DESIGN CONSULTANCY FEE", 60000, 12]] },
  { name: "Meera Joshi", email: "meera.joshi@example.com", mobile: "+919812300005", acct: "IDBI200100005", income: 70000, credit: 700, product: "Personal Loan", journey: "apply", promo: false,
    commits: [["SIP", "SIP DEBIT / UTI NIFTY FUND", 5000], ["Utility", "MSEB ELECTRICITY BILL", 2500], ["Rent", "RENT DEBIT / KOTHRUD", 18000]],
    triggers: [["Shopping", "DPS SCHOOL TUITION FEE", 45000, 7], ["Penalty", "OVERDRAFT INTEREST DEBIT", 800, 9]] },
  { name: "Arjun Rao", email: "arjun.rao@example.com", mobile: "+919812300006", acct: "IDBI200100006", income: 90000, credit: 680, product: "Auto Loan", journey: "calc", promo: false,
    commits: [["SIP", "SIP DEBIT / CANARA ROBECO", 7000], ["Utility", "BESCOM ELECTRICITY BILL", 3000], ["Rent", "RENT DEBIT / HSR LAYOUT", 22000]],
    triggers: [["Shopping", "HYUNDAI SHOWROOM VISIT BOOKING", 20000, 8]] },
  { name: "Divya Menon", email: "divya.menon@example.com", mobile: "+919812300007", acct: "IDBI200100007", income: 160000, credit: 810, product: "Home Loan", journey: "apply", promo: true,
    commits: [["SIP", "SIP DEBIT / QUANT ACTIVE FUND", 16000], ["Utility", "KSEB ELECTRICITY BILL", 6000]],
    triggers: [["Shopping", "IKEA FURNITURE & INTERIOR", 70000, 6], ["Rent", "HOUSING SOCIETY DEPOSIT BROKERAGE", 100000, 10]], second: "Mortgage Loan:calc" },
  { name: "Rahul Verma", email: "rahul.verma@example.com", mobile: "+919812300008", acct: "IDBI200100008", income: 45000, credit: 610, product: "Personal Loan", journey: "view", promo: false,
    commits: [["Utility", "PVVNL ELECTRICITY BILL", 2000], ["Transfer", "FAMILY TRANSFER", 12000]],
    triggers: [["Penalty", "CC BILL LATE FEE CHARGE", 1500, 5], ["Penalty", "CHEQUE BOUNCE CHG", 500, 9], ["Penalty", "OVERDRAFT PENALTY DEBIT", 700, 12]] },
  { name: "Ishita Shah", email: "ishita.shah@example.com", mobile: "+919812300009", acct: "IDBI200100009", income: 300000, credit: 830, product: "Mortgage Loan", journey: "apply", promo: true,
    commits: [["SIP", "SIP DEBIT / PPFAS FLEXICAP", 30000], ["Utility", "TORRENT POWER BILL", 8000]],
    triggers: [["Shopping", "PRESTIGE BUILDER PART PAYMENT", 200000, 7], ["Shopping", "INTERIOR DECOR ARCHITECT FEE", 80000, 11]] },
  { name: "Aditya Kumar", email: "aditya.kumar@example.com", mobile: "+919812300010", acct: "IDBI200100010", income: 110000, credit: 750, product: "Auto Loan", journey: "apply", promo: false,
    commits: [["SIP", "SIP DEBIT / ICICI PRU FUND", 10000], ["Utility", "BSES ELECTRICITY BILL", 4000], ["Rent", "RENT DEBIT / DWARKA", 25000]],
    triggers: [["Shopping", "MARUTI NEXA SHOWROOM BOOKING", 35000, 6], ["Insurance", "CAR SERVICE & INSURANCE RENEWAL", 12000, 10]] },
  { name: "Pooja Iyer", email: "pooja.iyer@example.com", mobile: "+919812300011", acct: "IDBI200100011", income: 95000, credit: 730, product: "Home Loan", journey: "calc", promo: false,
    commits: [["SIP", "SIP DEBIT / KOTAK EMERGING", 9000], ["Utility", "TANGEDCO ELECTRICITY BILL", 3500], ["Rent", "RENT DEBIT / ADYAR", 24000]],
    triggers: [["Shopping", "IKEA HOME DECOR PURCHASE", 40000, 9], ["Rent", "NOBROKER RENTAL DEPOSIT", 70000, 12]] },
  { name: "Nikhil Gupta", email: "nikhil.gupta@example.com", mobile: "+919812300012", acct: "IDBI200100012", income: 130000, credit: 770, product: "Personal Loan", journey: "apply", promo: false,
    commits: [["SIP", "SIP DEBIT / DSP MIDCAP", 12000], ["Utility", "BESCOM & GAS UTILITY", 4500], ["Rent", "RENT DEBIT / INDIRANAGAR", 28000]],
    triggers: [["Shopping", "KALYAN JEWELLERS WEDDING", 150000, 6], ["Shopping", "BANQUET MARRIAGE HALL ADVANCE", 60000, 11]] },
];

// Historical closed leads for the A/B dashboard: [name, product, status, cohort, disposable, emi, eligible]
const SEED_HIST: [string, LoanType, LeadStatus, Cohort, number, number, number][] = [
  ["Aarav Mehta", "Personal Loan", "Converted", "Treated", 65000, 32500, 1000000],
  ["Rohan Kapoor", "Home Loan", "Converted", "Treated", 140000, 70000, 6500000],
  ["Karthik Nair", "Auto Loan", "Converted", "Treated", 180000, 90000, 2200000],
  ["Divya Menon", "Personal Loan", "Converted", "Treated", 120000, 48000, 1500000],
  ["Ishita Shah", "Home Loan", "Converted", "Treated", 220000, 110000, 9000000],
  ["Aditya Kumar", "Home Loan", "Converted", "Treated", 78000, 31000, 3200000],
  ["Sneha Reddy", "Auto Loan", "Rejected", "Treated", 60000, 24000, 900000],
  ["Priya Sharma", "Mortgage Loan", "Converted", "Control", 72000, 36000, 3000000],
  ["Ananya Desai", "Personal Loan", "Rejected", "Control", 84000, 33000, 1200000],
  ["Meera Joshi", "Home Loan", "Rejected", "Control", 44000, 17000, 2100000],
  ["Arjun Rao", "Mortgage Loan", "Rejected", "Control", 55000, 22000, 1800000],
  ["Pooja Iyer", "Personal Loan", "Rejected", "Control", 60000, 24000, 1100000],
  ["Nikhil Gupta", "Home Loan", "Rejected", "Control", 82000, 32000, 4000000],
  ["Vikram Singh", "Auto Loan", "Rejected", "Control", 33000, 13200, 600000],
];

export function seedDatabase(): void {
  state.customers = SEED_PROFILES.map((p, i) => ({
    id: i + 1,
    name: p.name,
    email: p.email,
    mobile: p.mobile,
    account_number: p.acct,
    gross_monthly_income: p.income,
    credit_score: p.credit,
  }));
  state.transactions = [];
  state.clicks = [];
  state.leads = [];
  state.leadCounter = 100;

  const now = new Date();
  const push = (customer_id: number, amount: number, category: string, description: string, ts: Date) => {
    state.transactions.push({ id: state.transactions.length + 1, customer_id, amount, category, description, timestamp: ts.toISOString() });
  };
  const click = (customer_id: number, page_url: string, action: string, duration: number, daysAgo: number) => {
    state.clicks.push({ customer_id, page_url, action, duration_seconds: duration, timestamp: new Date(now.getTime() - daysAgo * DAY).toISOString() });
  };

  SEED_PROFILES.forEach((p, idx) => {
    const id = idx + 1;
    for (let i = 0; i < 3; i++) {
      const m = new Date(now.getTime() - i * 30 * DAY);
      const d = (day: number) => new Date(m.getFullYear(), m.getMonth(), day);
      const sal = i === 0 && p.promo ? 1.25 : 1.0;
      push(id, p.income * sal, "Salary", "IDBI SALARY CREDIT", d(1));
      p.commits.forEach(([cat, desc, amt], j) => push(id, -amt, cat, desc, d(5 + j * 2)));
    }
    p.triggers.forEach(([cat, desc, amt, daysAgo]) => push(id, -amt, cat, desc, new Date(now.getTime() - daysAgo * DAY)));
    let clicks = journeyClicks(p.product, p.journey);
    if (p.second) {
      const [sp, sk] = p.second.split(":") as [LoanType, Journey];
      clicks = clicks.concat(journeyClicks(sp, sk).map(([u, a, dur, ago]) => [u, a, dur, ago + 1] as [string, string, number, number]));
    }
    clicks.forEach(([u, a, dur, ago]) => click(id, u, a, dur, ago));
  });

  // active (open) leads — computed & risk-gated by refreshCustomerLeads
  state.customers.forEach((c) => refreshCustomerLeads(c.id));

  // historical closed leads with computed scores, so board == twin everywhere
  const byName = (name: string) => state.customers.find((c) => c.name === name)!;
  const compositeFor = (customer_id: number, loan_type: LoanType): { score: number; level: "Hot" | "Warm" | "Cold" } => {
    const cust = state.customers.find((c) => c.id === customer_id)!;
    const txs = state.transactions.filter((t) => t.customer_id === customer_id);
    const clicks = state.clicks.filter((c) => c.customer_id === customer_id);
    const t = evaluatePropensityAndIntent(clicks, txs, cust.credit_score, [])[loan_type];
    return { score: Math.round(t.composite_lead_score * 100) / 100, level: t.intent_level };
  };
  SEED_HIST.forEach(([name, loan_type, status, cohort, disp, emi, amount], i) => {
    const customer = byName(name);
    const { score, level } = compositeFor(customer.id, loan_type);
    state.leads.push({
      id: 200 + i,
      customer_id: customer.id,
      customer,
      loan_type,
      propensity_score: score,
      intent_level: level,
      calculated_disposable_income: disp,
      max_eligible_emi: emi,
      eligible_loan_amount: amount,
      status,
      cohort,
    });
  });
}

// ---------- Model 1: cash-flow income estimation ----------

function calculateDisposableIncome(txs: Transaction[], grossIncome: number) {
  const now = Date.now();
  const recent = txs.filter((t) => new Date(t.timestamp).getTime() >= now - 90 * DAY);

  let inflows = 0, emis = 0, sips = 0, bills = 0;
  for (const t of recent) {
    const cat = t.category.toUpperCase();
    const desc = t.description.toUpperCase();
    if (t.amount > 0) {
      if (desc.includes("SALARY") || desc.includes("PAYROLL") || cat === "SALARY") inflows += t.amount;
    } else {
      const abs = Math.abs(t.amount);
      if (desc.includes("EMI") || desc.includes("LOAN") || cat === "EMI") emis += abs;
      else if (desc.includes("SIP") || desc.includes("MUTUAL FUND") || cat === "SIP") sips += abs;
      else if (desc.includes("ELECTRICITY") || desc.includes("BILL") || desc.includes("UTILITY") || cat === "UTILITY") bills += abs;
    }
  }

  let numMonths = 3;
  if (recent.length > 0) {
    const times = recent.map((t) => new Date(t.timestamp).getTime());
    const spanDays = (Math.max(...times) - Math.min(...times)) / DAY;
    numMonths = Math.max(Math.round(spanDays / 30) + 1, 1);
  }

  const avgSalary = inflows / numMonths;
  const fixedCommitments = (emis + sips + bills) / numMonths;
  const baseInflow = avgSalary > 0 ? avgSalary : grossIncome;
  return {
    gross_income: baseInflow,
    fixed_commitments: fixedCommitments,
    disposable_income: Math.max(baseInflow - fixedCommitments, 0),
  };
}

function calculateLoanEligibility(disposable: number, loanType: LoanType, creditScore: number) {
  let foir = 0.2;
  if (creditScore >= 800) foir = 0.6;
  else if (creditScore >= 700) foir = 0.5;
  else if (creditScore >= 600) foir = 0.4;

  const maxEmi = disposable * foir;
  const params: Record<LoanType, { rate: number; tenure: number }> = {
    "Auto Loan": { rate: 9.5, tenure: 60 },
    "Home Loan": { rate: 8.5, tenure: 240 },
    "Personal Loan": { rate: 12.0, tenure: 36 },
    "Mortgage Loan": { rate: 10.0, tenure: 120 },
  };
  const p = params[loanType];
  const r = p.rate / 12 / 100;
  const eligible = r > 0 ? (maxEmi * (1 - Math.pow(1 + r, -p.tenure))) / r : maxEmi * p.tenure;

  return {
    loan_type: loanType,
    max_eligible_emi: Math.round(maxEmi),
    eligible_loan_amount: Math.round(eligible / 10000) * 10000,
    interest_rate: p.rate,
    tenure_months: p.tenure,
    foir_applied: foir,
  };
}

// ---------- Model 2: GBDT intent propensity ----------

function predictIntent(clicks: ClickEvent[], txs: Transaction[], product: LoanType, creditScore: number): number {
  const now = Date.now();
  let views = 0, calculators = 0, applies = 0;
  const seq: string[] = [];

  const sorted = [...clicks].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  for (const c of sorted) {
    if (new Date(c.timestamp).getTime() < now - 7 * DAY) continue;
    const page = c.page_url.toLowerCase();
    const act = c.action.toUpperCase();
    const match =
      (product === "Auto Loan" && (page.includes("auto") || page.includes("car"))) ||
      (product === "Home Loan" && (page.includes("home") || page.includes("housing"))) ||
      (product === "Personal Loan" && (page.includes("personal") || page.includes("salary-loan"))) ||
      (product === "Mortgage Loan" && (page.includes("mortgage") || page.includes("property")));
    if (match) {
      seq.push(act);
      if (act === "VIEW") views++;
      else if (act === "CALCULATE_EMI") calculators++;
      else if (act === "CLICK_APPLY") applies++;
    }
  }

  // Tree 2: graph sequence VIEW → CALCULATE_EMI → CLICK_APPLY (+1.5 log-odds)
  let hasHighIntentPath = false;
  for (let i = 0; i < seq.length - 2; i++) {
    if (seq[i] === "VIEW" && seq[i + 1] === "CALCULATE_EMI" && seq[i + 2] === "CLICK_APPLY") {
      hasHighIntentPath = true;
      break;
    }
  }

  // Tree 1: transactional showroom / decor / penalty triggers
  let txTriggers = 0;
  for (const t of txs) {
    if (new Date(t.timestamp).getTime() < now - 30 * DAY || t.amount >= 0) continue;
    const desc = t.description.toUpperCase();
    if (product === "Auto Loan" && ["MARUTI", "HYUNDAI", "TOYOTA", "TATA MOTORS", "CAR DEKHO", "AUTO SERVICE", "SHOWROOM"].some((k) => desc.includes(k))) txTriggers++;
    else if ((product === "Home Loan" || product === "Mortgage Loan") && ["INTERIOR", "DECOR", "FURNITURE", "IKEA", "ASIAN PAINTS", "BUILDER", "ARCHITECT"].some((k) => desc.includes(k))) txTriggers++;
    else if (product === "Personal Loan" && ["LATE FEE", "PENALTY", "OVERDRAFT", "INTEREST DEBIT", "CREDIT CARD BILL LATE"].some((k) => desc.includes(k))) txTriggers++;
  }

  let z = -2.5;
  if (applies > 0) z += txTriggers > 0 ? 1.8 : 1.2;
  else if (txTriggers > 0) z += 0.8;

  if (hasHighIntentPath) z += 1.5;
  else if (calculators > 0) {
    z += 0.6;
    if (views > 2) z += 0.4;
  }

  // Tree 3: risk profiling shift
  if (creditScore >= 750) z += 0.4;
  else if (creditScore < 600) z -= 0.5;

  return Math.round((1 / (1 + Math.exp(-z))) * 1000) / 10;
}

// ---------- Model 3: risk underwriting gate ----------

function evaluateRisk(creditScore: number, txs: Transaction[]) {
  const now = Date.now();
  let lateCharges = 0;
  for (const t of txs) {
    if (new Date(t.timestamp).getTime() < now - 30 * DAY) continue;
    const desc = t.description.toUpperCase();
    if (t.amount < 0 && ["LATE FEE", "PENALTY", "BOUNCE", "CHG", "UNPAID"].some((k) => desc.includes(k))) lateCharges++;
  }

  let z = -1.5 - (creditScore - 600) / 100 + lateCharges * 0.8;
  const pd = 1 / (1 + Math.exp(-z));

  let tier = "Low Risk (Elite)";
  if (creditScore < 600 || pd >= 0.5 || lateCharges >= 2) tier = "High Risk (Subprime)";
  else if (creditScore < 700 || pd >= 0.2 || lateCharges > 0) tier = "Medium Risk (Standard)";

  return { risk_tier: tier, probability_of_default: pd, late_charges_count: lateCharges };
}

// ---------- Model 4: conversion ----------

function predictConversion(creditScore: number, intentVal: number, pdRisk: number): number {
  const z = -1.2 + (intentVal / 100) * 2.2 + (creditScore - 600) / 200 - pdRisk * 1.5;
  return 1 / (1 + Math.exp(-z));
}

// ---------- life events ----------

function detectLifeEvents(txs: Transaction[], clicks: ClickEvent[]): LifeEvent[] {
  const events: LifeEvent[] = [];
  const now = new Date();

  const salaries = txs.filter((t) => t.category.toLowerCase() === "salary" && t.amount > 0).map((t) => t.amount);
  if (salaries.length >= 2) {
    const latest = salaries[0];
    const prior = salaries.slice(1);
    const avgPrior = prior.reduce((a, b) => a + b, 0) / prior.length;
    if (latest >= avgPrior * 1.15) {
      events.push({ event: "PROMOTION_DETECTED", icon: "📈", label: "Income Promotion Detected", confidence: 95, date: now.toISOString() });
    }
  }

  const wedding = txs.filter((t) => t.amount < 0 && ["JEWEL", "WEDDING", "MARRIAGE", "BANQUET"].some((k) => t.description.toUpperCase().includes(k)));
  if (wedding.length > 0) {
    events.push({ event: "MARRIAGE_PLANNING", icon: "💍", label: "Marriage Planning Spend", confidence: 90, date: wedding[0].timestamp });
  } else {
    const personalClicks = clicks.filter((c) => c.page_url.includes("personal-loan"));
    if (personalClicks.length > 0) {
      events.push({ event: "MARRIAGE_PLANNING", icon: "💍", label: "Marriage Planning (Browsing)", confidence: 40, date: personalClicks[0].timestamp });
    }
  }

  const school = txs.filter((t) => t.amount < 0 && ["SCHOOL", "COLLEGE", "TUITION", "ACADEMY", "UNIVERSITY", "VIDYALAYA"].some((k) => t.description.toUpperCase().includes(k)));
  if (school.length > 0) events.push({ event: "SCHOOL_FEES_STARTED", icon: "🎓", label: "Education Fees Commenced", confidence: 85, date: school[0].timestamp });

  const auto = txs.filter((t) => t.amount < 0 && ["INSURANCE", "CHOLA", "ICICI LOMBARD", "HDFC ERGO", "MOTORS", "SHOWROOM", "CAR SERVICE"].some((k) => t.description.toUpperCase().includes(k)));
  if (auto.length > 0) events.push({ event: "VEHICLE_UPGRADE_POTENTIAL", icon: "🚗", label: "Vehicle Insurance / Premium", confidence: 80, date: auto[0].timestamp });

  const rent = txs.filter((t) => t.amount < 0 && ["DEPOSIT", "RENTAL", "NOBROKER", "HOUSING", "BROKERAGE"].some((k) => t.description.toUpperCase().includes(k)));
  if (rent.length > 0 && clicks.some((c) => c.page_url.includes("home-loan"))) {
    events.push({ event: "HOME_BUYER_INTENT", icon: "🏠", label: "Rental Deposit & Home Search", confidence: 90, date: rent[0].timestamp });
  }

  return events;
}

// ---------- composite evaluation (Models 1–5 + LRI) ----------

function evaluatePropensityAndIntent(clicks: ClickEvent[], txs: Transaction[], creditScore: number, prevLeads: Lead[]): TwinMap {
  const incomeMetrics = calculateDisposableIncome(txs, 75000);
  const disposable = incomeMetrics.disposable_income;
  const repaymentCapacityScore = Math.min((disposable / incomeMetrics.gross_income) * 100, 100);

  const riskMetrics = evaluateRisk(creditScore, txs);
  const pdRisk = riskMetrics.probability_of_default;
  const disciplineScore = Math.max(100 - riskMetrics.late_charges_count * 25, 0);
  const spendingStabilityScore = incomeMetrics.fixed_commitments > 0 ? 85 : 95;
  const financialStability = (disciplineScore + spendingStabilityScore) / 2;

  const salaryCount = txs.filter((t) => t.category === "Salary").length;
  let confidenceScore = 40;
  if (salaryCount >= 3) confidenceScore = 95;
  else if (salaryCount === 2) confidenceScore = 80;
  else if (salaryCount === 1) confidenceScore = 60;

  let relationshipScore = 55;
  if (creditScore >= 780) relationshipScore = 85;
  else if (creditScore >= 680) relationshipScore = 70;

  const lifeEvents = detectLifeEvents(txs, clicks);
  const now = Date.now();
  const results: TwinMap = {};

  for (const p of LOAN_TYPES) {
    const intentVal = predictIntent(clicks, txs, p, creditScore);

    // Intent velocity: recent 7d vs prior 7-14d window
    const clicksRecent = clicks.filter((c) => (now - new Date(c.timestamp).getTime()) / DAY <= 7);
    const clicksPrior = clicks.filter((c) => {
      const d = (now - new Date(c.timestamp).getTime()) / DAY;
      return d > 7 && d <= 14;
    });
    const intentVelocity = Math.round((predictIntent(clicksRecent, txs, p, creditScore) - predictIntent(clicksPrior, txs, p, creditScore)) * 10) / 10;

    const pEvents = lifeEvents.filter((le) => {
      if (p === "Auto Loan") return ["VEHICLE_UPGRADE_POTENTIAL", "PROMOTION_DETECTED"].includes(le.event);
      if (p === "Home Loan" || p === "Mortgage Loan") return ["HOME_BUYER_INTENT", "PROMOTION_DETECTED"].includes(le.event);
      return ["MARRIAGE_PLANNING", "SCHOOL_FEES_STARTED", "PROMOTION_DETECTED"].includes(le.event);
    });
    const lifeEventConfidence = pEvents.length > 0 ? Math.max(...pEvents.map((e) => e.confidence)) : 50;

    // Model 5: historical conversion
    let pHistory = 0.5;
    const relevant = prevLeads.filter((l) => l.loan_type === p);
    if (relevant.length > 0) pHistory = relevant.filter((l) => l.status === "Converted").length / relevant.length;

    // Model 4: blended conversion
    const conversionProb = 0.7 * predictConversion(creditScore, intentVal, pdRisk) + 0.3 * pHistory;

    // LRI: soft-bounded multiplicative index
    const scores = [repaymentCapacityScore, intentVal, financialStability, lifeEventConfidence, relationshipScore];
    const lriScore = Math.min(100, Math.max(0, 100 * scores.reduce((acc, s) => acc * (0.2 + 0.8 * (s / 100)), 1)));
    const propensityScoreScaled = Math.round(lriScore) / 100;

    const reasons: string[] = [];
    reasons.push(confidenceScore >= 80 ? "Salary stable for 90+ days (consistent salary deposits verified)" : "Irregular or limited salary inflows observed in past 90 days");
    reasons.push(disciplineScore >= 100 ? "Pristine payment discipline (zero statement bounce alerts)" : `Statement penalty checks bounced (Discipline: ${disciplineScore.toFixed(0)}/100)`);
    reasons.push(repaymentCapacityScore >= 40 ? `Optimal debt capacity headroom (${repaymentCapacityScore.toFixed(0)}% net disposable income)` : `Tight debt capacity headroom (${repaymentCapacityScore.toFixed(0)}% net disposable income)`);
    if (intentVelocity >= 15) reasons.push(`Digital intent velocity surged: +${intentVelocity.toFixed(0)}% clickstream intensity increase`);
    pEvents.forEach((le) => reasons.push(`Life Event: ${le.label} (Confidence: ${le.confidence}%)`));
    if (conversionProb >= 0.7) reasons.push(`High historical offer conversion likelihood (${(conversionProb * 100).toFixed(0)}%)`);

    const triggers: string[] = [];
    if (intentVal >= 70) triggers.push(`High digital intent signals: ${intentVal.toFixed(0)}/100`);
    if (riskMetrics.late_charges_count > 0) triggers.push("Missed bills/late penalties on account history");
    if (spendingStabilityScore >= 90) triggers.push(`Stable cash inflows: ${spendingStabilityScore.toFixed(0)}/100`);

    let label: "Hot" | "Warm" | "Cold" = "Cold";
    if (propensityScoreScaled >= 0.55) label = "Hot"; // calibrated to the LRI's conservative range
    else if (propensityScoreScaled >= 0.35) label = "Warm";

    const eligibility = calculateLoanEligibility(disposable, p, creditScore);
    const r1 = (v: number) => Math.round(v * 10) / 10;

    results[p] = {
      propensity_score: propensityScoreScaled,
      intent_level: label,
      triggers,
      reasons,
      intent_velocity: intentVelocity,
      life_events: pEvents,
      repayment_capacity_score: r1(repaymentCapacityScore),
      intent_score: r1(intentVal),
      discipline_score: r1(disciplineScore),
      spending_stability_score: r1(spendingStabilityScore),
      income_confidence_score: r1(confidenceScore),
      offer_acceptance_probability: Math.round(conversionProb * 100) / 100,
      composite_lead_score: Math.round(propensityScoreScaled * 100) / 100,
      risk_evaluation: {
        risk_tier: riskMetrics.risk_tier,
        probability_of_default: riskMetrics.probability_of_default,
        max_eligible_limit: eligibility.eligible_loan_amount,
        foir_limit: eligibility.foir_applied,
      },
      financial_twin: {
        repayment_capacity: r1(repaymentCapacityScore),
        intent_score: r1(intentVal),
        financial_discipline: r1(disciplineScore),
        spending_stability: r1(spendingStabilityScore),
        income_confidence: r1(confidenceScore),
        offer_acceptance: Math.round(conversionProb * 1000) / 10,
        lead_score: r1(lriScore),
      },
    };
  }

  return results;
}

// ---------- lead board refresh (gate + rank) ----------

function refreshCustomerLeads(customerId: number): void {
  const cust = state.customers.find((c) => c.id === customerId);
  if (!cust) return;

  const txs = state.transactions.filter((t) => t.customer_id === customerId);
  const clicks = state.clicks.filter((c) => c.customer_id === customerId);
  const { disposable_income: disposable } = calculateDisposableIncome(txs, cust.gross_monthly_income);
  const prevLeads = state.leads.filter((l) => l.customer_id === customerId);
  const twinMap = evaluatePropensityAndIntent(clicks, txs, cust.credit_score, prevLeads);

  let leadIdx = 0;
  for (const loanType of LOAN_TYPES) {
    const pData = twinMap[loanType];
    const existingIdx = state.leads.findIndex((l) => l.customer_id === customerId && l.loan_type === loanType && l.status === "New");

    // Model 3 strict gate: prune subprime leads entirely
    if (pData.risk_evaluation.risk_tier === "High Risk (Subprime)") {
      if (existingIdx !== -1) state.leads.splice(existingIdx, 1);
      continue;
    }

    if (pData.propensity_score >= 0.35) {
      const eligibility = calculateLoanEligibility(disposable, loanType, cust.credit_score);
      const cohort: Cohort = leadIdx % 2 === 0 ? "Treated" : "Control";
      leadIdx++;

      const patch = {
        propensity_score: pData.propensity_score,
        intent_level: pData.intent_level,
        calculated_disposable_income: disposable,
        max_eligible_emi: eligibility.max_eligible_emi,
        eligible_loan_amount: eligibility.eligible_loan_amount,
        intent_velocity: pData.intent_velocity,
        life_events: pData.life_events,
        reasons: pData.reasons,
        financial_twin: pData.financial_twin,
      };

      if (existingIdx !== -1) {
        Object.assign(state.leads[existingIdx], patch);
      } else {
        state.leadCounter++;
        state.leads.push({ id: state.leadCounter, customer_id: customerId, customer: cust, loan_type: loanType, status: "New", cohort, ...patch });
      }
    } else if (existingIdx !== -1) {
      state.leads.splice(existingIdx, 1);
    }
  }
}

// ---------- outreach generation ----------

function generateOutreachCopy(lead: Lead, channel: OutreachChannel): string {
  const name = lead.customer.name;
  const loanType = lead.loan_type;
  const amt = lead.eligible_loan_amount.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
  const emi = lead.max_eligible_emi.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
  const code = "IDBI" + Math.floor(1000 + Math.random() * 9000);

  if (lead.cohort === "Control") {
    if (channel === "whatsapp") {
      return `👋 IDBI Bank Offer: Hi ${name}, get pre-approved ${loanType} options starting at attractive interest rates. Minimal documentation required. Apply today! T&C Apply. Click: https://idbi.co/loans`;
    }
    if (channel === "email") {
      return `Subject: Special Pre-Approved ${loanType} Offer from IDBI Bank\n\nDear Customer,\n\nWe are pleased to inform you that you have been selected for a pre-approved ${loanType} based on your banking relationship with IDBI Bank.\n\nKey Benefits:\n- Highly competitive interest rates\n- Flexible repayment tenures\n- 100% paperless documentation\n\nPlease visit our nearest branch or log in to internet banking to submit your application.\n\nWarm regards,\nIDBI Bank Ltd.`;
    }
    return `[Control Group RM Call Script]\n\nRM: "Hello, am I speaking with ${name}? My name is [Name] calling from IDBI Bank."\nClient: "Yes, speaking."\nRM: "I am calling to ask if you are looking for any ${loanType} today? We have some attractive offers."\nClient: "No, I am not interested right now."\nRM: "Okay, no problem. Thank you for your time. Goodbye."`;
  }

  let hook = "";
  const evt = lead.life_events?.[0]?.event;
  if (evt === "PROMOTION_DETECTED") hook = "We noticed your recent income surge! In celebration of your financial growth, ";
  else if (evt === "MARRIAGE_PLANNING") hook = "Planning a wedding is a beautiful journey. To assist with your expenses, ";
  else if (evt === "SCHOOL_FEES_STARTED") hook = "To support your family's educational needs, ";
  else if (evt === "VEHICLE_UPGRADE_POTENTIAL") hook = "Looking to upgrade your ride or premium insurance? ";
  else if (evt === "HOME_BUYER_INTENT") hook = "Ready to transition from renting to owning? ";

  if (channel === "whatsapp") {
    return `*IDBI Prospect Assist AI* 🚀\n\nDear ${name},\n\n${hook || "Unlock your customized borrowing limits today! "}We are pleased to offer you a pre-approved *${loanType}* of up to *${amt}* with manageable monthly EMIs starting at just *${emi}*.\n\n👉 Tap link to apply instantly: https://idbi.com/apply?code=${code}\n\n*IDBI Bank — Banking For All.*`;
  }
  if (channel === "email") {
    return `Subject: Pre-Approved ${loanType} of ${amt} tailored for you!\n\nDear ${name},\n\n${hook}Based on your banking relationship with IDBI Bank, we have designed a customized credit limit tailored specifically to your needs.\n\nApproved Loan: ${loanType}\nMaximum Limit: ${amt}\nEstimated EMI: ${emi}/month\n\nNo paperwork, 100% digital verification, and instant disbursal. Click below to confirm acceptance:\nhttps://idbi.com/apply?code=${code}\n\nBest Regards,\nRetail Lending Team\nIDBI Bank`;
  }
  return `[RM Script]\n"Hello ${name}, this is your Relationship Manager from IDBI Bank. I'm calling to share that we've set up a pre-approved ${loanType} limit of ${amt} on your account. ${hook ? "We saw some related transactions and wanted to reach out. " : ""}This comes with an easy EMI structure of ${emi} per month. Would you like me to process the digital disbursal for you?"`;
}

// ---------- Branch Manager team analytics (mirror of services/analytics.py) ----------

interface RawRM {
  id: number;
  name: string;
  email: string;
  region: string;
  tenure_years: number;
  initials: string;
  is_live?: boolean;
  new: number;
  contacted: number;
  converted: number;
  rejected: number;
  disbursed_amount: number;
  target_conversions: number;
  target_disbursal: number;
  avg_propensity: number;
  treated: { total: number; converted: number };
  control: { total: number; converted: number };
  product_mix: Record<string, number>;
  weekly_trend: number[];
}

const STATIC_ROSTER: RawRM[] = [
  {
    id: 2, name: "Arjun Kapoor", email: "arjun.kapoor@idbibank.in", region: "Delhi NCR", tenure_years: 5, initials: "AK",
    new: 8, contacted: 21, converted: 11, rejected: 8, disbursed_amount: 13_200_000, target_conversions: 16, target_disbursal: 15_000_000, avg_propensity: 71,
    treated: { total: 22, converted: 8 }, control: { total: 18, converted: 3 },
    product_mix: { "Auto Loan": 14, "Home Loan": 12, "Personal Loan": 16, "Mortgage Loan": 6 }, weekly_trend: [2, 2, 1, 2, 2, 2],
  },
  {
    id: 3, name: "Meera Iyer", email: "meera.iyer@idbibank.in", region: "Bengaluru", tenure_years: 7, initials: "MI",
    new: 10, contacted: 23, converted: 13, rejected: 9, disbursed_amount: 22_500_000, target_conversions: 15, target_disbursal: 20_000_000, avg_propensity: 78,
    treated: { total: 26, converted: 10 }, control: { total: 19, converted: 3 },
    product_mix: { "Auto Loan": 9, "Home Loan": 18, "Personal Loan": 10, "Mortgage Loan": 18 }, weekly_trend: [2, 2, 2, 2, 3, 3],
  },
  {
    id: 4, name: "Karan Malhotra", email: "karan.malhotra@idbibank.in", region: "Pune", tenure_years: 2, initials: "KM",
    new: 18, contacted: 17, converted: 5, rejected: 12, disbursed_amount: 5_400_000, target_conversions: 14, target_disbursal: 12_000_000, avg_propensity: 58,
    treated: { total: 10, converted: 3 }, control: { total: 24, converted: 2 },
    product_mix: { "Auto Loan": 18, "Home Loan": 7, "Personal Loan": 22, "Mortgage Loan": 5 }, weekly_trend: [2, 2, 1, 0, 0, 0],
  },
  {
    id: 5, name: "Sanya Reddy", email: "sanya.reddy@idbibank.in", region: "Hyderabad", tenure_years: 3, initials: "SR",
    new: 9, contacted: 22, converted: 10, rejected: 8, disbursed_amount: 12_800_000, target_conversions: 14, target_disbursal: 14_000_000, avg_propensity: 69,
    treated: { total: 23, converted: 8 }, control: { total: 17, converted: 2 },
    product_mix: { "Auto Loan": 12, "Home Loan": 11, "Personal Loan": 14, "Mortgage Loan": 12 }, weekly_trend: [1, 1, 2, 2, 2, 2],
  },
];

const LIVE_RM_META = {
  id: 1, name: "Rhea Nair", email: "rm.demo@idbibank.in", region: "Mumbai South", tenure_years: 4, initials: "RN",
  target_conversions: 12, target_disbursal: 12_000_000, weekly_trend: [1, 1, 2, 1, 1, 2],
};

const r1 = (x: number) => Math.round(x * 10) / 10;
const rate = (part: number, whole: number) => (whole ? r1((part / whole) * 100) : 0);

function trendDirection(t: number[]): TrendDirection {
  if (t.length < 4) return "flat";
  const h = Math.floor(t.length / 2);
  const first = t.slice(0, h).reduce((a, b) => a + b, 0) / h;
  const last = t.slice(h).reduce((a, b) => a + b, 0) / (t.length - h);
  if (last > first + 0.3) return "up";
  if (last < first - 0.3) return "down";
  return "flat";
}

function coachingFor(rm: RMPerformance): string {
  const name = rm.name.split(" ")[0];
  const lift = r1(rm.treated.rate - rm.control.rate);
  const convGap = Math.max(rm.target_conversions - rm.converted, 0);
  if (rm.status === "ahead") {
    return `${name} is exceeding target (${rm.attainment.toFixed(0)}% attainment) with a +${lift.toFixed(0)} pt AI-cohort lift — a model book; pair with peers to share playbook.`;
  }
  if (rm.status === "behind") {
    if (rm.control.total > rm.treated.total) {
      return `${name} is behind (${rm.attainment.toFixed(0)}%) and leaning on generic outreach (${rm.control.total} control vs ${rm.treated.total} AI leads) — migrate the control book to AI-personalized templates to close the ${lift.toFixed(0)} pt conversion gap.`;
    }
    return `${name} is behind (${rm.attainment.toFixed(0)}%) with ${rm.new} untouched leads — ${convGap} more conversions needed; prioritize the highest-propensity prospects this week.`;
  }
  if (rm.trend_direction === "down") {
    return `${name} is on target but weekly conversions are slipping — schedule a pipeline review before momentum erodes; ${rm.new} fresh leads are waiting.`;
  }
  return `${name} is on pace (${rm.attainment.toFixed(0)}%) converting at ${rm.conversion_rate.toFixed(0)}% — nudge the ${rm.new} new leads to pull ahead of target.`;
}

function finalizeRM(raw: RawRM): RMPerformance {
  const worked = raw.treated.total + raw.control.total;
  const assigned = worked + raw.new;
  const treatedRate = rate(raw.treated.converted, raw.treated.total);
  const controlRate = rate(raw.control.converted, raw.control.total);
  const convAttainment = rate(raw.converted, raw.target_conversions);
  const disbursalAttainment = rate(raw.disbursed_amount, raw.target_disbursal);
  const attainment = r1((convAttainment + disbursalAttainment) / 2);
  const status: RMStatus = attainment >= 95 ? "ahead" : attainment >= 70 ? "on_track" : "behind";

  const rm: RMPerformance = {
    id: raw.id, name: raw.name, email: raw.email, region: raw.region, tenure_years: raw.tenure_years,
    initials: raw.initials, is_live: !!raw.is_live,
    assigned, new: raw.new, contacted: raw.contacted, converted: raw.converted, rejected: raw.rejected,
    disbursed_amount: raw.disbursed_amount, conversion_rate: rate(raw.converted, worked),
    target_conversions: raw.target_conversions, target_disbursal: raw.target_disbursal,
    conv_attainment: convAttainment, disbursal_attainment: disbursalAttainment, attainment,
    avg_propensity: r1(raw.avg_propensity),
    treated: { total: raw.treated.total, converted: raw.treated.converted, rate: treatedRate },
    control: { total: raw.control.total, converted: raw.control.converted, rate: controlRate },
    product_mix: raw.product_mix, weekly_trend: raw.weekly_trend,
    status, trend_direction: trendDirection(raw.weekly_trend), coaching: "",
  };
  rm.coaching = coachingFor(rm);
  return rm;
}

function liveRMFromLeads(): RMPerformance {
  const leads = state.leads;
  const treated = leads.filter((l) => l.cohort === "Treated");
  const control = leads.filter((l) => l.cohort === "Control");
  const convertedLeads = leads.filter((l) => l.status === "Converted");
  const disbursed = convertedLeads.reduce((a, l) => a + (l.eligible_loan_amount || 0), 0);
  const props = leads.map((l) => l.propensity_score).filter((p) => p != null) as number[];
  const avgProp = props.length ? r1((props.reduce((a, b) => a + b, 0) / props.length) * 100) : 0;
  const productMix: Record<string, number> = {};
  for (const lt of LOAN_TYPES) productMix[lt] = leads.filter((l) => l.loan_type === lt).length;

  return finalizeRM({
    ...LIVE_RM_META,
    is_live: true,
    new: leads.filter((l) => l.status === "New").length,
    contacted: leads.filter((l) => l.status === "Contacted").length,
    converted: convertedLeads.length,
    rejected: leads.filter((l) => l.status === "Rejected").length,
    disbursed_amount: disbursed,
    avg_propensity: avgProp,
    treated: { total: treated.length, converted: treated.filter((l) => l.status === "Converted").length },
    control: { total: control.length, converted: control.filter((l) => l.status === "Converted").length },
    product_mix: productMix,
  });
}

function buildForecast(rms: RMPerformance[]): TeamForecast {
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysElapsed = Math.max(now.getDate(), 1);
  const factor = daysInMonth / daysElapsed;
  const totalConverted = rms.reduce((a, r) => a + r.converted, 0);
  const totalDisbursed = rms.reduce((a, r) => a + r.disbursed_amount, 0);
  const targetConversions = rms.reduce((a, r) => a + r.target_conversions, 0);
  const targetDisbursal = rms.reduce((a, r) => a + r.target_disbursal, 0);
  const projectedDisbursal = Math.round(totalDisbursed * factor);
  const ratio = targetDisbursal ? projectedDisbursal / targetDisbursal : 0;
  const pace: RMStatus = ratio >= 1.0 ? "ahead" : ratio >= 0.85 ? "on_track" : "behind";
  return {
    projected_conversions: Math.round(totalConverted * factor),
    target_conversions: targetConversions,
    projected_disbursal: projectedDisbursal,
    target_disbursal: targetDisbursal,
    pace,
    days_elapsed: daysElapsed,
    days_in_month: daysInMonth,
  };
}

function executiveSummary(c: TeamConsolidated, f: TeamForecast, rms: RMPerformance[]): string {
  const best = rms.reduce((a, b) => (b.attainment > a.attainment ? b : a));
  const weak = rms.reduce((a, b) => (b.attainment < a.attainment ? b : a));
  const disbursedCr = c.total_disbursed / 1e7;
  const targetCr = c.total_target_disbursal / 1e7;
  const paceWord = f.pace === "ahead" ? "tracking ahead of plan" : f.pace === "on_track" ? "on pace with plan" : "trailing plan";
  return (
    `The team has disbursed ₹${disbursedCr.toFixed(2)} Cr — ${c.disbursal_attainment.toFixed(0)}% of the ₹${targetCr.toFixed(2)} Cr target — ` +
    `across ${c.active_rms} RMs, and is ${paceWord} for month-end (projected ${f.projected_conversions} conversions vs a target of ${f.target_conversions}). ` +
    `AI-personalized outreach is converting at ${c.treated.rate.toFixed(0)}% versus ${c.control.rate.toFixed(0)}% for the generic control cohort — ` +
    `a decisive +${c.lift.toFixed(0)} pt lift that holds across the whole team. ${best.name} leads at ${best.attainment.toFixed(0)}% attainment, ` +
    `while ${weak.name} needs attention at ${weak.attainment.toFixed(0)}% — recommend rebalancing the lagging book onto the AI cohort and ` +
    `reviewing the untouched-lead backlog this week.`
  );
}

function computeTeamPerformance(): TeamPerformance {
  const rms = [liveRMFromLeads(), ...STATIC_ROSTER.map((r) => finalizeRM({ ...r }))];
  const sum = (fn: (r: RMPerformance) => number) => rms.reduce((a, r) => a + fn(r), 0);

  const tTotal = sum((r) => r.treated.total);
  const tConv = sum((r) => r.treated.converted);
  const cTotal = sum((r) => r.control.total);
  const cConv = sum((r) => r.control.converted);
  const treatedRate = rate(tConv, tTotal);
  const controlRate = rate(cConv, cTotal);
  const worked = tTotal + cTotal;

  const totalConverted = sum((r) => r.converted);
  const totalDisbursed = sum((r) => r.disbursed_amount);
  const totalTargetDisbursal = sum((r) => r.target_disbursal);
  const totalTargetConversions = sum((r) => r.target_conversions);
  const best = rms.reduce((a, b) => (b.attainment > a.attainment ? b : a));
  const weak = rms.reduce((a, b) => (b.attainment < a.attainment ? b : a));

  const consolidated: TeamConsolidated = {
    total_assigned: sum((r) => r.assigned),
    total_new: sum((r) => r.new),
    total_contacted: sum((r) => r.contacted),
    total_converted: totalConverted,
    total_rejected: sum((r) => r.rejected),
    total_disbursed: totalDisbursed,
    total_target_disbursal: totalTargetDisbursal,
    total_target_conversions: totalTargetConversions,
    conversion_rate: rate(totalConverted, worked),
    disbursal_attainment: rate(totalDisbursed, totalTargetDisbursal),
    conv_attainment: rate(totalConverted, totalTargetConversions),
    active_rms: rms.length,
    treated: { total: tTotal, converted: tConv, rate: treatedRate },
    control: { total: cTotal, converted: cConv, rate: controlRate },
    lift: r1(treatedRate - controlRate),
    best_performer: best.name,
    needs_attention: weak.name,
  };

  const forecast = buildForecast(rms);
  const rmsSorted = [...rms].sort((a, b) => b.attainment - a.attainment);

  return {
    rms: rmsSorted,
    consolidated,
    forecast,
    ai_summary: executiveSummary(consolidated, forecast, rms),
    generated_at: new Date().toISOString(),
  };
}

// ---------- public API (mirrors FastAPI endpoints) ----------

export const engine = {
  reset(): void {
    seedDatabase();
  },

  getCustomers(): Customer[] {
    return [...state.customers];
  },

  getCustomerTwin(customerId: number) {
    const cust = state.customers.find((c) => c.id === customerId);
    if (!cust) throw new Error("Customer not found");
    const txs = state.transactions.filter((t) => t.customer_id === customerId);
    const clicks = state.clicks.filter((c) => c.customer_id === customerId);
    const prevLeads = state.leads.filter((l) => l.customer_id === customerId);
    return {
      customer_id: cust.id,
      name: cust.name,
      account_number: cust.account_number,
      credit_score: cust.credit_score,
      twins: evaluatePropensityAndIntent(clicks, txs, cust.credit_score, prevLeads),
    };
  },

  getLeads(): Lead[] {
    return state.leads
      .map((l) => ({ ...l, customer: state.customers.find((c) => c.id === l.customer_id) ?? l.customer }))
      .sort((a, b) => b.propensity_score - a.propensity_score);
  },

  logClickstream(event: { customer_id: number; page_url: string; action: string; duration_seconds?: number }): void {
    state.clicks.push({ ...event, timestamp: new Date().toISOString() });
    refreshCustomerLeads(event.customer_id);
  },

  addTransaction(tx: { customer_id: number; amount: number; category: string; description: string }): void {
    state.transactions.push({ id: state.transactions.length + 1, ...tx, timestamp: new Date().toISOString() });
    refreshCustomerLeads(tx.customer_id);
  },

  updateLeadStatus(leadId: number, status: LeadStatus): void {
    const lead = state.leads.find((l) => l.id === leadId);
    if (!lead) throw new Error("Lead not found");
    lead.status = status;
  },

  generateOutreach(leadId: number, channel: OutreachChannel) {
    const lead = state.leads.find((l) => l.id === leadId);
    if (!lead) throw new Error("Lead not found");
    return { lead_id: leadId, channel, content: generateOutreachCopy(lead, channel) };
  },

  getTeamPerformance(): TeamPerformance {
    return computeTeamPerformance();
  },

  getPerformance(): PerformanceStats {
    const bucket = (cohort: Cohort) => {
      const group = state.leads.filter((l) => l.cohort === cohort);
      const converted = group.filter((l) => l.status === "Converted").length;
      return {
        converted,
        total: group.length,
        rate: group.length > 0 ? Math.round((converted / group.length) * 1000) / 10 : 0,
      };
    };
    return { treated: bucket("Treated"), control: bucket("Control") };
  },
};
