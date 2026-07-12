from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List

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
    title="Alpha-Fin Core Engine",
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
    propensity_map = evaluate_propensity_and_intent(click_list, tx_list)
    
    for loan_type, p_data in propensity_map.items():
        existing_lead = db.query(Lead).filter(
            Lead.customer_id == customer_id,
            Lead.loan_type == loan_type
        ).first()
        
        # We only track Warm and Hot leads to prevent spamming the Relationship Manager
        if p_data["intent_level"] in ["Warm", "Hot"]:
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
                    status="New"
                )
                db.add(new_lead)
        else:
            # If propensity falls back to Cold, remove it from active leads
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
    # Fetch all leads sorted by propensity score descending (highest priority first)
    return db.query(Lead).order_by(Lead.propensity_score.desc()).all()

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
    
    # Re-evaluate triggers list for this lead type
    tx_list = [{"amount": t.amount, "category": t.category, "description": t.description, "timestamp": t.timestamp} for t in cust.transactions]
    click_list = [{"page_url": c.page_url, "action": c.action, "timestamp": c.timestamp} for c in cust.clickstream_events]
    propensity_map = evaluate_propensity_and_intent(click_list, tx_list)
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
