import { useLayoutEffect, useRef, useState } from 'react';
import type { DashboardTask, DashboardCollection } from '../api/dashboard';
import { getDayIndex, getWeekIndex, toLocalDateString } from '../lib/dateIndex';
import { useUpdateProgress } from '../hooks/useUpdateProgress';
import { AddTaskModal } from './AddTaskModal';
import { EditTaskModal } from './EditTaskModal';
import { ArchiveModal } from './ArchiveModal';
import { AddCollectionModal } from './AddCollectionModal';
import { EditCollectionModal } from './EditCollectionModal';
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


function buildCalendarWeeks(year: number, month: number): CalendarDay[][] {
    const daysInMonth = getDaysInMonth(year, month);
    const weeks: CalendarDay[][] = [];

    for (let index = 0; index < daysInMonth; index += 1) {
        const day = index + 1;
        const date = new Date(year, month - 1, day);
        const weekIndex = getWeekIndex(date);

        if (!weeks[weekIndex]) {
            weeks[weekIndex] = [];
        }

        weeks[weekIndex].push({
            day,
            date,
            dateString: toLocalDateString(date),
        });
    }

    return weeks.filter(Boolean);
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
        completed ? isToday ? 'dashboard-task-cell-completed-today' : 'dashboard-task-cell-completed' : '',
    ]
        .filter(Boolean)
        .join(' ');
}

// Shared by the day-number header row and every task's cell row: both pass
// their own renderCell function but reuse the exact same week-grouping and
// markup, so the two can never drift out of alignment with each other. Cell
// sizing is controlled entirely by CSS (--cell-size), not a pixel constant
// duplicated here in JS.
function WeekGrid({
    weeks,
    renderCell,
}: {
    weeks: CalendarDay[][];
    renderCell: (day: CalendarDay) => React.ReactNode;
}) {
    return (
        <div className="dashboard-task-weeks-row">
            {weeks.map((week, weekIndex) => (
                <div className="dashboard-task-week-row" key={weekIndex}>
                    {week.map((day) => renderCell(day))}
                </div>
            ))}
        </div>
    );
}

interface GroupedTasks {
    type: TaskType;
    tasks: DashboardTask[];
}

