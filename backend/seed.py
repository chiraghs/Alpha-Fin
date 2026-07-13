import sys
import os
from datetime import datetime, timedelta

# Adjust path to import from app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import Base, SessionLocal, engine
from app.models import Customer, Transaction, ClickstreamEvent, Lead
from app.services.credit import calculate_disposable_income, calculate_loan_eligibility
from app.services.scoring import evaluate_propensity_and_intent

# ---------------------------------------------------------------------------
# Data-driven customer roster. Each profile emits 90 days of salary + monthly
# commitments, recent trigger transactions (which fire intent + life-event
# detectors), and a clickstream journey for its primary product (plus an
# optional secondary browse). Every lead's Loan Readiness is then computed from
# this same engine, so the leads board and the Twin Portfolio always agree.
# ---------------------------------------------------------------------------

VIEW_SLUG = {
    "Auto Loan": "/auto-loan",
    "Home Loan": "/home-loan",
    "Personal Loan": "/personal-loan",
    "Mortgage Loan": "/mortgage-loan",
}
CALC_SLUG = {
    "Auto Loan": "/auto-loan/emi-calculator",
    "Home Loan": "/home-loan/calculator",
    "Personal Loan": "/personal-loan/emi-calculator",
    "Mortgage Loan": "/mortgage-loan/calculator",
}


def journey_clicks(product, kind):
    """Return [(page_url, action, duration, days_ago)] for a product journey."""
    v, c = VIEW_SLUG[product], CALC_SLUG[product]
    if kind == "apply":
        return [(v, "VIEW", 60, 3), (c, "CALCULATE_EMI", 140, 3), (v, "CLICK_APPLY", 6, 2)]
    if kind == "calc":
        return [(v, "VIEW", 55, 4), (c, "CALCULATE_EMI", 90, 3)]
    return [(v, "VIEW", 40, 5), (v, "VIEW", 50, 2)]


