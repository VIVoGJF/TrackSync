import type { DashboardTask } from '../api/dashboard';

export interface TypeBreakdown {
    completed: number;
    max: number;
    percent: number;
}

export interface GaugeBreakdown {
    overall: number;
    daily: TypeBreakdown;
    weekly: TypeBreakdown;
    deadline: TypeBreakdown;
}

function countCompletedBits(progress: string): number {
    let count = 0;
    for (const char of progress) {
        if (char === '1') count += 1;
    }
    return count;
}

function toBreakdown(completed: number, max: number): TypeBreakdown {
    return {
        completed,
        max,
        percent: max === 0 ? 0 : Math.round((completed / max) * 100),
    };
}

export function computeGaugeBreakdown(tasks: DashboardTask[]): GaugeBreakdown {
    let dailyCompleted = 0;
    let dailyMax = 0;
    let weeklyCompleted = 0;
    let weeklyMax = 0;
    let deadlineCompleted = 0;
    let deadlineMax = 0;

    for (const task of tasks) {
        if (task.task_type === 'DAILY') {
            dailyCompleted += countCompletedBits(task.progress);
            dailyMax += task.progress.length;
        } else if (task.task_type === 'WEEKLY') {
            weeklyCompleted += countCompletedBits(task.progress);
            weeklyMax += task.progress.length;
        } else {
            deadlineMax += 1;
            if (task.deadline.completed) deadlineCompleted += 1;
        }
    }

    const daily = toBreakdown(dailyCompleted, dailyMax);
    const weekly = toBreakdown(weeklyCompleted, weeklyMax);
    const deadline = toBreakdown(deadlineCompleted, deadlineMax);

    const totalCompleted = dailyCompleted + weeklyCompleted + deadlineCompleted;
    const totalMax = dailyMax + weeklyMax + deadlineMax;

    return {
        overall: totalMax === 0 ? 0 : Math.round((totalCompleted / totalMax) * 100),
        daily,
        weekly,
        deadline,
    };
}