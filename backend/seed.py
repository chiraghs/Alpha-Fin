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
        
        # Helper to generate monthly records. The most recent month carries a
        # salary hike (income promotion) so the behavioral model detects a life
        # event — this lifts the computed Loan Readiness into a compelling range
        # while keeping the leads-board and twin numbers identical (both derive
        # from this same engine output).
        for i in range(3):
            days_offset = i * 30
            m_date = now - timedelta(days=days_offset)
            sal = 1.25 if i == 0 else 1.0  # +25% promotion in the current month

            # Aarav transactions
            db.add_all([
                Transaction(customer_id=aarav.id, amount=95000.0 * sal, category="SALARY", description="IDBI SALARY CREDIT / TECH CORP", timestamp=m_date.replace(day=1)),
                Transaction(customer_id=aarav.id, amount=-25000.0, category="RENT", description="RENT TRANSFER / APARTMENT", timestamp=m_date.replace(day=3)),
                Transaction(customer_id=aarav.id, amount=-10000.0, category="SIP", description="SIP DEBIT / HDFC MUTUAL FUND", timestamp=m_date.replace(day=5)),
                Transaction(customer_id=aarav.id, amount=-3500.0, category="UTILITY", description="TATA POWER ELECTRICITY BILL", timestamp=m_date.replace(day=10)),
                Transaction(customer_id=aarav.id, amount=-12000.0, category="SHOPPING", description="AMAZON INDIA INFORMATICS", timestamp=m_date.replace(day=15))
            ])

            # Priya transactions
            db.add_all([
                Transaction(customer_id=priya.id, amount=150000.0 * sal, category="SALARY", description="SALARY CREDIT / CONSULTING GROUP", timestamp=m_date.replace(day=1)),
                Transaction(customer_id=priya.id, amount=-35000.0, category="RENT", description="RENT DEBIT / SOCIETY BANK", timestamp=m_date.replace(day=3)),
                Transaction(customer_id=priya.id, amount=-15000.0, category="EMI", description="HDFC CAR LOAN AUTO EMI", timestamp=m_date.replace(day=5)),
                Transaction(customer_id=priya.id, amount=-20000.0, category="SIP", description="SIP DEBIT / NIPPON INDIA FUND", timestamp=m_date.replace(day=7)),
                Transaction(customer_id=priya.id, amount=-8000.0, category="UTILITY", description="ACT FIBERNET & GAS UTILITY", timestamp=m_date.replace(day=12))
            ])

            # Vikram transactions
            db.add_all([
                Transaction(customer_id=vikram.id, amount=55000.0 * sal, category="SALARY", description="SALARY CREDIT / RETAIL CORP", timestamp=m_date.replace(day=1)),
                Transaction(customer_id=vikram.id, amount=-15000.0, category="TRANSFER", description="FAMILY TRANSFER", timestamp=m_date.replace(day=3)),
                Transaction(customer_id=vikram.id, amount=-5000.0, category="SIP", description="SIP DEBIT / AXIS MUTUAL FUND", timestamp=m_date.replace(day=5)),
                Transaction(customer_id=vikram.id, amount=-2200.0, category="UTILITY", description="PHONE & BROADBAND BILLS", timestamp=m_date.replace(day=10))
            ])
            
        # Add special trigger transactions in the last 15 days. These give the
        # intent model transactional corroboration (a showroom visit, a rental
        # deposit, furniture) and fire life-event detectors, so the primary
        # product's readiness reads as a genuine hot lead.
        db.add_all([
            # Aarav is car-shopping -> Auto Loan trigger + vehicle life event
            Transaction(customer_id=aarav.id, amount=-30000.0, category="SHOPPING", description="MARUTI SUZUKI SHOWROOM BOOKING", timestamp=now - timedelta(days=6)),
            Transaction(customer_id=aarav.id, amount=-18500.0, category="INSURANCE", description="ICICI LOMBARD MOTORS INSURANCE", timestamp=now - timedelta(days=9)),
            # Priya is home-buying -> furniture + rental deposit -> Home Loan intent & life event
            Transaction(customer_id=priya.id, amount=-65000.0, category="SHOPPING", description="IKEA FURNITURE MUMBAI IN", timestamp=now - timedelta(days=12)),
            Transaction(customer_id=priya.id, amount=-90000.0, category="RENT", description="NOBROKER RENTAL DEPOSIT & BROKERAGE", timestamp=now - timedelta(days=10)),
            # Vikram gets a credit card penalty -> personal loan intent (but stays high-risk)
            Transaction(customer_id=vikram.id, amount=-1200.0, category="PENALTY", description="IDBI CC BILL LATE FEE CHARGE", timestamp=now - timedelta(days=8)),
            Transaction(customer_id=vikram.id, amount=-18000.0, category="SHOPPING", description="FLIPKART INTERNET DEBIT", timestamp=now - timedelta(days=14))
        ])

        # --- Clickstream Events Generation (Last 7 days) ---
        print("Generating mock clickstream logs...")

        # Aarav: strong auto-loan journey + a secondary home-loan look
        db.add_all([
            ClickstreamEvent(customer_id=aarav.id, page_url="/auto-loan", action="VIEW", duration_seconds=45, timestamp=now - timedelta(days=3)),
            ClickstreamEvent(customer_id=aarav.id, page_url="/auto-loan/emi-calculator", action="CALCULATE_EMI", duration_seconds=120, timestamp=now - timedelta(days=3)),
            ClickstreamEvent(customer_id=aarav.id, page_url="/auto-loan", action="CLICK_APPLY", duration_seconds=5, timestamp=now - timedelta(days=2)),
            ClickstreamEvent(customer_id=aarav.id, page_url="/home-loan", action="VIEW", duration_seconds=40, timestamp=now - timedelta(days=4)),
            ClickstreamEvent(customer_id=aarav.id, page_url="/home-loan/calculator", action="CALCULATE_EMI", duration_seconds=70, timestamp=now - timedelta(days=4))
        ])

        # Priya: strong home-loan journey (through to apply) + a secondary personal-loan look
        db.add_all([
            ClickstreamEvent(customer_id=priya.id, page_url="/home-loan", action="VIEW", duration_seconds=80, timestamp=now - timedelta(days=5)),
            ClickstreamEvent(customer_id=priya.id, page_url="/home-loan/calculator", action="CALCULATE_EMI", duration_seconds=150, timestamp=now - timedelta(days=4)),
            ClickstreamEvent(customer_id=priya.id, page_url="/home-loan", action="CLICK_APPLY", duration_seconds=8, timestamp=now - timedelta(days=2)),
            ClickstreamEvent(customer_id=priya.id, page_url="/personal-loan", action="VIEW", duration_seconds=35, timestamp=now - timedelta(days=6)),
            ClickstreamEvent(customer_id=priya.id, page_url="/personal-loan/emi-calculator", action="CALCULATE_EMI", duration_seconds=60, timestamp=now - timedelta(days=6))
        ])

        # Vikram searches personal loan (high intent, but the risk gate holds him back)
        db.add_all([
            ClickstreamEvent(customer_id=vikram.id, page_url="/personal-loan", action="VIEW", duration_seconds=30, timestamp=now - timedelta(days=6)),
            ClickstreamEvent(customer_id=vikram.id, page_url="/personal-loan/emi-calculator", action="CALCULATE_EMI", duration_seconds=55, timestamp=now - timedelta(days=2))
        ])
        
        db.commit()
        
        # --- Evaluate twins once, then generate leads from that same output ---
        # Both the active leads and the historical A/B leads take their
        # propensity from this engine result, so the leads board and the Twin
        # Portfolio always show the identical Loan Readiness for a customer+product.
        print("Evaluating intent and underwriting eligibility to seed the Lead Board...")
        customers = db.query(Customer).all()
        twin_by_cust = {}
        disposable_by_cust = {}
        for cust in customers:
            tx_list = [{"amount": t.amount, "category": t.category, "description": t.description, "timestamp": t.timestamp} for t in cust.transactions]
            click_list = [{"page_url": c.page_url, "action": c.action, "timestamp": c.timestamp} for c in cust.clickstream_events]
            disposable_by_cust[cust.id] = calculate_disposable_income(tx_list, cust.gross_monthly_income)["disposable_income"]
            twin_by_cust[cust.id] = evaluate_propensity_and_intent(click_list, tx_list, cust.credit_score)

        # Active (open) leads — anything the model rates Warm/Hot and the risk gate clears
        for cust in customers:
            disposable = disposable_by_cust[cust.id]
            lead_idx = 0
            for loan_type, p_data in twin_by_cust[cust.id].items():
                is_high_risk = p_data.get("risk_evaluation", {}).get("risk_tier") == "High Risk (Subprime)"
                if p_data["intent_level"] in ["Warm", "Hot"] and not is_high_risk:
                    eligibility = calculate_loan_eligibility(disposable, loan_type, cust.credit_score)
                    cohort = "Treated" if lead_idx % 2 == 0 else "Control"
                    lead_idx += 1
                    db.add(Lead(
                        customer_id=cust.id,
                        loan_type=loan_type,
                        propensity_score=p_data["propensity_score"],
                        intent_level=p_data["intent_level"],
                        calculated_disposable_income=disposable,
                        max_eligible_emi=eligibility["max_eligible_emi"],
                        eligible_loan_amount=eligibility["eligible_loan_amount"],
                        status="New",
                        cohort=cohort,
                        last_updated=datetime.utcnow()
                    ))

        # --- Seed Historical Completed Leads for the A/B Test Dashboard ---
        # Same (customer, product, status, cohort) A/B distribution as before, but
        # each score is now the model's computed LRI so it matches the twin exactly.
        print("Seeding historical leads for A/B testing analytics...")
        # (customer_id, loan_type, status, cohort, disposable, emi, eligible)
        hist_spec = [
            (aarav.id, "Personal Loan", "Converted", "Treated", 65000.0, 32500, 1000000),
            (priya.id, "Auto Loan", "Converted", "Treated", 72000.0, 36000, 1500000),
            (aarav.id, "Mortgage Loan", "Converted", "Treated", 65000.0, 32500, 2500000),
            (vikram.id, "Auto Loan", "Rejected", "Treated", 33000.0, 13200, 600000),
            (priya.id, "Mortgage Loan", "Converted", "Control", 72000.0, 36000, 3000000),
            (vikram.id, "Home Loan", "Rejected", "Control", 33000.0, 13200, 1200000),
            (aarav.id, "Home Loan", "Rejected", "Control", 65000.0, 32500, 3500000),
            (priya.id, "Personal Loan", "Rejected", "Control", 72000.0, 36000, 1200000),
            (vikram.id, "Mortgage Loan", "Rejected", "Control", 33000.0, 13200, 1000000),
        ]
        for cid, loan_type, status_val, cohort, disp, emi, elig in hist_spec:
            t = twin_by_cust[cid][loan_type]
            db.add(Lead(
                customer_id=cid,
                loan_type=loan_type,
                propensity_score=round(t["composite_lead_score"], 2),
                intent_level=t["intent_level"],
                calculated_disposable_income=disp,
                max_eligible_emi=emi,
                eligible_loan_amount=elig,
                status=status_val,
                cohort=cohort,
            ))
                    
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