# (name, email, mobile, account, income, credit, product, journey, promo,
#  commits[(cat,desc,amt)], triggers[(cat,desc,amt,days_ago)], second "Product:kind")
PROFILES = [
    ("Aarav Mehta", "aarav.mehta@example.com", "+919876543210", "IDBI100892931", 95000, 780, "Auto Loan", "apply", True,
     [("RENT", "RENT TRANSFER / APARTMENT", 25000), ("SIP", "SIP DEBIT / HDFC MUTUAL FUND", 10000), ("UTILITY", "TATA POWER ELECTRICITY BILL", 3500)],
     [("SHOPPING", "MARUTI SUZUKI SHOWROOM BOOKING", 30000, 6), ("INSURANCE", "ICICI LOMBARD MOTORS INSURANCE", 18500, 9)], "Home Loan:calc"),

    ("Priya Sharma", "priya.sharma@example.com", "+919876543211", "IDBI100482932", 150000, 810, "Home Loan", "apply", True,
     [("RENT", "RENT DEBIT / SOCIETY BANK", 35000), ("EMI", "HDFC CAR LOAN AUTO EMI", 15000), ("SIP", "SIP DEBIT / NIPPON INDIA FUND", 20000), ("UTILITY", "ACT FIBERNET & GAS UTILITY", 8000)],
     [("SHOPPING", "IKEA FURNITURE MUMBAI IN", 65000, 12), ("RENT", "NOBROKER RENTAL DEPOSIT & BROKERAGE", 90000, 10)], "Personal Loan:calc"),

    ("Vikram Singh", "vikram.singh@example.com", "+919876543212", "IDBI100382933", 55000, 640, "Personal Loan", "calc", False,
     [("SIP", "SIP DEBIT / AXIS MUTUAL FUND", 5000), ("TRANSFER", "FAMILY TRANSFER", 15000), ("UTILITY", "PHONE & BROADBAND BILLS", 2200)],
     [("PENALTY", "IDBI CC BILL LATE FEE CHARGE", 1200, 8), ("PENALTY", "CHEQUE BOUNCE CHG", 500, 5), ("SHOPPING", "FLIPKART INTERNET DEBIT", 18000, 14)], None),

    ("Ananya Desai", "ananya.desai@example.com", "+919812300001", "IDBI200100001", 120000, 730, "Home Loan", "apply", False,
     [("SIP", "SIP DEBIT / SBI BLUECHIP FUND", 12000), ("UTILITY", "BESCOM ELECTRICITY BILL", 4000), ("RENT", "RENT TRANSFER / WHITEFIELD", 30000)],
     [("RENT", "NOBROKER RENTAL DEPOSIT", 80000, 7), ("SHOPPING", "ASIAN PAINTS HOME DECOR", 25000, 11)], "Auto Loan:view"),

    ("Rohan Kapoor", "rohan.kapoor@example.com", "+919812300002", "IDBI200100002", 180000, 800, "Auto Loan", "apply", True,
     [("SIP", "SIP DEBIT / PARAG PARIKH FUND", 18000), ("UTILITY", "TATA POWER & GAS BILL", 5000)],
     [("SHOPPING", "TATA MOTORS SHOWROOM BOOKING", 40000, 5), ("INSURANCE", "HDFC ERGO MOTORS INSURANCE", 22000, 9)], None),

    ("Sneha Reddy", "sneha.reddy@example.com", "+919812300003", "IDBI200100003", 85000, 760, "Personal Loan", "apply", False,
     [("SIP", "SIP DEBIT / MIRAE ASSET FUND", 8000), ("UTILITY", "TSSPDCL ELECTRICITY BILL", 3000), ("RENT", "RENT DEBIT / GACHIBOWLI", 20000)],
     [("SHOPPING", "TANISHQ JEWELLERS WEDDING", 120000, 6), ("SHOPPING", "BANQUET HALL BOOKING MARRIAGE", 45000, 10)], None),

    ("Karthik Nair", "karthik.nair@example.com", "+919812300004", "IDBI200100004", 250000, 790, "Mortgage Loan", "calc", True,
     [("SIP", "SIP DEBIT / AXIS BLUECHIP", 25000), ("UTILITY", "ADANI ELECTRICITY BILL", 7000)],
     [("SHOPPING", "PRESTIGE BUILDER PART PAYMENT", 150000, 8), ("SHOPPING", "ARCHITECT DESIGN CONSULTANCY FEE", 60000, 12)], None),

    ("Meera Joshi", "meera.joshi@example.com", "+919812300005", "IDBI200100005", 70000, 700, "Personal Loan", "apply", False,
     [("SIP", "SIP DEBIT / UTI NIFTY FUND", 5000), ("UTILITY", "MSEB ELECTRICITY BILL", 2500), ("RENT", "RENT DEBIT / KOTHRUD", 18000)],
     [("SHOPPING", "DPS SCHOOL TUITION FEE", 45000, 7), ("PENALTY", "OVERDRAFT INTEREST DEBIT", 800, 9)], None),

    ("Arjun Rao", "arjun.rao@example.com", "+919812300006", "IDBI200100006", 90000, 680, "Auto Loan", "calc", False,
     [("SIP", "SIP DEBIT / CANARA ROBECO", 7000), ("UTILITY", "BESCOM ELECTRICITY BILL", 3000), ("RENT", "RENT DEBIT / HSR LAYOUT", 22000)],
     [("SHOPPING", "HYUNDAI SHOWROOM VISIT BOOKING", 20000, 8)], None),

    ("Divya Menon", "divya.menon@example.com", "+919812300007", "IDBI200100007", 160000, 810, "Home Loan", "apply", True,
     [("SIP", "SIP DEBIT / QUANT ACTIVE FUND", 16000), ("UTILITY", "KSEB ELECTRICITY BILL", 6000)],
     [("SHOPPING", "IKEA FURNITURE & INTERIOR", 70000, 6), ("RENT", "HOUSING SOCIETY DEPOSIT BROKERAGE", 100000, 10)], "Mortgage Loan:calc"),

    ("Rahul Verma", "rahul.verma@example.com", "+919812300008", "IDBI200100008", 45000, 610, "Personal Loan", "view", False,
     [("UTILITY", "PVVNL ELECTRICITY BILL", 2000), ("TRANSFER", "FAMILY TRANSFER", 12000)],
     [("PENALTY", "CC BILL LATE FEE CHARGE", 1500, 5), ("PENALTY", "CHEQUE BOUNCE CHG", 500, 9), ("PENALTY", "OVERDRAFT PENALTY DEBIT", 700, 12)], None),

    ("Ishita Shah", "ishita.shah@example.com", "+919812300009", "IDBI200100009", 300000, 830, "Mortgage Loan", "apply", True,
     [("SIP", "SIP DEBIT / PPFAS FLEXICAP", 30000), ("UTILITY", "TORRENT POWER BILL", 8000)],
     [("SHOPPING", "PRESTIGE BUILDER PART PAYMENT", 200000, 7), ("SHOPPING", "INTERIOR DECOR ARCHITECT FEE", 80000, 11)], None),

    ("Aditya Kumar", "aditya.kumar@example.com", "+919812300010", "IDBI200100010", 110000, 750, "Auto Loan", "apply", False,
     [("SIP", "SIP DEBIT / ICICI PRU FUND", 10000), ("UTILITY", "BSES ELECTRICITY BILL", 4000), ("RENT", "RENT DEBIT / DWARKA", 25000)],
     [("SHOPPING", "MARUTI NEXA SHOWROOM BOOKING", 35000, 6), ("INSURANCE", "CAR SERVICE & INSURANCE RENEWAL", 12000, 10)], None),

    ("Pooja Iyer", "pooja.iyer@example.com", "+919812300011", "IDBI200100011", 95000, 730, "Home Loan", "calc", False,
     [("SIP", "SIP DEBIT / KOTAK EMERGING", 9000), ("UTILITY", "TANGEDCO ELECTRICITY BILL", 3500), ("RENT", "RENT DEBIT / ADYAR", 24000)],
     [("SHOPPING", "IKEA HOME DECOR PURCHASE", 40000, 9), ("RENT", "NOBROKER RENTAL DEPOSIT", 70000, 12)], None),

    ("Nikhil Gupta", "nikhil.gupta@example.com", "+919812300012", "IDBI200100012", 130000, 770, "Personal Loan", "apply", False,
     [("SIP", "SIP DEBIT / DSP MIDCAP", 12000), ("UTILITY", "BESCOM & GAS UTILITY", 4500), ("RENT", "RENT DEBIT / INDIRANAGAR", 28000)],
     [("SHOPPING", "KALYAN JEWELLERS WEDDING", 150000, 6), ("SHOPPING", "BANQUET MARRIAGE HALL ADVANCE", 60000, 11)], None),
]

