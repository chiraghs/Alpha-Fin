from abc import ABC, abstractmethod
from datetime import datetime
from typing import List, Dict, Any

class BaseBankingAdapter(ABC):
    """
    Abstract Base Class for Core Banking / Sandbox API integrations.
    Any custom adapters (e.g. IDBI Sandbox API, local mock, synthetic database)
    must implement these methods.
    """

    @abstractmethod
    async def get_customer_profile(self, account_number: str) -> Dict[str, Any]:
        """
        Retrieves basic profile information for a customer using their account number.
        """
        pass

    @abstractmethod
    async def fetch_transactions(self, account_number: str, start_date: datetime, end_date: datetime) -> List[Dict[str, Any]]:
        """
        Fetches historical transaction logs for a specific account.
        """
        pass

    @abstractmethod
    async def log_behavior_event(self, customer_id: int, page_url: str, action: str, duration_seconds: int) -> Dict[str, Any]:
        """
        Logs a user clickstream or behavioral event to the banking system.
        """
        pass
