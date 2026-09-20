import type { TodaysTaskItem } from '../lib/todaysTasks';
import { useUpdateProgress } from '../hooks/useUpdateProgress';
import './TodaysTasks.css';

interface TodaysTasksProps {
    items: TodaysTaskItem[];
}

type TaskType = TodaysTaskItem['taskType'];

const TYPE_LABELS: Record<TaskType, string> = {
    DAILY: 'Daily',
    WEEKLY: 'Weekly',
    DEADLINE: 'Deadline',
};


const GROUP_ORDER: TaskType[] = ['DAILY', 'WEEKLY', 'DEADLINE'];

interface TaskTab {
    id: string;
    label: string;
}

const TABS: TaskTab[] = [
    {
        id: 'today',
        label: "Today's tasks",      
    },
];

const ACTIVE_TAB_ID = 'today';

function TodaysTasksHeading() {
    return (
        <div className="todays-tasks-heading" role="tablist" aria-label="Task collections">
            {TABS.map((tab) => {
                const isActive = tab.id === ACTIVE_TAB_ID;

                return (
                    <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        className={isActive ? 'todays-tab todays-tab-active' : 'todays-tab'}
                    >
                        {tab.label}
                    </button>
                );
            })}
        </div>
    );
}

export function TodaysTasks({ items }: TodaysTasksProps) {
    const toggleMutation = useUpdateProgress();

    if (items.length === 0) {
        return (
            <div className="todays-tasks">
                <TodaysTasksHeading />
                <p className="todays-tasks-empty">Nothing scheduled for today.</p>
            </div>
        );
    }

    // One group per type, skipping types with no tasks today. filter() keeps
    // each task's existing order within its type.
    const groups = GROUP_ORDER.map((type) => ({
        type,
        tasks: items.filter((item) => item.taskType === type),
    })).filter((group) => group.tasks.length > 0);

    return (
        <div className="todays-tasks">
            <TodaysTasksHeading />

            <div className="todays-task-groups">
                {groups.map((group) => (
                    <section className="todays-task-group" key={group.type}>
                        <h4 className="todays-task-group-label">{TYPE_LABELS[group.type]}</h4>

                        <ul className="todays-tasks-list">
                            {group.tasks.map((item) => {
                                const isPendingThisTask =
                                    toggleMutation.isPending && toggleMutation.variables === item.taskId;

                                return (
                                    <li className="todays-task-row" key={item.taskId}>
                                        <span className="todays-task-title">{item.title}</span>

                                        {item.isDone ? (
                                            <div className="todays-task-actions">
                                                <span className="todays-task-done-label">
                                                    ✓ Done
                                                </span>
                                                <button
                                                    type="button"
                                                    className="undo-button"
                                                    disabled={isPendingThisTask}
                                                    onClick={() => toggleMutation.mutate(item.taskId)}
                                                >
                                                    Undo
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                className="mark-done-button"
                                                disabled={isPendingThisTask}
                                                onClick={() => toggleMutation.mutate(item.taskId)}
                                            >
                                                Mark done
                                            </button>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    </section>
                ))}
            </div>
        </div>
    );
}