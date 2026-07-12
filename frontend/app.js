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

// ON LOAD
window.addEventListener("DOMContentLoaded", async () => {
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
