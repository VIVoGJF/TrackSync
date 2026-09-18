import './MiniCalendar.css';

const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function MiniCalendar() {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const todayDate = today.getDate();

    const monthLabel = today.toLocaleString('en-US', { month: 'long' });
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: (number | null)[] = [
        ...Array.from({ length: firstWeekday }, () => null),
        ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];

    return (
        <div className="mini-calendar">
            <h3 className="mini-calendar-month">{monthLabel}</h3>
            <div className="mini-calendar-grid">
                {WEEKDAY_LABELS.map((label) => (
                    <span key={label} className="mini-calendar-weekday">
                        {label}
                    </span>
                ))}
                {cells.map((day, i) =>
                    day === null ? (
                        <span key={`blank-${i}`} />
                    ) : (
                        <span key={day} className={day === todayDate ? 'mini-calendar-day mini-calendar-day-today' : 'mini-calendar-day'}>
                            {day}
                        </span>
                    )
                )}
            </div>
        </div>
    );
}