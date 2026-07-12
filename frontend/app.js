// ==========================================
// ALPHA-FIN FRONTEND SIMULATOR LOGIC
// ==========================================

const API_BASE = "http://localhost:8000/api";

let customers = [];
let selectedCustomer = null;
let leads = [];
let activeLeadForOutreach = null;
let activeOutreachChannel = 'whatsapp';

// Elements
const customerSelect = document.getElementById("customerSelect");
const phoneUserName = document.getElementById("phoneUserName");
const phoneUserAccount = document.getElementById("phoneUserAccount");
const phoneUserBalance = document.getElementById("phoneUserBalance");
const leadsTableBody = document.getElementById("leadsTableBody");
const statTotalLeads = document.getElementById("statTotalLeads");
const statHotLeads = document.getElementById("statHotLeads");

// Outreach Drawer Elements
const outreachDrawer = document.getElementById("outreachDrawer");
const outreachCustomerName = document.getElementById("outreachCustomerName");
const outreachLoanType = document.getElementById("outreachLoanType");
const outreachAmount = document.getElementById("outreachAmount");
const outreachContentText = document.getElementById("outreachContentText");
const outreachContentLoader = document.getElementById("outreachContentLoader");
const btnCopyOutreach = document.getElementById("btnCopyOutreach");
const outreachControlWarning = document.getElementById("outreachControlWarning");

// Toast
const toastNotification = document.getElementById("toastNotification");
const toastMessage = document.getElementById("toastMessage");

// ==========================================================
// 🌐 STANDALONE MOCK BACKEND ENGINE FOR GITHUB PAGES HOSTING
// ==========================================================
let isStandaloneMode = false;
let mockCustomers = [];
let mockTransactions = [];
let mockClickstream = [];
let mockLeads = [];
let mockLeadCounter = 100;

function switchToStandaloneMode() {
    if (isStandaloneMode) return;
    isStandaloneMode = true;
    console.log("⚠️ FastAPI backend unavailable. Switched to browser Standalone Mode.");
    
    // Update Badge styling in UI
    const badge = document.getElementById("connectionStatusBadge");
    if (badge) {
        badge.className = "connection-status-badge standalone-mode";
        badge.innerHTML = `<i class="fa-solid fa-triangle-exclamation pulse-dot"></i> Standalone Mode`;
        badge.title = "Running fully client-side inside the browser. Changes are kept in memory.";
    }
    
    seedMockDatabase();
}

function seedMockDatabase() {
    mockCustomers = [
        { id: 1, name: "Aarav Mehta", email: "aarav.mehta@example.com", mobile: "+919876543210", account_number: "IDBI100892931", gross_monthly_income: 95000.0, credit_score: 780 },
        { id: 2, name: "Priya Sharma", email: "priya.sharma@example.com", mobile: "+919876543211", account_number: "IDBI100482932", gross_monthly_income: 150000.0, credit_score: 810 },
        { id: 3, name: "Vikram Singh", email: "vikram.singh@example.com", mobile: "+919876543212", account_number: "IDBI100382933", gross_monthly_income: 55000.0, credit_score: 640 }
    ];

    mockTransactions = [];
    mockClickstream = [];
    mockLeads = [];

    // Seed 90 days of transactions
    const now = new Date();
    for (let i = 0; i < 3; i++) {
        const mDate = new Date(now.getTime() - i * 30 * 24 * 60 * 60 * 1000);
        
        // Aarav
        mockTransactions.push(
            { id: mockTransactions.length+1, customer_id: 1, amount: 95000.0, category: "Salary", description: "IDBI SALARY CREDIT / TECH CORP", timestamp: new Date(mDate.getFullYear(), mDate.getMonth(), 1).toISOString() },
            { id: mockTransactions.length+1, customer_id: 1, amount: -25000.0, category: "Rent", description: "RENT TRANSFER / APARTMENT", timestamp: new Date(mDate.getFullYear(), mDate.getMonth(), 3).toISOString() },
            { id: mockTransactions.length+1, customer_id: 1, amount: -10000.0, category: "SIP", description: "SIP DEBIT / HDFC MUTUAL FUND", timestamp: new Date(mDate.getFullYear(), mDate.getMonth(), 5).toISOString() },
            { id: mockTransactions.length+1, customer_id: 1, amount: -3500.0, category: "Utility", description: "TATA POWER ELECTRICITY BILL", timestamp: new Date(mDate.getFullYear(), mDate.getMonth(), 10).toISOString() },
            { id: mockTransactions.length+1, customer_id: 1, amount: -12000.0, category: "Shopping", description: "AMAZON INDIA INFORMATICS", timestamp: new Date(mDate.getFullYear(), mDate.getMonth(), 15).toISOString() }
        );

        // Priya
        mockTransactions.push(
            { id: mockTransactions.length+1, customer_id: 2, amount: 150000.0, category: "Salary", description: "SALARY CREDIT / CONSULTING GROUP", timestamp: new Date(mDate.getFullYear(), mDate.getMonth(), 1).toISOString() },
            { id: mockTransactions.length+1, customer_id: 2, amount: -35000.0, category: "Rent", description: "RENT DEBIT / SOCIETY BANK", timestamp: new Date(mDate.getFullYear(), mDate.getMonth(), 3).toISOString() },
            { id: mockTransactions.length+1, customer_id: 2, amount: -15000.0, category: "EMI", description: "HDFC CAR LOAN AUTO EMI", timestamp: new Date(mDate.getFullYear(), mDate.getMonth(), 5).toISOString() },
            { id: mockTransactions.length+1, customer_id: 2, amount: -20000.0, category: "SIP", description: "SIP DEBIT / NIPPON INDIA FUND", timestamp: new Date(mDate.getFullYear(), mDate.getMonth(), 7).toISOString() },
            { id: mockTransactions.length+1, customer_id: 2, amount: -8000.0, category: "Utility", description: "ACT FIBERNET & GAS UTILITY", timestamp: new Date(mDate.getFullYear(), mDate.getMonth(), 12).toISOString() }
        );

        // Vikram
        mockTransactions.push(
            { id: mockTransactions.length+1, customer_id: 3, amount: 55000.0, category: "Salary", description: "SALARY CREDIT / RETAIL CORP", timestamp: new Date(mDate.getFullYear(), mDate.getMonth(), 1).toISOString() },
            { id: mockTransactions.length+1, customer_id: 3, amount: -15000.0, category: "Transfer", description: "FAMILY TRANSFER", timestamp: new Date(mDate.getFullYear(), mDate.getMonth(), 3).toISOString() },
            { id: mockTransactions.length+1, customer_id: 3, amount: -5000.0, category: "SIP", description: "SIP DEBIT / AXIS MUTUAL FUND", timestamp: new Date(mDate.getFullYear(), mDate.getMonth(), 5).toISOString() },
            { id: mockTransactions.length+1, customer_id: 3, amount: -2200.0, category: "Utility", description: "PHONE & BROADBAND BILLS", timestamp: new Date(mDate.getFullYear(), mDate.getMonth(), 10).toISOString() }
        );
    }

    // Special trigger transactions
    mockTransactions.push(
        { id: mockTransactions.length+1, customer_id: 2, amount: -65000.0, category: "Shopping", description: "IKEA FURNITURE MUMBAI IN", timestamp: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000).toISOString() },
        { id: mockTransactions.length+1, customer_id: 3, amount: -1200.0, category: "Penalty", description: "IDBI CC BILL LATE FEE CHARGE", timestamp: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString() },
        { id: mockTransactions.length+1, customer_id: 3, amount: -18000.0, category: "Shopping", description: "FLIPKART INTERNET DEBIT", timestamp: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString() }
    );

    // Seed clickstream events (Last 7 days)
    mockClickstream.push(
        { customer_id: 1, page_url: "/auto-loan", action: "VIEW", duration_seconds: 45, timestamp: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString() },
        { customer_id: 1, page_url: "/auto-loan/emi-calculator", action: "CALCULATE_EMI", duration_seconds: 120, timestamp: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString() },
        { customer_id: 1, page_url: "/auto-loan", action: "CLICK_APPLY", duration_seconds: 5, timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString() },

        { customer_id: 2, page_url: "/home-loan", action: "VIEW", duration_seconds: 80, timestamp: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString() },
        { customer_id: 2, page_url: "/home-loan/calculator", action: "CALCULATE_EMI", duration_seconds: 150, timestamp: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString() },
        { customer_id: 2, page_url: "/home-loan", action: "VIEW", duration_seconds: 90, timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString() },

        { customer_id: 3, page_url: "/personal-loan", action: "VIEW", duration_seconds: 30, timestamp: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString() },
        { customer_id: 3, page_url: "/personal-loan", action: "VIEW", duration_seconds: 50, timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString() }
    );

    // Initial leads evaluation for Aarav, Priya, Vikram
    mockCustomers.forEach(cust => {
        mockRefreshCustomerLeads(cust.id);
    });

    // Seed historical completed leads for A/B testing lift charts
    mockLeads.push(
        { id: 200, customer_id: 1, customer: mockCustomers[0], loan_type: "Personal Loan", propensity_score: 0.85, intent_level: "Hot", calculated_disposable_income: 65000.0, max_eligible_emi: 32500, eligible_loan_amount: 1000000, status: "Converted", cohort: "Treated" },
        { id: 201, customer_id: 2, customer: mockCustomers[1], loan_type: "Auto Loan", propensity_score: 0.90, intent_level: "Hot", calculated_disposable_income: 72000.0, max_eligible_emi: 36000, eligible_loan_amount: 1500000, status: "Converted", cohort: "Treated" },
        { id: 202, customer_id: 1, customer: mockCustomers[0], loan_type: "Mortgage Loan", propensity_score: 0.45, intent_level: "Warm", calculated_disposable_income: 65000.0, max_eligible_emi: 32500, eligible_loan_amount: 2500000, status: "Converted", cohort: "Treated" },
        { id: 203, customer_id: 3, customer: mockCustomers[2], loan_type: "Auto Loan", propensity_score: 0.55, intent_level: "Warm", calculated_disposable_income: 33000.0, max_eligible_emi: 13200, eligible_loan_amount: 600000, status: "Rejected", cohort: "Treated" },
        
        { id: 204, customer_id: 2, customer: mockCustomers[1], loan_type: "Mortgage Loan", propensity_score: 0.40, intent_level: "Warm", calculated_disposable_income: 72000.0, max_eligible_emi: 36000, eligible_loan_amount: 3000000, status: "Converted", cohort: "Control" },
        { id: 205, customer_id: 3, customer: mockCustomers[2], loan_type: "Home Loan", propensity_score: 0.50, intent_level: "Warm", calculated_disposable_income: 33000.0, max_eligible_emi: 13200, eligible_loan_amount: 1200000, status: "Rejected", cohort: "Control" },
        { id: 206, customer_id: 1, customer: mockCustomers[0], loan_type: "Home Loan", propensity_score: 0.45, intent_level: "Warm", calculated_disposable_income: 65000.0, max_eligible_emi: 32500, eligible_loan_amount: 3500000, status: "Rejected", cohort: "Control" },
        { id: 207, customer_id: 2, customer: mockCustomers[1], loan_type: "Personal Loan", propensity_score: 0.60, intent_level: "Warm", calculated_disposable_income: 72000.0, max_eligible_emi: 36000, eligible_loan_amount: 1200000, status: "Rejected", cohort: "Control" },
        { id: 208, customer_id: 3, customer: mockCustomers[2], loan_type: "Mortgage Loan", propensity_score: 0.35, intent_level: "Warm", calculated_disposable_income: 33000.0, max_eligible_emi: 13200, eligible_loan_amount: 1000000, status: "Rejected", cohort: "Control" }
    );
}

