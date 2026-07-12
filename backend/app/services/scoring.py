from datetime import datetime, timedelta
from typing import List, Dict, Any

def evaluate_propensity_and_intent(
    clickstream_events: List[Dict[str, Any]], 
    transactions: List[Dict[str, Any]]
) -> Dict[str, Dict[str, Any]]:
    """
    Computes Propensity Scores (0.0 to 1.0) and Intent Levels (Cold, Warm, Hot)
    across all loan products based on app interactions and spending behaviors.
    """
    now = datetime.utcnow()
    seven_days_ago = now - timedelta(days=7)
    thirty_days_ago = now - timedelta(days=30)
    
    # Initialize scores for each loan type
    products = ["Auto Loan", "Home Loan", "Personal Loan", "Mortgage Loan"]
    results = {p: {"score": 0.0, "triggers": []} for p in products}
    
    # 1. Evaluate clickstream events (Last 7 days)
    for event in clickstream_events:
        event_time = event["timestamp"]
        if isinstance(event_time, str):
            event_time = datetime.fromisoformat(event_time.replace("Z", ""))
        
        if event_time < seven_days_ago:
            continue
            
        page = event["page_url"].lower()
        action = event["action"].upper()
        
        # Match pages
        target_product = None
        if "auto" in page or "car" in page:
            target_product = "Auto Loan"
        elif "home" in page or "housing" in page:
            target_product = "Home Loan"
        elif "personal" in page or "salary-loan" in page:
            target_product = "Personal Loan"
        elif "mortgage" in page or "property" in page:
            target_product = "Mortgage Loan"
            
        if target_product:
            if action == "VIEW":
                results[target_product]["score"] += 0.15
                results[target_product]["triggers"].append(f"Viewed {target_product} page")
            elif action == "CALCULATE_EMI":
                results[target_product]["score"] += 0.25
                results[target_product]["triggers"].append(f"Used {target_product} EMI calculator")
            elif action == "CLICK_APPLY":
                results[target_product]["score"] += 0.35
                results[target_product]["triggers"].append(f"Clicked Apply for {target_product}")

    # 2. Evaluate transaction triggers (Last 30 days)
    for tx in transactions:
        tx_time = tx["timestamp"]
        if isinstance(tx_time, str):
            tx_time = datetime.fromisoformat(tx_time.replace("Z", ""))
            
        if tx_time < thirty_days_ago:
            continue
            
        desc = tx["description"].upper()
        amount = tx["amount"]
        
        # We only check negative (spending) transactions for interest triggers
        if amount < 0:
            # Auto Loan triggers: spending at showrooms, car service, fuel spikes
            if any(k in desc for k in ["MARUTI", "HYUNDAI", "TOYOTA", "TATA MOTORS", "CAR DEKHO", "AUTO SERVICE", "SHOWROOM"]):
                results["Auto Loan"]["score"] += 0.30
                results["Auto Loan"]["triggers"].append("Transaction detected with auto showroom/dealer")
                
            # Home/Mortgage Loan triggers: spending at furniture, interior design, architects, builders
            if any(k in desc for k in ["INTERIOR", "DECOR", "FURNITURE", "IKEA", "ASIAN PAINTS", "BUILDER", "ARCHITECT"]):
                results["Home Loan"]["score"] += 0.30
                results["Home Loan"]["triggers"].append("Transaction detected with home decor / interior vendor")
                results["Mortgage Loan"]["score"] += 0.20
                results["Mortgage Loan"]["triggers"].append("Transaction detected with decorator/architect")
                
            # Personal Loan triggers: cash flow drops, late fee charges, credit card interest
            if any(k in desc for k in ["LATE FEE", "PENALTY", "OVERDRAFT", "INTEREST DEBIT", "CREDIT CARD BILL LATE"]):
                results["Personal Loan"]["score"] += 0.30
                results["Personal Loan"]["triggers"].append("Late fee/finance charge detected in statements")

    # 3. Finalize scores and map to Intent Levels
    final_results = {}
    for product, data in results.items():
        # Cap score between 0.0 and 1.0
        score = min(round(data["score"], 2), 1.0)
        
        # Deduplicate triggers
        unique_triggers = list(set(data["triggers"]))
        
        # Classify intent level
        if score >= 0.70:
            intent = "Hot"
        elif score >= 0.35:
            intent = "Warm"
        else:
            intent = "Cold"
            
        final_results[product] = {
            "propensity_score": score,
            "intent_level": intent,
            "triggers": unique_triggers
        }
        
    return final_results
