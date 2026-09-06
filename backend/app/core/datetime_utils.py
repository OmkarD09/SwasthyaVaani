from datetime import datetime, timezone
from typing import Optional, Union


def utcnow() -> datetime:
    """Return the current datetime with timezone set to UTC."""
    return datetime.now(timezone.utc)


def ensure_utc(v: Union[datetime, str, None]) -> Optional[datetime]:
    """
    Ensure the datetime or ISO string is converted to a timezone-aware UTC datetime.
    If the datetime is naive (no tzinfo), UTC is assigned.
    If it has another timezone offset, it is converted to UTC.
    """
    if v is None:
        return None
    if isinstance(v, str):
        cleaned = v.strip()
        if not cleaned:
            return None
        if cleaned.endswith("Z") or cleaned.endswith("z"):
            cleaned = cleaned[:-1] + "+00:00"
        dt = datetime.fromisoformat(cleaned)
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    if isinstance(v, datetime):
        if v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)
        return v.astimezone(timezone.utc)
    return v


def ensure_utc_iso(v: Union[datetime, str, None]) -> Optional[str]:
    """
    Ensure the datetime or ISO string is converted to an ISO-8601 string with UTC indicator (+00:00).
    """
    dt = ensure_utc(v)
    if dt is None:
        return None
    return dt.isoformat()