// Port of services/credit.py
function mockCalculateDisposableIncome(txs, grossIncome) {
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    
    const recent = txs.filter(t => new Date(t.timestamp) >= ninetyDaysAgo);
    
    let inflows = 0;
    let emis = 0;
    let sips = 0;
    let bills = 0;
    
    recent.forEach(t => {
        const amt = t.amount;
        const cat = t.category.toUpperCase();
        const desc = t.description.toUpperCase();
        
        if (amt > 0) {
            if (desc.includes("SALARY") || desc.includes("PAYROLL") || cat === "SALARY") {
                inflows += amt;
            }
        } else {
            const absAmt = Math.abs(amt);
            if (desc.includes("EMI") || desc.includes("LOAN") || cat === "EMI") {
                emis += absAmt;
            } else if (desc.includes("SIP") || desc.includes("MUTUAL FUND") || cat === "SIP") {
                sips += absAmt;
            } else if (desc.includes("ELECTRICITY") || desc.includes("BILL") || desc.includes("UTILITY") || cat === "UTILITY") {
                bills += absAmt;
            }
        }
    });
    
    let numMonths = 3.0;
    if (recent.length > 0) {
        const times = recent.map(t => new Date(t.timestamp).getTime());
        const spanDays = (Math.max(...times) - Math.min(...times)) / (24 * 60 * 60 * 1000);
        numMonths = Math.max(parseFloat((Math.round(spanDays / 30) + 1).toFixed(1)), 1.0);
    }
    
    const avgSalary = inflows / numMonths;
    const avgEmi = emis / numMonths;
    const avgSip = sips / numMonths;
    const avgBill = bills / numMonths;
    
    const baseInflow = avgSalary > 0 ? avgSalary : grossIncome;
    const fixedCommitments = avgEmi + avgSip + avgBill;
    const disposable = Math.max(baseInflow - fixedCommitments, 0);
    
    return {
        gross_income: baseInflow,
        fixed_commitments: fixedCommitments,
        avg_emi: avgEmi,
        avg_sip: avgSip,
        avg_bill: avgBill,
        disposable_income: disposable
    };
}

function mockCalculateLoanEligibility(disposable, loanType, creditScore) {
    let foir = 0.20;
    if (creditScore >= 800) foir = 0.60;
    else if (creditScore >= 700) foir = 0.50;
    else if (creditScore >= 600) foir = 0.40;
    
    const maxEmi = disposable * foir;
    
    const loanParams = {
        "Auto Loan": { rate: 9.5, tenure: 60 },
        "Home Loan": { rate: 8.5, tenure: 240 },
        "Personal Loan": { rate: 12.0, tenure: 36 },
        "Mortgage Loan": { rate: 10.0, tenure: 120 }
    };
    
    const p = loanParams[loanType] || { rate: 10.0, tenure: 60 };
    const r = (p.rate / 12) / 100;
    const n = p.tenure;
    
    let eligibleAmount = 0;
    if (r > 0) {
        eligibleAmount = (maxEmi * (1 - Math.pow(1 + r, -n))) / r;
    } else {
        eligibleAmount = maxEmi * n;
    }
    
    return {
        loan_type: loanType,
        max_eligible_emi: Math.round(maxEmi),
        eligible_loan_amount: Math.round(eligibleAmount / 10000) * 10000,
        interest_rate: p.rate,
        tenure_months: n,
        foir_applied: foir
    };
}

// Port of services/scoring.py
function mockPredictIntent(clicks, txs, product, creditScore) {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    let views = 0;
    let calculators = 0;
    let applies = 0;
    
    const sorted = [...clicks].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const seq = [];
    
    sorted.forEach(c => {
        if (new Date(c.timestamp) < sevenDaysAgo) return;
        
        const page = c.page_url.toLowerCase();
        const act = c.action.toUpperCase();
        
        let match = false;
        if (product === "Auto Loan" && (page.includes("auto") || page.includes("car"))) match = true;
        else if (product === "Home Loan" && (page.includes("home") || page.includes("housing"))) match = true;
        else if (product === "Personal Loan" && (page.includes("personal") || page.includes("salary-loan"))) match = true;
        else if (product === "Mortgage Loan" && (page.includes("mortgage") || page.includes("property"))) match = true;
        
        if (match) {
            seq.push(act);
            if (act === "VIEW") views++;
            else if (act === "CALCULATE_EMI") calculators++;
            else if (act === "CLICK_APPLY") applies++;
        }
    });
    
    let hasHighIntentPath = false;
    for (let i = 0; i < seq.length - 2; i++) {
        if (seq[i] === "VIEW" && seq[i+1] === "CALCULATE_EMI" && seq[i+2] === "CLICK_APPLY") {
            hasHighIntentPath = true;
            break;
        }
    }
    
    let txTriggers = 0;
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    txs.forEach(t => {
        if (new Date(t.timestamp) < thirtyDaysAgo) return;
        const desc = t.description.toUpperCase();
        if (t.amount < 0) {
            if (product === "Auto Loan" && ["MARUTI", "HYUNDAI", "TOYOTA", "TATA MOTORS", "CAR DEKHO", "AUTO SERVICE", "SHOWROOM"].some(k => desc.includes(k))) {
                txTriggers++;
            } else if (["Home Loan", "Mortgage Loan"].includes(product) && ["INTERIOR", "DECOR", "FURNITURE", "IKEA", "ASIAN PAINTS", "BUILDER", "ARCHITECT"].some(k => desc.includes(k))) {
                txTriggers++;
            } else if (product === "Personal Loan" && ["LATE FEE", "PENALTY", "OVERDRAFT", "INTEREST DEBIT", "CREDIT CARD BILL LATE"].some(k => desc.includes(k))) {
                txTriggers++;
            }
        }
    });
    
    let z = -2.5;
    if (applies > 0) {
        z += txTriggers > 0 ? 1.8 : 1.2;
    } else {
        if (txTriggers > 0) z += 0.8;
    }
    
    if (hasHighIntentPath) z += 1.5;
    else if (calculators > 0) {
        z += 0.6;
        if (views > 2) z += 0.4;
    }
    
    if (creditScore >= 750) z += 0.4;
    else if (creditScore < 600) z -= 0.5;
    
    const intentProb = 1.0 / (1.0 + Math.exp(-z));
    return Math.round(intentProb * 1000) / 10;
}

