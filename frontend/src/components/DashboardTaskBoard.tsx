import { useState } from 'react';
import type { DashboardTask, DashboardCollection } from '../api/dashboard';
import { getDayIndex, toLocalDateString } from '../lib/dateIndex';
import './DashboardTaskBoard.css';

interface DashboardTaskBoardProps {
    tasks: DashboardTask[];
    collections: DashboardCollection[];
    year: number;
    month: number;
}

type TaskType = DashboardTask['task_type'];

const GROUP_ORDER: TaskType[] = ['DAILY', 'WEEKLY', 'DEADLINE'];

const TYPE_LABELS: Record<TaskType, string> = {
    DAILY: 'Daily',
    WEEKLY: 'Weekly',
    DEADLINE: 'Deadline',
};

interface CalendarDay {
    day: number;
    date: Date;
    dateString: string;
}

function getDaysInMonth(year: number, month: number): number {
    return new Date(year, month, 0).getDate();
}

function buildCalendarDays(year: number, month: number): CalendarDay[] {
    const daysInMonth = getDaysInMonth(year, month);

    return Array.from({ length: daysInMonth }, (_, index) => {
        const day = index + 1;
        const date = new Date(year, month - 1, day);

        return {
            day,
            date,
            dateString: toLocalDateString(date),
        };
    });
}

function isTaskActiveOnDate(task: DashboardTask, dateString: string): boolean {
    if (task.task_type === 'DEADLINE') {
        return (
            dateString >= task.deadline.start_date &&
            dateString <= task.deadline.deadline_date
        );
    }

    return task.active_period.some((period) => {
        if (dateString < period.start_date) {
            return false;
        }

        if (period.end_date !== null && dateString > period.end_date) {
            return false;
        }

        return true;
    });
}

function isTaskCompletedOnDate(task: DashboardTask, day: CalendarDay): boolean {
    if (task.task_type === 'DAILY') {
        return task.progress[getDayIndex(day.date)] === '1';
    }

    if (task.task_type === 'WEEKLY') {
        return task.weekly_completions.some(
            (completion) => completion.completion_date === day.dateString,
        );
    }

    return (
        task.deadline.completed &&
        task.deadline.completion_date?.slice(0, 10) === day.dateString
    );
}

function getTaskCompletionPercentage(task: DashboardTask): number {
    if (task.task_type === 'DEADLINE') {
        return task.deadline.completed ? 100 : 0;
    }

    let completed = 0;
    let available = 0;

    for (let index = 0; index < task.progress.length; index += 1) {
        if (task.progress[index] !== '0') {
            completed += 1;
        }

        available += 1;
    }

    return available === 0 ? 0 : Math.round((completed / available) * 100);
}

function getCellClass(
    task: DashboardTask,
    day: CalendarDay,
    todayString: string,
): string {
    const active = isTaskActiveOnDate(task, day.dateString);

    if (!active) {
        return 'dashboard-task-cell dashboard-task-cell-outside';
    }

    const completed = isTaskCompletedOnDate(task, day);
    const isToday = day.dateString === todayString;

    return [
        'dashboard-task-cell',
        isToday ? 'dashboard-task-cell-today' : 'dashboard-task-cell-inactive',
        completed ? 'dashboard-task-cell-completed' : '',
    ]
        .filter(Boolean)
        .join(' ');
}

