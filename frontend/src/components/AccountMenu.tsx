import { ThemeToggle } from './ThemeToggle';
import './AccountMenu.css';

interface AccountMenuProps {
    onLogout?: () => void;
}

export function AccountMenu({ onLogout }: AccountMenuProps) {
    return (
        <div className="account-menu" role="menu">
            <button className="account-menu-edit-profile" type="button">
                Edit profile
            </button>

            <ThemeToggle />

            <button className="account-menu-logout" type="button" onClick={onLogout}>
                Log out
            </button>
        </div>
    );
}