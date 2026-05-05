"""
GoCardless Bank Account Data API client.

Free PSD2 aggregator covering most EU banks. Free tier limits: roughly
200 requests/day per account, consents valid 90 days max.

Docs: https://developer.gocardless.com/bank-account-data/

The client is intentionally thin — no SDK, just `httpx`. We only use the
endpoints we need: institutions list, requisition lifecycle, account
details and transactions.
"""
from __future__ import annotations

import logging
import threading
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

BASE_URL = "https://bankaccountdata.gocardless.com/api/v2"


class GoCardlessNotConfigured(RuntimeError):
    """Raised when secret_id / secret_key are missing from env."""


class GoCardlessError(RuntimeError):
    """Wraps non-2xx responses from GoCardless with the body for visibility."""

    def __init__(self, status_code: int, body: Any):
        super().__init__(f"GoCardless {status_code}: {body}")
        self.status_code = status_code
        self.body = body


class _TokenCache:
    """Process-wide cache for the GoCardless access token (24h lifetime).

    A simple lock guards refreshes so concurrent requests don't all hit the
    /token/new endpoint simultaneously.
    """

    def __init__(self) -> None:
        self._access: Optional[str] = None
        self._access_expires: Optional[datetime] = None
        self._refresh: Optional[str] = None
        self._refresh_expires: Optional[datetime] = None
        self._lock = threading.Lock()

    def get(self) -> str:
        with self._lock:
            now = datetime.now(timezone.utc)
            # Refresh 60s before expiry to dodge clock skew
            if self._access and self._access_expires and self._access_expires - timedelta(seconds=60) > now:
                return self._access
            if self._refresh and self._refresh_expires and self._refresh_expires - timedelta(seconds=60) > now:
                self._refresh_token()
            else:
                self._fetch_new()
            return self._access  # type: ignore[return-value]

    def reset(self) -> None:
        with self._lock:
            self._access = None
            self._access_expires = None
            self._refresh = None
            self._refresh_expires = None

    def _ensure_creds(self) -> tuple[str, str]:
        sid = settings.GOCARDLESS_SECRET_ID
        skey = settings.GOCARDLESS_SECRET_KEY
        if not sid or not skey:
            raise GoCardlessNotConfigured(
                "GOCARDLESS_SECRET_ID / GOCARDLESS_SECRET_KEY are not set"
            )
        return sid, skey

    def _fetch_new(self) -> None:
        sid, skey = self._ensure_creds()
        with httpx.Client(timeout=20.0) as client:
            resp = client.post(
                f"{BASE_URL}/token/new/",
                json={"secret_id": sid, "secret_key": skey},
                headers={"Accept": "application/json"},
            )
        _raise_for_status(resp)
        data = resp.json()
        now = datetime.now(timezone.utc)
        self._access = data["access"]
        self._access_expires = now + timedelta(seconds=int(data.get("access_expires", 86400)))
        self._refresh = data.get("refresh")
        self._refresh_expires = (
            now + timedelta(seconds=int(data["refresh_expires"]))
            if data.get("refresh_expires")
            else None
        )

    def _refresh_token(self) -> None:
        with httpx.Client(timeout=20.0) as client:
            resp = client.post(
                f"{BASE_URL}/token/refresh/",
                json={"refresh": self._refresh},
                headers={"Accept": "application/json"},
            )
        if resp.status_code >= 400:
            # Refresh failed → fall back to a fresh /token/new
            logger.warning("[gocardless] refresh failed, fetching new token: %s", resp.text)
            self._fetch_new()
            return
        data = resp.json()
        now = datetime.now(timezone.utc)
        self._access = data["access"]
        self._access_expires = now + timedelta(seconds=int(data.get("access_expires", 86400)))


_token_cache = _TokenCache()


def _raise_for_status(resp: httpx.Response) -> None:
    if resp.status_code >= 400:
        try:
            body = resp.json()
        except Exception:
            body = resp.text
        raise GoCardlessError(resp.status_code, body)


