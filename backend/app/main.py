from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List
import random

from .database import get_db, Base, engine
from .models import Customer, Transaction, ClickstreamEvent, Lead
from .schemas import (
    Customer as CustomerSchema,
    CustomerDetail as CustomerDetailSchema,
    ClickstreamEventCreate,
    TransactionCreate,
    LeadResponse,
    OutreachGenerateRequest,
    OutreachGenerateResponse
)
from .services.credit import calculate_disposable_income, calculate_loan_eligibility
from .services.scoring import evaluate_propensity_and_intent
from .services.ai_outreach import generate_outreach_copy
from ..seed import seed_database

app = FastAPI(
    title="Prospect Assist AI Core Engine",
    description="Behavioral Credit & Hyper-Targeted Lead underwriting API",
    version="1.0.0"
)

# CORS setup for frontend simulator integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Helper function to recalculate a customer's credit profile and scoring leads
def refresh_customer_leads(db: Session, customer_id: int):
    cust = db.query(Customer).filter(Customer.id == customer_id).first()
    if not cust:
        return
        
    tx_list = [{"amount": t.amount, "category": t.category, "description": t.description, "timestamp": t.timestamp} for t in cust.transactions]
    click_list = [{"page_url": c.page_url, "action": c.action, "timestamp": c.timestamp} for c in cust.clickstream_events]
    
    # Underwrite creditcapacity
    credit_data = calculate_disposable_income(tx_list, cust.gross_monthly_income)
    disposable = credit_data["disposable_income"]
    
    # Calculate propensity scores
    leads_list = [{"status": l.status, "loan_type": l.loan_type} for l in cust.leads]
    propensity_map = evaluate_propensity_and_intent(click_list, tx_list, cust.credit_score, leads_list)
    
    for loan_type, p_data in propensity_map.items():
        existing_lead = db.query(Lead).filter(
            Lead.customer_id == customer_id,
            Lead.loan_type == loan_type
        ).first()
        
        # Strict Risk Model 3 Gate check
        is_high_risk = p_data.get("risk_evaluation", {}).get("risk_tier") == "High Risk (Subprime)"
        if is_high_risk:
            # Remove any active lead if risk is high
            if existing_lead:
                db.delete(existing_lead)
            continue
            
        # Filter: Save leads in database if propensity score >= 35% (Warm/Hot leads) for dynamic RM dashboard filtering
        if p_data["propensity_score"] >= 0.35:
            eligibility = calculate_loan_eligibility(disposable, loan_type, cust.credit_score)
            
            if existing_lead:
                existing_lead.propensity_score = p_data["propensity_score"]
                existing_lead.intent_level = p_data["intent_level"]
                existing_lead.calculated_disposable_income = disposable
                existing_lead.max_eligible_emi = eligibility["max_eligible_emi"]
                existing_lead.eligible_loan_amount = eligibility["eligible_loan_amount"]
                existing_lead.last_updated = datetime.utcnow()
            else:
                new_lead = Lead(
                    customer_id=customer_id,
                    loan_type=loan_type,
                    propensity_score=p_data["propensity_score"],
                    intent_level=p_data["intent_level"],
                    calculated_disposable_income=disposable,
                    max_eligible_emi=eligibility["max_eligible_emi"],
                    eligible_loan_amount=eligibility["eligible_loan_amount"],
                    status="New",
                    cohort=random.choice(["Treated", "Control"])
                )
                db.add(new_lead)
        else:
            # If propensity score falls below 35%, remove it from the active database
            if existing_lead:
                db.delete(existing_lead)
                
    db.commit()

@app.on_event("startup")
def startup_event():
    # Make sure tables exist on launch
    Base.metadata.create_all(bind=engine)

@app.get("/")
def read_root():
    return {"status": "online", "message": "Alpha-Fin scoring services ready"}

# --- Customers Endpoints ---
@app.get("/api/customers", response_model=List[CustomerSchema])
def get_customers(db: Session = Depends(get_db)):
    return db.query(Customer).all()

@app.get("/api/customers/{customer_id}", response_model=CustomerDetailSchema)
def get_customer_detail(customer_id: int, db: Session = Depends(get_db)):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer

