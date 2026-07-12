import math
from datetime import datetime, timedelta
from typing import List, Dict, Any

# ==========================================
# PROSPECT ASSIST AI: MULTI-MODEL ML SERVICE
# ==========================================

def estimate_income(transactions: List[Dict[str, Any]], gross_monthly_income: float) -> Dict[str, Any]:
    """
    Model 1: Income Estimation Model
    Estimates income, checks monthly consistency, and calculates net disposable income.
    """
    now = datetime.utcnow()
    ninety_days_ago = now - timedelta(days=90)
    
    # Filter recent 90-day transactions
    recent_txs = []
    for tx in transactions:
        tx_time = tx["timestamp"]
        if isinstance(tx_time, str):
            tx_time = datetime.fromisoformat(tx_time.replace("Z", ""))
        if tx_time >= ninety_days_ago:
            recent_txs.append(tx)
            
    # Calculate inflows (salary credits & regular deposits)
    salary_credits = [t["amount"] for t in recent_txs if t["category"] == "Salary" or "SALARY" in t["description"].upper()]
    
    # Calculate total salary credits over 3 months
    total_salary = sum(salary_credits)
    avg_monthly_salary = total_salary / 3.0 if total_salary > 0 else gross_monthly_income
    
    # Standard deviation calculation for income stability score
    if len(salary_credits) >= 2:
        stability_score = 95.0 # Very stable recurring salary
    elif len(salary_credits) == 1:
        stability_score = 70.0 # Occasional credits
    else:
        stability_score = 50.0 # Highly irregular cash inflows
        
    # Subtract regular outflows (EMIs, Rent, Utilities)
    emi_payments = abs(sum([t["amount"] for t in recent_txs if t["amount"] < 0 and t["category"] == "EMI"])) / 3.0
    utility_payments = abs(sum([t["amount"] for t in recent_txs if t["amount"] < 0 and t["category"] == "Utility"])) / 3.0
    rent_estimates = abs(sum([t["amount"] for t in recent_txs if t["amount"] < 0 and "RENT" in t["description"].upper()])) / 3.0
    
    # Estimate disposable income
    estimated_disposable = avg_monthly_salary - (emi_payments + utility_payments + rent_estimates)
    estimated_disposable = max(0.0, estimated_disposable)
    
    return {
        "estimated_monthly_income": round(avg_monthly_salary, 2),
        "income_stability_score": round(stability_score, 1),
        "estimated_disposable_income": round(estimated_disposable, 2)
    }