export function DashboardTaskBoard({
    tasks,
    collections,
    year,
    month,
}: DashboardTaskBoardProps) {
    const todayString = toLocalDateString(new Date());
    const weeks = buildCalendarWeeks(year, month);

    const updateProgress = useUpdateProgress();

    const [selectedCollectionId, setSelectedCollectionId] =
        useState<string | null>(null);

    const [isAddCollectionOpen, setIsAddCollectionOpen] = useState(false);

    const [isEditCollectionOpen, setIsEditCollectionOpen] = useState(false);

    const [selectedTask, setSelectedTask] =
        useState<DashboardTask | null>(null);

    const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);

    const [isArchiveOpen, setIsArchiveOpen] = useState(false);


    const activeCollection =
        collections.find(
            (collection) => collection.collection_id === selectedCollectionId,
        ) ?? null;

    const visibleTasks = activeCollection
        ? tasks.filter((task) =>
            activeCollection.task_ids.includes(task.task_id),
        )
        : tasks;

    const groups: GroupedTasks[] = GROUP_ORDER.map((type) => ({
        type,
        tasks: visibleTasks.filter((task) => task.task_type === type),
    })).filter((group) => group.tasks.length > 0);

    const gridScrollRef = useRef<HTMLDivElement>(null);
    const hasTasks = groups.length > 0;

    useLayoutEffect(() => {
        const container = gridScrollRef.current;
        if (!container) return;

        const target = container.querySelector<HTMLElement>('[data-today]');
        if (!target) {
            container.scrollLeft = 0; // past or future month: start at day 1
            return;
        }

        const c = container.getBoundingClientRect();
        const t = target.getBoundingClientRect();
        container.scrollLeft += (t.left - c.left) - (c.width / 2 - t.width / 2);
    }, [year, month, selectedCollectionId, hasTasks]);

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
                </div>
                <button
                    type="button"
                    className="dashboard-task-board-add-collection"
                    aria-label="Add collection"
                    onClick={() => setIsAddCollectionOpen(true)}
                >
                    +
                </button>
            </div>

            {groups.length === 0 ? (
                <p className="dashboard-task-empty">
                    {activeCollection
                        ? `No tasks in "${activeCollection.name}" yet.`
                        : 'No tasks yet.'}
                </p>
            ) : (
                <div className="dashboard-task-board-body">
                    {/* Column 1: titles. Never scrolls. */}
                    <div className="dashboard-task-titles-col">
                        <div className="dashboard-task-header-spacer" />
                        {groups.map((group) => (
                            <div className="dashboard-task-group-block" key={group.type}>
                                <div className="dashboard-task-group-label">
                                    {TYPE_LABELS[group.type]}
                                </div>
                                {group.tasks.map((task) => (
                                    <div className="dashboard-task-row" key={task.task_id}>
                                        <span className="dashboard-task-title">
                                            {task.title}
                                        </span>

                                        <button
                                            type="button"
                                            className="dashboard-task-action-button"
                                            aria-label={`Task options for ${task.title}`}
                                            onClick={() => setSelectedTask(task)}
                                        >
                                            ⋮
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>

                    {/* Column 2: the day-header and every task's cells, inside ONE
                        overflow-x:auto div — the only thing that scrolls. */}
                    <div className="dashboard-task-grid-scroll" ref={gridScrollRef}>
                        <div className="dashboard-task-grid-inner">
                            <div className="dashboard-task-calendar-header-row">
                                <WeekGrid
                                    weeks={weeks}
                                    renderCell={(day) => (
                                        <span
                                            className="dashboard-task-day-label"
                                            key={day.dateString}
                                            data-today={day.dateString === todayString ? '' : undefined}
                                        >
                                            {day.day}
                                        </span>
                                    )}
                                />
                            </div>

                            {groups.map((group) => (
                                <div className="dashboard-task-group-block" key={group.type}>
                                    <div className="dashboard-task-group-label-spacer" />
                                    {group.tasks.map((task) => (
                                        <div className="dashboard-task-row" key={task.task_id}>
                                            <WeekGrid
                                                weeks={weeks}
                                                renderCell={(day) => (
                                                    <button
                                                        type="button"
                                                        key={day.dateString}
                                                        className={getCellClass(task, day, todayString)}
                                                        disabled={
                                                            day.dateString !== todayString ||
                                                            !isTaskActiveOnDate(task, day.dateString)
                                                        }
                                                        onClick={() => {
                                                            updateProgress.mutate(task.task_id);
                                                        }}
                                                        aria-label={`${task.title}, ${day.dateString}`}
                                                    />
                                                )}
                                            />
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Column 3: progress bars. Never scrolls. */}
                    <div className="dashboard-task-progress-col">
                        <div className="dashboard-task-header-spacer" />
                        {groups.map((group) => (
                            <div className="dashboard-task-group-block" key={group.type}>
                                <div className="dashboard-task-group-label-spacer" />
                                {group.tasks.map((task) => {
                                    const percentage = getTaskCompletionPercentage(task);
                                    return (
                                        <div className="dashboard-task-row" key={task.task_id}>
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
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeCollection && (
                <div className="dashboard-task-board-collection-actions">
                    <button
                        type="button"
                        className="dashboard-task-board-button dashboard-task-board-button-edit"
                        onClick={() => setIsEditCollectionOpen(true)}
                    >
                        Edit Collection
                    </button>
                </div>
            )}

            <div className="dashboard-task-board-footer">
                <button
                    type="button"
                    className="dashboard-task-board-button dashboard-task-board-button-add"
                    onClick={() => setIsAddTaskOpen(true)}
                >
                    + Add task
                </button>
                <button
                    type="button"
                    className="dashboard-task-board-button dashboard-task-board-button-archive"
                    onClick={() => setIsArchiveOpen(true)}
                >
                    Archived
                </button>
            </div>
            {selectedTask && (
                <EditTaskModal
                    task={selectedTask}
                    onClose={() => setSelectedTask(null)}
                />
            )}
            {isAddTaskOpen && (
                <AddTaskModal
                    onClose={() => setIsAddTaskOpen(false)}
                />
            )}
            {isArchiveOpen && (
                <ArchiveModal
                    onClose={() => setIsArchiveOpen(false)}
                />
            )}
            {isAddCollectionOpen && (
                <AddCollectionModal
                    onClose={() => setIsAddCollectionOpen(false)}
                />
            )}
            {isEditCollectionOpen && activeCollection && (
                <EditCollectionModal
                    collectionId={activeCollection.collection_id}
                    collectionName={activeCollection.name}
                    onClose={() => setIsEditCollectionOpen(false)}
                />
            )}

        </section>
    );
}