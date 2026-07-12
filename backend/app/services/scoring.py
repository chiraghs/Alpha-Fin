import math
from datetime import datetime, timedelta
from typing import List, Dict, Any

def evaluate_propensity_and_intent(
    clickstream_events: List[Dict[str, Any]], 
    transactions: List[Dict[str, Any]],
    credit_score: int
) -> Dict[str, Dict[str, Any]]:
    """
    Evaluates customer propensity using:
    1. A Graph-based Clickstream Path Sequence Analyzer (detects high-intent flow patterns).
    2. A GBDT (Gradient Boosted Decision Tree) Ensemble Simulator (LightGBM-like)
       that aggregates feature vectors and outputs a probability via Sigmoid.
    """
    now = datetime.utcnow()
    seven_days_ago = now - timedelta(days=7)
    thirty_days_ago = now - timedelta(days=30)
    
    # Products we model
    products = ["Auto Loan", "Home Loan", "Personal Loan", "Mortgage Loan"]
    
    # Feature extraction structure per product
    features = {
        p: {
            "views_count": 0,
            "calculator_use_count": 0,
            "apply_clicks_count": 0,
            "transaction_triggers_count": 0,
            "has_high_intent_path": False,
            "triggers": []
        } for p in products
    }

    # --- 1. Graph Path Sequence Extraction ---
    # Sort clickstream events chronologically to evaluate paths
    sorted_events = sorted(clickstream_events, key=lambda x: x["timestamp"])
    
    # Group page sequences by product type
    product_sequences = {p: [] for p in products}
    for event in sorted_events:
        event_time = event["timestamp"]
        if isinstance(event_time, str):
            event_time = datetime.fromisoformat(event_time.replace("Z", ""))
        
        if event_time < seven_days_ago:
            continue
            
        page = event["page_url"].lower()
        action = event["action"].upper()
        
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
            # Map action type to state nodes
            product_sequences[target_product].append(action)
            
            # Aggregate counts for GBDT features
            if action == "VIEW":
                features[target_product]["views_count"] += 1
            elif action == "CALCULATE_EMI":
                features[target_product]["calculator_use_count"] += 1
            elif action == "CLICK_APPLY":
                features[target_product]["apply_clicks_count"] += 1

    # Check for specific high-intent graph sequences (e.g. View -> Calc -> Click Apply)
    for p in products:
        seq = product_sequences[p]
        # Match a transition sub-graph pattern: VIEW -> CALCULATE_EMI -> CLICK_APPLY
        # This shows structural path analysis rather than flat page views
        for i in range(len(seq) - 2):
            sub_seq = seq[i:i+3]
            if sub_seq == ["VIEW", "CALCULATE_EMI", "CLICK_APPLY"]:
                features[p]["has_high_intent_path"] = True
                features[p]["triggers"].append("High-intent graph sequence VIEW ➔ CALCULATE_EMI ➔ APPLY detected")
                break
                
        # If not full sequence, check for View -> Calc
        if not features[p]["has_high_intent_path"]:
            for i in range(len(seq) - 1):
                if seq[i:i+2] == ["VIEW", "CALCULATE_EMI"]:
                    features[p]["triggers"].append("Sequence VIEW ➔ CALCULATE_EMI detected")
                    break

    # --- 2. Transaction Trigger Extraction ---
    for tx in transactions:
        tx_time = tx["timestamp"]
        if isinstance(tx_time, str):
            tx_time = datetime.fromisoformat(tx_time.replace("Z", ""))
            
        if tx_time < thirty_days_ago:
            continue
            
        desc = tx["description"].upper()
        amount = tx["amount"]
        
        if amount < 0:
            # Auto Loan transaction triggers
            if any(k in desc for k in ["MARUTI", "HYUNDAI", "TOYOTA", "TATA MOTORS", "CAR DEKHO", "AUTO SERVICE", "SHOWROOM"]):
                features["Auto Loan"]["transaction_triggers_count"] += 1
                features["Auto Loan"]["triggers"].append("Recent auto dealer / service center spending")
                
            # Home/Mortgage transaction triggers
            if any(k in desc for k in ["INTERIOR", "DECOR", "FURNITURE", "IKEA", "ASIAN PAINTS", "BUILDER", "ARCHITECT"]):
                features["Home Loan"]["transaction_triggers_count"] += 1
                features["Home Loan"]["triggers"].append("Significant spend with home decor/renovation vendor")
                features["Mortgage Loan"]["transaction_triggers_count"] += 1
                features["Mortgage Loan"]["triggers"].append("Property/Architect vendor debit")
                
            # Personal Loan transaction triggers
            if any(k in desc for k in ["LATE FEE", "PENALTY", "OVERDRAFT", "INTEREST DEBIT", "CREDIT CARD BILL LATE"]):
                features["Personal Loan"]["transaction_triggers_count"] += 1
                features["Personal Loan"]["triggers"].append("Late payment charges on card/overdraft statements")

    # --- 3. LightGBM GBDT Ensemble Simulator ---
    # We simulate a GBDT booster by building a series of decision trees that return raw margin scores (logits),
    # which are summed and scaled through a Sigmoid function: P(conversion) = 1 / (1 + e^-z)
    final_results = {}
    
    for p, f in features.items():
        # Feature Vector extraction
        x_views = f["views_count"]
        x_calc = f["calculator_use_count"]
        x_apply = f["apply_clicks_count"]
        x_tx = f["transaction_triggers_count"]
        x_graph = 1.0 if f["has_high_intent_path"] else 0.0
        
        # Base logit (prior conversion bias)
        z = -2.5 # Negative bias represents low default conversion rate of bank products
        
        # Tree 1: Evaluate Direct Interest (Split on Apply clicks & Transactions)
        if x_apply > 0:
            if x_tx > 0:
                z += 1.8 # Hot combination
            else:
                z += 1.2
        else:
            if x_tx > 0:
                z += 0.8
                
        # Tree 2: Evaluate Exploration Rigor (Split on Graph path & Calculators)
        if x_graph > 0:
            z += 1.5 # Path sequence centrality boost
        else:
            if x_calc > 0:
                z += 0.6
                if x_views > 2:
                    z += 0.4
                    
        # Tree 3: Risk & Score Profiling (Split on Customer Credit rating)
        if credit_score >= 750:
            z += 0.4 # Higher scores are more financially active
        elif credit_score < 600:
            z -= 0.5 # Subprime rating lowers interest in standard bank products
            
        # Sigmoid Function to compute probability
        try:
            propensity_score = 1.0 / (1.0 + math.exp(-z))
        except OverflowError:
            propensity_score = 0.0 if z < 0 else 1.0
            
        # Scale & Round Propensity
        propensity_score = round(propensity_score, 2)
        
        # Classify Intent Level
        if propensity_score >= 0.70:
            intent = "Hot"
        elif propensity_score >= 0.35:
            intent = "Warm"
        else:
            intent = "Cold"
            
        final_results[p] = {
            "propensity_score": propensity_score,
            "intent_level": intent,
            "triggers": list(set(f["triggers"]))
        }
        
    return final_results
