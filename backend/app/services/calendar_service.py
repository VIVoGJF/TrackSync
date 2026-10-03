import calendar
from datetime import date, timedelta


def get_week_start(day: date) -> date:
    return day - timedelta(days=day.weekday())


def get_week_end(day: date) -> date:
    return day + timedelta(days=6 - day.weekday())

def is_continuation_week(day: date) -> bool:
    week_start = get_week_start(day)
    return week_start.month != day.month

def get_days_in_month(year: int, month: int) -> int:
    return calendar.monthrange(year, month)[1]


def get_weeks_in_month(year: int, month: int) -> int:
    weeks = calendar.monthcalendar(year, month)

    return len(weeks)