function mockEvaluateRisk(creditScore, txs) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    let lateCharges = 0;
    txs.forEach(t => {
        if (new Date(t.timestamp) < thirtyDaysAgo) return;
        const desc = t.description.toUpperCase();
        if (t.amount < 0 && ["LATE FEE", "PENALTY", "BOUNCE", "CHG", "UNPAID"].some(k => desc.includes(k))) {
            lateCharges++;
        }
    });
    
    let z = -1.5;
    z -= (creditScore - 600) / 100.0;
    z += lateCharges * 0.8;
    
    const pd = 1.0 / (1.0 + Math.exp(-z));
    let tier = "Low Risk (Elite)";
    if (creditScore < 600 || pd >= 0.50 || lateCharges >= 2) {
        tier = "High Risk (Subprime)";
    } else if (creditScore < 700 || pd >= 0.20 || lateCharges > 0) {
        tier = "Medium Risk (Standard)";
    }
    
    return {
        risk_tier: tier,
        probability_of_default: pd,
        late_charges_count: lateCharges
    };
}

function mockPredictConversion(creditScore, intentVal, disposable, pdRisk) {
    let z = -1.2;
    z += (intentVal / 100.0) * 2.2;
    z += (creditScore - 600) / 200.0;
    z -= pdRisk * 1.5;
    
    return 1.0 / (1.0 + Math.exp(-z));
}

function mockDetectLifeEvents(txs, clicks) {
    const events = [];
    const now = new Date();
    
    // 1. Inflow surge
    const salaries = txs.filter(t => t.category.toLowerCase() === "salary" && t.amount > 0).map(t => t.amount);
    if (salaries.length >= 2) {
        const latest = salaries[0];
        const prior = salaries.slice(1);
        const avgPrior = prior.reduce((a,b)=>a+b, 0) / prior.length;
        if (latest >= avgPrior * 1.15) {
            events.push({
                event: "PROMOTION_DETECTED",
                icon: "📈",
                label: "Income Promotion Detected",
                confidence: 95,
                date: now.toISOString()
            });
        }
    }
    
    // 2. Wedding
    const shopTxs = txs.filter(t => t.amount < 0 && ["JEWEL", "WEDDING", "MARRIAGE", "BANQUET"].some(k => t.description.toUpperCase().includes(k)));
    if (shopTxs.length > 0) {
        events.push({
            event: "MARRIAGE_PLANNING",
            icon: "💍",
            label: "Marriage Planning Spend",
            confidence: 90,
            date: shopTxs[0].timestamp
        });
    } else {
        const personalClicks = clicks.filter(c => c.page_url.includes("personal-loan"));
        if (personalClicks.length > 0) {
            events.push({
                event: "MARRIAGE_PLANNING",
                icon: "💍",
                label: "Marriage Planning (Browsing)",
                confidence: 40,
                date: personalClicks[0].timestamp
            });
        }
    }
    
    // 3. School fees
    const school = txs.filter(t => t.amount < 0 && ["SCHOOL", "COLLEGE", "TUITION", "ACADEMY", "UNIVERSITY", "VIDYALAYA"].some(k => t.description.toUpperCase().includes(k)));
    if (school.length > 0) {
        events.push({
            event: "SCHOOL_FEES_STARTED",
            icon: "🎓",
            label: "Education Fees Commenced",
            confidence: 85,
            date: school[0].timestamp
        });
    }
    
    // 4. Vehicle Upgrade
    const auto = txs.filter(t => t.amount < 0 && ["INSURANCE", "CHOLA", "ICICI LOMBARD", "HDFC ERGO", "MOTORS", "SHOWROOM", "CAR SERVICE"].some(k => t.description.toUpperCase().includes(k)));
    if (auto.length > 0) {
        events.push({
            event: "VEHICLE_UPGRADE_POTENTIAL",
            icon: "🚗",
            label: "Vehicle Insurance / Premium",
            confidence: 80,
            date: auto[0].timestamp
        });
    }
    
    // 5. Rent / Home search
    const rent = txs.filter(t => t.amount < 0 && ["DEPOSIT", "RENTAL", "NOBROKER", "HOUSING", "BROKERAGE"].some(k => t.description.toUpperCase().includes(k)));
    const homeViews = clicks.some(c => c.page_url.includes("home-loan"));
    if (rent.length > 0 && homeViews) {
        events.push({
            event: "HOME_BUYER_INTENT",
            icon: "🏠",
            label: "Rental Deposit & Home Search",
            confidence: 90,
            date: rent[0].timestamp
        });
    }
    
    return events;
}

