import { Link } from 'react-router-dom';
import logo from '../../public/favlogo.png';
import './TopBar.css';

interface TopBarProps {
    username: string;
    /** When provided, phones get a hamburger button that calls this (opens the profile menu). */
    onMenuClick?: () => void;
    menuOpen?: boolean;
}

export function TopBar({ username, onMenuClick, menuOpen = false }: TopBarProps) {
    return (
        <header className="top-bar">
            <div className="top-bar-content">
                <Link to="/profile" className="top-bar-logo" aria-label="TrackSync home">
                    <img src={logo} className="top-logo" alt="" />
                    <span className="top-TrackSync">TrackSync</span>
                </Link>
                <div className="top-bar-right">
                    {/* Wired up once Groups/Projects exist and there's something to search */}
                    {/* <input className="top-bar-search" type="text" placeholder="Search" disabled /> */}

                    {/* Avatar + name. Hidden on phones when a menu button takes over. */}
                    <div className={`top-bar-user${onMenuClick ? ' top-bar-user-has-menu' : ''}`}>
                        <div className="top-bar-avatar" aria-hidden="true" />
                        <span className="top-bar-username">{username}</span>
                    </div>

                    {onMenuClick && (
                        <button
                            type="button"
                            className="top-bar-menu-button"
                            onClick={onMenuClick}
                            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                            aria-expanded={menuOpen}
                            aria-controls="profile-menu"
                        >
                            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
                                {menuOpen ? (
                                    <path d="M5 5l12 12M17 5L5 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                ) : (
                                    <path d="M3 6h16M3 11h16M3 16h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                )}
                            </svg>
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
}