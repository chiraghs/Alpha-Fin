# Prospect Assist AI: Track 02 Problem Statement & Expected Outcome

This document details how **Prospect Assist AI** (Behavioral Credit & Hyper-Targeted Lead Engine) maps to, addresses, and satisfies all requirements, features, comparable industry benchmarks, and model architectures specified in the IDBI Innovate 2026 Hackathon Track 02.

---

## 🎯 Problem Statement Coverage

> **Problem Statement**:
> *Bank’s retail lending relies on traditional metrics, resulting in low conversions and limited insight into customer intent. A data-driven approach is needed to identify eligible, quantifiable repayment capacity, genuinely interested prospects using transaction and behavioral insights.*

### 1. Traditional Metrics vs. Real-Time Customer Intent
* **The Traditional Gap**: Banks rely on static lagging metrics like bureau scores or self-reported income, which do not reflect real-time interest or current financial events.
* **Prospect Assist AI Data-Driven Solution**:
  * **Behavioral Clickstream Logs**: The system captures clicks, interest page loads, and EMI calculator hits.
  * **LightGBM-like GBDT Ensemble**: Features are fed into a three-stage GBDT decision tree forest model in `services/scoring.py` that computes log-odds and runs a **Sigmoid Activation Function** to predict a conversion probability $P(\text{conversion}) = 1/(1+e^{-z})$.
  * **Graph Clickstream Transition mapping**: User taps are analyzed as a directed state-space transition graph. Taps matching the high-intent pattern:
    `VIEW` ➔ `CALCULATE_EMI` ➔ `CLICK_APPLY`
    receive a +1.5 log-odds boost, separating serious customers from casual browsers.

### 2. Identifying Quantifiable Repayment Capacity
* **The Traditional Gap**: Credit teams look at Gross Income, missing active commitments (like other bank EMIs, SIP mutual fund investments, or insurance payments), leading to defaults or bad underwriting.
* **Prospect Assist AI Data-Driven Solution**:
  * **True Income Assessment Engine**: Parses 90 days of bank statement transactions using cash-flow integration layers.
  * **EMI Headroom Underwriting**:
    $$\text{Actual Disposable Income} = \text{Monthly Inflows} - \sum (\text{Existing EMIs} + \text{Active SIPs} + \text{Fixed Utilities})$$
    This isolates the borrower's *true disposable capacity*, protecting bank asset quality.

---

## 🚀 Expected Outcome Coverage

> **Expected Outcome**:
> *The solution is expected to generate high‑quality leads with a conversion rate exceeding 30%, while also enabling accurate assessment of borrowers’ actual income levels to support prudent underwriting for loans such as Personal Loan, Home loan, Mortgage Loan, Auto Loan.*

### 1. Exceeding 30% Conversion Rate
* **Causal A/B Testing Cohort Splits**: Dynamic cohort routing splits incoming leads:
  * **Treated Cohort (AI Assist)**: Receives contextual, AI-personalized marketing pitches outlining their pre-approved limits, EMI capacity, and triggers.
  * **Control Cohort (Spam)**: Receives standard, generic bank templates.
* **Live Lift Analytics Dashboard**: Computes conversion metrics directly from database tables. Seeded data demonstrates a **~75% conversion rate for Treated leads** vs. **~16% for Control leads** (yielding a **~58% Conversion Lift**).
* **Interactive Relationship Manager Outcome Logging**: RMs can mark leads as "Converted" or "Rejected" dynamically to update charts instantly.

### 2. Underwriting Multi-Product Retail Portfolios
The system applies product-specific underwriting standards to calculate maximum EMI and eligible credit limits across four target portfolios:
1. **Personal Loan**: 36-month tenure, 12.0% interest rate.
2. **Auto Loan**: 60-month tenure, 9.5% interest rate.
3. **Home Loan**: 240-month tenure, 8.5% interest rate.
4. **Mortgage Loan**: 120-month tenure, 10.0% interest rate.

*Each product evaluates borrowing limits dynamically using the credit-score-adjusted FOIR (Fixed Obligation to Income Ratio) model, ensuring highly prudent risk management.*

---

## 📊 Comprehensive Feature Matrix (Input Variables)

Our core models ingest and engineer features across four distinct categories to build a complete underwriting and propensity profile, drawing design patterns from leading global financial tech models:

* **Transaction Behaviour (Inflow/Outflow Verification)**: Similar to cash flow verification platforms like **Plaid** and statement scoring engines like **Perfios**, we analyze monthly salary stability, average balance averages, and subtract fixed commitments (current EMIs, rent, utilities).
* **Behavioural Analytics (Intent & Digital Footprint)**: Similar to digital footprint scoring frameworks like **FinBox**, we capture interest calculators, drop-off actions, and comparators to predict acquisition propensity.
* **Relationship & Underwriting Profiles**: Drawing inspiration from alternative scorecards like **Upstart**, dynamic underwriters like **Zest AI**, and thin-file access networks like **Nova Credit**, we combine external bureau scores with internal historical cheque bounce frequencies and card utilization.

The variables are structured as follows:

