import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    archiveTask,
    deleteTask,
    updateTaskDeadline,
} from '../api/tasks';
import type { DashboardTask } from '../api/dashboard';
import './EditTaskModal.css';

interface EditTaskModalProps {
    task: DashboardTask;
    onClose: () => void;
}

function getTaskTypeLabel(
    taskType: DashboardTask['task_type'],
): string {
    switch (taskType) {
        case 'DAILY':
            return 'Daily';
        case 'WEEKLY':
            return 'Weekly';
        case 'DEADLINE':
            return 'Deadline';
    }
}

export function EditTaskModal({
    task,
    onClose,
}: EditTaskModalProps) {
    const queryClient = useQueryClient();

    const originalDeadline =
        task.task_type === 'DEADLINE'
            ? task.deadline.deadline_date
            : '';

    const [deadline, setDeadline] = useState(originalDeadline);

    const updateDeadlineMutation = useMutation({
        mutationFn: () =>
            updateTaskDeadline(task.task_id, {
                deadline,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['dashboard'],
            });

            onClose();
        },
    });

    const archiveMutation = useMutation({
        mutationFn: () => archiveTask(task.task_id),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['dashboard'],
            });

            onClose();
        },
    });

    const deleteMutation = useMutation({
        mutationFn: () => deleteTask(task.task_id),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['dashboard'],
            });

            onClose();
        },
    });

    const deadlineChanged =
        task.task_type === 'DEADLINE' &&
        deadline !== originalDeadline;

    const isPending =
        updateDeadlineMutation.isPending ||
        archiveMutation.isPending ||
        deleteMutation.isPending;

    const handleSaveDeadline = () => {
        if (
            task.task_type !== 'DEADLINE' ||
            !deadline ||
            !deadlineChanged
        ) {
            return;
        }

        updateDeadlineMutation.mutate();
    };

    const handleArchive = () => {
        archiveMutation.mutate();
    };

    const handleDelete = () => {
        const confirmed = window.confirm(
            `Delete "${task.title}" permanently? This cannot be undone.`,
        );

        if (!confirmed) {
            return;
        }

        deleteMutation.mutate();
    };

    return (
        <div
            className="edit-task-overlay"
            onMouseDown={onClose}
        >
            <div
                className="edit-task-modal"
                onMouseDown={(event) =>
                    event.stopPropagation()
                }
            >
                <div className="edit-task-header">
                    <div className="edit-task-heading">
                        <h2>{task.title}</h2>

                        <span className="edit-task-type">
                            {getTaskTypeLabel(task.task_type)} Task
                        </span>
                    </div>

                    <button
                        type="button"
                        className="edit-task-close"
                        onClick={onClose}
                        disabled={isPending}
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>

                <div className="edit-task-content">
                    <span className="edit-description-header">
                        Description:
                    </span>
                    <div className="edit-task-description">
                        
                        {task.description || 'No description'}
                    </div>

                    {task.task_type === 'DEADLINE' && (
                        <div className="edit-task-deadline-row">
                            <div className="edit-task-deadline-content">
                                <label htmlFor="edit-task-deadline">
                                    Deadline
                                </label>

                                <input
                                    id="edit-task-deadline"
                                    type="date"
                                    value={deadline}
                                    onChange={(event) =>
                                        setDeadline(
                                            event.target.value,
                                        )
                                    }
                                    disabled={isPending}
                                />
                            </div>

                            {deadlineChanged && (
                                <button
                                    type="button"
                                    className="edit-task-save"
                                    onClick={handleSaveDeadline}
                                    disabled={
                                        isPending || !deadline
                                    }
                                >
                                    {updateDeadlineMutation.isPending
                                        ? 'Saving...'
                                        : 'Save'}
                                </button>
                            )}
                        </div>
                    )}

                    {updateDeadlineMutation.isError && (
                        <p className="edit-task-error">
                            Failed to update the deadline.
                        </p>
                    )}

                    {archiveMutation.isError && (
                        <p className="edit-task-error">
                            Failed to archive the task.
                        </p>
                    )}

                    {deleteMutation.isError && (
                        <p className="edit-task-error">
                            Failed to delete the task.
                        </p>
                    )}
                </div>

                <div className="edit-task-actions">
                    <button
                        type="button"
                        className="edit-task-archive"
                        onClick={handleArchive}
                        disabled={isPending}
                    >
                        {archiveMutation.isPending
                            ? 'Archiving...'
                            : 'Archive'}
                    </button>

                    <button
                        type="button"
                        className="edit-task-delete"
                        onClick={handleDelete}
                        disabled={isPending}
                        aria-label="Delete task"
                    >
                        <span aria-hidden="true">🗑</span>
                        <span>
                            {deleteMutation.isPending
                                ? 'Deleting...'
                                : 'Delete'}
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
}