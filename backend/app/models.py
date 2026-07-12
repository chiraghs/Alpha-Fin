from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base

class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    mobile = Column(String, unique=True, index=True, nullable=False)
    account_number = Column(String, unique=True, index=True, nullable=False)
    gross_monthly_income = Column(Float, default=0.0)
    credit_score = Column(Integer, default=750)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    transactions = relationship("Transaction", back_populates="customer", cascade="all, delete-orphan")
    clickstream_events = relationship("ClickstreamEvent", back_populates="customer", cascade="all, delete-orphan")
    leads = relationship("Lead", back_populates="customer", cascade="all, delete-orphan")

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id", ondelete="CASCADE"), nullable=False)
    amount = Column(Float, nullable=False) # Positive = Inflow (Salary, etc.), Negative = Outflow (EMI, etc.)
    category = Column(String, nullable=False) # Salary, EMI, SIP, Utility, Shopping, Dining, etc.
    description = Column(String, nullable=False) # e.g. "SALARY CREDIT", "HDFC AUTO LOAN EMI"
    timestamp = Column(DateTime, default=datetime.utcnow)

    customer = relationship("Customer", back_populates="transactions")

class ClickstreamEvent(Base):
    __tablename__ = "clickstream_events"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id", ondelete="CASCADE"), nullable=False)
    page_url = Column(String, nullable=False) # "/auto-loan", "/home-loan", "/emi-calculator"
    action = Column(String, nullable=False) # "VIEW", "CALCULATE_EMI", "CLICK_APPLY"
    duration_seconds = Column(Integer, default=0)
    timestamp = Column(DateTime, default=datetime.utcnow)

    customer = relationship("Customer", back_populates="clickstream_events")

class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id", ondelete="CASCADE"), nullable=False)
    loan_type = Column(String, nullable=False) # "Auto Loan", "Home Loan", "Personal Loan", "Mortgage Loan"
    propensity_score = Column(Float, default=0.0) # 0.0 to 1.0
    intent_level = Column(String, default="Cold") # Cold, Warm, Hot
    calculated_disposable_income = Column(Float, default=0.0)
    max_eligible_emi = Column(Float, default=0.0)
    eligible_loan_amount = Column(Float, default=0.0)
    status = Column(String, default="New") # New, Contacted, Converted, Rejected
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    customer = relationship("Customer", back_populates="leads")
