export type LoanType = "Auto Loan" | "Home Loan" | "Personal Loan" | "Mortgage Loan";

export const LOAN_TYPES: LoanType[] = ["Auto Loan", "Home Loan", "Personal Loan", "Mortgage Loan"];

export interface Customer {
  id: number;
  name: string;
  email: string;
  mobile: string;
  account_number: string;
  gross_monthly_income: number;
  credit_score: number;
}

export interface Transaction {
  id: number;
  customer_id: number;
  amount: number;
  category: string;
  description: string;
  timestamp: string;
}

export interface ClickEvent {
  customer_id: number;
  page_url: string;
  action: string;
  duration_seconds?: number;
  timestamp: string;
}

export interface LifeEvent {
  event: string;
  icon: string;
  label: string;
  confidence: number;
  date: string;
}

export interface RiskEvaluation {
  risk_tier: string;
  probability_of_default: number;
  max_eligible_limit: number;
  foir_limit: number;
}

export interface FinancialTwin {
  repayment_capacity: number;
  intent_score: number;
  financial_discipline: number;
  spending_stability: number;
  income_confidence: number;
  offer_acceptance: number; // 0-100
  lead_score: number; // 0-100 LRI
}

export interface ProductTwin {
  propensity_score: number; // 0-1
  intent_level: "Hot" | "Warm" | "Cold";
  triggers: string[];
  reasons: string[];
  intent_velocity: number;
  life_events: LifeEvent[];
  repayment_capacity_score: number;
  intent_score: number;
  discipline_score: number;
  spending_stability_score: number;
  income_confidence_score: number;
  offer_acceptance_probability: number; // 0-1
  composite_lead_score: number; // 0-1
  risk_evaluation: RiskEvaluation;
  financial_twin: FinancialTwin;
}

export type TwinMap = Record<string, ProductTwin>;

export interface CustomerTwinProfile {
  customer_id: number;
  name: string;
  account_number: string;
  credit_score: number;
  twins: TwinMap;
}

export type LeadStatus = "New" | "Contacted" | "Converted" | "Rejected";
export type Cohort = "Treated" | "Control";

export interface Lead {
  id: number;
  customer_id: number;
  customer: Customer;
  loan_type: LoanType;
  propensity_score: number; // 0-1
  intent_level: "Hot" | "Warm" | "Cold";
  calculated_disposable_income: number;
  max_eligible_emi: number;
  eligible_loan_amount: number;
  status: LeadStatus;
  cohort: Cohort;
  intent_velocity?: number;
  life_events?: LifeEvent[];
  reasons?: string[];
  financial_twin?: FinancialTwin;
}

export interface PerformanceStats {
  treated: { converted: number; total: number; rate: number };
  control: { converted: number; total: number; rate: number };
}

export type OutreachChannel = "whatsapp" | "email" | "call_script";

export interface OutreachResponse {
  lead_id: number;
  channel: OutreachChannel;
  content: string;
}

export type ConnectionMode = "live" | "standalone";

export interface ActivityItem {
  id: number;
  at: string;
  icon: string;
  text: string;
  kind: "click" | "transaction" | "system" | "outcome";
}
