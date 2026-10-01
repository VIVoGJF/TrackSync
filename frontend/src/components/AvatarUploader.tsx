import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Avatar } from './Avatar';
import { AvatarCropModal } from './AvatarCropModal';
import { useAuth } from '../context/AuthContext';
import { getAvatarUrl, AVATAR_MAX_BYTES } from '../lib/avatar';
import { uploadAvatar, removeAvatar } from '../api/profile';
import './AvatarUploader.css';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function AvatarUploader() {
    const { user, updateUser } = useAuth();
    const [popoverOpen, setPopoverOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pendingImageSrc, setPendingImageSrc] = useState<string | null>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const avatarUrl = user ? getAvatarUrl(user.id, user.avatar_uploaded, user.avatar_version) : null;

    const uploadMutation = useMutation({
        mutationFn: (file: File) => uploadAvatar(file),
        onSuccess: (data) => {
            updateUser({ avatar_uploaded: data.avatar_uploaded, avatar_version: data.avatar_version });
            setPopoverOpen(false);
            setError(null);
            closeCropModal();
        },
        onError: () => {
            setError('Upload failed. Try a different image.');
            closeCropModal();
        },
    });

    const deleteMutation = useMutation({
        mutationFn: () => removeAvatar(),
        onSuccess: (data) => {
            updateUser({ avatar_uploaded: data.avatar_uploaded, avatar_version: data.avatar_version });
            setPopoverOpen(false);
            setError(null);
        },
        onError: () => {
            setError('Could not remove photo. Try again.');
        },
    });

    const isBusy = uploadMutation.isPending || deleteMutation.isPending;

    useEffect(() => {
        if (!popoverOpen) return;

        const onPointerDown = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setPopoverOpen(false);
            }
        };
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setPopoverOpen(false);
        };

        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [popoverOpen]);

    function closeCropModal() {
        if (pendingImageSrc) URL.revokeObjectURL(pendingImageSrc);
        setPendingImageSrc(null);
    }

    function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;

        if (!ALLOWED_TYPES.includes(file.type)) {
            setError('Avatar must be a JPEG, PNG, or WEBP image.');
            return;
        }

        if (file.size > AVATAR_MAX_BYTES) {
            setError('Avatar must be 5MB or smaller.');
            return;
        }

        setError(null);
        setPendingImageSrc(URL.createObjectURL(file));
    }

    function handleCropConfirm(blob: Blob) {
        const croppedFile = new File([blob], 'avatar.webp', { type: 'image/webp' });
        uploadMutation.mutate(croppedFile);
    }

    function handleDelete() {
        setError(null);
        deleteMutation.mutate();
    }

    return (
        <div className="avatar-uploader" ref={wrapperRef}>
            <button
                type="button"
                className="avatar-uploader-trigger"
                onClick={() => setPopoverOpen((open) => !open)}
                aria-haspopup="true"
                aria-expanded={popoverOpen}
                aria-label="Change profile picture"
            >
                <Avatar src={avatarUrl} size={220} alt="" />
                <span className="avatar-uploader-edit-overlay" aria-hidden="true">
                    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                        <path
                            d="M15.7 3.3a1.6 1.6 0 0 1 2.3 0l.7.7a1.6 1.6 0 0 1 0 2.3L8.4 16.6l-3.3.7.7-3.3z"
                            stroke="currentColor"
                            strokeWidth="1.4"
                            strokeLinejoin="round"
                        />
                    </svg>
                </span>
            </button>

            {popoverOpen && (
                <div className="avatar-uploader-popover" role="dialog">
                    <button
                        type="button"
                        className="avatar-uploader-upload-button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isBusy}
                    >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                            <path
                                d="M8 11V2m0 0L4.5 5.5M8 2l3.5 3.5M2.5 12v1.5A1.5 1.5 0 0 0 4 15h8a1.5 1.5 0 0 0 1.5-1.5V12"
                                stroke="currentColor"
                                strokeWidth="1.3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                        {uploadMutation.isPending ? 'Uploading…' : 'Upload Image'}
                    </button>

                    {user?.avatar_uploaded && (
                        <button
                            type="button"
                            className="avatar-uploader-delete-button"
                            onClick={handleDelete}
                            disabled={isBusy}
                        >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                                <path
                                    d="M3 4.5h10M6.5 4.5V3a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1.5M4.5 4.5l.5 8.5a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1l.5-8.5"
                                    stroke="currentColor"
                                    strokeWidth="1.3"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                            {deleteMutation.isPending ? 'Removing…' : 'Remove Photo'}
                        </button>
                    )}

                    <p className="avatar-uploader-hint">
                        JPEG, PNG, or WEBP. The maximum size per file is 5MB.
                    </p>

                    {error && <p className="avatar-uploader-error">{error}</p>}

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="avatar-uploader-file-input"
                        onChange={handleFileChange}
                    />
                </div>
            )}

            {pendingImageSrc && (
                <AvatarCropModal
                    imageSrc={pendingImageSrc}
                    onCancel={closeCropModal}
                    onConfirm={handleCropConfirm}
                    isSaving={uploadMutation.isPending}
                />
            )}
        </div>
    );
}