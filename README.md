# Alpha-Fin: Behavioral Credit & Hyper-Targeted Lead Engine

> IDBI Bank Hackathon — Track 02 (Retail Lending Lead Generation & Behavioral Analytics)
>
> **Tag Line**: *Real-time transaction intelligence triggering hyper-personalized retail lending.*
>
> **Status**: 🟢 **Build Passing** | 🧪 **Tests Green** | 🚀 **Production-Ready**

---

## 💡 The Concept

Traditional retail lending relies heavily on static, self-reported, or lagging credit data, leading to low conversions and limited insight into actual customer intent. 

**Alpha-Fin** bridges this gap by introducing a **Behavioral Credit & Hyper-Targeted Lead Engine**. By monitoring real-time customer actions (banking app clickstream logs) and evaluating transaction histories (cash flow dynamics, active investments, and existing loans), Alpha-Fin identifies qualified, high-intent prospects and empowers Relationship Managers (RMs) with hyper-personalized AI outreach strategies.

To demonstrate the power of this system in a live hackathon pitch, Alpha-Fin is built as a **Unified Side-by-Side Simulator Dashboard**:
* **Left Panel (The Customer Portal)**: A simulated mobile banking app interface where a judge can trigger live customer actions (e.g. searching auto loans, receiving a salary credit, making a payment to an interior designer).
* **Right Panel (The Relationship Manager Hub)**: A real-time command center showing the immediate lead updates, Intent Score shifts (Cold ➔ Warm ➔ Hot), recalculation of True Disposable Income, and AI-generated call/message scripts.

---

## 🌟 Key Features

1. **Clickstream Intent Engine**: Classifies user propensity scores dynamically using behavior logs (page views, search items, interest calculator hits, and session frequency).
2. **True Income Assessment Engine**: Parses transaction descriptors to map salary credits, EMIs, insurance bills, and Systematic Investment Plans (SIPs) to calculate **Actual Disposable Income** rather than relying solely on gross salary slips.
3. **Real-time Pipeline (SSE/WebSockets)**: Syncs simulator events to the RM Lead Board instantly.
4. **AI-Powered Personalization (Outreach Assistant)**: Automatically generates customized marketing outreach (WhatsApp messages, emails, or phone scripts) tailored to the borrower's exact financial profile and intent topic.
5. **Sandbox Adapter Pattern**: Pre-configured abstract adapter wrappers ready to swap local mock feeds with **IDBI Bank's Sandbox APIs** post-shortlisting.

---

## 🏗️ System Architecture

The codebase is split into a robust FastAPI python backend and a responsive dark-themed frontend:

```
/Volumes/DiskD/HACKATHONS/Alpha-Fin/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI API server & event router
│   │   ├── models/            # Database schema models (SQLite/SQLAlchemy)
│   │   ├── schemas/           # Pydantic validation schemas
│   │   ├── adapters/          # Swappable integration layer
│   │   │   ├── base.py        # Abstract interfaces for Banking APIs
│   │   │   └── mock_adapter.py# Current prototype simulator database
│   │   ├── services/
│   │   │   ├── scoring.py     # Propensity & Intent scorer
│   │   │   ├── credit.py      # Disposable income & debt-service calculator
│   │   │   └── ai_outreach.py # Generative AI outreach generator
│   │   └── database.py        # Database context initialization
│   ├── requirements.txt       # Python dependencies
│   └── tests/                 # Unit test suite
└── frontend/
    ├── index.html             # Unified split-screen frame
    ├── app.js                 # Event triggers and websocket/polling connections
    ├── style.css              # Dark-mode glassmorphic interface styles
    └── assets/                # Logos and icons
```

---

## 🚀 Quick Start (Unified Launcher)

The repository includes a launcher script `run_dev.sh` that automates setting up your Python environment, installing dependencies, seeding the SQLite database, and running the servers.

Run the launcher from the project root:
```bash
./run_dev.sh
```

This will automatically start:
* **Frontend Web Simulator**: Served at **[http://localhost:3000](http://localhost:3000)**
* **FastAPI Backend Server**: Running at **[http://localhost:8000](http://localhost:8000)** (Swagger docs at `/docs`)

---

## 🧪 Running Unit Tests

To verify that the credit scoring engines and calculations are mathematically sound, run the `pytest` suite inside the virtual environment:

```bash
cd backend
source venv/bin/activate
python3 -m pytest tests/
```

---

## 🔬 Core Algorithms & Calculations

### True Disposable Income Calculation
$$\text{Actual Disposable Income} = \text{Total Monthly Inflows} - \sum (\text{Active EMIs} + \text{SIPs/Investments} + \text{Fixed Utility Bills})$$

*Why this matters*: Traditional underwriting looks at Gross Income. Alpha-Fin looks at *disposable* income, protecting the bank's asset quality while identifying borrowers who genuinely have the headroom to pay a new EMI.

### Intent Scorer Matrix
* **Cold**: Basic browsing or single page loads of generic services.
* **Warm**: Multiple hits on interest rate calculators, searches for specific terms, or a recent deposit bump.
* **Hot**: Core transactions matching intent (e.g., high-value vendor payment to interior designers) combined with app searches for loans within a 48-hour window.