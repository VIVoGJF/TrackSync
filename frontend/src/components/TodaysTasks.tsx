import type { TodaysTaskItem } from '../lib/todaysTasks';
import { useUpdateProgress } from '../hooks/useUpdateProgress';
import './TodaysTasks.css';

interface TodaysTasksProps {
    items: TodaysTaskItem[];
}

const TYPE_LABELS: Record<TodaysTaskItem['taskType'], string> = {
    DAILY: 'Daily',
    WEEKLY: 'Weekly',
    DEADLINE: 'Deadline',
};

export function TodaysTasks({ items }: TodaysTasksProps) {
    const toggleMutation = useUpdateProgress();

    if (items.length === 0) {
        return (
            <div className="todays-tasks">
                <h3 className="todays-tasks-heading">Today's tasks</h3>
                <p className="todays-tasks-empty">Nothing scheduled for today.</p>
            </div>
        );
    }

    return (
        <div className="todays-tasks">
            <h3 className="todays-tasks-heading">Today's tasks</h3>
            <ul className="todays-tasks-list">
                {items.map((item) => {
                    const isPendingThisTask =
                        toggleMutation.isPending && toggleMutation.variables === item.taskId;

                    return (
                        <li className="todays-task-row" key={item.taskId}>
                            <span className="todays-task-type">{TYPE_LABELS[item.taskType]}</span>
                            <span className="todays-task-title">{item.title}</span>
                            <button
                                type="button"
                                className={item.isDone ? 'mark-done-button mark-done-button-done' : 'mark-done-button'}
                                disabled={isPendingThisTask}
                                onClick={() => toggleMutation.mutate(item.taskId)}
                            >
                                {item.isDone ? 'Done' : 'Mark done'}
                            </button>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}