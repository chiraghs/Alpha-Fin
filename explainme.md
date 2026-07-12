# Track 02 Problem Statement and Expected Outcome

This document details how **Alpha-Fin** (Behavioral Credit & Hyper-Targeted Lead Engine) maps to, addresses, and satisfies all requirements outlined in the IDBI Innovate 2026 Hackathon Track 02 specifications.

---

## 🎯 Problem Statement Coverage

> **Problem Statement**:
> *Bank’s retail lending relies on traditional metrics, resulting in low conversions and limited insight into customer intent. A data-driven approach is needed to identify eligible, quantifiable repayment capacity, genuinely interested prospects using transaction and behavioral insights.*

### 1. Traditional Metrics vs. Real-Time Customer Intent
* **The Traditional Gap**: Banks rely on static lagging metrics like bureau scores or self-reported income, which do not reflect real-time interest or current financial events.
* **Alpha-Fin Data-Driven Solution**:
  * **Behavioral Clickstream Logs**: The system captures clicks, interest page loads, and EMI calculator hits.
  * **LightGBM-like GBDT Ensemble**: Features are fed into a three-stage GBDT decision tree forest model in `services/scoring.py` that computes log-odds and runs a **Sigmoid Activation Function** to predict a conversion probability $P(\text{conversion}) = 1/(1+e^{-z})$.
  * **Graph Clickstream Transition mapping**: User taps are analyzed as a directed state-space transition graph. Taps matching the high-intent pattern:
    $$\text{VIEW} \xrightarrow{} \text{CALCULATE\_EMI} \xrightarrow{} \text{CLICK\_APPLY}$$
    receive a +1.5 log-odds boost, separating serious customers from casual browsers.

### 2. Identifying Quantifiable Repayment Capacity
* **The Traditional Gap**: Credit teams look at Gross Income, missing active commitments (like other bank EMIs, SIP mutual fund investments, or insurance payments), leading to defaults or bad underwriting.
* **Alpha-Fin Data-Driven Solution**:
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

## 💡 Executive Submission Summary

### 1. Brief about the Idea
**Alpha-Fin** is a real-time **Behavioral Credit & Hyper-Targeted Lead Engine** designed to modernize bank retail lending. It links digital customer behaviors (app/web clickstreams) directly to bank statement transaction flows. 

By analyzing instant behavior flags (like searching auto loan rates) and transactional triggers (like paying a car dealer deposit), the engine dynamically qualifies prospects, calculates their actual disposable cash headroom (prudent underwriting), creates context-aware AI outreach copy, and tracks campaign effectiveness live under a causal A/B testing split dashboard.

---

### 2. Opportunities

#### How different is it from any of the other existing ideas?
Traditional solutions operate in silos: rating engines look solely at credit scores, while CRMs generate cold leads using basic demographic filters. 

Alpha-Fin is a unified engine that runs **real-time behavioral GBDT ML scoring** and **directed state-space graph transition sequence models** on digital clickstreams, cross-referencing them immediately with a deep statement analysis parser. This allows the bank to predict customer purchase intent *hours before* they apply elsewhere, bridging the gap between transaction telemetry and front-end marketing.

#### How will it be able to solve the problem?
* **Captures Real Intent**: Uses graph-based sequence mapping to filter casual browsers from high-propensity buyers, capturing leads early.
* **Prudent Risk Guardrails**: Computes actual cash headroom rather than self-reported gross income by dynamically subtracting existing EMIs, active mutual fund SIPs, and utilities over a rolling 90-day time window.
* **Overcomes CRM Spam**: Delivers highly contextualized AI-generated outreach copy citing the customer's eligible limit and actual triggers, lifting conversion rates.

#### USP of the Proposed Solution
1. **Prudent EMI Headroom Calculator**: Dynamically adjusts FOIR ratios based on credit scores to calculate accurate borrowing limits for 4 loan types.
2. **Causal A/B Lift Dashboard**: Splits leads into Treated (AI) vs. Control (Spam) groups to mathematically measure and prove campaign lift.
3. **The Adapter Integration Pattern**: Built with abstract classes to run on local mock logs now and swap seamlessly to **IDBI Sandbox APIs** and AWS RDS/ECS.

---

### 3. List of Features Offered
* **Real-time Clickstream Ingestion**: Ingests pageviews, duration tracking, and rate calculator events.
* **LightGBM-like GBDT Classifier**: Ensemble model running log-odds and Sigmoid scaling to calculate conversion probability.
* **Directed Graph Path Analyzer**: Captures state transition subgraphs (VIEW ➔ CALCULATE_EMI ➔ CLICK_APPLY) to apply intent boosts.
* **Transactional Cash Flow Underwriter**: Subtracts EMIs, SIPs, and bills from gross inflows to compute disposable income.
* **Multi-Product Credit Qualifier**: Auto-underwrites Personal, Home, Auto, and Mortgage loans using score-adjusted FOIR limits.
* **A/B Cohort Splitter**: Assigns leads to Treated/Control groups to prevent bias.
* **Contextual Generative AI Outreach Writer**: Creates WhatsApp, email, and script drafts tailored to triggers.
* **Causal Impact Analytics Card**: Displays Treated conversion rates, Control rates, and lift metrics.
* **Relationship Manager Outcome Logger**: Logs "Converted"/"Rejected" leads to update live pipeline metrics.
