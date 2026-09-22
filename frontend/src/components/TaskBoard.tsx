import { useState } from 'react';
import type { DashboardCollection } from '../api/dashboard';
import { formatShortDate, type TaskBoardItem } from '../lib/taskBoard';
import { useUpdateProgress } from '../hooks/useUpdateProgress';
import './TaskBoard.css';

interface TaskBoardProps {
    items: TaskBoardItem[];
    collections: DashboardCollection[];
}

type TaskType = TaskBoardItem['taskType'];

const TYPE_LABELS: Record<TaskType, string> = {
    DAILY: 'Daily',
    WEEKLY: 'Weekly',
    DEADLINE: 'Deadline',
};

const GROUP_ORDER: TaskType[] = ['DAILY', 'WEEKLY', 'DEADLINE'];

interface TaskTab {
    id: string | null;
    label: string;
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

interface TaskBoardHeadingProps {
    tabs: TaskTab[];
    activeId: string | null;
    onSelect: (id: string | null) => void;
}

function TaskBoardHeading({ tabs, activeId, onSelect }: TaskBoardHeadingProps) {
    return (
        <div className="taskboard-heading" role="tablist" aria-label="Task collections">
            {tabs.map((tab) => {
                const isActive = tab.id === activeId;

                return (
                    <button
                        key={tab.id ?? 'all'}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        className={isActive ? 'taskboard-tab taskboard-tab-active' : 'taskboard-tab'}
                        onClick={() => onSelect(tab.id)}
                    >
                        {tab.label}
                    </button>
                );
            })}
        </div>
    );
}

export function TaskBoard({ items, collections }: TaskBoardProps) {
    const toggleMutation = useUpdateProgress();
    const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);

    const activeCollection =
        collections.find((collection) => collection.collection_id === selectedCollectionId) ?? null;
    const activeId = activeCollection ? activeCollection.collection_id : null;

    const tabs: TaskTab[] = [
        { id: null, label: "Today's tasks" },
        ...collections.map((collection) => ({ id: collection.collection_id, label: capitalize(collection.name) })),
    ];

    const visibleItems = activeCollection
        ? items.filter((item) => activeCollection.task_ids.includes(item.taskId))
        : items;

    const heading = <TaskBoardHeading tabs={tabs} activeId={activeId} onSelect={setSelectedCollectionId} />;

    if (visibleItems.length === 0) {
        return (
            <div className="taskboard">
                {heading}
                <p className="taskboard-empty">
                    {activeCollection
                        ? `None of the tasks in "${activeCollection.name}" are scheduled today.`
                        : 'Nothing scheduled for today.'}
                </p>
            </div>
        );
    }

    const groups = GROUP_ORDER.map((type) => ({
        type,
        tasks: visibleItems.filter((item) => item.taskType === type),
    })).filter((group) => group.tasks.length > 0);

    return (
        <div className="taskboard">
            {heading}

            <div className="taskboard-groups">
                {groups.map((group) => (
                    <section className="taskboard-group" key={group.type}>
                        <h4 className="taskboard-group-label">{TYPE_LABELS[group.type]}</h4>

                        <ul className="taskboard-list">
                            {group.tasks.map((item) => {
                                const isPendingThisTask =
                                    toggleMutation.isPending && toggleMutation.variables === item.taskId;

                                return (
                                    <li className="taskboard-row" key={item.taskId}>
                                        <span className="taskboard-title">
                                            {item.title}
                                            {item.deadlineDate && (
                                                <span className="taskboard-deadline">({formatShortDate(item.deadlineDate)})</span>
                                            )}
                                        </span>

                                        {item.isDone ? (
                                            <div className="taskboard-actions">
                                                <span className="taskboard-done-label">✓ Done</span>
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