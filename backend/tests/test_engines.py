from datetime import datetime, timedelta
from app.services.credit import calculate_disposable_income, calculate_loan_eligibility
from app.services.scoring import evaluate_propensity_and_intent

def test_calculate_disposable_income():
    # 90 days transaction logs
    now = datetime.utcnow()
    transactions = [
        # Inflows (Salary in each of the 3 months)
        {"amount": 100000.0, "category": "SALARY", "description": "SALARY CREDIT TECH", "timestamp": now - timedelta(days=5)},
        {"amount": 100000.0, "category": "SALARY", "description": "SALARY CREDIT TECH", "timestamp": now - timedelta(days=35)},
        {"amount": 100000.0, "category": "SALARY", "description": "SALARY CREDIT TECH", "timestamp": now - timedelta(days=65)},
        
        # Outflows Month 1 (current)
        {"amount": -20000.0, "category": "EMI", "description": "CAR LOAN AUTO EMI DEBIT", "timestamp": now - timedelta(days=10)},
        {"amount": -10000.0, "category": "SIP", "description": "SIP INVEST / HDFC MF", "timestamp": now - timedelta(days=12)},
        {"amount": -5000.0, "category": "UTILITY", "description": "POWER BILL", "timestamp": now - timedelta(days=15)},
        
        # Outflows Month 2
        {"amount": -20000.0, "category": "EMI", "description": "CAR LOAN AUTO EMI DEBIT", "timestamp": now - timedelta(days=40)},
        {"amount": -10000.0, "category": "SIP", "description": "SIP INVEST / HDFC MF", "timestamp": now - timedelta(days=42)},
        {"amount": -5000.0, "category": "UTILITY", "description": "POWER BILL", "timestamp": now - timedelta(days=45)},
        
        # Outflows Month 3
        {"amount": -20000.0, "category": "EMI", "description": "CAR LOAN AUTO EMI DEBIT", "timestamp": now - timedelta(days=70)},
        {"amount": -10000.0, "category": "SIP", "description": "SIP INVEST / HDFC MF", "timestamp": now - timedelta(days=72)},
        {"amount": -5000.0, "category": "UTILITY", "description": "POWER BILL", "timestamp": now - timedelta(days=75)}
    ]
    
    result = calculate_disposable_income(transactions, gross_income=100000.0)
    
    assert result["disposable_income"] == 65000.0  # 100000 - (20000 + 10000 + 5000)
    assert result["fixed_commitments"] == 35000.0
    assert result["avg_emi"] == 20000.0
    assert result["avg_sip"] == 10000.0

def test_calculate_loan_eligibility():
    # Elite credit score (foir 60%)
    res_elite = calculate_loan_eligibility(disposable_income=50000.0, loan_type="Auto Loan", credit_score=820)
    assert res_elite["foir_applied"] == 0.60
    assert res_elite["max_eligible_emi"] == 30000.0
    assert res_elite["eligible_loan_amount"] > 0
    
    # Subprime credit score (foir 20%)
    res_subprime = calculate_loan_eligibility(disposable_income=50000.0, loan_type="Auto Loan", credit_score=550)
    assert res_subprime["foir_applied"] == 0.20
    assert res_subprime["max_eligible_emi"] == 10000.0

def test_evaluate_propensity_and_intent():
    now = datetime.utcnow()
    
    # Customer logs a high-intent sequential path VIEW ➔ CALCULATE_EMI ➔ CLICK_APPLY
    clickstream = [
        {"page_url": "/auto-loan", "action": "VIEW", "timestamp": now - timedelta(days=2)},
        {"page_url": "/auto-loan/emi", "action": "CALCULATE_EMI", "timestamp": now - timedelta(days=2)},
        {"page_url": "/auto-loan/apply", "action": "CLICK_APPLY", "timestamp": now - timedelta(days=2)}
    ]
    
    transactions = [
        {"amount": -500.0, "category": "FUEL", "description": "HPCL FUEL PETROL", "timestamp": now - timedelta(days=10)}
    ]
    
    # Evaluate with baseline transaction (no showroom spend)
    res = evaluate_propensity_and_intent(clickstream, transactions, credit_score=750)
    
    # Auto Loan Behavioral Financial Twin evaluation:
    # Model 1 (Income): Estimated gross = 82k, disposable = 82k -> Repayment Capacity Score = 100%
    # Model 2 (Intent): intent_score = 64.6% (using exact GBDT Forest: logit = 0.6)
    # Model 3 (Risk): pd_risk = 0.047 -> Discipline = 100%, Stability = 50%, composite = 75%
    # Model 4 (Conversion): logit z = 1.92 -> Sigmoid(1.92) = 0.87 (Conversion Acceptance)
    # Lead Score = LRI Multiplicative Product = 26% (Cold)
    assert res["Auto Loan"]["propensity_score"] == 0.26
    assert res["Auto Loan"]["intent_level"] == "Cold"
    
    # Add high-value transaction trigger (car dealer)
    transactions.append({"amount": -2000.0, "category": "SHOPPING", "description": "MARUTI SUZUKI SHOWROOM DEBIT", "timestamp": now - timedelta(days=4)})
    
    res_hot = evaluate_propensity_and_intent(clickstream, transactions, credit_score=750)
    
    # Auto Loan Twin evaluation with transaction dealer debit:
    # Model 2 (Intent): intent_score = 76.9%
    # Life Event Detected: VEHICLE_UPGRADE_POTENTIAL (80% confidence)
    # Lead Score = LRI Multiplicative Product = 42% (Warm)
    assert res_hot["Auto Loan"]["propensity_score"] == 0.42
    assert res_hot["Auto Loan"]["intent_level"] == "Warm"

