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
        
        if (showVisualIndicators) {
            showToast("RM Lead Board refreshed!");
        }
    } catch (err) {
        console.error("Error fetching leads:", err);
    }
}

// RENDER LEAD BOARD
function renderLeadBoard() {
    leadsTableBody.innerHTML = "";
    
    statTotalLeads.textContent = leads.length;
    const hotLeads = leads.filter(l => l.intent_level === "Hot").length;
    statHotLeads.textContent = hotLeads;

    if (leads.length === 0) {
        leadsTableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-secondary); padding: 2rem;">No active high-intent leads generated yet. Trigger customer actions on the phone portal.</td></tr>`;
        return;
    }

    leads.forEach(lead => {
        const row = document.createElement("tr");
        
        const disposable = lead.calculated_disposable_income.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
        const eligibleLimit = lead.eligible_loan_amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
        
        const intentBadgeClass = lead.intent_level === "Hot" ? "badge-hot" : "badge-warm";
        const propensityPct = Math.round(lead.propensity_score * 100);

        row.innerHTML = `
            <td><strong>${lead.customer.name}</strong></td>
            <td>${lead.loan_type}</td>
            <td>${disposable}</td>
            <td>${lead.customer.credit_score}</td>
            <td>
                <span class="badge-intent ${intentBadgeClass}">
                    <i class="fa-solid ${lead.intent_level === 'Hot' ? 'fa-fire pulse' : 'fa-circle-dot'}"></i>
                    ${lead.intent_level} (${propensityPct}%)
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
