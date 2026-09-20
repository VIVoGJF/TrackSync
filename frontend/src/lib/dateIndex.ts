export function toLocalDateString(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}


export function getDayIndex(date: Date): number {
    return date.getDate() - 1;
}


export function getWeekIndex(date: Date): number {
    const year = date.getFullYear();
    const month = date.getMonth(); // 0-indexed
    const firstWeekdaySunday = new Date(year, month, 1).getDay();
    const firstWeekdayMonday = (firstWeekdaySunday + 6) % 7;
    return Math.floor((date.getDate() - 1 + firstWeekdayMonday) / 7);
}

export function isDateInRange(dateStr: string, start: string, end: string | null): boolean {
    if (dateStr < start) return false;
    if (end !== null && dateStr > end) return false;
    return true;
}