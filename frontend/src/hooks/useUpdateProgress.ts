import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateProgress } from '../api/progress';
import type { DashboardActivity, DashboardResponse, DashboardTask } from '../api/dashboard';
import type { YearlyActivityResponse } from '../api/dashboard';
import { getDayIndex, getWeekIndex, toLocalDateString } from '../lib/dateIndex';

function flipBit(str: string, index: number): string {
    const next = str[index] === '1' ? '0' : '1';
    return str.slice(0, index) + next + str.slice(index + 1);
}

function isTaskDone(task: DashboardTask, today: Date): boolean {
    if (task.task_type === 'DEADLINE') return task.deadline.completed;
    const index = task.task_type === 'DAILY' ? getDayIndex(today) : getWeekIndex(today);
    return task.progress[index] === '1';
}

function patchTask(task: DashboardTask, today: Date): DashboardTask {
    const todayStr = toLocalDateString(today);

    if (task.task_type === 'DEADLINE') {
        const completed = !task.deadline.completed;

        return {
            ...task,
            deadline: {
                ...task.deadline,
                completed,
                completion_date: completed ? todayStr : null,
            },
        };
    }

    if (task.task_type === 'WEEKLY') {
        const index = getWeekIndex(today);

        const completedToday = task.weekly_completions.some(
            (completion) => completion.completion_date === todayStr,
        );

        return {
            ...task,
            progress: flipBit(task.progress, index),
            weekly_completions: completedToday
                ? task.weekly_completions.filter(
                    (completion) =>
                        completion.completion_date !== todayStr,
                )
                : [
                    ...task.weekly_completions,
                    {
                        week: index,
                        completion_date: todayStr,
                    },
                ],
        };
    }

    const index = getDayIndex(today);

    return {
        ...task,
        progress: flipBit(task.progress, index),
    };
}

function bumpActivity(activity: DashboardActivity[], dateStr: string, delta: number): DashboardActivity[] {
    const existing = activity.find((a) => a.date === dateStr);
    if (existing) {
        return activity.map((a) => (a.date === dateStr ? { ...a, count: Math.max(0, a.count + delta) } : a));
    }
    if (delta <= 0) return activity; // nothing to remove from a day with no entry
    return [...activity, { date: dateStr, count: delta }];
}

interface MutationContext {
    previousDashboard?: DashboardResponse;
    previousActivity?: YearlyActivityResponse;
}

/**
 * Shared across Home and Dashboard — both read/write the exact same cache
 * entries (['dashboard', year, month] and ['activity']), so a toggle from
 * either screen keeps them in sync automatically.
 *
 * NOTE: this does not update a WEEKLY task's `weekly_completions` array
 * (the exact day a week was completed on, used for placing the green cell
 * correctly on the Dashboard's per-task grid). It only flips the progress
 * bit. Fine for the gauge/today's-list on Home, but needs addressing
 * before the Dashboard grid renders weekly rows.
 */
export function useUpdateProgress() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (taskId: string) => {
            const todayStr = toLocalDateString(new Date());
            return updateProgress(taskId, todayStr);
        },

        onMutate: async (taskId: string) => {
            const today = new Date();
            const todayStr = toLocalDateString(today);
            const year = today.getFullYear();
            const month = today.getMonth() + 1;
            const dashboardKey = ['dashboard', year, month];
            const activityKey = ['activity'];

            await queryClient.cancelQueries({ queryKey: dashboardKey });
            await queryClient.cancelQueries({ queryKey: activityKey });

            const previousDashboard = queryClient.getQueryData<DashboardResponse>(dashboardKey);
            const previousActivity = queryClient.getQueryData<YearlyActivityResponse>(activityKey);

            if (previousDashboard) {
                const targetTask = previousDashboard.tasks.find((t) => t.task_id === taskId);
                const delta = targetTask && isTaskDone(targetTask, today) ? -1 : 1;

                queryClient.setQueryData<DashboardResponse>(dashboardKey, {
                    ...previousDashboard,
                    tasks: previousDashboard.tasks.map((t) => (t.task_id === taskId ? patchTask(t, today) : t)),
                    activity: bumpActivity(previousDashboard.activity, todayStr, delta),
                });

                if (previousActivity) {
                    queryClient.setQueryData<YearlyActivityResponse>(activityKey, {
                        activity: bumpActivity(previousActivity.activity, todayStr, delta),
                    });
                }
            }

            return { previousDashboard, previousActivity } satisfies MutationContext;
        },

        onError: (_err, _taskId, context) => {
            const today = new Date();
            const year = today.getFullYear();
            const month = today.getMonth() + 1;

            if (context?.previousDashboard) {
                queryClient.setQueryData(['dashboard', year, month], context.previousDashboard);
            }
            if (context?.previousActivity) {
                queryClient.setQueryData(['activity'], context.previousActivity);
            }
        },
    });
}