import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { changePassword } from '../api/auth';
import './ChangePasswordModal.css';

interface ChangePasswordModalProps {
    onClose: () => void;
}

export function ChangePasswordModal({ onClose }: ChangePasswordModalProps) {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);

    const mutation = useMutation({
        mutationFn: () => changePassword(currentPassword, newPassword),
        onError: (err) => {
            const message =
                (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
                'Something went wrong. Try again.';
            setError(message);
        },
    });

    const confirmMismatch = confirmPassword.length > 0 && confirmPassword !== newPassword;
    const canSubmit =
        currentPassword.length > 0 &&
        newPassword.length > 0 &&
        confirmPassword.length > 0 &&
        !confirmMismatch &&
        !mutation.isPending;

    function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);
        if (!canSubmit) return;
        mutation.mutate();
    }

    return (
        <div className="change-password-overlay" onMouseDown={onClose}>
            <div className="change-password-modal" onMouseDown={(e) => e.stopPropagation()}>
                <div className="change-password-header">
                    <div>
                        <h2>Change Password</h2>
                        {!mutation.isSuccess && <p>Enter your current password and choose a new one.</p>}
                    </div>
                    <button
                        type="button"
                        className="change-password-close"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>

                {mutation.isSuccess ? (
                    <div className="change-password-content">
                        <p className="change-password-success">Password updated successfully.</p>
                        <div className="change-password-actions">
                            <button type="button" className="change-password-submit" onClick={onClose}>
                                Done
                            </button>
                        </div>
                    </div>
                ) : (
                    <form className="change-password-content" onSubmit={handleSubmit}>
                        <div className="change-password-field">
                            <label htmlFor="current-password">Current password</label>
                            <input
                                id="current-password"
                                type="password"
                                autoComplete="current-password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                disabled={mutation.isPending}
                                autoFocus
                            />
                        </div>

                        <div className="change-password-field">
                            <label htmlFor="new-password">New password</label>
                            <input
                                id="new-password"
                                type="password"
                                autoComplete="new-password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                disabled={mutation.isPending}
                            />
                        </div>

                        <div className="change-password-field">
                            <label htmlFor="confirm-password">Confirm new password</label>
                            <input
                                id="confirm-password"
                                type="password"
                                autoComplete="new-password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                disabled={mutation.isPending}
                            />
                            {confirmMismatch && (
                                <p className="change-password-field-error">Passwords don't match.</p>
                            )}
                        </div>

                        {error && <p className="change-password-error">{error}</p>}

                        <div className="change-password-actions">
                            <button
                                type="button"
                                className="change-password-cancel"
                                onClick={onClose}
                                disabled={mutation.isPending}
                            >
                                Cancel
                            </button>
                            <button type="submit" className="change-password-submit" disabled={!canSubmit}>
                                {mutation.isPending ? 'Saving…' : 'Save'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