# Historical closed leads for the A/B conversion-lift dashboard.
# (customer_name, product, status, cohort, disposable, emi, eligible)
HIST_SPEC = [
    ("Aarav Mehta", "Personal Loan", "Converted", "Treated", 65000, 32500, 1000000),
    ("Rohan Kapoor", "Home Loan", "Converted", "Treated", 140000, 70000, 6500000),
    ("Karthik Nair", "Auto Loan", "Converted", "Treated", 180000, 90000, 2200000),
    ("Divya Menon", "Personal Loan", "Converted", "Treated", 120000, 48000, 1500000),
    ("Ishita Shah", "Home Loan", "Converted", "Treated", 220000, 110000, 9000000),
    ("Aditya Kumar", "Home Loan", "Converted", "Treated", 78000, 31000, 3200000),
    ("Sneha Reddy", "Auto Loan", "Rejected", "Treated", 60000, 24000, 900000),
    ("Priya Sharma", "Mortgage Loan", "Converted", "Control", 72000, 36000, 3000000),
    ("Ananya Desai", "Personal Loan", "Rejected", "Control", 84000, 33000, 1200000),
    ("Meera Joshi", "Home Loan", "Rejected", "Control", 44000, 17000, 2100000),
    ("Arjun Rao", "Mortgage Loan", "Rejected", "Control", 55000, 22000, 1800000),
    ("Pooja Iyer", "Personal Loan", "Rejected", "Control", 60000, 24000, 1100000),
    ("Nikhil Gupta", "Home Loan", "Rejected", "Control", 82000, 32000, 4000000),
    ("Vikram Singh", "Auto Loan", "Rejected", "Control", 33000, 13200, 600000),
]


