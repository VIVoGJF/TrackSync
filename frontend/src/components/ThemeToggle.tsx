import { useTheme } from '../context/ThemeContext';
import './ThemeToggle.css';

export function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();
    const isLight = theme === 'light';

    return (
        <button
            type="button"
            className="theme-toggle-row"
            role="switch"
            aria-checked={isLight}
            onClick={toggleTheme}
        >
            <span className="theme-toggle-label">Appearance</span>
            <span className={`theme-toggle-pill${isLight ? ' theme-toggle-pill-on' : ''}`}>
                <span className="theme-toggle-knob" />
            </span>
        </button>
    );
}