from datetime import datetime, timedelta
from typing import List, Dict, Any

def calculate_disposable_income(transactions: List[Dict[str, Any]], gross_income: float) -> Dict[str, Any]:
    """
    Parses transaction history over the last 90 days to determine:
    1. Total Inflows (Salary etc.)
    2. Fixed Commitments (EMIs, SIPs, Bills)
    3. True Disposable Income
    """
    now = datetime.utcnow()
    ninety_days_ago = now - timedelta(days=90)
    
    # Filter 90 days transactions
    recent_txs = []
    for tx in transactions:
        tx_time = tx["timestamp"]
        if isinstance(tx_time, str):
            tx_time = datetime.fromisoformat(tx_time.replace("Z", ""))
        if tx_time >= ninety_days_ago:
            recent_txs.append(tx)
            
    # Monthly aggregators
    monthly_inflows = 0.0
    monthly_emis = 0.0
    monthly_sips = 0.0
    monthly_bills = 0.0
    
    # Track unique months to get accurate averages
    months_seen = set()
    
    for tx in recent_txs:
        amount = tx["amount"]
        category = tx["category"].upper()
        desc = tx["description"].upper()
        tx_time = tx["timestamp"]
        if isinstance(tx_time, str):
            tx_time = datetime.fromisoformat(tx_time.replace("Z", ""))
        months_seen.add(f"{tx_time.year}-{tx_time.month}")
        
        # Inflows
        if amount > 0:
            if "SALARY" in desc or "PAYROLL" in desc or category == "SALARY":
                monthly_inflows += amount
        # Outflows (represented as negative in DB, convert to positive for calculations)
        else:
            abs_amount = abs(amount)
            if "EMI" in desc or "LOAN" in desc or category == "EMI":
                monthly_emis += abs_amount
            elif "SIP" in desc or "MUTUAL FUND" in desc or category == "SIP":
                monthly_sips += abs_amount
            elif "ELECTRICITY" in desc or "BILL" in desc or "UTILITY" in desc or category == "UTILITY":
                monthly_bills += abs_amount
                
    # Dynamic monthly divisor based on transaction date span to avoid calendar month overlaps and fencepost cycle errors
    if recent_txs:
        timestamps = []
        for tx in recent_txs:
            t = tx["timestamp"]
            if isinstance(t, str):
                t = datetime.fromisoformat(t.replace("Z", ""))
            timestamps.append(t)
        
        span_days = (max(timestamps) - min(timestamps)).days
        num_months = float(round(span_days / 30.0) + 1)
    else:
        num_months = 3.0
    
    # Averages
    avg_salary_inflow = monthly_inflows / num_months
    avg_emi = monthly_emis / num_months
    avg_sip = monthly_sips / num_months
    avg_bill = monthly_bills / num_months
    
    # Fallback to gross_income if no salary inflow transactions detected in logs
    effective_base_inflow = avg_salary_inflow if avg_salary_inflow > 0 else gross_income
    
    # Calculate actual disposable income
    fixed_commitments = avg_emi + avg_sip + avg_bill
    disposable_income = max(effective_base_inflow - fixed_commitments, 0.0)
    
    return {
        "gross_income": effective_base_inflow,
        "fixed_commitments": fixed_commitments,
        "avg_emi": avg_emi,
        "avg_sip": avg_sip,
        "avg_bill": avg_bill,
        "disposable_income": disposable_income
    }

def calculate_loan_eligibility(disposable_income: float, loan_type: str, credit_score: int) -> Dict[str, Any]:
    """
    Underwrites loan eligibility using FOIR (Fixed Obligations to Income Ratio) model.
    FOIR is adjusted based on Credit Score.
    P = (EMI * (1 - (1 + r)^-n)) / r
    """
    # 1. FOIR limit (How much percentage of disposable income can go to new EMI)
    if credit_score >= 800:
        foir = 0.60  # 60%
    elif credit_score >= 700:
        foir = 0.50  # 50%
    elif credit_score >= 600:
        foir = 0.40  # 40%
    else:
        foir = 0.20  # 20%
        
    max_eligible_emi = disposable_income * foir
    
    # 2. Loan specific parameters
    # Auto Loan: 5 yrs (60m) @ 9.5%, Home: 20 yrs (240m) @ 8.5%, Personal: 3 yrs (36m) @ 12%
    loan_params = {
        "Auto Loan": {"rate": 9.5, "tenure_months": 60},
        "Home Loan": {"rate": 8.5, "tenure_months": 240},
        "Personal Loan": {"rate": 12.0, "tenure_months": 36},
        "Mortgage Loan": {"rate": 10.0, "tenure_months": 120}
    }
    
    params = loan_params.get(loan_type, {"rate": 10.0, "tenure_months": 60})
    rate = params["rate"]
    n = params["tenure_months"]
    
    # Monthly interest rate
    r = (rate / 12) / 100
    
    # Calculate Max Principal Loan Amount
    if r > 0:
        eligible_loan_amount = (max_eligible_emi * (1 - (1 + r) ** -n)) / r
    else:
        eligible_loan_amount = max_eligible_emi * n
        
    # Standard rounding
    eligible_loan_amount = round(eligible_loan_amount / 10000) * 10000
    max_eligible_emi = round(max_eligible_emi)
    
    return {
        "loan_type": loan_type,
        "max_eligible_emi": max_eligible_emi,
        "eligible_loan_amount": max(eligible_loan_amount, 0.0),
        "interest_rate": rate,
        "tenure_months": n,
        "foir_applied": foir
    }
