import { useNavigate } from 'react-router-dom';
import { ThemeToggle } from './ThemeToggle';
import './AccountMenu.css';

interface AccountMenuProps {
    onLogout?: () => void;
}

export function AccountMenu({ onLogout }: AccountMenuProps) {
    const navigate = useNavigate();

    return (
        <div className="account-menu" role="menu">
            <button
                className="account-menu-edit-profile"
                type="button"
                onClick={() => navigate('/settings')}
            >
                Edit profile
            </button>

            <ThemeToggle />

            <button className="account-menu-logout" type="button" onClick={onLogout}>
                Log out
            </button>
        </div>
    );
}