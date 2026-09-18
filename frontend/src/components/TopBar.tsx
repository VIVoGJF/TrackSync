import logo from '../../public/favlogo.png';
import './TopBar.css';

interface TopBarProps {
    username: string;
}

export function TopBar({ username }: TopBarProps) {
    return (
        <header className="top-bar">
            <div className="top-bar-content">
                <div  className="top-bar-logo">
                    <img src={logo} className="top-logo" />
                    <span className="top-TrackSync">TrackSync</span>
                </div>
                <div className="top-bar-right">
                    {/* Wired up once Groups/Projects exist and there's something to search */}
                    {/* <input className="top-bar-search" type="text" placeholder="Search" disabled /> */}
                    <div className="top-bar-user">
                        <div className="top-bar-avatar" aria-hidden="true" />
                        <span className="top-bar-username">{username}</span>
                    </div>
                </div>
            </div>
        </header>
    );
}