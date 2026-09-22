import type {
    DashboardActivity,
    DashboardTask,
} from '../api/dashboard';
import { getWeekIndex } from './dateIndex';

export interface WeeklyContribution {
    week: number;
    completed: number;
}

export interface DashboardStats {
    activeDays: number;
    currentStreak: number;
    maxStreak: number;
    averageTasksPerDay: number;
    weeklyContribution: WeeklyContribution[];
}

function getDaysInMonth(year: number, month: number): number {
    return new Date(year, month, 0).getDate();
}

function getWeeksInMonth(year: number, month: number): number {
    const firstDay = new Date(year, month - 1, 1);
    const daysInMonth = getDaysInMonth(year, month);
    const firstWeekdayMonday = (firstDay.getDay() + 6) % 7;

    return Math.ceil((firstWeekdayMonday + daysInMonth) / 7);
}

function getDateString(year: number, month: number, day: number): string {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getActiveDateSet(activity: DashboardActivity[]): Set<string> {
    return new Set(
        activity
            .filter((item) => item.count > 0)
            .map((item) => item.date),
    );
}

function getMaxStreak(activeDates: Set<string>, year: number, month: number): number {
    const daysInMonth = getDaysInMonth(year, month);
    let maxStreak = 0;
    let currentStreak = 0;

    for (let day = 1; day <= daysInMonth; day += 1) {
        const dateString = getDateString(year, month, day);

        if (activeDates.has(dateString)) {
            currentStreak += 1;
            maxStreak = Math.max(maxStreak, currentStreak);
        } else {
            currentStreak = 0;
        }
    }

    return maxStreak;
}

function getCurrentStreak(activeDates: Set<string>): number {
    if (activeDates.size === 0) {
        return 0;
    }

    const sortedDates = Array.from(activeDates).sort();

    let currentStreak = 1;

    for (let index = sortedDates.length - 1; index > 0; index -= 1) {
        const current = new Date(`${sortedDates[index]}T00:00:00`);
        const previous = new Date(`${sortedDates[index - 1]}T00:00:00`);

        const differenceInDays =
            (current.getTime() - previous.getTime()) /
            (1000 * 60 * 60 * 24);

        if (differenceInDays !== 1) {
            break;
        }

        currentStreak += 1;
    }

    return currentStreak;
}

function countDailyCompletions(task: Extract<DashboardTask, { task_type: 'DAILY' }>): number {
    let count = 0;

    for (const status of task.progress) {
        if (status === '1') {
            count += 1;
        }
    }

    return count;
}

function countWeeklyCompletions(task: Extract<DashboardTask, { task_type: 'WEEKLY' }>): number {
    return task.weekly_completions.length;
}

function countDeadlineCompletion(task: Extract<DashboardTask, { task_type: 'DEADLINE' }>): number {
    return task.deadline.completed ? 1 : 0;
}

function getTotalCompletionEvents(tasks: DashboardTask[]): number {
    let total = 0;

    for (const task of tasks) {
        if (task.task_type === 'DAILY') {
            total += countDailyCompletions(task);
        } else if (task.task_type === 'WEEKLY') {
            total += countWeeklyCompletions(task);
        } else {
            total += countDeadlineCompletion(task);
        }
    }

    return total;
}

function getWeeklyContribution(tasks: DashboardTask[], year: number, month: number): WeeklyContribution[] {
    const weekCount = getWeeksInMonth(year, month);

    const contribution = Array.from(
        { length: weekCount },
        (_, index) => ({
            week: index + 1,
            completed: 0,
        }),
    );

    for (const task of tasks) {
        if (task.task_type === 'DAILY') {
            for (let dayIndex = 0; dayIndex < task.progress.length; dayIndex += 1) {
                if (task.progress[dayIndex] !== '1') {
                    continue;
                }

                const day = dayIndex + 1;
                const date = new Date(year, month - 1, day);
                const weekIndex = getWeekIndex(date);

                if (contribution[weekIndex]) {
                    contribution[weekIndex].completed += 1;
                }
            }
        } else if (task.task_type === 'WEEKLY') {
            for (const completion of task.weekly_completions) {
                const weekIndex = completion.week - 1;

                if (contribution[weekIndex]) {
                    contribution[weekIndex].completed += 1;
                }
            }
        } else if (
            task.deadline.completed &&
            task.deadline.completion_date
        ) {
            const completionDate = new Date(
                `${task.deadline.completion_date.slice(0, 10)}T00:00:00`,
            );

            if (
                completionDate.getFullYear() === year &&
                completionDate.getMonth() + 1 === month
            ) {
                const weekIndex = getWeekIndex(completionDate);

                if (contribution[weekIndex]) {
                    contribution[weekIndex].completed += 1;
                }
            }
        }
    }

    return contribution;
}

export function computeDashboardStats(
    tasks: DashboardTask[],
    activity: DashboardActivity[],
    year: number,
    month: number,
): DashboardStats {
    const activeDates = getActiveDateSet(activity);

    const activeDays = activeDates.size;

    const currentStreak = getCurrentStreak(activeDates);

    const maxStreak = getMaxStreak(
        activeDates,
        year,
        month,
    );

    const totalCompletionEvents = getTotalCompletionEvents(tasks);

    const averageTasksPerDay =
        activeDays === 0
            ? 0
            : Number((totalCompletionEvents / activeDays).toFixed(2));

    const weeklyContribution = getWeeklyContribution(
        tasks,
        year,
        month,
    );

    return {
        activeDays,
        currentStreak,
        maxStreak,
        averageTasksPerDay,
        weeklyContribution,
    };
}