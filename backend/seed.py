import sys
import os
from datetime import datetime, timedelta

# Adjust path to import from app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import Base, SessionLocal, engine
from app.models import Customer, Transaction, ClickstreamEvent, Lead
from app.services.credit import calculate_disposable_income, calculate_loan_eligibility
from app.services.scoring import evaluate_propensity_and_intent

def seed_database():
    print("Initializing database tables...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        print("Generating mock customer profiles...")
        
        # 1. Aarav Mehta (Auto Loan Lead Profile)
        aarav = Customer(
            name="Aarav Mehta",
            email="aarav.mehta@example.com",
            mobile="+919876543210",
            account_number="IDBI100892931",
            gross_monthly_income=95000.0,
            credit_score=780
        )
        db.add(aarav)
        
        # 2. Priya Sharma (Home Loan Lead Profile)
        priya = Customer(
            name="Priya Sharma",
            email="priya.sharma@example.com",
            mobile="+919876543211",
            account_number="IDBI100482932",
            gross_monthly_income=150000.0,
            credit_score=810
        )
        db.add(priya)
        
        # 3. Vikram Singh (Personal Loan Lead Profile)
        vikram = Customer(
            name="Vikram Singh",
            email="vikram.singh@example.com",
            mobile="+919876543212",
            account_number="IDBI100382933",
            gross_monthly_income=55000.0,
            credit_score=640
        )
        db.add(vikram)
        
        db.commit()
        
        # --- Transaction logs generation (Last 90 days) ---
        now = datetime.utcnow()
        print("Generating 90-day transaction logs...")
        
        # Helper to generate monthly records
        for i in range(3):
            days_offset = i * 30
            m_date = now - timedelta(days=days_offset)
            
            # Aarav transactions
            db.add_all([
                Transaction(customer_id=aarav.id, amount=95000.0, category="SALARY", description="IDBI SALARY CREDIT / TECH CORP", timestamp=m_date.replace(day=1)),
                Transaction(customer_id=aarav.id, amount=-25000.0, category="RENT", description="RENT TRANSFER / APARTMENT", timestamp=m_date.replace(day=3)),
                Transaction(customer_id=aarav.id, amount=-10000.0, category="SIP", description="SIP DEBIT / HDFC MUTUAL FUND", timestamp=m_date.replace(day=5)),
                Transaction(customer_id=aarav.id, amount=-3500.0, category="UTILITY", description="TATA POWER ELECTRICITY BILL", timestamp=m_date.replace(day=10)),
                Transaction(customer_id=aarav.id, amount=-12000.0, category="SHOPPING", description="AMAZON INDIA INFORMATICS", timestamp=m_date.replace(day=15))
            ])
            
            # Priya transactions
            db.add_all([
                Transaction(customer_id=priya.id, amount=150000.0, category="SALARY", description="SALARY CREDIT / CONSULTING GROUP", timestamp=m_date.replace(day=1)),
                Transaction(customer_id=priya.id, amount=-35000.0, category="RENT", description="RENT DEBIT / SOCIETY BANK", timestamp=m_date.replace(day=3)),
                Transaction(customer_id=priya.id, amount=-15000.0, category="EMI", description="HDFC CAR LOAN AUTO EMI", timestamp=m_date.replace(day=5)),
                Transaction(customer_id=priya.id, amount=-20000.0, category="SIP", description="SIP DEBIT / NIPPON INDIA FUND", timestamp=m_date.replace(day=7)),
                Transaction(customer_id=priya.id, amount=-8000.0, category="UTILITY", description="ACT FIBERNET & GAS UTILITY", timestamp=m_date.replace(day=12))
            ])
            
            # Vikram transactions
            db.add_all([
                Transaction(customer_id=vikram.id, amount=55000.0, category="SALARY", description="SALARY CREDIT / RETAIL CORP", timestamp=m_date.replace(day=1)),
                Transaction(customer_id=vikram.id, amount=-15000.0, category="TRANSFER", description="FAMILY TRANSFER", timestamp=m_date.replace(day=3)),
                Transaction(customer_id=vikram.id, amount=-5000.0, category="SIP", description="SIP DEBIT / AXIS MUTUAL FUND", timestamp=m_date.replace(day=5)),
                Transaction(customer_id=vikram.id, amount=-2200.0, category="UTILITY", description="PHONE & BROADBAND BILLS", timestamp=m_date.replace(day=10))
            ])
            
        # Add special trigger transactions in the last 15 days
        db.add_all([
            # Priya buys furniture -> Triggers Home Loan intent
            Transaction(customer_id=priya.id, amount=-65000.0, category="SHOPPING", description="IKEA FURNITURE MUMBAI IN", timestamp=now - timedelta(days=12)),
            # Vikram gets a credit card penalty -> Triggers personal loan intent
            Transaction(customer_id=vikram.id, amount=-1200.0, category="PENALTY", description="IDBI CC BILL LATE FEE CHARGE", timestamp=now - timedelta(days=8)),
            Transaction(customer_id=vikram.id, amount=-18000.0, category="SHOPPING", description="FLIPKART INTERNET DEBIT", timestamp=now - timedelta(days=14))
        ])
        
        # --- Clickstream Events Generation (Last 7 days) ---
        print("Generating mock clickstream logs...")
        
        # Aarav searches auto loan
        db.add_all([
            ClickstreamEvent(customer_id=aarav.id, page_url="/auto-loan", action="VIEW", duration_seconds=45, timestamp=now - timedelta(days=3)),
            ClickstreamEvent(customer_id=aarav.id, page_url="/auto-loan/emi-calculator", action="CALCULATE_EMI", duration_seconds=120, timestamp=now - timedelta(days=3)),
            ClickstreamEvent(customer_id=aarav.id, page_url="/auto-loan", action="CLICK_APPLY", duration_seconds=5, timestamp=now - timedelta(days=2))
        ])
        
        # Priya searches home loan
        db.add_all([
            ClickstreamEvent(customer_id=priya.id, page_url="/home-loan", action="VIEW", duration_seconds=80, timestamp=now - timedelta(days=5)),
            ClickstreamEvent(customer_id=priya.id, page_url="/home-loan/calculator", action="CALCULATE_EMI", duration_seconds=150, timestamp=now - timedelta(days=5)),
            ClickstreamEvent(customer_id=priya.id, page_url="/home-loan", action="VIEW", duration_seconds=90, timestamp=now - timedelta(days=2))
        ])
        
        # Vikram searches personal loan
        db.add_all([
            ClickstreamEvent(customer_id=vikram.id, page_url="/personal-loan", action="VIEW", duration_seconds=30, timestamp=now - timedelta(days=6)),
            ClickstreamEvent(customer_id=vikram.id, page_url="/personal-loan", action="VIEW", duration_seconds=50, timestamp=now - timedelta(days=2))
        ])
        
        db.commit()
        
        # --- Evaluate and Generate initial Leads ---
        print("Evaluating intent and underwriting eligibility to seed the Lead Board...")
        customers = db.query(Customer).all()
        for cust in customers:
            # Fetch structured lists
            tx_list = [{"amount": t.amount, "category": t.category, "description": t.description, "timestamp": t.timestamp} for t in cust.transactions]
            click_list = [{"page_url": c.page_url, "action": c.action, "timestamp": c.timestamp} for c in cust.clickstream_events]
            
            # Compute Credit Capacity
            credit_data = calculate_disposable_income(tx_list, cust.gross_monthly_income)
            disposable = credit_data["disposable_income"]
            
            # Compute Propensities
            propensity_map = evaluate_propensity_and_intent(click_list, tx_list)
            
            for loan_type, p_data in propensity_map.items():
                # For demo, only add leads with Warm or Hot intent to keep dashboard clean and relevant
                if p_data["intent_level"] in ["Warm", "Hot"]:
                    eligibility = calculate_loan_eligibility(disposable, loan_type, cust.credit_score)
                    
                    lead = Lead(
                        customer_id=cust.id,
                        loan_type=loan_type,
                        propensity_score=p_data["propensity_score"],
                        intent_level=p_data["intent_level"],
                        calculated_disposable_income=disposable,
                        max_eligible_emi=eligibility["max_eligible_emi"],
                        eligible_loan_amount=eligibility["eligible_loan_amount"],
                        status="New",
                        last_updated=datetime.utcnow()
                    )
                    db.add(lead)
                    
        db.commit()
        print("Database successfully seeded!")
        
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