### 1. Transaction Behaviour
* **Monthly Salary Consistency**: Checks standard deviations of salary arrival dates and amounts.
* **Average Balance**: Assesses monthly rolling ledger averages.
* **Cash Withdrawals**: Tracks ATM velocity and cash dependency.
* **EMI Payments**: Identifies current credit commitments (subtracted from capacity).
* **Utility & Rent Payments**: Maps recurring fixed monthly obligations.
* **Shopping & Travel Spend**: Clusters card swipe categories to assess discretionary burn.
* **Investment Frequency**: Tracks deposits into mutual fund SIPs, stocks, and deposits.

### 2. Behavioural Analytics
* **Mobile App Login Frequency**: Measures client session logs and engagement trends.
* **Loan Page Visits**: Registers clicks on specific lending products (Auto, Home, etc.).
* **EMI Calculator Usage**: Captures inputs to estimate loan amount expectations.
* **Time Spent Comparing Products**: Measures active session durations.
* **Drop-off Point**: Identifies where prospects left the digital application flow.

### 3. Relationship with Bank
* **Existing Account Age**: Prioritizes long-term banking relationships.
* **Credit Card Utilization**: Monitors balances vs. limits.
* **Fixed Deposits**: Measures locked liquid asset balances.
* **Salary Account Status**: Tags primary account holders.
* **Missed EMIs / Cheque Bounces**: Tracks negative repayment indicators.

### 4. External Signals
* **GST Turnover**: Pulls business performance for self-employed/MSME files.
* **Bureau Score**: Ingests standard credit history records.
* **Employment & Location Stability**: Measures employer rating and address duration.

---

## 🧠 Prospect Assist AI: Multi-Model Architecture

Instead of a single, opaque score, Prospect Assist AI splits calculations across four specialized machine learning layers inside a centralized orchestration loop, supported by three critical diagnostic frameworks:

* **GBDT Propensity Scorer**: Captures complex, non-linear feature interactions (such as the convergence of credit bureau history, calculator engagement, and specific category transactional debit actions) to prevent false positives.
* **Graph Clickstream Sequence Matcher**: Analyzes sequential app hits as a directed transition graph to verify active shopping intents (triggering a $+1.5$ log-odds boost on targeted sequences).
* **Causal A/B Campaign Lift Dashboard**: Segments incoming leads into Treated (personalized AI) and Control (generic pre-approved) cohorts to dynamically isolate outreach effectiveness and conversion rates directly from database tables.

The data flow from ingestion to display is structured as follows:

```
[Core Banking | Internet Banking | UPI Transactions | Credit Bureau | CRM Data]
                                │
                          ───────────────
                             Data Lake
                          ───────────────
                                │
                       Feature Engineering
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
  ┌───────────┐         [Graph Sequence]          ┌───────────┐
  │  Model 1: │                 │                 │  Model 3: │
  │   Income  │        [GBDT Propensity]          │   Risk    │
  │ Estimation│                 │                 │Underwritg │
  └─────┬─────┘         ┌───────┴───────┐         └─────┬─────┘
        │               │   Model 2:    │               │
        │               │ Intent Engine │               │
        └───────┬───────┘               └───────┬───────┘
                │                               │
                └───────────────┬───────────────┘
                                │
                         ┌───────────────┐
                         │   Model 4:    │
                         │ Conversion ML │
                         └───────┬───────┘
                                 │
                           Lead Ranking 
                      (Filter: Threshold >70%)
                                 │
                   ┌─────────────┴─────────────┐
                   │                           │
          ┌────────┴────────┐         ┌────────┴────────┐
          │   Treated Cohort│         │   Control Cohort│
          └────────┬────────┘         └────────┬────────┘
                   │                           │
         ┌─────────┴───────────────────────────┴─────────┐
         │       Relationship Manager Lead Board         │
         │  [ Causal A/B Campaign Lift Dashboard ]       │
         └───────────────────────────────────────────────┘
```

### 📈 Model 1 – Income Estimation Model
* **Purpose**: Calculates actual disposable cash flows without manual salary slip verification.
* **Inputs**: Bank transactions, salary credits, UPI logs, cash deposits, rent payments.
* **Outputs**: Estimated monthly income, income stability index, net disposable income.
* **Example**:
  * *Salary credits*: ₹82,000
  * *Monthly expenses*: ₹39,000
  * *Existing EMIs*: ₹10,000
  * *Estimated Net Disposable Income*: **₹33,000**

### 🎯 Model 2 – Intent Prediction Model (GBDT Booster)
* **Purpose**: Evaluates likelihood that the client is looking to take a loan in the immediate window using a 3-stage Gradient Boosted Decision Trees (GBDT) ensemble.
* **Feature Splits**:
  * **Tree 1 (Direct Interest)**: Checks clickstream `CLICK_APPLY` and transactional showroom tags (boosts +1.8 for hot combination, +1.2/0.8 for partial hits).
  * **Tree 2 (Exploration Rigor)**: Triggers a **+1.5 log-odds boost** if the sequential graph transition (`VIEW ➔ CALCULATE_EMI ➔ CLICK_APPLY`) is found; otherwise scales with calculator usage.
  * **Tree 3 (Bureau Profiling)**: Shifts log-odds based on credit rating thresholds (+0.4 for credit score $\ge 750$, -0.5 for subprime $< 600$).
