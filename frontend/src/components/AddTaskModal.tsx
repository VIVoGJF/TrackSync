import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    createTask,
    type CreateTaskRequest,
    type TaskType,
} from '../api/tasks';
import './AddTaskModal.css';

interface AddTaskModalProps {
    onClose: () => void;
}

export function AddTaskModal({ onClose }: AddTaskModalProps) {
    const queryClient = useQueryClient();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [taskType, setTaskType] = useState<TaskType | ''>('');
    const [deadline, setDeadline] = useState('');

    const createTaskMutation = useMutation({
        mutationFn: (payload: CreateTaskRequest) => createTask(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['dashboard'],
            });

            onClose();
        },
    });

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!title.trim()) {
            return;
        }

        if (taskType === 'DEADLINE' && !deadline) {
            return;
        }

        if (!taskType) {
            return;
        }

        const payload: CreateTaskRequest = {
            title: title.trim(),
            task_type: taskType,
        };

        if (description.trim()) {
            payload.description = description.trim();
        }

        if (taskType === 'DEADLINE') {
            payload.deadline = deadline;
        }

        createTaskMutation.mutate(payload);
    };

    return (
        <div className="add-task-overlay" onMouseDown={onClose}>
            <div
                className="add-task-modal"
                onMouseDown={(event) => event.stopPropagation()}
            >
                <div className="add-task-modal-header">
                    <div>
                        <h2>Add Task</h2>
                        <p>Create a new task for your dashboard.</p>
                    </div>

                    <button
                        type="button"
                        className="add-task-close"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>

                <form
                    className="add-task-form"
                    onSubmit={handleSubmit}
                >
                    <div className="add-task-field">
                        <label htmlFor="task-title">
                            Title
                        </label>

                        <input
                            id="task-title"
                            type="text"
                            value={title}
                            onChange={(event) =>
                                setTitle(event.target.value)
                            }
                            placeholder="Enter task title"
                            maxLength={100}
                            autoFocus
                            required
                        />
                    </div>

                    <div className="add-task-field">
                        <label htmlFor="task-description">
                            Description
                            <span>Optional</span>
                        </label>

                        <textarea
                            id="task-description"
                            value={description}
                            onChange={(event) =>
                                setDescription(event.target.value)
                            }
                            placeholder="Add a description"
                            maxLength={500}
                            rows={3}
                        />
                    </div>

                    <div className="add-task-field">
                        <label htmlFor="task-type">
                            Type
                        </label>

                        <select
                            id="task-type"
                            value={taskType}
                            onChange={(event) => {
                                const type = event.target.value as TaskType | '';

                                setTaskType(type);

                                if (type !== 'DEADLINE') {
                                    setDeadline('');
                                }
                            }}
                            required
                        >
                            <option value="" disabled>
                                Select task type
                            </option>
                            <option value="DAILY">Daily</option>
                            <option value="WEEKLY">Weekly</option>
                            <option value="DEADLINE">Deadline</option>
                        </select>
                    </div>

                    {taskType === 'DEADLINE' && (
                        <div className="add-task-field">
                            <label htmlFor="task-deadline">
                                Deadline
                            </label>

                            <input
                                id="task-deadline"
                                type="date"
                                value={deadline}
                                onChange={(event) =>
                                    setDeadline(event.target.value)
                                }
                                required
                            />
                        </div>
                    )}

                    {createTaskMutation.isError && (
                        <p className="add-task-error">
                            Failed to create task. Please try again.
                        </p>
                    )}

                    <div className="add-task-actions">
                        <button
                            type="button"
                            className="add-task-cancel"
                            onClick={onClose}
                            disabled={createTaskMutation.isPending}
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className="add-task-submit"
                            disabled={
                                createTaskMutation.isPending ||
                                !title.trim() ||
                                !taskType ||
                                (taskType === 'DEADLINE' && !deadline)
                            }
                        >
                            {createTaskMutation.isPending
                                ? 'Creating...'
                                : 'Create task'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}