import { useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    deleteTask,
    getArchivedTasks,
    restoreTask,
} from '../api/tasks';
import type { TaskResponse } from '../api/tasks';
import './ArchiveModal.css';

interface ArchiveModalProps {
    onClose: () => void;
}

type TaskType = TaskResponse['task_type'];

const GROUP_ORDER: TaskType[] = [
    'DAILY',
    'WEEKLY',
    'DEADLINE',
];

const TYPE_LABELS: Record<TaskType, string> = {
    DAILY: 'Daily',
    WEEKLY: 'Weekly',
    DEADLINE: 'Deadline',
};

export function ArchiveModal({
    onClose,
}: ArchiveModalProps) {
    const queryClient = useQueryClient();

    const archivedQuery = useQuery({
        queryKey: ['archived-tasks'],
        queryFn: getArchivedTasks,
    });

    const restoreMutation = useMutation({
        mutationFn: restoreTask,
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['archived-tasks'],
            });

            queryClient.invalidateQueries({
                queryKey: ['dashboard'],
            });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: deleteTask,
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['archived-tasks'],
            });

            queryClient.invalidateQueries({
                queryKey: ['dashboard'],
            });
        },
    });

    useEffect(() => {
        if (archivedQuery.isError) {
            // Keep the modal open so the error can be displayed.
        }
    }, [archivedQuery.isError]);

    const groups = useMemo(() => {
        const tasks = archivedQuery.data ?? [];

        return GROUP_ORDER
            .map((type) => ({
                type,
                tasks: tasks.filter(
                    (task) => task.task_type === type,
                ),
            }))
            .filter((group) => group.tasks.length > 0);
    }, [archivedQuery.data]);

    const isTaskPending = (taskId: string) =>
        restoreMutation.isPending &&
        restoreMutation.variables === taskId
            ? true
            : deleteMutation.isPending &&
                deleteMutation.variables === taskId;

    const handleRestore = (taskId: string) => {
        restoreMutation.mutate(taskId);
    };

    const handleDelete = (task: TaskResponse) => {
        const confirmed = window.confirm(
            `Delete "${task.title}" permanently? This cannot be undone.`,
        );

        if (!confirmed) {
            return;
        }

        deleteMutation.mutate(task.id);
    };

    return (
        <div
            className="archive-modal-overlay"
            onMouseDown={onClose}
        >
            <div
                className="archive-modal"
                onMouseDown={(event) =>
                    event.stopPropagation()
                }
            >
                <div className="archive-modal-header">
                    <div>
                        <h2>Archive</h2>
                        <p>
                            Restore or permanently delete archived
                            tasks.
                        </p>
                    </div>

                    <button
                        type="button"
                        className="archive-modal-close"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>

                <div className="archive-modal-content">
                    {archivedQuery.isLoading && (
                        <div className="archive-modal-empty">
                            Loading archived tasks...
                        </div>
                    )}

                    {archivedQuery.isError && (
                        <div className="archive-modal-error">
                            Failed to load archived tasks.
                        </div>
                    )}

                    {!archivedQuery.isLoading &&
                        !archivedQuery.isError &&
                        groups.length === 0 && (
                            <div className="archive-modal-empty">
                                No archived tasks.
                            </div>
                        )}

                    {!archivedQuery.isLoading &&
                        !archivedQuery.isError &&
                        groups.map((group) => (
                            <section
                                className="archive-task-group"
                                key={group.type}
                            >
                                <h3>
                                    {TYPE_LABELS[group.type]}
                                </h3>

                                <div className="archive-task-list">
                                    {group.tasks.map((task) => {
                                        const pending =
                                            isTaskPending(task.id);

                                        return (
                                            <div
                                                className="archive-task-row"
                                                key={task.id}
                                            >
                                                <div className="archive-task-info">
                                                    <span className="archive-task-title">
                                                        {task.title}
                                                    </span>
                                                </div>

                                                <div className="archive-task-actions">
                                                    <button
                                                        type="button"
                                                        className="archive-task-restore"
                                                        onClick={() =>
                                                            handleRestore(
                                                                task.id,
                                                            )
                                                        }
                                                        disabled={pending}
                                                    >
                                                        {restoreMutation.isPending &&
                                                        restoreMutation.variables ===
                                                            task.id
                                                            ? 'Restoring...'
                                                            : 'Restore'}
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className="archive-task-delete"
                                                        onClick={() =>
                                                            handleDelete(
                                                                task,
                                                            )
                                                        }
                                                        disabled={pending}
                                                        aria-label={`Delete ${task.title}`}
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        ))}
                </div>
            </div>
        </div>
    );
}