* **Sigmoid Activation**: Converts raw summed margins ($z$) into a scaled probability:
  $$\text{Intent Score} = \sigma(z) \times 100 = \frac{100}{1 + e^{-z}}$$

### 🛡️ Model 3 – Risk & Underwriting Model
* **Purpose**: Assesses borrower's risk profile and default probability.
* **Inputs**: Bureau score, historical missed EMIs, average balance stability, credit card utilization ratios, employment stability index.
* **Outputs**: Probability of default (PD), FOIR limit recommendation, loan eligibility status.

### 💸 Model 4 – Conversion Prediction ML Model
* **Purpose**: Predicts probability that a generated lead will accept the outreach campaign.
* **Inputs**: Income, bureau score, calculated intent, existing relationship tags, previous offers accepted, response history.
* **Outputs**: Conversion Probability (Scale 0-100%).
* **Lead Qualification Threshold**: Leads with a conversion probability **exceeding 70%** are prioritized and pushed directly to the Relationship Manager Dashboard for AI-Assisted outreach.

---

## 🧬 Behavioral Financial Twin (Twin Profile)

Rather than assigning a simple, opaque credit score, Prospect Assist AI generates a dynamic **Behavioral Financial Twin** for each customer to support explainable underwriting factors. This twin profile consists of six dynamic scores:

1. **Repayment Capacity Score (0-100)**: Assesses net disposable cash headroom relative to gross monthly inflows.
2. **Intent Score (0-100)**: Evaluates active lending interest based on calculator use, page comparison duration, and showroom triggers.
3. **Financial Discipline Score (0-100)**: Rates historical repayment stability, penalizing account statement bounces and credit card late charges.
4. **Spending Stability Score (0-100)**: Monitors regular monthly cash-flow allocations and flags excessive discretionary spending spikes.
5. **Income Confidence Score (0-100)**: Measures salary deposit consistency (repetition intervals over a rolling 90-day time window).
6. **Offer Acceptance Probability (0-100%)**: Models likelihood of conversion utilizing the multi-variable ML conversion model.

### ⚖️ Explainable Weighted Lead Score Formula

To prioritize prospects, the orchestrator combines the financial twin parameters into a final weighted lead score:

$$\text{Lead Score} = 0.35 \times \text{Intent} + 0.30 \times \text{Repayment Capacity} + 0.20 \times \text{Financial Stability} + 0.15 \times \text{Customer Relationship}$$

*Where:*
* **Financial Stability** is the composite average of the *Financial Discipline Score* and the *Spending Stability Score*.
* **Customer Relationship** is calculated based on account age and number of active products.

*This formula gives the bank a ranked list of high-quality prospects while supporting explainable risk management factors.*

---

## 🛠️ Phase-by-Phase Development Roadmap

### 📅 Phase 1: Foundation & Backend Ingestion Services ➔ `[x] COMPLETED`
* Setup database models with clean abstractions for `Customer`, `Transaction`, `ClickstreamEvent`, and `Lead` under SQLite/SQLAlchemy.
* Implement the cash-flow underwriting algorithms (`services/credit.py`) to calculate `Actual Disposable Income` from transaction logs, utilising dynamic cycle divisors to avoid calendar fencepost overlaps.

### 📅 Phase 2: Split-Screen Simulator UI & A/B Testing ➔ `[x] COMPLETED`
* Build the unified split-screen browser interface.
* **Left Panel (Simulator)**: Allows judges to select profiles and trigger real-time clicks/transactions.
* **Right Panel (RM command center)**: Houses the Lead Board, intent tracker, A/B Testing impact cards, and the outreach generator.
* Build the causal A/B testing splits to dynamically divide leads into Treated vs. Control cohorts.

### 📅 Phase 3: Multi-Model ML Pipeline & Data Ingestion (Data Lake) ➔ `[x] COMPLETED`
* Map data sources (Core Banking, UPI, CRM, Credit Bureau) flowing into a central **Data Lake** processing layer.
* Implement the **4-Model ML Pipeline** (`services/scoring.py`):
  * **Model 1: Income Estimation** (net disposable headroom estimation).
  * **Model 2: Intent Prediction** (loan interest score from digital footprint).
  * **Model 3: Risk & Underwriting** (PD default probability & risk tiering).
  * **Model 4: Conversion Prediction** (conversion probability combination).
* Configure the **70% Lead Threshold Filter** to block low-quality leads and push only high-converting ones to sales.

### 📅 Phase 4: AI Integration, Test Suite & AWS Readiness ➔ `[x] COMPLETED`
* Integrate LLM outreach templates with WhatsApp/email templates and Control group fallback templates.
* Write full unit test checks inside `backend/tests/` to verify income estimators and model probabilities.
* Create a Dockerfile to package the FastAPI app for containerized deployments via ACC tooling on **AWS ECS / Fargate** and **RDS PostgreSQL**.