function TaskRow({
    task,
    days,
    todayString,
}: {
    task: DashboardTask;
    days: CalendarDay[];
    todayString: string;
}) {
    const percentage = getTaskCompletionPercentage(task);

    return (
        <div className="dashboard-task-row">
            <span className="dashboard-task-title">{task.title}</span>

            <div
                className="dashboard-task-calendar"
                style={{
                    gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))`,
                }}
            >
                {days.map((day) => (
                    <button
                        type="button"
                        key={day.dateString}
                        className={getCellClass(task, day, todayString)}
                        disabled={day.dateString !== todayString}
                        aria-label={`${task.title}, ${day.dateString}`}
                    />
                ))}
            </div>

            <div className="dashboard-task-progress">
                <div className="dashboard-task-progress-track">
                    <div
                        className="dashboard-task-progress-fill"
                        style={{ width: `${percentage}%` }}
                    />
                </div>
                <span className="dashboard-task-progress-value">
                    {percentage}%
                </span>
            </div>
        </div>
    );
}

export function DashboardTaskBoard({
    tasks,
    collections,
    year,
    month,
}: DashboardTaskBoardProps) {
    const todayString = toLocalDateString(new Date());
    const days = buildCalendarDays(year, month);

    const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);

    const activeCollection =
        collections.find(
            (collection) => collection.collection_id === selectedCollectionId,
        ) ?? null;

    const visibleTasks = activeCollection
        ? tasks.filter((task) =>
              activeCollection.task_ids.includes(task.task_id),
          )
        : tasks;

    const groups = GROUP_ORDER.map((type) => ({
        type,
        tasks: visibleTasks.filter((task) => task.task_type === type),
    })).filter((group) => group.tasks.length > 0);

    return (
        <section className="dashboard-task-board">
            <div className="dashboard-task-board-header">
                <div
                    className="dashboard-task-board-tabs"
                    role="tablist"
                    aria-label="Task collections"
                >
                    <button
                        type="button"
                        role="tab"
                        aria-selected={selectedCollectionId === null}
                        className={
                            selectedCollectionId === null
                                ? 'dashboard-task-board-tab active'
                                : 'dashboard-task-board-tab'
                        }
                        onClick={() => setSelectedCollectionId(null)}
                    >
                        Today's tasks
                    </button>

                    {collections.map((collection) => (
                        <button
                            type="button"
                            role="tab"
                            aria-selected={
                                selectedCollectionId === collection.collection_id
                            }
                            key={collection.collection_id}
                            className={
                                selectedCollectionId ===
                                collection.collection_id
                                    ? 'dashboard-task-board-tab active'
                                    : 'dashboard-task-board-tab'
                            }
                            onClick={() =>
                                setSelectedCollectionId(
                                    collection.collection_id,
                                )
                            }
                        >
                            {collection.name}
                        </button>
                    ))}

                    <button
                        type="button"
                        className="dashboard-task-board-add-collection"
                        aria-label="Add collection"
                    >
                        +
                    </button>
                </div>
            </div>

            <div className="dashboard-task-calendar-header">
                <span className="dashboard-task-info-spacer" />

                <div
                    className="dashboard-task-calendar dashboard-task-calendar-labels"
                    style={{
                        gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))`,
                    }}
                >
                    {days.map((day) => (
                        <span
                            className="dashboard-task-day-label"
                            key={day.dateString}
                        >
                            {day.day}
                        </span>
                    ))}
                </div>

                <span className="dashboard-task-progress-spacer" />
            </div>

            <div className="dashboard-task-groups">
                {groups.length === 0 ? (
                    <p className="dashboard-task-empty">
                        {activeCollection
                            ? `No tasks in "${activeCollection.name}" yet.`
                            : 'No tasks yet.'}
                    </p>
                ) : (
                    groups.map((group) => (
                        <section
                            className="dashboard-task-group"
                            key={group.type}
                        >
                            <h4 className="dashboard-task-group-label">
                                {TYPE_LABELS[group.type]}
                            </h4>

                            <div className="dashboard-task-group-rows">
                                {group.tasks.map((task) => (
                                    <TaskRow
                                        key={task.task_id}
                                        task={task}
                                        days={days}
                                        todayString={todayString}
                                    />
                                ))}
                            </div>
                        </section>
                    ))
                )}
            </div>

            <div className="dashboard-task-board-footer">
                <button
                    type="button"
                    className="dashboard-task-board-button dashboard-task-board-button-add"
                >
                    + Add task
                </button>
                <button
                    type="button"
                    className="dashboard-task-board-button dashboard-task-board-button-archive"
                >
                    Archived
                </button>
            </div>
        </section>
    );
}