def seed_database():
    print("Initializing database tables...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        now = datetime.utcnow()
        print(f"Generating {len(PROFILES)} mock customer profiles + behavioral history...")

        cust_by_name = {}
        for name, email, mobile, acct, income, credit, *_ in PROFILES:
            c = Customer(name=name, email=email, mobile=mobile, account_number=acct,
                         gross_monthly_income=float(income), credit_score=credit)
            db.add(c)
            cust_by_name[name] = c
        db.commit()

        for name, email, mobile, acct, income, credit, product, journey, promo, commits, triggers, second in PROFILES:
            c = cust_by_name[name]
            # 90 days of salary + monthly commitments; the current month carries a
            # +25% promotion for "promo" profiles (income-surge life event).
            for i in range(3):
                m_date = now - timedelta(days=i * 30)
                sal = 1.25 if (i == 0 and promo) else 1.0
                db.add(Transaction(customer_id=c.id, amount=float(income) * sal, category="SALARY",
                                   description="IDBI SALARY CREDIT", timestamp=m_date.replace(day=1)))
                for j, (cat, desc, amt) in enumerate(commits):
                    db.add(Transaction(customer_id=c.id, amount=-float(amt), category=cat, description=desc,
                                       timestamp=m_date.replace(day=5 + j * 2)))
            for cat, desc, amt, days_ago in triggers:
                db.add(Transaction(customer_id=c.id, amount=-float(amt), category=cat, description=desc,
                                   timestamp=now - timedelta(days=days_ago)))
            # clickstream for the primary product journey + optional secondary browse
            clicks = journey_clicks(product, journey)
            if second:
                sp, sk = second.split(":")
                clicks += [(u, a, dur, ago + 1) for (u, a, dur, ago) in journey_clicks(sp, sk)]
            for url, action, dur, days_ago in clicks:
                db.add(ClickstreamEvent(customer_id=c.id, page_url=url, action=action,
                                        duration_seconds=dur, timestamp=now - timedelta(days=days_ago)))
        db.commit()

        # --- Evaluate twins once, then generate leads from that same output ---
        print("Evaluating intent and underwriting eligibility to seed the Lead Board...")
        customers = db.query(Customer).all()
        twin_by_cust = {}
        disposable_by_cust = {}
        for cust in customers:
            tx_list = [{"amount": t.amount, "category": t.category, "description": t.description, "timestamp": t.timestamp} for t in cust.transactions]
            click_list = [{"page_url": c.page_url, "action": c.action, "timestamp": c.timestamp} for c in cust.clickstream_events]
            disposable_by_cust[cust.id] = calculate_disposable_income(tx_list, cust.gross_monthly_income)["disposable_income"]
            twin_by_cust[cust.id] = evaluate_propensity_and_intent(click_list, tx_list, cust.credit_score)

        # Active (open) leads — Warm/Hot and cleared by the risk gate
        lead_counter = 0
        for cust in customers:
            disposable = disposable_by_cust[cust.id]
            for loan_type, p_data in twin_by_cust[cust.id].items():
                is_high_risk = p_data.get("risk_evaluation", {}).get("risk_tier") == "High Risk (Subprime)"
                if p_data["intent_level"] in ["Warm", "Hot"] and not is_high_risk:
                    eligibility = calculate_loan_eligibility(disposable, loan_type, cust.credit_score)
                    cohort = "Treated" if lead_counter % 2 == 0 else "Control"
                    lead_counter += 1
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

        # --- Historical closed leads for the A/B dashboard (computed scores) ---
        print("Seeding historical leads for A/B testing analytics...")
        for cname, loan_type, status_val, cohort, disp, emi, elig in HIST_SPEC:
            cust = cust_by_name[cname]
            t = twin_by_cust[cust.id][loan_type]
            db.add(Lead(
                customer_id=cust.id,
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
