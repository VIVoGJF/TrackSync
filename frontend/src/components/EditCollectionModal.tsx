import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    addTaskToCollection,
    deleteCollection,
    getCollection,
    removeTaskFromCollection,
} from '../api/collections';
import { getTasks } from '../api/tasks';
import type { TaskResponse } from '../api/tasks';
import './EditCollectionModal.css';

interface EditCollectionModalProps {
    collectionId: string;
    collectionName: string;
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

function getTaskTypeLabel(taskType: TaskType): string {
    return TYPE_LABELS[taskType];
}

export function EditCollectionModal({
    collectionId,
    collectionName,
    onClose,
}: EditCollectionModalProps) {
    const queryClient = useQueryClient();

    const [isAddingTasks, setIsAddingTasks] = useState(false);
    const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>(
        [],
    );

    const collectionQuery = useQuery({
        queryKey: ['collection', collectionId],
        queryFn: () => getCollection(collectionId),
    });

    const tasksQuery = useQuery({
        queryKey: ['tasks'],
        queryFn: getTasks,
    });

    const removeMutation = useMutation({
        mutationFn: (taskId: string) =>
            removeTaskFromCollection(collectionId, taskId),

        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['collection', collectionId],
            });

            queryClient.invalidateQueries({
                queryKey: ['dashboard'],
            });
        },
    });

    const addMutation = useMutation({
        mutationFn: async (taskIds: string[]) => {
            for (const taskId of taskIds) {
                await addTaskToCollection(
                    collectionId,
                    taskId,
                );
            }
        },

        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['collection', collectionId],
            });

            queryClient.invalidateQueries({
                queryKey: ['dashboard'],
            });

            setSelectedTaskIds([]);
            setIsAddingTasks(false);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: () => deleteCollection(collectionId),

        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['dashboard'],
            });

            queryClient.invalidateQueries({
                queryKey: ['collection', collectionId],
            });

            onClose();
        },
    });

    const collectionTaskIds =
        collectionQuery.data?.task_ids ?? [];

    const currentTasks = useMemo(() => {
        const tasks = tasksQuery.data ?? [];

        return tasks.filter((task) =>
            collectionTaskIds.includes(task.id),
        );
    }, [tasksQuery.data, collectionTaskIds]);

    const availableTasks = useMemo(() => {
        const tasks = tasksQuery.data ?? [];

        return tasks.filter(
            (task) => !collectionTaskIds.includes(task.id),
        );
    }, [tasksQuery.data, collectionTaskIds]);

    const currentGroups = useMemo(
        () =>
            GROUP_ORDER.map((type) => ({
                type,
                tasks: currentTasks.filter(
                    (task) => task.task_type === type,
                ),
            })).filter((group) => group.tasks.length > 0),
        [currentTasks],
    );

    const availableGroups = useMemo(
        () =>
            GROUP_ORDER.map((type) => ({
                type,
                tasks: availableTasks.filter(
                    (task) => task.task_type === type,
                ),
            })).filter((group) => group.tasks.length > 0),
        [availableTasks],
    );

    const isPending =
        removeMutation.isPending ||
        addMutation.isPending ||
        deleteMutation.isPending;

    const toggleTask = (taskId: string) => {
        setSelectedTaskIds((current) =>
            current.includes(taskId)
                ? current.filter((id) => id !== taskId)
                : [...current, taskId],
        );
    };

    const handleAddTasks = () => {
        if (
            selectedTaskIds.length === 0 ||
            addMutation.isPending
        ) {
            return;
        }

        addMutation.mutate(selectedTaskIds);
    };

    const handleRemoveTask = (taskId: string) => {
        removeMutation.mutate(taskId);
    };

    const handleDeleteCollection = () => {
        const confirmed = window.confirm(
            `Delete "${collectionName}"? The tasks inside it will not be deleted.`,
        );

        if (!confirmed) {
            return;
        }

        deleteMutation.mutate();
    };

    return (
        <div
            className="edit-collection-overlay"
            onMouseDown={onClose}
        >
            <div
                className="edit-collection-modal"
                onMouseDown={(event) =>
                    event.stopPropagation()
                }
            >
                <div className="edit-collection-header">
                    <div>
                        <h2>{collectionName}</h2>

                        <p>
                            {isAddingTasks
                                ? 'Add tasks to this collection.'
                                : 'Manage the tasks in this collection.'}
                        </p>
                    </div>

                    <button
                        type="button"
                        className="edit-collection-close"
                        onClick={onClose}
                        disabled={isPending}
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>

                <div className="edit-collection-content">
                    {collectionQuery.isLoading ||
                    tasksQuery.isLoading ? (
                        <div className="edit-collection-message">
                            Loading tasks...
                        </div>
                    ) : collectionQuery.isError ||
                      tasksQuery.isError ? (
                        <div className="edit-collection-error">
                            Failed to load collection tasks.
                        </div>
                    ) : isAddingTasks ? (
                        <>
                            <div className="edit-collection-section-heading">
                                <span>Add tasks</span>

                                <span>
                                    {selectedTaskIds.length} selected
                                </span>
                            </div>

                            <div className="edit-collection-task-list">
                                {availableGroups.length === 0 && (
                                    <div className="edit-collection-message">
                                        All available tasks are already
                                        in this collection.
                                    </div>
                                )}

                                {availableGroups.map((group) => (
                                    <section
                                        className="edit-collection-task-group"
                                        key={group.type}
                                    >
                                        <h3>
                                            {getTaskTypeLabel(
                                                group.type,
                                            )}
                                        </h3>

                                        <div className="edit-collection-task-group-list">
                                            {group.tasks.map((task) => {
                                                const selected =
                                                    selectedTaskIds.includes(
                                                        task.id,
                                                    );

                                                return (
                                                    <button
                                                        type="button"
                                                        key={task.id}
                                                        className={`edit-collection-task-select-row ${
                                                            selected
                                                                ? 'edit-collection-task-select-row-selected'
                                                                : ''
                                                        }`}
                                                        onClick={() =>
                                                            toggleTask(
                                                                task.id,
                                                            )
                                                        }
                                                        disabled={isPending}
                                                    >
                                                        <span
                                                            className={`edit-collection-checkbox ${
                                                                selected
                                                                    ? 'edit-collection-checkbox-selected'
                                                                    : ''
                                                            }`}
                                                        >
                                                            {selected
                                                                ? '✓'
                                                                : ''}
                                                        </span>

                                                        <span className="edit-collection-task-info">
                                                            <span className="edit-collection-task-title">
                                                                {task.title}
                                                            </span>

                                                            <span className="edit-collection-task-type">
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
                                ))}
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="edit-collection-task-list">
                                {currentGroups.length === 0 && (
                                    <div className="edit-collection-message">
                                        No tasks in this collection.
                                    </div>
                                )}

                                {currentGroups.map((group) => (
                                    <section
                                        className="edit-collection-task-group"
                                        key={group.type}
                                    >
                                        <h3>
                                            {getTaskTypeLabel(
                                                group.type,
                                            )}
                                        </h3>

                                        <div className="edit-collection-task-group-list">
                                            {group.tasks.map((task) => (
                                                <div
                                                    className="edit-collection-task-row"
                                                    key={task.id}
                                                >
                                                    <span className="edit-collection-task-info">
                                                        <span className="edit-collection-task-title">
                                                            {task.title}
                                                        </span>

                                                        <span className="edit-collection-task-type">
                                                            {getTaskTypeLabel(
                                                                task.task_type,
                                                            )}
                                                        </span>
                                                    </span>

                                                    <button
                                                        type="button"
                                                        className="edit-collection-remove-button"
                                                        onClick={() =>
                                                            handleRemoveTask(
                                                                task.id,
                                                            )
                                                        }
                                                        disabled={isPending}
                                                        aria-label={`Remove ${task.title}`}
                                                    >
                                                        <span aria-hidden="true">
                                                            🗑
                                                        </span>
                                                        Remove
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                ))}
                            </div>
                        </>
                    )}

                    {removeMutation.isError && (
                        <p className="edit-collection-error">
                            Failed to remove the task.
                        </p>
                    )}

                    {addMutation.isError && (
                        <p className="edit-collection-error">
                            Failed to add one or more tasks.
                        </p>
                    )}

                    {deleteMutation.isError && (
                        <p className="edit-collection-error">
                            Failed to delete the collection.
                        </p>
                    )}
                </div>

                {isAddingTasks ? (
                    <div className="edit-collection-actions">
                        <button
                            type="button"
                            className="edit-collection-secondary"
                            onClick={() => {
                                setSelectedTaskIds([]);
                                setIsAddingTasks(false);
                            }}
                            disabled={isPending}
                        >
                            Cancel
                        </button>

                        <button
                            type="button"
                            className="edit-collection-primary"
                            onClick={handleAddTasks}
                            disabled={
                                selectedTaskIds.length === 0 ||
                                isPending
                            }
                        >
                            {addMutation.isPending
                                ? 'Adding...'
                                : 'Add Tasks'}
                        </button>
                    </div>
                ) : (
                    <div className="edit-collection-actions">
                        <button
                            type="button"
                            className="edit-collection-primary"
                            onClick={() => setIsAddingTasks(true)}
                            disabled={
                                isPending ||
                                availableTasks.length === 0
                            }
                        >
                            + Add Task
                        </button>

                        <button
                            type="button"
                            className="edit-collection-delete"
                            onClick={handleDeleteCollection}
                            disabled={isPending}
                        >
                            Delete Collection
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}