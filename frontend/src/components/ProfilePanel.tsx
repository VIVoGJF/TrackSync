import { useNavigate } from 'react-router-dom';
import { Avatar } from './Avatar';
import { ThemeToggle } from './ThemeToggle';
import { getAvatarUrl } from '../lib/avatar';
import './ProfilePanel.css';

interface ProfilePanelProps {
    userId: string;
    username: string;
    displayName?: string | null;
    avatarUploaded: boolean;
    avatarVersion: number;
    /** Phones only: whether the slide-in sheet is showing. Ignored on desktop. */
    isOpen?: boolean;
    /** Phones only: shows a Log out button inside the sheet. */
    onLogout?: () => void;
    /** Which page the panel is on. The first nav item links to the *other* page. */
    currentPage?: 'profile' | 'dashboard';
}

export function ProfilePanel({
    userId,
    username,
    displayName,
    avatarUploaded,
    avatarVersion,
    isOpen = false,
    onLogout,
    currentPage = 'profile',
}: ProfilePanelProps) {
    const navigate = useNavigate();
    const avatarUrl = getAvatarUrl(userId, avatarUploaded, avatarVersion);

    return (
        <aside
            id="profile-menu"
            className={`profile-panel${isOpen ? ' profile-panel-open' : ''}`}
        >
            <Avatar src={avatarUrl} size={220} alt="" className="profile-avatar" />
            {displayName && <p className="profile-display-name">{displayName}</p>}
            <p className="profile-name">{username}</p>
            <button className="edit-profile-button" type="button" onClick={() => navigate('/settings')}>
                <span className="edit-button-text">Edit profile</span>
            </button>

            <div className="profile-panel-divider" />

            <nav className="profile-nav">
                {currentPage === 'dashboard' ? (
                    <button className="nav-item nav-item-active" type="button" onClick={() => navigate('/profile')}>
                        Profile
                    </button>
                ) : (
                    <button className="nav-item nav-item-active" type="button" onClick={() => navigate('/dashboard')}>
                        Dashboard
                    </button>
                )}
                <button className="nav-item nav-item-disabled" type="button" disabled>
                    Groups
                    <span className="nav-badge">Upcoming</span>
                </button>
                <button className="nav-item nav-item-disabled" type="button" disabled>
                    Projects
                    <span className="nav-badge">Upcoming</span>
                </button>
            </nav>

            {onLogout && (
                <div className="profile-panel-footer">
                    <div className="profile-panel-divider" />
                    <ThemeToggle />
                    <button className="profile-logout-button" type="button" onClick={onLogout}>
                        Log out
                    </button>
                </div>
            )}
        </aside>
    );
}