@app.get("/api/customers/{customer_id}/twin")
def get_customer_twin_profile(customer_id: int, db: Session = Depends(get_db)):
    cust = db.query(Customer).filter(Customer.id == customer_id).first()
    if not cust:
        raise HTTPException(status_code=404, detail="Customer not found")
        
    tx_list = [{"amount": t.amount, "category": t.category, "description": t.description, "timestamp": t.timestamp} for t in cust.transactions]
    click_list = [{"page_url": c.page_url, "action": c.action, "timestamp": c.timestamp} for c in cust.clickstream_events]
    
    leads_list = [{"status": l.status, "loan_type": l.loan_type} for l in cust.leads]
    twin_data = evaluate_propensity_and_intent(click_list, tx_list, cust.credit_score, leads_list)
    
    return {
        "customer_id": cust.id,
        "name": cust.name,
        "account_number": cust.account_number,
        "credit_score": cust.credit_score,
        "twins": twin_data
    }

# --- Clickstream Events Endpoints ---
@app.post("/api/clickstream", status_code=201)
def log_clickstream_event(event: ClickstreamEventCreate, db: Session = Depends(get_db)):
    # Verify customer exists
    customer = db.query(Customer).filter(Customer.id == event.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
        
    db_event = ClickstreamEvent(
        customer_id=event.customer_id,
        page_url=event.page_url,
        action=event.action,
        duration_seconds=event.duration_seconds,
        timestamp=datetime.utcnow()
    )
    db.add(db_event)
    db.commit()
    
    # Recalculate propensity score and update leads
    refresh_customer_leads(db, event.customer_id)
    
    return {"message": "Clickstream event logged", "event_id": db_event.id}

# --- Transaction Endpoints ---
@app.post("/api/transaction", status_code=201)
def add_transaction(tx: TransactionCreate, db: Session = Depends(get_db)):
    # Verify customer exists
    customer = db.query(Customer).filter(Customer.id == tx.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
        
    db_tx = Transaction(
        customer_id=tx.customer_id,
        amount=tx.amount,
        category=tx.category,
        description=tx.description,
        timestamp=datetime.utcnow()
    )
    db.add(db_tx)
    db.commit()
    
    # Trigger recalculation of credit limit and update leads
    refresh_customer_leads(db, tx.customer_id)
    
    return {"message": "Transaction logged", "transaction_id": db_tx.id}

# --- Lead Board Endpoints ---
@app.get("/api/leads", response_model=List[LeadResponse])
def get_leads(db: Session = Depends(get_db)):
    leads_list = db.query(Lead).order_by(Lead.propensity_score.desc()).all()
    
    # Dynamically inject the Behavioral Financial Twin profile metadata
    for lead in leads_list:
        cust = lead.customer
        tx_list = [{"amount": t.amount, "category": t.category, "description": t.description, "timestamp": t.timestamp} for t in cust.transactions]
        click_list = [{"page_url": c.page_url, "action": c.action, "timestamp": c.timestamp} for c in cust.clickstream_events]
        
        # Evaluate twin scores
        previous_leads = [{"status": l.status, "loan_type": l.loan_type} for l in cust.leads]
        twin_data = evaluate_propensity_and_intent(click_list, tx_list, cust.credit_score, previous_leads)
        
        # Bind the product specific twin parameters to the lead schema object
        if lead.loan_type in twin_data:
            lead.financial_twin = twin_data[lead.loan_type]["financial_twin"]
            lead.reasons = twin_data[lead.loan_type].get("reasons", [])
            lead.intent_velocity = twin_data[lead.loan_type].get("intent_velocity", 0.0)
            lead.life_events = twin_data[lead.loan_type].get("life_events", [])
            
    return leads_list

@app.post("/api/leads/{lead_id}/status")
def update_lead_status(lead_id: int, status_update: dict, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
        
    new_status = status_update.get("status")
    if new_status not in ["New", "Contacted", "Converted", "Rejected"]:
        raise HTTPException(status_code=400, detail="Invalid status option")
        
    lead.status = new_status
    db.commit()
    return {"message": f"Lead status updated to {new_status}"}

# --- AI Outreach Endpoints ---
@app.post("/api/outreach/generate", response_model=OutreachGenerateResponse)
async def generate_lead_outreach(req: OutreachGenerateRequest, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == req.lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
        
    cust = lead.customer
    
    # Check if lead is in the Control group to serve standard banking templates instead of AI personalized copy
    if lead.cohort == "Control":
        if req.channel == "whatsapp":
            content = f"👋 IDBI Bank Offer: Hi {cust.name}, get pre-approved {lead.loan_type} options starting at attractive interest rates. Minimal documentation required. Apply today! T&C Apply. Click: https://idbi.co/loans"
        elif req.channel == "email":
            content = f"Subject: Special Pre-Approved {lead.loan_type} Offer from IDBI Bank\n\nDear Customer,\n\nWe are pleased to inform you that you have been selected for a pre-approved {lead.loan_type} based on your banking relationship with IDBI Bank.\n\nKey Benefits:\n- Highly competitive interest rates\n- Flexible repayment tenures\n- 100% paperless documentation\n\nPlease visit our nearest branch or log in to internet banking to submit your application.\n\nWarm regards,\nIDBI Bank Ltd."
        else: # call_script
            content = f"[Control Group RM Call Script]\n\nRM: \"Hello, am I speaking with {cust.name}? My name is [Name] calling from IDBI Bank.\"\nClient: \"Yes, speaking.\"\nRM: \"I am calling to ask if you are looking for any {lead.loan_type} today? We have some attractive offers.\"\nClient: \"No, I am not interested right now.\"\nRM: \"Okay, no problem. Thank you for your time. Goodbye.\""
            
        return OutreachGenerateResponse(
            lead_id=lead.id,
            channel=req.channel,
            content=content
        )

    # Re-evaluate triggers list for this lead type (Treated Group: Dynamic AI Generation)
    tx_list = [{"amount": t.amount, "category": t.category, "description": t.description, "timestamp": t.timestamp} for t in cust.transactions]
    click_list = [{"page_url": c.page_url, "action": c.action, "timestamp": c.timestamp} for c in cust.clickstream_events]
    previous_leads = [{"status": l.status, "loan_type": l.loan_type} for l in cust.leads]
    propensity_map = evaluate_propensity_and_intent(click_list, tx_list, cust.credit_score, previous_leads)
    triggers = propensity_map.get(lead.loan_type, {}).get("triggers", [])
    
    # Standard loan parameters (rates matching underwriting in services/credit.py)
    rates = {
        "Auto Loan": 9.5,
        "Home Loan": 8.5,
        "Personal Loan": 12.0,
        "Mortgage Loan": 10.0
    }
    tenures = {
        "Auto Loan": 60,
        "Home Loan": 240,
        "Personal Loan": 36,
        "Mortgage Loan": 120
    }
    
    lead_details = {
        "customer_name": cust.name,
        "loan_type": lead.loan_type,
        "eligible_loan_amount": lead.eligible_loan_amount,
        "max_eligible_emi": lead.max_eligible_emi,
        "interest_rate": rates.get(lead.loan_type, 10.0),
        "tenure_months": tenures.get(lead.loan_type, 60),
        "triggers": triggers
    }
    
    content = await generate_outreach_copy(lead_details, req.channel)
    
    return OutreachGenerateResponse(
        lead_id=lead.id,
        channel=req.channel,
        content=content
    )

# --- A/B testing Analytics performance Endpoints ---
@app.get("/api/leads/performance")
def get_leads_performance(db: Session = Depends(get_db)):
    """
    Computes conversion statistics comparing the Treated group (AI outreach)
    against the Control group (generic bank spam).
    """
    leads_list = db.query(Lead).all()
    
    treated = [l for l in leads_list if l.cohort == "Treated"]
    control = [l for l in leads_list if l.cohort == "Control"]
    
    treated_conv = len([l for l in treated if l.status == "Converted"])
    treated_total = len(treated)
    
    control_conv = len([l for l in control if l.status == "Converted"])
    control_total = len(control)
    
    return {
        "treated": {
            "converted": treated_conv,
            "total": treated_total,
            "rate": round((treated_conv / treated_total * 100), 1) if treated_total > 0 else 0.0
        },
        "control": {
            "converted": control_conv,
            "total": control_total,
            "rate": round((control_conv / control_total * 100), 1) if control_total > 0 else 0.0
        }
    }

# --- Simulator Control Endpoints ---
@app.post("/api/reset")
def reset_database():
    """
    Utility endpoint to quickly flush and re-seed database.
    Allows judges to restart demo seamlessly.
    """
    try:
        seed_database()
        return {"status": "success", "message": "Database reset and seeded."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
