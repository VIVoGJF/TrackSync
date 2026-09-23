import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createCollection } from '../api/collections';
import { getTasks } from '../api/tasks';
import type { TaskResponse } from '../api/tasks';
import './AddCollectionModal.css';

interface AddCollectionModalProps {
    onClose: () => void;
}

function getTaskTypeLabel(
    taskType: TaskResponse['task_type'],
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

export function AddCollectionModal({
    onClose,
}: AddCollectionModalProps) {
    const queryClient = useQueryClient();

    const [name, setName] = useState('');
    const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>(
        [],
    );

    const tasksQuery = useQuery({
        queryKey: ['tasks'],
        queryFn: getTasks,
    });

    const createMutation = useMutation({
        mutationFn: () =>
            createCollection({
                name: name.trim(),
                task_ids: selectedTaskIds,
            }),

        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['dashboard'],
            });

            onClose();
        },
    });

    const toggleTask = (taskId: string) => {
        setSelectedTaskIds((current) => {
            if (current.includes(taskId)) {
                return current.filter((id) => id !== taskId);
            }

            return [...current, taskId];
        });
    };

    const canCreate =
        name.trim().length > 0 &&
        selectedTaskIds.length > 0 &&
        !createMutation.isPending;

    const handleCreate = () => {
        if (!canCreate) {
            return;
        }

        createMutation.mutate();
    };

    return (
        <div
            className="add-collection-overlay"
            onMouseDown={onClose}
        >
            <div
                className="add-collection-modal"
                onMouseDown={(event) =>
                    event.stopPropagation()
                }
            >
                <div className="add-collection-header">
                    <div>
                        <h2>Add Collection</h2>

                        <p>
                            Group tasks together for easier tracking.
                        </p>
                    </div>

                    <button
                        type="button"
                        className="add-collection-close"
                        onClick={onClose}
                        disabled={createMutation.isPending}
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>

                <div className="add-collection-content">
                    <div className="add-collection-field">
                        <label htmlFor="collection-name">
                            Collection name
                        </label>

                        <input
                            id="collection-name"
                            type="text"
                            value={name}
                            onChange={(event) =>
                                setName(event.target.value)
                            }
                            placeholder="Enter collection name"
                            maxLength={255}
                            disabled={createMutation.isPending}
                        />
                    </div>

                    <div className="add-collection-task-section">
                        <div className="add-collection-task-heading">
                            <span>Select tasks</span>

                            <span>
                                {selectedTaskIds.length} selected
                            </span>
                        </div>

                        <div className="add-collection-task-list">
                            {tasksQuery.isLoading && (
                                <div className="add-collection-message">
                                    Loading tasks...
                                </div>
                            )}

                            {tasksQuery.isError && (
                                <div className="add-collection-error">
                                    Failed to load tasks.
                                </div>
                            )}

                            {!tasksQuery.isLoading &&
                                !tasksQuery.isError &&
                                tasksQuery.data?.length === 0 && (
                                    <div className="add-collection-message">
                                        No active tasks available.
                                    </div>
                                )}

                            {!tasksQuery.isLoading &&
                                !tasksQuery.isError &&
                                (['DAILY', 'WEEKLY', 'DEADLINE'] as const).map(
                                    (taskType) => {
                                        const typeTasks =
                                            tasksQuery.data?.filter(
                                                (task) =>
                                                    task.task_type === taskType,
                                            ) ?? [];

                                        if (typeTasks.length === 0) {
                                            return null;
                                        }

                                        const typeLabel =
                                            taskType === 'DAILY'
                                                ? 'Daily'
                                                : taskType === 'WEEKLY'
                                                    ? 'Weekly'
                                                    : 'Deadline';

                                        return (
                                            <section
                                                className="add-collection-task-group"
                                                key={taskType}
                                            >
                                                <h3 className="add-collection-task-group-title">
                                                    {typeLabel}
                                                </h3>

                                                <div className="add-collection-task-group-list">
                                                    {typeTasks.map((task) => {
                                                        const selected =
                                                            selectedTaskIds.includes(
                                                                task.id,
                                                            );

                                                        return (
                                                            <button
                                                                type="button"
                                                                key={task.id}
                                                                className={`add-collection-task-row ${selected
                                                                        ? 'add-collection-task-row-selected'
                                                                        : ''
                                                                    }`}
                                                                onClick={() =>
                                                                    toggleTask(task.id)
                                                                }
                                                                disabled={
                                                                    createMutation.isPending
                                                                }
                                                            >
                                                                <span
                                                                    className={`add-collection-checkbox ${selected
                                                                            ? 'add-collection-checkbox-selected'
                                                                            : ''
                                                                        }`}
                                                                    aria-hidden="true"
                                                                >
                                                                    {selected ? '✓' : ''}
                                                                </span>

                                                                <span className="add-collection-task-info">
                                                                    <span className="add-collection-task-title">
                                                                        {task.title}
                                                                    </span>

                                                                    <span className="add-collection-task-type">
                                                                        {getTaskTypeLabel(
                                                                            task.task_type,
                                                                        )}
                                                                    </span>
                                                                </span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </section>
                                        );
                                    },
                                )}
                        </div>
                    </div>

                    {createMutation.isError && (
                        <p className="add-collection-error">
                            Failed to create collection. Please try
                            again.
                        </p>
                    )}
                </div>

                <div className="add-collection-actions">
                    <button
                        type="button"
                        className="add-collection-cancel"
                        onClick={onClose}
                        disabled={createMutation.isPending}
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        className="add-collection-create"
                        onClick={handleCreate}
                        disabled={!canCreate}
                    >
                        {createMutation.isPending
                            ? 'Creating...'
                            : 'Create Collection'}
                    </button>
                </div>
            </div>
        </div>
    );
}