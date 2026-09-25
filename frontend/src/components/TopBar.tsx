import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import logoDark from '../../public/favlogo.png';
import logoLight from '../../public/favlogo-light.png';
import logoTextDark from '../assets/logo-text.png';
import logoTextLight from '../assets/logo-text-light.png';
import { AccountMenu } from './AccountMenu';
import { Avatar } from './Avatar';
import { useThemedAsset } from '../context/ThemeContext';
import { getAvatarUrl } from '../lib/avatar';
import './TopBar.css';

interface TopBarProps {
    userId: string;
    username: string;
    avatarUploaded: boolean;
    avatarVersion: number;
    /** When provided, phones get a hamburger button that calls this (opens the profile menu). */
    onMenuClick?: () => void;
    menuOpen?: boolean;
    /** Desktop: shown in the account dropdown opened from the avatar + name. */
    onLogout?: () => void;
}

export function TopBar({
    userId,
    username,
    avatarUploaded,
    avatarVersion,
    onMenuClick,
    menuOpen = false,
    onLogout,
}: TopBarProps) {
    const [accountMenuOpen, setAccountMenuOpen] = useState(false);
    const accountRef = useRef<HTMLDivElement>(null);
    const logo = useThemedAsset(logoDark, logoLight);
    const logoText = useThemedAsset(logoTextDark, logoTextLight);
    const avatarUrl = getAvatarUrl(userId, avatarUploaded, avatarVersion);

    useEffect(() => {
        if (!accountMenuOpen) return;

        const onPointerDown = (e: MouseEvent) => {
            if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
                setAccountMenuOpen(false);
            }
        };
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setAccountMenuOpen(false);
        };

        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [accountMenuOpen]);

    return (
        <header className="top-bar">
            <div className="top-bar-content">
                <Link to="/profile" className="top-bar-logo" aria-label="TrackSync home">
                    <img src={logo} className="top-logo" alt="" />
                    <img src={logoText} className="top-logo-text" alt="" />
                </Link>
                <div className="top-bar-right">
                    {/* Wired up once Groups/Projects exist and there's something to search */}
                    {/* <input className="top-bar-search" type="text" placeholder="Search" disabled /> */}

                    {/* Avatar + name. Hidden on phones when a menu button takes over. */}
                    <div
                        className={`top-bar-user${onMenuClick ? ' top-bar-user-has-menu' : ''}`}
                        ref={accountRef}
                    >
                        <button
                            type="button"
                            className="top-bar-user-button"
                            onClick={() => setAccountMenuOpen((open) => !open)}
                            aria-haspopup="menu"
                            aria-expanded={accountMenuOpen}
                        >
                            <Avatar src={avatarUrl} size={32} alt="" />
                            <span className="top-bar-username">{username}</span>
                        </button>

                        {accountMenuOpen && <AccountMenu onLogout={onLogout} />}
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