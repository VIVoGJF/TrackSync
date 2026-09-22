import { useNavigate } from 'react-router-dom';
import './ProfilePanel.css';

interface ProfilePanelProps {
    username: string;
}

export function ProfilePanel({ username }: ProfilePanelProps) {
    const navigate = useNavigate();

    return (
        <aside className="profile-panel">
            <div className="profile-avatar" aria-hidden="true" />
            <p className="profile-name">{username}</p>
            <button className="edit-profile-button" type="button">
                <span className="edit-button-text">Edit profile</span>
            </button>

            <nav className="profile-nav">
                <button className="nav-item nav-item-active" type="button" onClick={() => navigate('/dashboard')}>
                    Dashboard
                </button>
                <button className="nav-item nav-item-disabled" type="button" disabled>
                    Groups
                    <span className="nav-badge">Upcoming</span>
                </button>
                <button className="nav-item nav-item-disabled" type="button" disabled>
                    Projects
                    <span className="nav-badge">Upcoming</span>
                </button>
            </nav>
        </aside>
    );
}