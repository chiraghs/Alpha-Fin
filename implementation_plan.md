# Implementation Plan: Behavioral Credit & Hyper-Targeted Lead Engine (Track 02)

This plan outlines the architecture, data models, and developmental phases for building the **Behavioral Credit & Hyper-Targeted Lead Engine** (Alpha-Fin). To ensure maximum hackathon impact, we will build a **Unified Side-by-Side Simulator Dashboard**:
1. **Left Side**: A simulated mobile banking app (the Customer Portal) where users trigger behavioral events.
2. **Right Side**: The Relationship Manager (RM) Hub where credit leads appear, score, and trigger automated AI outreach in real-time.

---

## 🏗️ System Architecture

We will implement a clean, single-repository structure at `/Volumes/DiskD/HACKATHONS/Alpha-Fin/` containing a **FastAPI backend** (Python) and a **Vite/React frontend** (or clean vanilla JS/CSS) for the unified simulator.

```
/Volumes/DiskD/HACKATHONS/Alpha-Fin/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI entry point
│   │   ├── core/              # Configuration and security
│   │   ├── models/            # SQLAlchemy database models
│   │   ├── schemas/           # Pydantic validation schemas
│   │   ├── services/
│   │   │   ├── scoring.py     # Propensity & Intent calculation
│   │   │   ├── credit.py      # Disposable income & debt-service calculator
│   │   │   └── ai_outreach.py # Generative AI call scripts
│   │   └── database.py        # SQLite setup
│   ├── requirements.txt
│   └── tests/                 # Pytest suite
└── frontend/
    ├── index.html             # Unified split-screen frame
    ├── app.js                 # Frontend state and event handling
    ├── style.css              # Custom dark-mode glassmorphic styling
    └── assets/                # Logos, mock animations
```

---

## 🛠️ Phase-by-Phase Development Plan

### 📅 Phase 1: Foundation & Backend Services
* **Goal**: Establish the data schema, transaction logger, scoring logic, and FastAPI endpoints.
* **Key Tasks**:
  * Set up SQLite database with tables for `Customer`, `Transaction`, `ClickstreamEvent`, and `Lead`.
  * Implement the **Intent Engine** (`scoring.py`):
    * Calculate dynamic `Intent Score` based on clickstream logs (e.g., page views, session duration, interest calculators used) and transaction activities.
  * Implement the **True Income Assessment Engine** (`credit.py`):
    * Parse transaction descriptions (e.g., matching salary deposits, active EMI debits, recurring mutual funds/SIPs, insurance premiums).
    * Calculate `Actual Disposable Income` = `Total Inflows` - `Mandatory Outflows` (EMIs + SIPs + bills).
  * Expose API endpoints:
    * `POST /api/events` (log behavioral/clickstream events)
    * `GET /api/leads` (fetch prioritized leads for RM)
    * `POST /api/outreach/generate` (LLM-based personalized marketing copy generator)

### 📅 Phase 2: Split-Screen Simulator UI (Frontend)
* **Goal**: Build a unified, high-fidelity browser interface styled with rich aesthetics (dark-mode, neon accents, glassmorphic card borders).
* **Left Panel: Customer Mobile Simulator**:
  * An interactive mock phone screen representing the bank's customer app.
  * Quick-trigger event simulator buttons for judges to act as the customer:
    * *Button A*: "Simulate Salary Hike ($15\%$ credit bump)"
    * *Button B*: "Simulate Auto Loan Interest Search (3 clicks)"
    * *Button C*: "Simulate $45,000 transaction to Home Decor/Interior Vendor"
  * Visual log showing immediate local actions.
* **Right Panel: Relationship Manager (RM) Hub**:
  * **Lead Board**: Interactive table sorting leads by Propensity (Hot/Warm/Cold) and calculated Credit Limit.
  * **Behavioral Timeline**: A live feed of events showing why a lead triggered (e.g., *"Clicked Home Loan page 4 times; disposable income rose to $75,000"*).
  * **Disposable Income Breakdown**: Circular gauge charts comparing Gross Income vs. True Disposable Income.
  * **AI Outreach Assistant**: Click to open a modal that displays an LLM-generated personalized pitch (SMS, WhatsApp, or phone script) dynamically customized to their context.

### 📅 Phase 3: AI Integration & Testing
* **Goal**: Hook up the generative AI outreach, refine the scoring algorithms, and perform automated testing.
* **Key Tasks**:
  * Integrate OpenAI / Gemini API (or a high-fidelity local fallback generator) to write customized marketing outreach scripts.
  * Run static analysis and linting (`flake8`, `black`, `mypy`).
  * Implement unit tests in `backend/tests/` to verify income calculations and propensity score boundaries.
  * Package a quick launch script (`run_dev.sh`) to start both backend and frontend servers in one command.

---

## 🔍 Verification Plan

### Automated Tests
* Run `pytest` to verify:
  1. Propensity scores increase correctly when clickstream event logs are added.
  2. Disposable income calculations accurately account for EMI deductions.
  3. Lead priority rankings sort `Hot` leads with high disposable income first.

### Manual Verification
* Run the unified split-screen app in a browser:
  1. Trigger "Auto Loan Search" inside the simulated phone panel.
  2. Verify that the customer instantly appears in the RM Lead Board with a `Warm` tag.
  3. Trigger "Home Decor Spend" and "Salary Hike".
  4. Verify that their propensity upgrades to `Hot`, credit limits recalculate, and the AI outreach generator outputs a pitch mentioning home interior loans.