function mockEvaluatePropensityAndIntent(clicks, txs, creditScore, prevLeads = []) {
    const products = ["Auto Loan", "Home Loan", "Personal Loan", "Mortgage Loan"];
    
    const incomeMetrics = mockCalculateDisposableIncome(txs, 75000);
    const disposable = incomeMetrics.disposable_income;
    const repaymentCapacityScore = Math.min((disposable / incomeMetrics.gross_income) * 100, 100);
    
    const riskMetrics = mockEvaluateRisk(creditScore, txs);
    const pdRisk = riskMetrics.probability_of_default;
    const disciplineScore = Math.max(100 - riskMetrics.late_charges_count * 25, 0);
    const spendingStabilityScore = incomeMetrics.fixed_commitments > 0 ? 85.0 : 95.0;
    const financialStability = (disciplineScore + spendingStabilityScore) / 2.0;
    
    const salaryCount = txs.filter(t => t.category === "Salary").length;
    let confidenceScore = 40.0;
    if (salaryCount >= 3) confidenceScore = 95.0;
    else if (salaryCount === 2) confidenceScore = 80.0;
    else if (salaryCount === 1) confidenceScore = 60.0;
    
    let relationshipScore = 55.0;
    if (creditScore >= 780) relationshipScore = 85.0;
    else if (creditScore >= 680) relationshipScore = 70.0;
    
    const lifeEvents = mockDetectLifeEvents(txs, clicks);
    const results = {};
    
    products.forEach(p => {
        const intentVal = mockPredictIntent(clicks, txs, p, creditScore);
        
        // Velocity
        const now = new Date();
        const clicksRecent = clicks.filter(c => {
            const daysAgo = (now - new Date(c.timestamp)) / (24 * 60 * 60 * 1000);
            return daysAgo <= 7;
        });
        const clicksPrior = clicks.filter(c => {
            const daysAgo = (now - new Date(c.timestamp)) / (24 * 60 * 60 * 1000);
            return daysAgo > 7 && daysAgo <= 14;
        });
        const intentRecent = mockPredictIntent(clicksRecent, txs, p, creditScore);
        const intentPrior = mockPredictIntent(clicksPrior, txs, p, creditScore);
        const intentVelocity = Math.round((intentRecent - intentPrior) * 10) / 10;
        
        // Match life events
        const pEvents = [];
        lifeEvents.forEach(le => {
            const evt = le.event;
            if (p === "Auto Loan" && ["VEHICLE_UPGRADE_POTENTIAL", "PROMOTION_DETECTED"].includes(evt)) pEvents.push(le);
            else if (["Home Loan", "Mortgage Loan"].includes(p) && ["HOME_BUYER_INTENT", "PROMOTION_DETECTED"].includes(evt)) pEvents.push(le);
            else if (p === "Personal Loan" && ["MARRIAGE_PLANNING", "SCHOOL_FEES_STARTED", "PROMOTION_DETECTED"].includes(evt)) pEvents.push(le);
        });
        
        let lifeEventConfidence = 50.0;
        if (pEvents.length > 0) {
            lifeEventConfidence = Math.max(...pEvents.map(e => e.confidence));
        }
        
        let pHistory = 0.50;
        const relevantHistory = prevLeads.filter(l => l.loan_type === p);
        if (relevantHistory.length > 0) {
            const converts = relevantHistory.filter(l => l.status === "Converted").length;
            pHistory = converts / relevantHistory.length;
        }
        
        const conversionProbGbdt = mockPredictConversion(creditScore, intentVal, disposable, pdRisk);
        const conversionProb = 0.70 * conversionProbGbdt + 0.30 * pHistory;
        
        // LRI multiplicative index
        const scores = [repaymentCapacityScore, intentVal, financialStability, lifeEventConfidence, relationshipScore];
        let prodTerm = 1.0;
        scores.forEach(s => {
            prodTerm *= (0.2 + 0.8 * (s / 100.0));
        });
        let lriScore = 100.0 * prodTerm;
        lriScore = Math.min(100.0, Math.max(0.0, lriScore));
        const propensityScoreScaled = Math.round(lriScore) / 100;
        
        // Compile reasons checklist
        const reasons = [];
        if (confidenceScore >= 80.0) reasons.push("Salary stable for 90+ days (consistent salary deposits verified)");
        else reasons.push("Irregular or limited salary inflows observed in past 90 days");
        
        if (disciplineScore >= 100.0) reasons.push("Pristine payment discipline (zero statement bounce alerts)");
        else reasons.push(`Statement penalty checks bounced (Discipline: ${disciplineScore.toFixed(0)}/100)`);
        
        if (repaymentCapacityScore >= 40.0) reasons.push(`Optimal debt capacity headroom (${repaymentCapacityScore.toFixed(0)}% net disposable income)`);
        else reasons.push(`Tight debt capacity headroom (${repaymentCapacityScore.toFixed(0)}% net disposable income)`);
        
        if (intentVelocity >= 15.0) reasons.push(`Digital intent velocity surged: +${intentVelocity.toFixed(0)}% clickstream intensity increase`);
        
        pEvents.forEach(le => {
            reasons.push(`Life Event: ${le.label} (Confidence: ${le.confidence}%)`);
        });
        
        if (conversionProb >= 0.70) reasons.push(`High historical offer conversion likelihood (${(conversionProb * 100).toFixed(0)}%)`);
        
        const triggers = [];
        if (intentVal >= 70) triggers.push(`High digital intent signals: ${intentVal.toFixed(0)}/100`);
        if (riskMetrics.late_charges_count > 0) triggers.push("Missed bills/late penalties on account history");
        if (spendingStabilityScore >= 90) triggers.push(`Stable cash inflows: ${spendingStabilityScore.toFixed(0)}/100`);
        
        let label = "Cold";
        if (propensityScoreScaled >= 0.70) label = "Hot";
        else if (propensityScoreScaled >= 0.35) label = "Warm";
        
        const eligibility = mockCalculateLoanEligibility(disposable, p, creditScore);
        
        results[p] = {
            propensity_score: propensityScoreScaled,
            intent_level: label,
            triggers: triggers,
            reasons: reasons,
            intent_velocity: intentVelocity,
            life_events: pEvents,
            repayment_capacity_score: Math.round(repaymentCapacityScore * 10) / 10,
            intent_score: Math.round(intentVal * 10) / 10,
            discipline_score: Math.round(disciplineScore * 10) / 10,
            spending_stability_score: Math.round(spendingStabilityScore * 10) / 10,
            income_confidence_score: Math.round(confidenceScore * 10) / 10,
            offer_acceptance_probability: Math.round(conversion_prob * 100) / 100,
            composite_lead_score: Math.round(propensityScoreScaled * 100) / 100,
            risk_evaluation: {
                risk_tier: riskMetrics.risk_tier,
                probability_of_default: riskMetrics.probability_of_default,
                max_eligible_limit: eligibility.eligible_loan_amount,
                foir_limit: eligibility.foir_applied
            },
            financial_twin: {
                repayment_capacity: Math.round(repaymentCapacityScore * 10) / 10,
                intent_score: Math.round(intentVal * 10) / 10,
                financial_discipline: Math.round(disciplineScore * 10) / 10,
                spending_stability: Math.round(spendingStabilityScore * 10) / 10,
                income_confidence: Math.round(confidenceScore * 10) / 10,
                offer_acceptance: Math.round(conversion_prob * 1000) / 10,
                lead_score: Math.round(lriScore * 10) / 10
            }
        };
    });
    
    return results;
}

function mockRefreshCustomerLeads(customerId) {
    const cust = mockCustomers.find(c => c.id === customerId);
    if (!cust) return;
    
    const txList = mockTransactions.filter(t => t.customer_id === customerId);
    const clickList = mockClickstream.filter(c => c.customer_id === customerId);
    
    const incomeMetrics = mockCalculateDisposableIncome(txList, cust.gross_monthly_income);
    const disposable = incomeMetrics.disposable_income;
    
    const prevLeads = mockLeads.filter(l => l.customer_id === customerId);
    const propensityMap = mockEvaluatePropensityAndIntent(clickList, txList, cust.credit_score, prevLeads);
    
    let leadIdx = 0;
    Object.keys(propensityMap).forEach(loanType => {
        const pData = propensityMap[loanType];
        
        // Strict Underwriting Gate: Risk Model 3 check
        const isHighRisk = pData.risk_evaluation.risk_tier === "High Risk (Subprime)";
        const existingIdx = mockLeads.findIndex(l => l.customer_id === customerId && l.loan_type === loanType && l.status === "New");
        
        if (isHighRisk) {
            if (existingIdx !== -1) {
                mockLeads.splice(existingIdx, 1);
            }
            return;
        }
        
        if (pData.propensity_score >= 0.35) {
            const eligibility = mockCalculateLoanEligibility(disposable, loanType, cust.credit_score);
            const cohort = leadIdx % 2 === 0 ? "Treated" : "Control";
            leadIdx++;
            
            if (existingIdx !== -1) {
                // Update
                mockLeads[existingIdx].propensity_score = pData.propensity_score;
                mockLeads[existingIdx].intent_level = pData.intent_level;
                mockLeads[existingIdx].calculated_disposable_income = disposable;
                mockLeads[existingIdx].max_eligible_emi = eligibility.max_eligible_emi;
                mockLeads[existingIdx].eligible_loan_amount = eligibility.eligible_loan_amount;
                mockLeads[existingIdx].intent_velocity = pData.intent_velocity;
                mockLeads[existingIdx].life_events = pData.life_events;
                mockLeads[existingIdx].reasons = pData.reasons;
            } else {
                // Add new
                mockLeadCounter++;
                mockLeads.push({
                    id: mockLeadCounter,
                    customer_id: customerId,
                    customer: cust,
                    loan_type: loanType,
                    propensity_score: pData.propensity_score,
                    intent_level: pData.intent_level,
                    calculated_disposable_income: disposable,
                    max_eligible_emi: eligibility.max_eligible_emi,
                    eligible_loan_amount: eligibility.eligible_loan_amount,
                    status: "New",
                    cohort: cohort,
                    intent_velocity: pData.intent_velocity,
                    life_events: pData.life_events,
                    reasons: pData.reasons
                });
            }
        } else {
            // Remove if score drops below 35%
            if (existingIdx !== -1) {
                mockLeads.splice(existingIdx, 1);
            }
        }
    });
}

function mockGenerateOutreachCopy(lead, channel) {
    const name = lead.customer.name;
    const loanType = lead.loan_type;
    const amt = lead.eligible_loan_amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
    const emi = lead.max_eligible_emi.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
    const code = "IDBI" + Math.floor(1000 + Math.random() * 9000);
    
    // Check for life events
    let hook = "";
    if (lead.life_events && lead.life_events.length > 0) {
        const evt = lead.life_events[0].event;
        if (evt === "PROMOTION_DETECTED") hook = "We noticed your recent income surge! In celebration of your financial growth, ";
        else if (evt === "MARRIAGE_PLANNING") hook = "Planning a wedding is a beautiful journey. To assist with your expenses, ";
        else if (evt === "SCHOOL_FEES_STARTED") hook = "To support your family's educational needs, ";
        else if (evt === "VEHICLE_UPGRADE_POTENTIAL") hook = "Looking to upgrade your ride or premium insurance? ";
        else if (evt === "HOME_BUYER_INTENT") hook = "Ready to transition from renting to owning? ";
    }
    
    if (channel === 'whatsapp') {
        return `*IDBI Prospect Assist AI* 🚀\n\nDear ${name},\n\n${hook || "Unlock your customized borrowing limits today! "}We are pleased to offer you a pre-approved *${loanType}* of up to *${amt}* with manageable monthly EMIs starting at just *${emi}*.\n\n👉 Tap link to apply instantly: https://idbi.com/apply?code=${code}\n\n*IDBI Bank — Banking For All.*`;
    } else if (channel === 'email') {
        return `Subject: Pre-Approved ${loanType} of ${amt} tailored for you!\n\nDear ${name},\n\n${hook || ""}Based on your banking relationship with IDBI Bank, we have designed a customized credit limit tailored specifically to your needs.\n\nApproved Loan: ${loanType}\nMaximum Limit: ${amt}\nEstimated EMI: ${emi}/month\n\nNo paperwork, 100% digital verification, and instant disbursal. Click below to confirm acceptance:\nhttps://idbi.com/apply?code=${code}\n\nBest Regards,\nRetail Lending Team\nIDBI Bank`;
    } else {
        return `[RM Script]\n"Hello ${name}, this is your Relationship Manager from IDBI Bank. I'm calling to share that we've set up a pre-approved ${loanType} limit of ${amt} on your account. ${hook ? 'We saw some related transactions and wanted to reach out. ' : ''}This comes with an easy EMI structure of ${emi} per month. Would you like me to process the digital disbursal for you?"`;
    }
}

