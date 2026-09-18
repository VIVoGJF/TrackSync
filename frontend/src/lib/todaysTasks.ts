import type { DashboardTask } from '../api/dashboard';
import { getDayIndex, getWeekIndex, isDateInRange } from './dateIndex';

export interface TodaysTaskItem {
    taskId: string;
    title: string;
    taskType: 'DAILY' | 'WEEKLY' | 'DEADLINE';
    isDone: boolean;
}

function isTaskActiveToday(task: DashboardTask, todayStr: string): boolean {
    if (task.task_type === 'DEADLINE') {
        return isDateInRange(todayStr, task.deadline.start_date, task.deadline.deadline_date);
    }
    return task.active_period.some((period) => isDateInRange(todayStr, period.start_date, period.end_date));
}

export function getTodaysTasks(tasks: DashboardTask[], today: Date, todayStr: string): TodaysTaskItem[] {
    const items: TodaysTaskItem[] = [];

    for (const task of tasks) {
        if (!isTaskActiveToday(task, todayStr)) continue;

        if (task.task_type === 'DAILY') {
            const isDone = task.progress[getDayIndex(today)] === '1';
            items.push({ taskId: task.task_id, title: task.title, taskType: 'DAILY', isDone });
        } else if (task.task_type === 'WEEKLY') {
            const isDone = task.progress[getWeekIndex(today)] === '1';
            items.push({ taskId: task.task_id, title: task.title, taskType: 'WEEKLY', isDone });
        } else {
            items.push({ taskId: task.task_id, title: task.title, taskType: 'DEADLINE', isDone: task.deadline.completed });
        }
    }

    return items;
}