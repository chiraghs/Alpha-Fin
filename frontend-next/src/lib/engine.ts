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
  Transaction,
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

export function seedDatabase(): void {
  state.customers = [
    { id: 1, name: "Aarav Mehta", email: "aarav.mehta@example.com", mobile: "+919876543210", account_number: "IDBI100892931", gross_monthly_income: 95000, credit_score: 780 },
    { id: 2, name: "Priya Sharma", email: "priya.sharma@example.com", mobile: "+919876543211", account_number: "IDBI100482932", gross_monthly_income: 150000, credit_score: 810 },
    { id: 3, name: "Vikram Singh", email: "vikram.singh@example.com", mobile: "+919876543212", account_number: "IDBI100382933", gross_monthly_income: 55000, credit_score: 640 },
  ];
  state.transactions = [];
  state.clicks = [];
  state.leads = [];
  state.leadCounter = 100;

  const now = new Date();
  const push = (customer_id: number, amount: number, category: string, description: string, ts: Date) => {
    state.transactions.push({ id: state.transactions.length + 1, customer_id, amount, category, description, timestamp: ts.toISOString() });
  };

  for (let i = 0; i < 3; i++) {
    const m = new Date(now.getTime() - i * 30 * DAY);
    const d = (day: number) => new Date(m.getFullYear(), m.getMonth(), day);

    push(1, 95000, "Salary", "IDBI SALARY CREDIT / TECH CORP", d(1));
    push(1, -25000, "Rent", "RENT TRANSFER / APARTMENT", d(3));
    push(1, -10000, "SIP", "SIP DEBIT / HDFC MUTUAL FUND", d(5));
    push(1, -3500, "Utility", "TATA POWER ELECTRICITY BILL", d(10));
    push(1, -12000, "Shopping", "AMAZON INDIA INFORMATICS", d(15));

    push(2, 150000, "Salary", "SALARY CREDIT / CONSULTING GROUP", d(1));
    push(2, -35000, "Rent", "RENT DEBIT / SOCIETY BANK", d(3));
    push(2, -15000, "EMI", "HDFC CAR LOAN AUTO EMI", d(5));
    push(2, -20000, "SIP", "SIP DEBIT / NIPPON INDIA FUND", d(7));
    push(2, -8000, "Utility", "ACT FIBERNET & GAS UTILITY", d(12));

    push(3, 55000, "Salary", "SALARY CREDIT / RETAIL CORP", d(1));
    push(3, -15000, "Transfer", "FAMILY TRANSFER", d(3));
    push(3, -5000, "SIP", "SIP DEBIT / AXIS MUTUAL FUND", d(5));
    push(3, -2200, "Utility", "PHONE & BROADBAND BILLS", d(10));
  }

  push(2, -65000, "Shopping", "IKEA FURNITURE MUMBAI IN", new Date(now.getTime() - 12 * DAY));
  push(3, -1200, "Penalty", "IDBI CC BILL LATE FEE CHARGE", new Date(now.getTime() - 8 * DAY));
  push(3, -18000, "Shopping", "FLIPKART INTERNET DEBIT", new Date(now.getTime() - 14 * DAY));

  const click = (customer_id: number, page_url: string, action: string, duration: number, daysAgo: number) => {
    state.clicks.push({ customer_id, page_url, action, duration_seconds: duration, timestamp: new Date(now.getTime() - daysAgo * DAY).toISOString() });
  };
  click(1, "/auto-loan", "VIEW", 45, 3);
  click(1, "/auto-loan/emi-calculator", "CALCULATE_EMI", 120, 3);
  click(1, "/auto-loan", "CLICK_APPLY", 5, 2);
  click(2, "/home-loan", "VIEW", 80, 5);
  click(2, "/home-loan/calculator", "CALCULATE_EMI", 150, 5);
  click(2, "/home-loan", "VIEW", 90, 2);
  click(3, "/personal-loan", "VIEW", 30, 6);
  click(3, "/personal-loan", "VIEW", 50, 2);

  state.customers.forEach((c) => refreshCustomerLeads(c.id));

  // Historical completed leads so the campaign-lift dashboard has cohorts on load.
  const hist = (id: number, customer_id: number, loan_type: LoanType, propensity: number, level: "Hot" | "Warm", disp: number, emi: number, amount: number, status: LeadStatus, cohort: Cohort) => {
    const customer = state.customers.find((c) => c.id === customer_id)!;
    state.leads.push({ id, customer_id, customer, loan_type, propensity_score: propensity, intent_level: level, calculated_disposable_income: disp, max_eligible_emi: emi, eligible_loan_amount: amount, status, cohort });
  };
  hist(200, 1, "Personal Loan", 0.85, "Hot", 65000, 32500, 1000000, "Converted", "Treated");
  hist(201, 2, "Auto Loan", 0.9, "Hot", 72000, 36000, 1500000, "Converted", "Treated");
  hist(202, 1, "Mortgage Loan", 0.45, "Warm", 65000, 32500, 2500000, "Converted", "Treated");
  hist(203, 3, "Auto Loan", 0.55, "Warm", 33000, 13200, 600000, "Rejected", "Treated");
  hist(204, 2, "Mortgage Loan", 0.4, "Warm", 72000, 36000, 3000000, "Converted", "Control");
  hist(205, 3, "Home Loan", 0.5, "Warm", 33000, 13200, 1200000, "Rejected", "Control");
  hist(206, 1, "Home Loan", 0.45, "Warm", 65000, 32500, 3500000, "Rejected", "Control");
  hist(207, 2, "Personal Loan", 0.6, "Warm", 72000, 36000, 1200000, "Rejected", "Control");
  hist(208, 3, "Mortgage Loan", 0.35, "Warm", 33000, 13200, 1000000, "Rejected", "Control");
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
    if (propensityScoreScaled >= 0.7) label = "Hot";
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