// 🌐 Network Request Interception Layer (Fake fetch handler)
async function handleMockRequest(path, options = {}) {
    const method = (options.method || 'GET').toUpperCase();
    
    // Simulate slight network delay for premium UI feel (loading states)
    await new Promise(resolve => setTimeout(resolve, 300));
    
    let responseBody = null;
    let status = 200;
    
    // Router logic matching FastAPI endpoints
    if (path === "/customers" && method === "GET") {
        responseBody = mockCustomers;
    } 
    else if (path.startsWith("/customers/") && path.endsWith("/twin") && method === "GET") {
        const id = parseInt(path.split("/")[2]);
        const cust = mockCustomers.find(c => c.id === id);
        if (!cust) {
            status = 404;
            responseBody = { detail: "Customer not found" };
        } else {
            const txList = mockTransactions.filter(t => t.customer_id === id);
            const clickList = mockClickstream.filter(c => c.customer_id === id);
            const prevLeads = mockLeads.filter(l => l.customer_id === id);
            responseBody = mockEvaluatePropensityAndIntent(clickList, txList, cust.credit_score, prevLeads);
        }
    } 
    else if (path === "/leads" && method === "GET") {
        // Return active leads (status = New, Converted, Rejected) with populated customer object
        responseBody = mockLeads.map(l => {
            const cust = mockCustomers.find(c => c.id === l.customer_id);
            return { ...l, customer: cust };
        });
    } 
    else if (path === "/clickstream" && method === "POST") {
        const body = JSON.parse(options.body);
        const event = {
            customer_id: body.customer_id,
            page_url: body.page_url,
            action: body.action,
            timestamp: body.timestamp || new Date().toISOString()
        };
        mockClickstream.push(event);
        mockRefreshCustomerLeads(body.customer_id);
        responseBody = { status: "Success", logged: event };
    } 
    else if (path === "/transaction" && method === "POST") {
        const body = JSON.parse(options.body);
        const tx = {
            id: mockTransactions.length + 1,
            customer_id: body.customer_id,
            amount: parseFloat(body.amount),
            category: body.category,
            description: body.description,
            timestamp: body.timestamp || new Date().toISOString()
        };
        mockTransactions.push(tx);
        mockRefreshCustomerLeads(body.customer_id);
        responseBody = { status: "Success", logged: tx };
    } 
    else if (path === "/outreach/generate" && method === "POST") {
        const body = JSON.parse(options.body);
        const lead = mockLeads.find(l => l.id === body.lead_id);
        if (!lead) {
            status = 404;
            responseBody = { detail: "Lead not found" };
        } else {
            const text = mockGenerateOutreachCopy(lead, body.channel);
            responseBody = {
                lead_id: body.lead_id,
                channel: body.channel,
                personalized_copy: text,
                is_control: lead.cohort === "Control"
            };
        }
    } 
    else if (path === "/reset" && method === "POST") {
        seedMockDatabase();
        responseBody = { status: "Success", message: "Mock database re-seeded successfully." };
    } 
    else if (path === "/leads/performance" && method === "GET") {
        const treatedLeads = mockLeads.filter(l => l.cohort === "Treated");
        const controlLeads = mockLeads.filter(l => l.cohort === "Control");
        
        const treatedTotal = treatedLeads.length;
        const treatedConverted = treatedLeads.filter(l => l.status === "Converted").length;
        const treatedRate = treatedTotal > 0 ? (treatedConverted / treatedTotal) * 100 : 0;
        
        const controlTotal = controlLeads.length;
        const controlConverted = controlLeads.filter(l => l.status === "Converted").length;
        const controlRate = controlTotal > 0 ? (controlConverted / controlTotal) * 100 : 0;
        
        const lift = treatedRate - controlRate;
        
        responseBody = {
            treated_total: treatedTotal,
            treated_converted: treatedConverted,
            treated_conversion_rate: Math.round(treatedRate * 10) / 10,
            control_total: controlTotal,
            control_converted: controlConverted,
            control_conversion_rate: Math.round(controlRate * 10) / 10,
            conversion_lift: Math.round(lift * 10) / 10
        };
    } 
    else if (path.startsWith("/leads/") && path.endsWith("/status") && method === "PUT") {
        const id = parseInt(path.split("/")[2]);
        const body = JSON.parse(options.body);
        const idx = mockLeads.findIndex(l => l.id === id);
        if (idx === -1) {
            status = 404;
            responseBody = { detail: "Lead not found" };
        } else {
            mockLeads[idx].status = body.status;
            responseBody = { status: "Success", lead: mockLeads[idx] };
        }
    } 
    else {
        status = 404;
        responseBody = { detail: "Not Found Mock Path" };
    }
    
    return {
        ok: status >= 200 && status < 300,
        status: status,
        json: async () => responseBody
    };
}

// 🐒 Override window.fetch globally to intercept API requests
const originalFetch = window.fetch;
window.fetch = async function(url, options) {
    if (typeof url === "string" && url.startsWith(API_BASE)) {
        const path = url.substring(API_BASE.length);
        if (isStandaloneMode) {
            return await handleMockRequest(path, options);
        }
        try {
            const res = await originalFetch(url, options);
            return res;
        } catch (err) {
            switchToStandaloneMode();
            return await handleMockRequest(path, options);
        }
    }
    return originalFetch(url, options);
};

// ==========================================
// ON LOAD
// ==========================================
window.addEventListener("DOMContentLoaded", async () => {
    // Detect if served from GitHub Pages or locally via file URL (which forces standalone mode)
    if (window.location.hostname.includes("github.io") || window.location.protocol === "file:") {
        switchToStandaloneMode();
    }

    await initApp();
    
    // Periodically sync Lead Board in background to simulate live WebSocket updates
    setInterval(async () => {
        await fetchLeads(false); // Silent fetch without UI flashes
    }, 2500);
});

async function initApp() {
    try {
        await fetchCustomers();
        await fetchLeads(true);
    } catch (err) {
        console.error("Initialization error:", err);
        showToast("Error connecting to FastAPI backend. Ensure server is running.", true);
    }
}

// REST: FETCH CUSTOMERS
async function fetchCustomers() {
    const res = await fetch(`${API_BASE}/customers`);
    if (!res.ok) throw new Error("Failed to load customers");
    customers = await res.json();
    
    // Populate select element
    customerSelect.innerHTML = "";
    customers.forEach(c => {
        const option = document.createElement("option");
        option.value = c.id;
        option.textContent = `${c.name} (${c.account_number})`;
        customerSelect.appendChild(option);
    });

    // Listen to changes
    customerSelect.removeEventListener("change", handleCustomerChange);
    customerSelect.addEventListener("change", handleCustomerChange);

    if (customers.length > 0) {
        loadCustomerProfile(customers[0].id);
    }
}

function handleCustomerChange(e) {
    loadCustomerProfile(parseInt(e.target.value));
}