def _headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {_token_cache.get()}",
        "Accept": "application/json",
    }


def _request(method: str, path: str, **kwargs: Any) -> Any:
    url = f"{BASE_URL}{path}"
    with httpx.Client(timeout=30.0) as client:
        resp = client.request(method, url, headers=_headers(), **kwargs)
    _raise_for_status(resp)
    if resp.status_code == 204:
        return None
    return resp.json()


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def is_configured() -> bool:
    return bool(settings.GOCARDLESS_SECRET_ID and settings.GOCARDLESS_SECRET_KEY)


def list_institutions(country: str = "FR") -> list[dict]:
    """List banks supported in a country (ISO-2 code)."""
    return _request("GET", f"/institutions/?country={country.upper()}")


def get_institution(institution_id: str) -> dict:
    return _request("GET", f"/institutions/{institution_id}/")


def create_agreement(
    institution_id: str,
    max_historical_days: int | None = None,
    access_valid_days: int | None = None,
) -> dict:
    """Create an end-user agreement controlling consent length and scope.

    Without one, GoCardless uses defaults that are stricter than what's
    available — typically 90 days history but only 30 days access. We
    explicitly ask for 90/90.
    """
    payload = {
        "institution_id": institution_id,
        "max_historical_days": str(max_historical_days or settings.GOCARDLESS_HISTORICAL_DAYS),
        "access_valid_for_days": str(access_valid_days or settings.GOCARDLESS_ACCESS_VALID_DAYS),
        "access_scope": ["balances", "details", "transactions"],
    }
    return _request("POST", "/agreements/enduser/", json=payload)


def create_requisition(
    institution_id: str,
    redirect_uri: str,
    reference: str,
    agreement_id: str | None = None,
    user_language: str = "FR",
) -> dict:
    """Start a bank link flow. Returns {id, link, ...}; redirect the user to `link`."""
    payload = {
        "redirect": redirect_uri,
        "institution_id": institution_id,
        "reference": reference,
        "user_language": user_language,
    }
    if agreement_id:
        payload["agreement"] = agreement_id
    return _request("POST", "/requisitions/", json=payload)


def get_requisition(requisition_id: str) -> dict:
    return _request("GET", f"/requisitions/{requisition_id}/")


def delete_requisition(requisition_id: str) -> None:
    _request("DELETE", f"/requisitions/{requisition_id}/")


def get_account_details(account_id: str) -> dict:
    """Returns IBAN, currency, owner name etc. Wrapped in {"account": {...}}."""
    return _request("GET", f"/accounts/{account_id}/details/")


def get_account_metadata(account_id: str) -> dict:
    """Provider-side metadata (status, institution_id, last_accessed)."""
    return _request("GET", f"/accounts/{account_id}/")


def get_transactions(account_id: str, date_from: str | None = None, date_to: str | None = None) -> dict:
    """Returns {"transactions": {"booked": [...], "pending": [...]}}.

    Dates are ISO yyyy-mm-dd. If omitted, GoCardless returns the full window
    granted by the agreement.
    """
    params: dict[str, str] = {}
    if date_from:
        params["date_from"] = date_from
    if date_to:
        params["date_to"] = date_to
    return _request("GET", f"/accounts/{account_id}/transactions/", params=params)


# Status code → human label, for UI surfacing
STATUS_LABELS = {
    "CR": "En attente",        # Created, awaiting auth
    "GC": "En attente",        # Giving consent
    "UA": "En cours",          # Undergoing authentication
    "RJ": "Refusée",           # Rejected
    "SA": "En cours",          # Selecting accounts
    "GA": "En cours",          # Granting access
    "LN": "Liée",              # Linked — ready to sync
    "SU": "Suspendue",         # Suspended
    "EX": "Expirée",           # Expired
    "ER": "Erreur",
}
