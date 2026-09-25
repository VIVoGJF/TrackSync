import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateProfile } from '../api/profile';
import { TopBar } from '../components/TopBar';
import { ProfilePanel } from '../components/ProfilePanel';
import { AvatarUploader } from '../components/AvatarUploader';
import { SettingsFieldRow, ChevronIcon } from '../components/SettingsFieldRow';
import { ChangePasswordModal } from '../components/ChangePasswordModal';
import './SettingsPage.css';

export function SettingsPage() {
    const { user, logout, updateUser } = useAuth();

    // Phones: same slide-in profile sheet behaviour as HomePage/DashboardPage.
    const [menuOpen, setMenuOpen] = useState(false);
    const [passwordModalOpen, setPasswordModalOpen] = useState(false);

    useEffect(() => {
        if (!menuOpen) return;

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setMenuOpen(false);
        };
        const desktop = window.matchMedia('(min-width: 769px)');
        const onChange = (e: MediaQueryListEvent) => {
            if (e.matches) setMenuOpen(false);
        };

        document.addEventListener('keydown', onKeyDown);
        desktop.addEventListener('change', onChange);
        return () => {
            document.removeEventListener('keydown', onKeyDown);
            desktop.removeEventListener('change', onChange);
        };
    }, [menuOpen]);

    async function handleSaveUsername(newUsername: string) {
        const result = await updateProfile({ username: newUsername });
        updateUser({ username: result.username });
    }

    async function handleSaveDisplayName(newDisplayName: string) {
        const result = await updateProfile({ display_name: newDisplayName || null });
        updateUser({ display_name: result.display_name });
    }

    return (
        <div className="settings-page">
            <TopBar
                userId={user?.id ?? ''}
                username={user?.username ?? ''}
                avatarUploaded={user?.avatar_uploaded ?? false}
                avatarVersion={user?.avatar_version ?? 0}
                onMenuClick={() => setMenuOpen((open) => !open)}
                menuOpen={menuOpen}
                onLogout={logout}
            />

            <button
                type="button"
                className={`profile-overlay${menuOpen ? ' profile-overlay-visible' : ''}`}
                aria-label="Close menu"
                tabIndex={-1}
                onClick={() => setMenuOpen(false)}
            />

            <div className="settings-content">
                <div className="settings-profile-menu">
                    <ProfilePanel
                        userId={user?.id ?? ''}
                        username={user?.username ?? ''}
                        displayName={user?.display_name}
                        avatarUploaded={user?.avatar_uploaded ?? false}
                        avatarVersion={user?.avatar_version ?? 0}
                        isOpen={menuOpen}
                        onLogout={logout}
                    />
                </div>

                <div className="settings-main">
                    <section className="settings-avatar-card">
                        <AvatarUploader />
                    </section>

                    <section className="settings-stack">
                        <SettingsFieldRow
                            label="Username"
                            value={user?.username ?? ''}
                            onSave={handleSaveUsername}
                        />
                        <SettingsFieldRow
                            label="Display Name"
                            value={user?.display_name ?? ''}
                            placeholder="Not set"
                            allowEmpty
                            onSave={handleSaveDisplayName}
                        />
                        <button
                            type="button"
                            className="settings-row"
                            onClick={() => setPasswordModalOpen(true)}
                        >
                            <span className="settings-row-label">Change Password</span>
                            <ChevronIcon />
                        </button>
                    </section>
                </div>
            </div>

            {passwordModalOpen && <ChangePasswordModal onClose={() => setPasswordModalOpen(false)} />}
        </div>
    );
}
