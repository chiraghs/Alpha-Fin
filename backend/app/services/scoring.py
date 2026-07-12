import math
from datetime import datetime, timedelta
from typing import List, Dict, Any
from .credit import calculate_loan_eligibility

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


def ensure_datetime(t_val) -> datetime:
    if isinstance(t_val, str):
        try:
            return datetime.fromisoformat(t_val.replace("Z", ""))
        except ValueError:
            return datetime.utcnow()
    if isinstance(t_val, datetime):
        return t_val
    return datetime.utcnow()


def detect_life_events(transactions: List[Dict[str, Any]], clickstream: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    events = []
    
    # 1. Promotions / Inflow Surge
    salaries = []
    for t in transactions:
        if t.get("category") == "Salary":
            salaries.append({
                "amount": t["amount"],
                "timestamp": ensure_datetime(t["timestamp"])
            })
    salaries = sorted(salaries, key=lambda x: x["timestamp"])
    if len(salaries) >= 2:
        prev_avg = sum([s["amount"] for s in salaries[:-1]]) / (len(salaries) - 1)
        latest_val = salaries[-1]["amount"]
        if prev_avg > 0 and latest_val >= prev_avg * 1.15:
            percent_increase = round((latest_val - prev_avg) / prev_avg * 100)
            events.append({
                "event": "PROMOTION_DETECTED",
                "icon": "📈",
                "label": f"Promotion / Inflow Surge (+{percent_increase}%)",
                "confidence": 95,
                "date": salaries[-1]["timestamp"].isoformat()
            })

    # 2. Marriage payments
    wedding_keywords = ["JEWELLER", "WEDDING", "MARRIAGE", "BANQUET", "SHERWANI", "LEHENGA"]
    marriage_tx = []
    for t in transactions:
        desc = str(t.get("description", "")).upper()
        if any(kw in desc for kw in wedding_keywords):
            marriage_tx.append(t)
    if marriage_tx:
        events.append({
            "event": "MARRIAGE_PLANNING",
            "icon": "💍",
            "label": "Marriage Planning Payments",
            "confidence": 90,
            "date": ensure_datetime(marriage_tx[0]["timestamp"]).isoformat()
        })
    else:
        personal_clicks = [c for c in clickstream if "personal-loan" in str(c.get("page_url", "")).lower() and "marriage" in str(c.get("page_url", "")).lower()]
        if personal_clicks:
            events.append({
                "event": "MARRIAGE_PLANNING",
                "icon": "💍",
                "label": "Marriage Planning (Browsing)",
                "confidence": 40,
                "date": ensure_datetime(personal_clicks[0]["timestamp"]).isoformat()
            })

    # 3. School Fees
    school_keywords = ["SCHOOL", "COLLEGE", "TUITION", "ACADEMY", "UNIVERSITY", "VIDYALAYA"]
    school_tx = []
    for t in transactions:
        desc = str(t.get("description", "")).upper()
        if any(kw in desc for kw in school_keywords):
            school_tx.append(t)
    if school_tx:
        events.append({
            "event": "SCHOOL_FEES_STARTED",
            "icon": "🎓",
            "label": "Education Fees Commenced",
            "confidence": 85,
            "date": ensure_datetime(school_tx[0]["timestamp"]).isoformat()
        })

    # 4. Vehicle upgrade potential
    auto_keywords = ["INSURANCE", "CHOLA", "ICICI LOMBARD", "HDFC ERGO", "MOTORS", "SHOWROOM", "CAR SERVICE"]
    auto_tx = []
    for t in transactions:
        desc = str(t.get("description", "")).upper()
        if any(kw in desc for kw in auto_keywords):
            auto_tx.append(t)
    if auto_tx:
        events.append({
            "event": "VEHICLE_UPGRADE_POTENTIAL",
            "icon": "🚗",
            "label": "Vehicle Insurance / Premium",
            "confidence": 80,
            "date": ensure_datetime(auto_tx[0]["timestamp"]).isoformat()
        })

    # 5. Rent Deposit / Home Search
    rent_keywords = ["DEPOSIT", "RENTAL", "NOBROKER", "HOUSING", "BROKERAGE"]
    rent_tx = []
    for t in transactions:
        desc = str(t.get("description", "")).upper()
        if any(kw in desc for kw in rent_keywords):
            rent_tx.append(t)
    has_home_browsing = any("home-loan" in str(c.get("page_url", "")).lower() for c in clickstream)
    if rent_tx and has_home_browsing:
        events.append({
            "event": "HOME_BUYER_INTENT",
            "icon": "🏠",
            "label": "Rental Deposit & Home Search",
            "confidence": 90,
            "date": ensure_datetime(rent_tx[0]["timestamp"]).isoformat()
        })

    return events


# ==========================================
# MAIN INTERFACE ENTRY POINT (BEHAVIORAL FINANCIAL TWIN)
# ==========================================

def evaluate_propensity_and_intent(
    clickstream_events: List[Dict[str, Any]], 
    transactions: List[Dict[str, Any]],
    credit_score: int,
    previous_leads: List[Dict[str, Any]] = None
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
    
    # 3. Model 5: Historical Conversion Propensity (Campaign Acceptance & Loan History)
    n_converted = 0
    n_total = 0
    if previous_leads:
        for lead in previous_leads:
            if lead.get("status") in ["Converted", "Rejected"]:
                n_total += 1
                if lead.get("status") == "Converted":
                    n_converted += 1
                    
    r_accept = n_converted / n_total if n_total > 0 else 0.5
    
    emi_descriptions = set([t["description"].upper() for t in transactions if t["category"] == "EMI"])
    n_active = len(emi_descriptions)
    
    z_hist = 2.0 * (r_accept - 0.5) - 0.4 * late_charges
    if n_active > 0 and late_charges == 0:
        z_hist += 0.3
        
    try:
        p_history = 1.0 / (1.0 + math.exp(-z_hist))
    except OverflowError:
        p_history = 0.0 if z_hist < 0 else 1.0
    
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
        
    # Life Event Detection
    life_events = detect_life_events(transactions, clickstream_events)
    
    for p in products:
        # f. Intent Score (0-100) using the GBDT tree simulator
        intent_val = predict_intent(clickstream_events, transactions, p, credit_score)
        
        # Calculate Intent Velocity
        now = datetime.utcnow()
        clicks_recent = []
        clicks_prior = []
        for c in clickstream_events:
            ts = ensure_datetime(c["timestamp"])
            days_ago = (now - ts).days
            if days_ago <= 7:
                clicks_recent.append(c)
            elif 7 < days_ago <= 14:
                clicks_prior.append(c)
                
        intent_recent = predict_intent(clicks_recent, transactions, p, credit_score)
        intent_prior = predict_intent(clicks_prior, transactions, p, credit_score)
        intent_velocity = round(intent_recent - intent_prior, 1)

        # Match life events for product p
        p_events = []
        for le in life_events:
            evt = le["event"]
            if p == "Auto Loan" and evt in ["VEHICLE_UPGRADE_POTENTIAL", "PROMOTION_DETECTED"]:
                p_events.append(le)
            elif p in ["Home Loan", "Mortgage Loan"] and evt in ["HOME_BUYER_INTENT", "PROMOTION_DETECTED"]:
                p_events.append(le)
            elif p == "Personal Loan" and evt in ["MARRIAGE_PLANNING", "SCHOOL_FEES_STARTED", "PROMOTION_DETECTED"]:
                p_events.append(le)
                
        life_event_confidence = 50.0
        if p_events:
            life_event_confidence = float(max([e["confidence"] for e in p_events]))

        # g. Offer Acceptance Probability (0-100%) - Blend GBDT & Historical
        conversion_prob_gbdt = predict_conversion(credit_score, intent_val, disposable, pd_risk)
        conversion_prob = 0.70 * conversion_prob_gbdt + 0.30 * p_history
        
        # h. Loan Readiness Index (LRI) replacing old lead score
        # Multiplicative bounded formula:
        scores = [repayment_capacity_score, intent_val, financial_stability, life_event_confidence, relationship_score]
        prod_term = 1.0
        for s in scores:
            prod_term *= (0.2 + 0.8 * (s / 100.0))
        lri_score = 100.0 * prod_term
        lri_score = min(100.0, max(0.0, lri_score))
        
        # Convert lri_score to 0.0 - 1.0 scale to store in database `propensity_score`
        propensity_score_scaled = round(lri_score / 100.0, 2)
        
        # Compile chronological timelines / reason logs
        reasons = []
        if confidence_score >= 80.0:
            reasons.append("Salary stable for 90+ days (consistent salary deposits verified)")
        else:
            reasons.append("Irregular or limited salary inflows observed in past 90 days")
            
        if discipline_score >= 100.0:
            reasons.append("Pristine payment discipline (zero statement bounce alerts)")
        else:
            reasons.append(f"Statement penalty checks bounced (Discipline: {discipline_score:.0f}/100)")
            
        if repayment_capacity_score >= 40.0:
            reasons.append(f"Optimal debt capacity headroom ({repayment_capacity_score:.0f}% net disposable income)")
        else:
            reasons.append(f"Tight debt capacity headroom ({repayment_capacity_score:.0f}% net disposable income)")
            
        if intent_velocity >= 15.0:
            reasons.append(f"Digital intent velocity surged: +{intent_velocity:.0f}% clickstream intensity increase")
            
        for le in p_events:
            reasons.append(f"Life Event: {le['label']} (Confidence: {le['confidence']}%)")
            
        if conversion_prob >= 0.70:
            reasons.append(f"High historical offer conversion likelihood ({conversion_prob * 100:.0f}%)")
            
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
            
        eligibility = calculate_loan_eligibility(disposable, p, credit_score)
        
        final_results[p] = {
            "propensity_score": propensity_score_scaled,  # Stores the LRI Score (0.0 to 1.0)
            "intent_level": intent_label,
            "triggers": triggers,
            "reasons": reasons,
            "intent_velocity": intent_velocity,
            "life_events": p_events,
            
            # --- Flat properties matching `twin` attributes in `app.js` customer-level twin detail ---
            "repayment_capacity_score": round(repayment_capacity_score, 1),
            "intent_score": round(intent_val, 1),
            "discipline_score": round(discipline_score, 1),
            "spending_stability_score": round(spending_stability_score, 1),
            "income_confidence_score": round(confidence_score, 1),
            "offer_acceptance_probability": round(conversion_prob, 2),
            "composite_lead_score": round(propensity_score_scaled, 2),
            "risk_evaluation": {
                "risk_tier": risk_metrics["risk_tier"],
                "probability_of_default": risk_metrics["probability_of_default"],
                "max_eligible_limit": eligibility["eligible_loan_amount"],
                "foir_limit": eligibility["foir_applied"]
            },
            
            # --- Nested dictionary matching `FinancialTwinSchema` in Pydantic schema ---
            "financial_twin": {
                "repayment_capacity": round(repayment_capacity_score, 1),
                "intent_score": round(intent_val, 1),
                "financial_discipline": round(discipline_score, 1),
                "spending_stability": round(spending_stability_score, 1),
                "income_confidence": round(confidence_score, 1),
                "offer_acceptance": round(conversion_prob * 100.0, 1),
                "lead_score": round(lri_score, 1)
            }
        }
        
    return final_results
