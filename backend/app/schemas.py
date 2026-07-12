from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import List, Optional

# --- Transaction Schemas ---
class TransactionBase(BaseModel):
    amount: float
    category: str
    description: str
    timestamp: Optional[datetime] = None

class TransactionCreate(TransactionBase):
    customer_id: int

class Transaction(TransactionBase):
    id: int
    customer_id: int

    class Config:
        from_attributes = True

# --- Clickstream Event Schemas ---
class ClickstreamEventBase(BaseModel):
    page_url: str
    action: str
    duration_seconds: Optional[int] = 0
    timestamp: Optional[datetime] = None

class ClickstreamEventCreate(ClickstreamEventBase):
    customer_id: int

class ClickstreamEvent(ClickstreamEventBase):
    id: int
    customer_id: int

    class Config:
        from_attributes = True

# --- Customer Schemas ---
class CustomerBase(BaseModel):
    name: str
    email: EmailStr
    mobile: str
    account_number: str
    gross_monthly_income: float
    credit_score: int

class CustomerCreate(CustomerBase):
    pass

class Customer(CustomerBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class CustomerDetail(Customer):
    transactions: List[Transaction] = []
    clickstream_events: List[ClickstreamEvent] = []

    class Config:
        from_attributes = True

# --- Lead Schemas ---
class LeadBase(BaseModel):
    loan_type: str
    propensity_score: float
    intent_level: str
    calculated_disposable_income: float
    max_eligible_emi: float
    eligible_loan_amount: float
    status: str
    cohort: str

class LeadCreate(LeadBase):
    customer_id: int

class FinancialTwinSchema(BaseModel):
    repayment_capacity: float
    intent_score: float
    financial_discipline: float
    spending_stability: float
    income_confidence: float
    offer_acceptance: float
    lead_score: float

class LeadResponse(LeadBase):
    id: int
    customer_id: int
    customer: Customer
    last_updated: datetime
    financial_twin: Optional[FinancialTwinSchema] = None

    class Config:
        from_attributes = True

# --- Outreach Schema ---
class OutreachGenerateRequest(BaseModel):
    lead_id: int
    channel: str # "whatsapp", "email", "call_script"

class OutreachGenerateResponse(BaseModel):
    lead_id: int
    channel: str
    content: str
