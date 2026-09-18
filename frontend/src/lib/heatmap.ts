import type { DashboardActivity } from '../api/dashboard';

// Fixed thresholds — tune these once you've seen real usage data.
// Index i means "count >= this value maps to level i+1".
const LEVEL_THRESHOLDS = [1, 2, 4, 6];

export function countToLevel(count: number): number {
    if (count <= 0) return 0;
    let level = 0;
    for (const threshold of LEVEL_THRESHOLDS) {
        if (count >= threshold) level += 1;
    }
    return Math.min(level, 4);
}

export interface HeatmapDay {
    date: string | null; // null = outside the tracked window entirely (not just zero activity)
    level: number;        // 0–4
}

export interface MonthBlock {
    label: string;           // 'Sep', 'Oct', ...
    columns: HeatmapDay[][]; // columns[col][row], row 0 = Sunday (matches GitHub/LeetCode convention)
}

export interface HeatmapStats {
    totalCount: number;
    totalActiveDays: number;
}

export function getHeatmapStats(activity: DashboardActivity[]): HeatmapStats {
    let totalCount = 0;
    let totalActiveDays = 0;
    for (const entry of activity) {
        totalCount += entry.count;
        if (entry.count > 0) totalActiveDays += 1;
    }
    return { totalCount, totalActiveDays };
}

// How many weekday-columns a given month needs. Not always the same number —
// a month starting near the end of a week needs an extra column to fit every day.
function getMonthColumns(year: number, month: number): number {
    const firstWeekday = new Date(year, month - 1, 1).getDay(); // 0=Sun..6=Sat
    const daysInMonth = new Date(year, month, 0).getDate();
    return Math.ceil((firstWeekday + daysInMonth) / 7);
}

function getCellPosition(year: number, month: number, day: number): { col: number; row: number } {
    const firstWeekday = new Date(year, month - 1, 1).getDay();
    const offset = firstWeekday + day - 1;
    return { col: Math.floor(offset / 7), row: offset % 7 };
}

function toDateKey(year: number, month: number, day: number): string {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Builds one mini-grid per calendar month between start and end (inclusive),
 * each independently sized and aligned — not one continuous 7xN grid like
 * GitHub's, but per-month blocks like LeetCode's, matching real week
 * boundaries so a month can start mid-week with leading gaps.
 */
export function buildHeatmapGrid(
    activity: DashboardActivity[],
    start: string,
    end: string
): MonthBlock[] {
    const activityMap = new Map(activity.map((a) => [a.date, a.count]));

    // Parse as local dates, not UTC — a plain "YYYY-MM-DD" string passed to
    // `new Date()` directly gets parsed as UTC midnight, which can land on
    // the wrong local day. Splitting and constructing manually avoids that.
    const [startYear, startMonth, startDay] = start.split('-').map(Number);
    const [endYear, endMonth, endDay] = end.split('-').map(Number);
    const startDate = new Date(startYear, startMonth - 1, startDay);
    const endDate = new Date(endYear, endMonth - 1, endDay);

    const blocks: MonthBlock[] = [];
    let cursorYear = startDate.getFullYear();
    let cursorMonth = startDate.getMonth() + 1; // 1-indexed

    while (
        cursorYear < endDate.getFullYear() ||
        (cursorYear === endDate.getFullYear() && cursorMonth <= endDate.getMonth() + 1)
    ) {
        const daysInMonth = new Date(cursorYear, cursorMonth, 0).getDate();
        const columnCount = getMonthColumns(cursorYear, cursorMonth);

        const columns: HeatmapDay[][] = Array.from({ length: columnCount }, () =>
            Array.from({ length: 7 }, () => ({ date: null, level: 0 }))
        );

        for (let day = 1; day <= daysInMonth; day++) {
            const thisDate = new Date(cursorYear, cursorMonth - 1, day);
            if (thisDate < startDate || thisDate > endDate) continue; // outside tracked window

            const dateKey = toDateKey(cursorYear, cursorMonth, day);
            const { col, row } = getCellPosition(cursorYear, cursorMonth, day);
            const count = activityMap.get(dateKey) ?? 0;
            columns[col][row] = { date: dateKey, level: countToLevel(count) };
        }

        const label = new Date(cursorYear, cursorMonth - 1, 1).toLocaleString('en-US', { month: 'short' });
        const trimmed = columns.filter((col) => col.some((d) => d.date !== null));
        blocks.push({ label, columns: trimmed });

        cursorMonth += 1;
        if (cursorMonth > 12) {
            cursorMonth = 1;
            cursorYear += 1;
        }
    }

    return blocks;
}