def predict_intent(
    clickstream_events: List[Dict[str, Any]], 
    transactions: List[Dict[str, Any]], 
    product: str,
    credit_score: int
) -> float:
    """
    Model 2: Intent Prediction Model (LightGBM GBDT Ensemble Simulator)
    Evaluates clickstream logs, sequential paths, and transactional triggers.
    """
    now = datetime.utcnow()
    seven_days_ago = now - timedelta(days=7)
    
    # 1. Feature Extraction: App clicks & views
    views = 0
    calculator_use = 0
    apply_clicks = 0
    
    sorted_events = sorted(clickstream_events, key=lambda x: x["timestamp"])
    seq = []
    
    for event in sorted_events:
        event_time = event["timestamp"]
        if isinstance(event_time, str):
            event_time = datetime.fromisoformat(event_time.replace("Z", ""))
        if event_time < seven_days_ago:
            continue
            
        page = event["page_url"].lower()
        action = event["action"].upper()
        
        # Product match check
        match = False
        if product == "Auto Loan" and ("auto" in page or "car" in page):
            match = True
        elif product == "Home Loan" and ("home" in page or "housing" in page):
            match = True
        elif product == "Personal Loan" and ("personal" in page or "salary-loan" in page):
            match = True
        elif product == "Mortgage Loan" and ("mortgage" in page or "property" in page):
            match = True
            
        if match:
            seq.append(action)
            if action == "VIEW":
                views += 1
            elif action == "CALCULATE_EMI":
                calculator_use += 1
            elif action == "CLICK_APPLY":
                apply_clicks += 1

    # Graph Sequence Transition Matching (VIEW ➔ CALCULATE_EMI ➔ CLICK_APPLY)
    has_high_intent_path = False
    for i in range(len(seq) - 2):
        if seq[i:i+3] == ["VIEW", "CALCULATE_EMI", "CLICK_APPLY"]:
            has_high_intent_path = True
            break
            
    # 2. Feature Extraction: Transaction Triggers
    recent_txs = []
    thirty_days_ago = now - timedelta(days=30)
    for tx in transactions:
        tx_time = tx["timestamp"]
        if isinstance(tx_time, str):
            tx_time = datetime.fromisoformat(tx_time.replace("Z", ""))
        if tx_time >= thirty_days_ago:
            recent_txs.append(tx)
            
    transaction_triggers = 0
    for tx in recent_txs:
        desc = tx["description"].upper()
        amount = tx["amount"]
        if amount < 0:
            if product == "Auto Loan" and any(k in desc for k in ["MARUTI", "HYUNDAI", "TOYOTA", "TATA MOTORS", "CAR DEKHO", "AUTO SERVICE", "SHOWROOM"]):
                transaction_triggers += 1
            elif product in ["Home Loan", "Mortgage Loan"] and any(k in desc for k in ["INTERIOR", "DECOR", "FURNITURE", "IKEA", "ASIAN PAINTS", "BUILDER", "ARCHITECT"]):
                transaction_triggers += 1
            elif product == "Personal Loan" and any(k in desc for k in ["LATE FEE", "PENALTY", "OVERDRAFT", "INTEREST DEBIT", "CREDIT CARD BILL LATE"]):
                transaction_triggers += 1

    # --- LightGBM GBDT Ensemble Simulation ---
    z = -2.5 # Base prior conversion log-odds bias
    
    # Tree 1: Direct Interest (Split on Apply clicks & Transactions)
    if apply_clicks > 0:
        if transaction_triggers > 0:
            z += 1.8
        else:
            z += 1.2
    else:
        if transaction_triggers > 0:
            z += 0.8
            
    # Tree 2: Exploration Rigor (Split on Graph path & Calculators)
    if has_high_intent_path:
        z += 1.5 # Graph Clickstream Sequence boost
    else:
        if calculator_use > 0:
            z += 0.6
            if views > 2:
                z += 0.4
                
    # Tree 3: Risk & Bureau score profiling
    if credit_score >= 750:
        z += 0.4
    elif credit_score < 600:
        z -= 0.5
        
    try:
        intent_prob = 1.0 / (1.0 + math.exp(-z))
    except OverflowError:
        intent_prob = 0.0 if z < 0 else 1.0
        
    return round(intent_prob * 100, 1)