// Load customer UI inside simulated phone app
async function loadCustomerProfile(customerId) {
    selectedCustomer = customers.find(c => c.id === customerId);
    if (!selectedCustomer) return;

    phoneUserName.textContent = selectedCustomer.name.split(" ")[0];
    phoneUserAccount.textContent = selectedCustomer.account_number;
    
    // Format monthly gross income as dummy balance representation
    const balance = selectedCustomer.gross_monthly_income * 1.5;
    phoneUserBalance.textContent = `₹${balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// REST: FETCH LEADS
async function fetchLeads(showVisualIndicators = false) {
    try {
        const res = await fetch(`${API_BASE}/leads`);
        if (!res.ok) throw new Error("Failed to load leads");
        leads = await res.json();
        
        renderLeadBoard();
        await fetchPerformanceData();
        
        if (showVisualIndicators) {
            showToast("RM Lead Board refreshed!");
        }
    } catch (err) {
        console.error("Error fetching leads:", err);
    }
}

// DYNAMIC THRESHOLD CONTROL
let activeThreshold = 0.70; // Defaults to 70% threshold

function changeThreshold(val) {
    activeThreshold = parseFloat(val) / 100.0;
    document.getElementById("thresholdLabel").textContent = val + "%";
    renderLeadBoard();
}

// RENDER LEAD BOARD
function renderLeadBoard() {
    leadsTableBody.innerHTML = "";
    
    const filteredLeads = leads.filter(l => l.propensity_score >= activeThreshold);
    
    statTotalLeads.textContent = filteredLeads.length;
    const hotLeads = filteredLeads.filter(l => l.intent_level === "Hot").length;
    statHotLeads.textContent = hotLeads;

    if (filteredLeads.length === 0) {
        leadsTableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-secondary); padding: 2rem;">No active leads match the qualification threshold of ${(activeThreshold * 100).toFixed(0)}%. Try sliding the filter down to see other prospects.</td></tr>`;
        return;
    }

    filteredLeads.forEach(lead => {
        const row = document.createElement("tr");
        
        const disposable = lead.calculated_disposable_income.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
        const eligibleLimit = lead.eligible_loan_amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
        
        const intentBadgeClass = lead.intent_level === "Hot" ? "badge-hot" : "badge-warm";
        const propensityPct = Math.round(lead.propensity_score * 100);
        
        const cohortBadgeClass = lead.cohort === "Treated" ? "badge-treated" : "badge-control";
        
        let velocityHtml = "";
        if (lead.intent_velocity >= 15) {
            velocityHtml = `<span class="badge-velocity pulse-fast" title="Intent velocity surged by +${lead.intent_velocity}% in the last week!"><i class="fa-solid fa-bolt"></i> Call Now</span>`;
        }
        
        let lifeEventHtml = "";
        if (lead.life_events && lead.life_events.length > 0) {
            const firstEvent = lead.life_events[0];
            const eventClean = firstEvent.label.split(" (")[0];
            lifeEventHtml = `<span class="badge-life-event" title="${firstEvent.label}">${firstEvent.icon} ${eventClean}</span>`;
        }

        row.innerHTML = `
            <td><strong>${lead.customer.name}</strong></td>
            <td>
                <div class="product-cell-container">
                    <strong>${lead.loan_type}</strong>
                    ${lifeEventHtml}
                </div>
            </td>
            <td>${disposable}</td>
            <td>${lead.customer.credit_score}</td>
            <td>
                <div class="readiness-cell-container" style="display: flex; flex-direction: column; gap: 4px;">
                    <span class="badge-intent ${intentBadgeClass}">
                        <i class="fa-solid ${lead.intent_level === 'Hot' ? 'fa-fire pulse' : 'fa-circle-dot'}"></i>
                        ${lead.intent_level} (${propensityPct}%)
                    </span>
                    ${velocityHtml}
                </div>
            </td>
            <td>
                <span class="badge-cohort ${cohortBadgeClass}">
                    ${lead.cohort}
                </span>
            </td>
            <td><strong style="color: var(--accent-green);">${eligibleLimit}</strong></td>
            <td>
                <button class="btn-outreach-trigger" onclick="openOutreachDrawer(${lead.id})">
                    <i class="fa-solid fa-wand-magic-sparkles"></i> Outreach
                </button>
            </td>
        `;
        leadsTableBody.appendChild(row);
    });
}

// SIMULATOR TRIGGER: CLICKSTREAM EVENT
async function logClickstream(pageUrl, action) {
    if (!selectedCustomer) return;
    
    try {
        const res = await fetch(`${API_BASE}/clickstream`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                customer_id: selectedCustomer.id,
                page_url: pageUrl,
                action: action,
                duration_seconds: 15
            })
        });

        if (res.ok) {
            showToast(`Logged portal hit: ${action} on ${pageUrl}`);
            await fetchLeads(false);
        }
    } catch (err) {
        showToast("Error logging clickstream", true);
    }
}

// SIMULATOR TRIGGER: SALARY INCREASE TRANSACTION
async function triggerSalaryHike() {
    if (!selectedCustomer) return;
    
    // Add positive credit entry
    const hikeAmount = Math.round(selectedCustomer.gross_monthly_income * 0.15);
    
    try {
        const res = await fetch(`${API_BASE}/transaction`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                customer_id: selectedCustomer.id,
                amount: hikeAmount,
                category: "Salary",
                description: `IDBI SALARY CRED BUMP / ${selectedCustomer.name.toUpperCase()}`
            })
        });

        if (res.ok) {
            showToast(`Salary credit hike of ₹${hikeAmount.toLocaleString()} logged!`);
            await fetchLeads(true);
        }
    } catch (err) {
        showToast("Error logging transaction", true);
    }
}

// SIMULATOR TRIGGER: BROWSE LOAN INFO SPAM
async function triggerAutoSearch() {
    if (!selectedCustomer) return;
    
    showToast("Simulating customer search journey...");
    await logClickstream("/auto-loan/details", "VIEW");
    setTimeout(async () => {
        await logClickstream("/auto-loan/emi-calculator", "CALCULATE_EMI");
    }, 400);
    setTimeout(async () => {
        await logClickstream("/auto-loan/apply", "CLICK_APPLY");
    }, 800);
}

// SIMULATOR TRIGGER: HOME DECOR SPEND
async function triggerDecorSpend() {
    if (!selectedCustomer) return;
    
    try {
        const res = await fetch(`${API_BASE}/transaction`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                customer_id: selectedCustomer.id,
                amount: -65000,
                category: "Shopping",
                description: "DECORATIVE LIGHTS & FURNITURE DEBIT / IKEA MUMBAI"
            })
        });

        if (res.ok) {
            showToast("IKEA spend of ₹65,000 logged! Intent updated.");
            await fetchLeads(true);
        }
    } catch (err) {
        showToast("Error logging spend", true);
    }
}

// SIMULATOR TRIGGER: CC PENALTY LATE CHARGE
async function triggerCcPenalty() {
    if (!selectedCustomer) return;
    
    try {
        const res = await fetch(`${API_BASE}/transaction`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                customer_id: selectedCustomer.id,
                amount: -1200,
                category: "Penalty",
                description: "IDBI BANK CREDIT CARD LATE PAYMENT PENALTY CHARGE"
            })
        });

        if (res.ok) {
            showToast("Credit card late fee penalty transaction triggered!");
            await fetchLeads(true);
        }
    } catch (err) {
        showToast("Error logging penalty", true);
    }
}

// --- OUTREACH DRAWER LOGIC ---
function openOutreachDrawer(leadId) {
    activeLeadForOutreach = leads.find(l => l.id === leadId);
    if (!activeLeadForOutreach) return;

    outreachCustomerName.textContent = activeLeadForOutreach.customer.name;
    outreachLoanType.textContent = activeLeadForOutreach.loan_type;
    outreachAmount.textContent = activeLeadForOutreach.eligible_loan_amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

    // Display warning if Control Group
    if (activeLeadForOutreach.cohort === "Control") {
        outreachControlWarning.classList.remove("hidden");
    } else {
        outreachControlWarning.classList.add("hidden");
    }

    // Bind Behavioral Financial Twin dynamic scores
    const twin = activeLeadForOutreach.financial_twin;
    if (twin) {
        document.getElementById("twinRepayment").textContent = `${twin.repayment_capacity.toFixed(1)}%`;
        document.getElementById("twinIntent").textContent = `${twin.intent_score.toFixed(0)}`;
        document.getElementById("twinDiscipline").textContent = `${twin.financial_discipline.toFixed(0)}`;
        document.getElementById("twinStability").textContent = `${twin.spending_stability.toFixed(0)}`;
        document.getElementById("twinIncomeConf").textContent = `${twin.income_confidence.toFixed(0)}`;
        document.getElementById("twinAcceptance").textContent = `${twin.offer_acceptance.toFixed(1)}%`;
        document.getElementById("twinLeadScore").textContent = `${twin.lead_score.toFixed(1)}%`;
        document.getElementById("financialTwinSection").classList.remove("hidden");
        
        // Render timeline checklist inside the outreach modal
        const outreachTimelineBox = document.getElementById("outreachTimelineReasons");
        outreachTimelineBox.innerHTML = "";
        
        const reasons = activeLeadForOutreach.reasons;
        if (reasons && reasons.length > 0) {
            let reasonsHtml = `<h5 style="margin-bottom: 0.5rem; font-size: 0.75rem; color: var(--accent-cyan); text-transform: uppercase; letter-spacing: 0.5px;"><i class="fa-solid fa-list-check"></i> Decision Timeline Checklist</h5>`;
            reasonsHtml += `<ul style="list-style: none; padding-left: 0; display: flex; flex-direction: column; gap: 6px;">`;
            reasons.forEach(reason => {
                let icon = `<i class="fa-solid fa-circle-check" style="color: var(--accent-green);"></i>`;
                if (reason.toLowerCase().includes("irregular") || reason.toLowerCase().includes("bounce") || reason.toLowerCase().includes("tight")) {
                    icon = `<i class="fa-solid fa-triangle-exclamation" style="color: var(--accent-amber);"></i>`;
                }
                reasonsHtml += `<li style="font-size: 0.75rem; display: flex; align-items: start; gap: 8px; color: var(--text-primary);">${icon} <span>${reason}</span></li>`;
            });
            reasonsHtml += `</ul>`;
            outreachTimelineBox.innerHTML = reasonsHtml;
            outreachTimelineBox.classList.remove("hidden");
        } else {
            outreachTimelineBox.classList.add("hidden");
        }
    } else {
        document.getElementById("financialTwinSection").classList.add("hidden");
    }

    outreachDrawer.classList.remove("hidden");
    
    // Switch to active tab channel
    generateOutreachContent(activeOutreachChannel);
}

