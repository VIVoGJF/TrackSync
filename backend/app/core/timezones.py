from datetime import date, datetime
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from app.db.models import User


def is_valid_timezone(tz: str) -> bool:
    try:
        ZoneInfo(tz)
        return True
    except (ZoneInfoNotFoundError, TypeError, ValueError):
        return False


def get_user_today(user: User) -> date:

    try:
        zone = ZoneInfo(user.timezone)
    except (ZoneInfoNotFoundError, TypeError, ValueError):
        zone = ZoneInfo("UTC")

    return datetime.now(zone).date()