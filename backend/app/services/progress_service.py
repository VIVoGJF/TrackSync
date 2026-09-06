from datetime import date

from app.db.models import TaskType
from app.services.calendar_service import get_days_in_month, get_weeks_in_month 


def initialize_status_string(task_type: TaskType, year: int, month: int) -> str:
    if task_type == TaskType.DAILY:
        length = get_days_in_month(year, month)

    elif task_type == TaskType.WEEKLY:
        length = get_weeks_in_month(year, month)

    else:
        raise ValueError("Deadline tasks do not use progress strings.")

    return "0" * length