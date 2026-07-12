from datetime import datetime
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from ..models import Customer, Transaction, ClickstreamEvent
from .base import BaseBankingAdapter

class MockBankingAdapter(BaseBankingAdapter):
    """
    Mock implementation of BaseBankingAdapter.
    Queries the local SQLite database to simulate core banking integration.
    """

    def __init__(self, db: Session):
        self.db = db

    async def get_customer_profile(self, account_number: str) -> Dict[str, Any]:
        customer = self.db.query(Customer).filter(Customer.account_number == account_number).first()
        if not customer:
            raise ValueError(f"Customer with account {account_number} not found.")
        
        return {
            "customer_id": customer.id,
            "name": customer.name,
            "email": customer.email,
            "mobile": customer.mobile,
            "account_number": customer.account_number,
            "gross_monthly_income": customer.gross_monthly_income,
            "credit_score": customer.credit_score
        }

    async def fetch_transactions(self, account_number: str, start_date: datetime, end_date: datetime) -> List[Dict[str, Any]]:
        customer = self.db.query(Customer).filter(Customer.account_number == account_number).first()
        if not customer:
            raise ValueError(f"Customer with account {account_number} not found.")

        query = self.db.query(Transaction).filter(
            Transaction.customer_id == customer.id
        )
        if start_date:
            query = query.filter(Transaction.timestamp >= start_date)
        if end_date:
            query = query.filter(Transaction.timestamp <= end_date)

        transactions = query.all()
        return [
            {
                "id": t.id,
                "amount": t.amount,
                "category": t.category,
                "description": t.description,
                "timestamp": t.timestamp
            } for t in transactions
        ]

    async def log_behavior_event(self, customer_id: int, page_url: str, action: str, duration_seconds: int) -> Dict[str, Any]:
        event = ClickstreamEvent(
            customer_id=customer_id,
            page_url=page_url,
            action=action,
            duration_seconds=duration_seconds,
            timestamp=datetime.utcnow()
        )
        self.db.add(event)
        self.db.commit()
        self.db.refresh(event)

        return {
            "id": event.id,
            "customer_id": event.customer_id,
            "page_url": event.page_url,
            "action": event.action,
            "duration_seconds": event.duration_seconds,
            "timestamp": event.timestamp
        }
