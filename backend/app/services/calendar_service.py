import calendar


def get_days_in_month(year: int, month: int) -> int:
    return calendar.monthrange(year, month)[1]


def get_weeks_in_month(year: int, month: int) -> int:
    weeks = calendar.monthcalendar(year, month)

    return len(weeks)