def test_historical_conversion_propensity():
    now = datetime.utcnow()
    clickstream = [
        {"page_url": "/auto-loan", "action": "VIEW", "timestamp": now - timedelta(days=2)},
        {"page_url": "/auto-loan/emi", "action": "CALCULATE_EMI", "timestamp": now - timedelta(days=2)},
        {"page_url": "/auto-loan/apply", "action": "CLICK_APPLY", "timestamp": now - timedelta(days=2)}
    ]
    
    # 1. Clean history (no missed payments, no previous rejections)
    tx_clean = [
        {"amount": -500.0, "category": "FUEL", "description": "HPCL FUEL PETROL", "timestamp": now - timedelta(days=10)},
        {"amount": -20000.0, "category": "EMI", "description": "HOME LOAN EMI", "timestamp": now - timedelta(days=10)}
    ]
    res_clean = evaluate_propensity_and_intent(clickstream, tx_clean, credit_score=750, previous_leads=[])
    
    # 2. History with missed payments and previous offer rejections
    tx_bad = [
        {"amount": -500.0, "category": "FUEL", "description": "HPCL FUEL PETROL", "timestamp": now - timedelta(days=10)},
        {"amount": -200.0, "category": "PENALTY", "description": "BOUNCE CHG CHARGE", "timestamp": now - timedelta(days=10)}
    ]
    prev_leads = [
        {"status": "Rejected", "loan_type": "Auto Loan"},
        {"status": "Rejected", "loan_type": "Home Loan"}
    ]
    res_bad = evaluate_propensity_and_intent(clickstream, tx_bad, credit_score=750, previous_leads=prev_leads)
    
    # Check that offer acceptance probability is lower for bad history than clean history
    clean_prob = res_clean["Auto Loan"]["financial_twin"]["offer_acceptance"]
    bad_prob = res_bad["Auto Loan"]["financial_twin"]["offer_acceptance"]
    
    assert bad_prob < clean_prob

def test_underwriting_risk_gate():
    # Elite/Low Risk customer
    res_low = evaluate_propensity_and_intent([], [], credit_score=780)
    assert res_low["Auto Loan"]["risk_evaluation"]["risk_tier"] == "Low Risk (Elite)"
    
    # High Risk customer: credit score below 600
    res_high_credit = evaluate_propensity_and_intent([], [], credit_score=550)
    assert res_high_credit["Auto Loan"]["risk_evaluation"]["risk_tier"] == "High Risk (Subprime)"
    
    # High Risk customer: late charges count >= 2
    now = datetime.utcnow()
    tx_bad = [
        {"amount": -200.0, "category": "PENALTY", "description": "LATE FEE CHARGE 1", "timestamp": now - timedelta(days=10)},
        {"amount": -200.0, "category": "PENALTY", "description": "BOUNCE CHG CHARGE 2", "timestamp": now - timedelta(days=15)}
    ]
    res_high_bounces = evaluate_propensity_and_intent([], tx_bad, credit_score=750)
    assert res_high_bounces["Auto Loan"]["risk_evaluation"]["risk_tier"] == "High Risk (Subprime)"

def test_loan_readiness_index():
    # High readiness in all dimensions
    res_ready = evaluate_propensity_and_intent([], [], credit_score=800)
    lri_high = res_ready["Auto Loan"]["propensity_score"]
    
    # Low readiness because of subprime status or no intent click activity
    res_low_readiness = evaluate_propensity_and_intent([], [], credit_score=620)
    lri_low = res_low_readiness["Auto Loan"]["propensity_score"]
    
    assert lri_low < lri_high

def test_life_event_detection():
    now = datetime.utcnow()
    
    # Trigger wedding and education events
    tx = [
        {"amount": -50000.0, "category": "SHOPPING", "description": "TANISHQ JEWELLERS WEDDING SPEND", "timestamp": now - timedelta(days=10)},
        {"amount": -15000.0, "category": "EDUCATION", "description": "DPS SCHOOL FEES DEBIT", "timestamp": now - timedelta(days=12)}
    ]
    
    res = evaluate_propensity_and_intent([], tx, credit_score=750)
    
    reasons = res["Personal Loan"]["reasons"]
    has_marriage = any("Marriage Planning" in r for r in reasons)
    has_school = any("Education Fees" in r for r in reasons)
    
    assert has_marriage is True
    assert has_school is True
