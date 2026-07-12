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
    
    # Auto Loan GBDT score:
    # Base: -2.5
    # Tree 1: apply_clicks > 0, tx_triggers = 0 -> +1.2
    # Tree 2: has_high_intent_path = True -> +1.5
    # Tree 3: credit_score >= 750 -> +0.4
    # Total z = -2.5 + 1.2 + 1.5 + 0.4 = +0.6 -> Sigmoid(0.6) = 0.65 (Warm intent)
    assert res["Auto Loan"]["propensity_score"] == 0.65
    assert res["Auto Loan"]["intent_level"] == "Warm"
    
    # Add high-value transaction trigger (car dealer)
    transactions.append({"amount": -2000.0, "category": "SHOPPING", "description": "MARUTI SUZUKI SHOWROOM DEBIT", "timestamp": now - timedelta(days=4)})
    
    res_hot = evaluate_propensity_and_intent(clickstream, transactions, credit_score=750)
    
    # Auto Loan GBDT score:
    # Base: -2.5
    # Tree 1: apply_clicks > 0, tx_triggers > 0 -> +1.8
    # Tree 2: has_high_intent_path = True -> +1.5
    # Tree 3: credit_score >= 750 -> +0.4
    # Total z = -2.5 + 1.8 + 1.5 + 0.4 = +1.2 -> Sigmoid(1.2) = 0.77 (Hot intent)
    assert res_hot["Auto Loan"]["propensity_score"] == 0.77
    assert res_hot["Auto Loan"]["intent_level"] == "Hot"
