import type { DashboardTask } from '../api/dashboard';
import { getDayIndex, getWeekIndex, isDateInRange } from './dateIndex';

export interface TaskBoardItem {
    taskId: string;
    title: string;
    taskType: 'DAILY' | 'WEEKLY' | 'DEADLINE';
    isDone: boolean;
    deadlineDate?: string;
}

function isTaskActiveToday(task: DashboardTask, todayStr: string): boolean {
    if (task.task_type === 'DEADLINE') {
        return isDateInRange(todayStr, task.deadline.start_date, task.deadline.deadline_date);
    }
    return task.active_period.some((period) => isDateInRange(todayStr, period.start_date, period.end_date));
}

const TYPE_ORDER: Record<TaskBoardItem['taskType'], number> = {
    DAILY: 0,
    WEEKLY: 1,
    DEADLINE: 2,
};

export function formatShortDate(dateStr: string): string {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function getTasksBoardItems(tasks: DashboardTask[], today: Date, todayStr: string): TaskBoardItem[] {
    const items: TaskBoardItem[] = [];

    for (const task of tasks) {
        if (!isTaskActiveToday(task, todayStr)) continue;

        if (task.task_type === 'DAILY') {
            const isDone = task.progress[getDayIndex(today)] === '1';
            items.push({ taskId: task.task_id, title: task.title, taskType: 'DAILY', isDone });
        } else if (task.task_type === 'WEEKLY') {
            const isDone = task.progress[getWeekIndex(today)] === '1';
            items.push({ taskId: task.task_id, title: task.title, taskType: 'WEEKLY', isDone });
        } else {
            items.push({ taskId: task.task_id, title: task.title, taskType: 'DEADLINE', isDone: task.deadline.completed, deadlineDate: task.deadline.deadline_date, });
        }
    }

    // Stable sort: within each type, tasks keep whatever order the backend sent them in.
    return items.sort((a, b) => TYPE_ORDER[a.taskType] - TYPE_ORDER[b.taskType]);
}