def evaluate_risk(credit_score: int, transactions: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Model 3: Risk & Underwriting Model
    Calculates Default Probability (PD) and risk tiering based on credit score and missed payment logs.
    """
    now = datetime.utcnow()
    thirty_days_ago = now - timedelta(days=30)
    
    # Ingest negative payment descriptors
    late_charges = 0
    for tx in transactions:
        tx_time = tx["timestamp"]
        if isinstance(tx_time, str):
            tx_time = datetime.fromisoformat(tx_time.replace("Z", ""))
        if tx_time >= thirty_days_ago:
            desc = tx["description"].upper()
            if any(k in desc for k in ["LATE FEE", "PENALTY", "BOUNCE", "CHG", "UNPAID"]):
                late_charges += 1
                
    # Calculate Probability of Default (PD)
    z = -1.5 
    z -= (credit_score - 600) / 100.0 
    z += late_charges * 0.8 
    
    try:
        pd = 1.0 / (1.0 + math.exp(-z))
    except OverflowError:
        pd = 1.0 if z > 0 else 0.0
        
    # Assign risk tier
    if credit_score >= 750 and late_charges == 0:
        tier = "Low Risk (Elite)"
    elif credit_score >= 650 and late_charges <= 1:
        tier = "Medium Risk (Prime)"
    else:
        tier = "High Risk (Subprime)"
        
    return {
        "probability_of_default": round(pd, 3),
        "risk_tier": tier,
        "late_charges_count": late_charges
    }


def predict_conversion(
    credit_score: int,
    intent_score: float,
    disposable_income: float,
    pd_risk: float
) -> float:
    """
    Model 4: Conversion ML Model
    Combines estimated income, risk, and intent parameters to estimate final campaign conversion probability (0.0 to 1.0).
    """
    z = -1.8 
    
    z += (intent_score / 100.0) * 3.5  
    z += (credit_score - 600) / 200.0 
    if disposable_income > 50000:
        z += 0.8
        
    z -= pd_risk * 2.0 
    
    try:
        conv_prob = 1.0 / (1.0 + math.exp(-z))
    except OverflowError:
        conv_prob = 0.0 if z < 0 else 1.0
        
    return round(conv_prob, 2)


# ==========================================
# MAIN INTERFACE ENTRY POINT (BEHAVIORAL FINANCIAL TWIN)
# ==========================================

def evaluate_propensity_and_intent(
    clickstream_events: List[Dict[str, Any]], 
    transactions: List[Dict[str, Any]],
    credit_score: int
) -> Dict[str, Dict[str, Any]]:
    """
    Generates a Behavioral Financial Twin and computes the final weighted Lead Score:
    Lead Score = 0.35 * Intent + 0.30 * RepaymentCapacity + 0.20 * FinancialStability + 0.15 * Relationship
    """
    products = ["Auto Loan", "Home Loan", "Personal Loan", "Mortgage Loan"]
    final_results = {}
    
    # 1. Run Income Model (Customer-level, shared)
    salary_sum = sum([t["amount"] for t in transactions if t["category"] == "Salary"])
    gross_est = salary_sum / 3.0 if salary_sum > 0 else 82000.0
    income_metrics = estimate_income(transactions, gross_est)
    disposable = income_metrics["estimated_disposable_income"]
    
    # 2. Run Risk Model (Customer-level, shared)
    risk_metrics = evaluate_risk(credit_score, transactions)
    pd_risk = risk_metrics["probability_of_default"]
    late_charges = risk_metrics["late_charges_count"]
    
    # Calculate Twin Components:
    # a. Repayment Capacity Score (0-100): Net disposable relative to gross income
    repayment_capacity_score = (disposable / gross_est * 100.0) if gross_est > 0 else 50.0
    repayment_capacity_score = min(100.0, max(0.0, repayment_capacity_score))
    
    # b. Financial Discipline Score (0-100): Deduct for missed payments
    discipline_score = max(0.0, 100.0 - (late_charges * 25.0))
    
    # c. Spending Stability Score (0-100): Income stability index
    spending_stability_score = income_metrics["income_stability_score"]
    
    # Financial Stability composite score (0-100)
    financial_stability = (discipline_score + spending_stability_score) / 2.0
    
    # d. Income Confidence Score (0-100): Based on salary credit occurrences
    salary_count = len([t for t in transactions if t["category"] == "Salary"])
    if salary_count >= 3:
        confidence_score = 95.0
    elif salary_count == 2:
        confidence_score = 80.0
    elif salary_count == 1:
        confidence_score = 60.0
    else:
        confidence_score = 40.0
        
    # e. Relationship Score (0-100): Mocked based on credit rating bands
    if credit_score >= 780:
        relationship_score = 85.0
    elif credit_score >= 680:
        relationship_score = 70.0
    else:
        relationship_score = 55.0
        
    for p in products:
        # f. Intent Score (0-100) using the GBDT tree simulator
        intent_val = predict_intent(clickstream_events, transactions, p, credit_score)
        
        # g. Offer Acceptance Probability (0-100%)
        conversion_prob = predict_conversion(credit_score, intent_val, disposable, pd_risk)
        
        # h. Final Weighted Lead Score Formula (0-100)
        lead_score = (
            (0.35 * intent_val) +
            (0.30 * repayment_capacity_score) +
            (0.20 * financial_stability) +
            (0.15 * relationship_score)
        )
        lead_score = min(100.0, max(0.0, lead_score))
        
        # Convert lead_score to a 0.0 - 1.0 scale to store in database `propensity_score`
        propensity_score_scaled = round(lead_score / 100.0, 2)
        
        # Intent level and triggers classification
        triggers = []
        if intent_val >= 70.0:
            triggers.append(f"High digital intent signals: {intent_val}/100")
        if late_charges > 0:
            triggers.append(f"Missed bills/late penalties on account history")
        if spending_stability_score >= 90.0:
            triggers.append(f"Stable cash inflows: {spending_stability_score}/100")
            
        # Lead score mapping to target tiers
        if propensity_score_scaled >= 0.70:
            intent_label = "Hot"
        elif propensity_score_scaled >= 0.35:
            intent_label = "Warm"
        else:
            intent_label = "Cold"
            
        final_results[p] = {
            "propensity_score": propensity_score_scaled,  # Stores the final Lead Score (0.0 to 1.0)
            "intent_level": intent_label,
            "triggers": triggers,
            "financial_twin": {
                "repayment_capacity": round(repayment_capacity_score, 1),
                "intent_score": round(intent_val, 1),
                "financial_discipline": round(discipline_score, 1),
                "spending_stability": round(spending_stability_score, 1),
                "income_confidence": round(confidence_score, 1),
                "offer_acceptance": round(conversion_prob * 100.0, 1),
                "lead_score": round(lead_score, 1)
            }
        }
        
    return final_results