function closeOutreachDrawer() {
    outreachDrawer.classList.add("hidden");
}

function switchOutreachChannel(channel) {
    activeOutreachChannel = channel;
    
    // Handle tab styles
    document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
    
    if (channel === 'whatsapp') document.getElementById("tabWhatsapp").classList.add("active");
    if (channel === 'email') document.getElementById("tabEmail").classList.add("active");
    if (channel === 'call_script') document.getElementById("tabCallScript").classList.add("active");

    generateOutreachContent(channel);
}

async function generateOutreachContent(channel) {
    if (!activeLeadForOutreach) return;

    outreachContentLoader.classList.remove("hidden");
    outreachContentText.textContent = "";

    try {
        const res = await fetch(`${API_BASE}/outreach/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                lead_id: activeLeadForOutreach.id,
                channel: channel
            })
        });

        if (res.ok) {
            const data = await res.json();
            outreachContentText.textContent = data.content;
        } else {
            outreachContentText.textContent = "Error generating content. Please retry.";
        }
    } catch (err) {
        outreachContentText.textContent = "Backend connection error. Failed to retrieve outreach copy.";
    } finally {
        outreachContentLoader.classList.add("hidden");
    }
}

// Clipboard Copy
btnCopyOutreach.addEventListener("click", () => {
    const text = outreachContentText.textContent;
    if (!text || text === "Click generate to view content...") return;

    navigator.clipboard.writeText(text).then(() => {
        showToast("Campaign copy copied to clipboard!");
    }).catch(err => {
        showToast("Failed to copy text", true);
    });
});

// RESET SANDBOX DATABASE BUTTON
document.getElementById("btnResetDB").addEventListener("click", async () => {
    try {
        const res = await fetch(`${API_BASE}/reset`, { method: "POST" });
        if (res.ok) {
            showToast("Sandbox database reset and re-seeded!");
            closeOutreachDrawer();
            await initApp();
        } else {
            showToast("Error resetting database", true);
        }
    } catch (err) {
        showToast("Failed to communicate database reset", true);
    }
});

// TOAST HELPER
function showToast(message, isError = false) {
    toastMessage.textContent = message;
    
    if (isError) {
        toastNotification.style.borderColor = "var(--accent-red)";
        toastNotification.querySelector(".toast-icon").className = "fa-solid fa-triangle-exclamation toast-icon";
        toastNotification.querySelector(".toast-icon").style.color = "var(--accent-red)";
    } else {
        toastNotification.style.borderColor = "var(--accent-green)";
        toastNotification.querySelector(".toast-icon").className = "fa-solid fa-circle-check toast-icon";
        toastNotification.querySelector(".toast-icon").style.color = "var(--accent-green)";
    }

    toastNotification.classList.remove("hidden");
    
    // Hide toast after 3 seconds
    setTimeout(() => {
        toastNotification.classList.add("hidden");
    }, 3000);
}

// --- PERFORMANCE ANALYTICS (A/B TESTING) ---
async function fetchPerformanceData() {
    try {
        const res = await fetch(`${API_BASE}/leads/performance`);
        if (!res.ok) throw new Error("Failed to load performance metrics");
        const data = await res.json();
        
        // Treated metrics
        const tRate = document.getElementById("perfTreatedRate");
        const tFrac = document.getElementById("perfTreatedFraction");
        const tProg = document.getElementById("perfTreatedProgress");
        
        tRate.textContent = `${data.treated.rate}%`;
        tFrac.textContent = `(${data.treated.converted}/${data.treated.total} Conv)`;
        tProg.style.width = `${data.treated.rate}%`;
        
        // Control metrics
        const cRate = document.getElementById("perfControlRate");
        const cFrac = document.getElementById("perfControlFraction");
        const cProg = document.getElementById("perfControlProgress");
        
        cRate.textContent = `${data.control.rate}%`;
        cFrac.textContent = `(${data.control.converted}/${data.control.total} Conv)`;
        cProg.style.width = `${data.control.rate}%`;
        
        // Lift calculation
        const lift = (data.treated.rate - data.control.rate).toFixed(1);
        const lRate = document.getElementById("perfLiftRate");
        const lStatus = document.getElementById("perfLiftStatus");
        
        lRate.textContent = `${lift >= 0 ? '+' : ''}${lift}%`;
        
        // Target evaluation (Track 2 conversion lift target > 15-20% margin, or 30% absolute)
        if (lift >= 15.0) {
            lStatus.textContent = "Target Met";
            lStatus.style.backgroundColor = "rgba(0, 255, 135, 0.1)";
            lStatus.style.color = "var(--accent-green)";
            lStatus.style.border = "1px solid var(--accent-green)";
        } else {
            lStatus.textContent = "In Progress";
            lStatus.style.backgroundColor = "rgba(255, 179, 0, 0.1)";
            lStatus.style.color = "var(--accent-amber)";
            lStatus.style.border = "1px solid var(--accent-amber)";
        }
    } catch (err) {
        console.error("Error loading performance data:", err);
    }
}

// REST: LOG CAMPAIGN OUTCOME (CONVERT / REJECT LEAD)
async function markLeadStatus(newStatus) {
    if (!activeLeadForOutreach) return;
    
    try {
        const res = await fetch(`${API_BASE}/leads/${activeLeadForOutreach.id}/status`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: newStatus })
        });
        
        if (res.ok) {
            showToast(`Campaign logged: Lead marked as ${newStatus}`);
            closeOutreachDrawer();
            
            // Refresh tables and stats
            await fetchLeads(false);
        } else {
            showToast("Failed to update status", true);
        }
    } catch (err) {
        showToast("Error updating lead status", true);
    }
}

// ==========================================
// VIEW SWITCHER FOR RELATIONSHIP MANAGER TABS
// ==========================================
function switchRMView(view) {
    const btnLeads = document.getElementById("btnTabLeads");
    const btnPortfolio = document.getElementById("btnTabPortfolio");
    const paneLeads = document.getElementById("rmViewLeads");
    const panePortfolio = document.getElementById("rmViewPortfolio");

    if (view === 'leads') {
        btnLeads.classList.add("active");
        btnPortfolio.classList.remove("active");
        paneLeads.classList.remove("hidden");
        panePortfolio.classList.add("hidden");
    } else if (view === 'portfolio') {
        btnPortfolio.classList.add("active");
        btnLeads.classList.remove("active");
        panePortfolio.classList.remove("hidden");
        paneLeads.classList.add("hidden");
        loadPortfolioCustomers();
    }
}

// Cache variables for customer twin details
let portfolioCustomers = [];
let selectedTwinProfileData = null;

// FETCH ALL CUSTOMERS AND POPULATE PORTFOLIO SIDEBAR
async function loadPortfolioCustomers() {
    const listContainer = document.getElementById("portfolioCustomerList");
    listContainer.innerHTML = `<div style="text-align: center; color: var(--text-secondary); padding: 1.5rem;"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</div>`;

    try {
        const res = await fetch(`${API_BASE}/customers`);
        if (!res.ok) throw new Error("Failed to load portfolio customers");
        
        portfolioCustomers = await res.json();
        listContainer.innerHTML = "";

        if (portfolioCustomers.length === 0) {
            listContainer.innerHTML = `<div style="text-align: center; color: var(--text-secondary); padding: 1rem; font-size: 0.75rem;">No customer records found.</div>`;
            return;
        }

        portfolioCustomers.forEach(cust => {
            const item = document.createElement("div");
            item.className = "portfolio-cust-item";
            item.id = `port-cust-${cust.id}`;
            item.onclick = () => selectPortfolioCustomer(cust.id);
            
            item.innerHTML = `
                <strong>${cust.name}</strong>
                <span>Score: ${cust.credit_score} | ₹${(cust.gross_monthly_income).toLocaleString('en-IN', { maximumFractionDigits: 0 })}/mo</span>
            `;
            listContainer.appendChild(item);
        });

        // Auto-select first customer if none is active
        if (portfolioCustomers.length > 0 && !selectedTwinProfileData) {
            selectPortfolioCustomer(portfolioCustomers[0].id);
        }
    } catch (err) {
        console.error("Error loading portfolio customers:", err);
        listContainer.innerHTML = `<div style="text-align: center; color: var(--accent-red); padding: 1rem; font-size: 0.75rem;">Error loading list.</div>`;
    }
}

// FETCH INDIVIDUAL TWIN SCORE DATA AND RENDER
async function selectPortfolioCustomer(customerId) {
    // Toggle active classes in list sidebar
    document.querySelectorAll(".portfolio-cust-item").forEach(item => {
        item.classList.remove("active");
    });
    const selectedItem = document.getElementById(`port-cust-${customerId}`);
    if (selectedItem) selectedItem.classList.add("active");

    const emptyState = document.getElementById("twinDetailEmpty");
    const contentArea = document.getElementById("twinDetailContent");

    try {
        const res = await fetch(`${API_BASE}/customers/${customerId}/twin`);
        if (!res.ok) throw new Error("Failed to load customer twin score");
        
        selectedTwinProfileData = await res.json();
        
        // Hide empty state, show content area
        emptyState.classList.add("hidden");
        contentArea.classList.remove("hidden");

        // Set static customer header details
        document.getElementById("twinDetailName").textContent = selectedTwinProfileData.name;
        document.getElementById("twinDetailAccNum").textContent = `A/C: ${selectedTwinProfileData.account_number}`;

        // Populate twin product values based on the dropdown selector
        renderSelectedTwinProduct();
    } catch (err) {
        console.error("Error rendering portfolio twin detail:", err);
        showToast("Error retrieving detailed twin score", true);
    }
}

// COMPUTE AND DISPLAY SCORES FOR THE SELECTED TARGET PRODUCT TWIN
function renderSelectedTwinProduct() {
    if (!selectedTwinProfileData) return;

    const selectedProduct = document.getElementById("twinProductSelector").value;
    const twin = selectedTwinProfileData.twins[selectedProduct];

    if (!twin) return;

    // 1. Repayment Capacity Score
    const repaymentVal = Math.round(twin.repayment_capacity_score);
    document.getElementById("twinDetailRepaymentVal").textContent = `${repaymentVal}%`;
    document.getElementById("twinDetailRepaymentProgress").style.width = `${repaymentVal}%`;

    // 2. Intent Score
    const intentVal = Math.round(twin.intent_score);
    document.getElementById("twinDetailIntentVal").textContent = `${intentVal}/100`;
    document.getElementById("twinDetailIntentProgress").style.width = `${intentVal}%`;

    // 3. Financial Discipline
    const disciplineVal = Math.round(twin.discipline_score);
    document.getElementById("twinDetailDisciplineVal").textContent = `${disciplineVal}/100`;
    document.getElementById("twinDetailDisciplineProgress").style.width = `${disciplineVal}%`;

    // 4. Spending Stability
    const stabilityVal = Math.round(twin.spending_stability_score);
    document.getElementById("twinDetailStabilityVal").textContent = `${stabilityVal}/100`;
    document.getElementById("twinDetailStabilityProgress").style.width = `${stabilityVal}%`;

    // 5. Income Confidence
    const confidenceVal = Math.round(twin.income_confidence_score);
    document.getElementById("twinDetailConfidenceVal").textContent = `${confidenceVal}/100`;
    document.getElementById("twinDetailConfidenceProgress").style.width = `${confidenceVal}%`;

    // 6. Offer Acceptance
    const acceptanceVal = Math.round(twin.offer_acceptance_probability * 100);
    document.getElementById("twinDetailAcceptanceVal").textContent = `${acceptanceVal}%`;
    document.getElementById("twinDetailAcceptanceProgress").style.width = `${acceptanceVal}%`;

    // Composite Lead Score
    const leadScorePct = (twin.composite_lead_score * 100).toFixed(1);
    document.getElementById("twinDetailLeadScore").textContent = `${leadScorePct}%`;

    // Risk Badge
    const riskBadge = document.getElementById("twinDetailRisk");
    const tier = twin.risk_evaluation.risk_tier;
    riskBadge.textContent = `${tier} Risk`;
    riskBadge.className = "badge"; // Reset classes
    if (tier === "Elite" || tier === "Low") {
        riskBadge.style.backgroundColor = "rgba(0, 255, 135, 0.1)";
        riskBadge.style.color = "var(--accent-green)";
        riskBadge.style.border = "1px solid var(--accent-green)";
    } else if (tier === "Medium") {
        riskBadge.style.backgroundColor = "rgba(255, 179, 0, 0.1)";
        riskBadge.style.color = "var(--accent-amber)";
        riskBadge.style.border = "1px solid var(--accent-amber)";
    } else {
        riskBadge.style.backgroundColor = "rgba(255, 59, 48, 0.1)";
        riskBadge.style.color = "var(--accent-red)";
        riskBadge.style.border = "1px solid var(--accent-red)";
    }

    // Dynamic AI Narrative Explanation
    const explanationEl = document.getElementById("twinDetailNarrative");
    const netHeadroom = twin.repayment_capacity_score.toFixed(0);
    const intentStatus = twin.intent_score > 60 ? "highly active digital browsing signals" : "moderate or passive digital interest";
    
    let narrative = `This customer displays a **Repayment Capacity Score of ${netHeadroom}%**, signifying healthy cash headroom after debt obligations. `;
    narrative += `Our GBDT Intent engine registers **${intentStatus}** for ${selectedProduct} limits. `;
    if (twin.discipline_score < 100) {
        narrative += `Note: Statement check bounces or late fees slightly affected their Financial Discipline score (${twin.discipline_score}/100). `;
    } else {
        narrative += `Financial discipline is pristine with zero statement alerts. `;
    }
    
    if (twin.offer_acceptance_probability * 100 < 50 && twin.intent_score > 65) {
        narrative += `Critically, while digital intent is high, their final conversion score is tempered by historical offer rejections or missed repayments. `;
    } else if (twin.offer_acceptance_probability * 100 >= 75) {
        narrative += `They exhibit a high historical campaign conversion rate (${(twin.offer_acceptance_probability * 100).toFixed(0)}%), making them a premium prospect. `;
    }
    
    narrative += `<br><br>Overall, they qualify for targeted outreach with a Loan Readiness Index (LRI) score of **${leadScorePct}%** under our campaign cohort.`;
    
    // Add checklist timeline HTML
    if (twin.reasons && twin.reasons.length > 0) {
        narrative += `<div class="timeline-reasons-box" style="margin-top: 1rem; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 0.75rem;">`;
        narrative += `<h5 style="margin-bottom: 0.5rem; font-size: 0.75rem; color: var(--accent-cyan); text-transform: uppercase; letter-spacing: 0.5px;"><i class="fa-solid fa-list-check"></i> Decision Intelligence Checklist</h5>`;
        narrative += `<ul style="list-style: none; padding-left: 0; display: flex; flex-direction: column; gap: 6px;">`;
        twin.reasons.forEach(reason => {
            let icon = `<i class="fa-solid fa-circle-check" style="color: var(--accent-green);"></i>`;
            if (reason.toLowerCase().includes("irregular") || reason.toLowerCase().includes("bounce") || reason.toLowerCase().includes("tight")) {
                icon = `<i class="fa-solid fa-triangle-exclamation" style="color: var(--accent-amber);"></i>`;
            }
            narrative += `<li style="font-size: 0.75rem; display: flex; align-items: start; gap: 8px; color: var(--text-primary);">${icon} <span>${reason}</span></li>`;
        });
        narrative += `</ul></div>`;
    }
    
    explanationEl.innerHTML = narrative;

    // Load Mini Limits Checklist
    const offersContainer = document.getElementById("twinDetailOffers");
    offersContainer.innerHTML = "";
    
    const limitAmt = twin.risk_evaluation.max_eligible_limit;
    const formatLimit = limitAmt.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
    
    const miniCard = document.createElement("div");
    miniCard.className = "offer-mini-card";
    miniCard.innerHTML = `
        <span>Target Eligible Limit</span>
        <strong>${formatLimit}</strong>
    `;
    offersContainer.appendChild(miniCard);

    const foirCard = document.createElement("div");
    foirCard.className = "offer-mini-card";
    foirCard.innerHTML = `
        <span>Debt Headroom (FOIR)</span>
        <strong>${(twin.risk_evaluation.foir_limit * 100).toFixed(0)}% Limit</strong>
    `;
    offersContainer.appendChild(foirCard);
}
