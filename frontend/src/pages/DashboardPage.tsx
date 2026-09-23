import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { getDashboard } from '../api/dashboard';
import { computeGaugeBreakdown } from '../lib/gauge';
import { TopBar } from '../components/TopBar';
import { MonthSelector } from '../components/MonthSelector';
import { Gauge } from '../components/Gauge';
import { StatsPanel, WeeklyChart } from '../components/StatsPanel';
import { ProfilePanel } from '../components/ProfilePanel';
import { computeDashboardStats } from '../lib/dashboardStats';
import { DashboardTaskBoard } from '../components/DashboardTaskBoard';
import './DashboardPage.css';

export function DashboardPage() {
    const { user, logout } = useAuth();

    // Phones: the profile panel is a slide-in sheet opened from the top bar
    // (same behaviour as HomePage).
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        if (!menuOpen) return;

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setMenuOpen(false);
        };
        // If the window grows back to desktop size, the sheet is hidden again.
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

    const today = new Date();

    const [selectedYear, setSelectedYear] = useState(today.getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);

    const dashboardQuery = useQuery({
        queryKey: ['dashboard', selectedYear, selectedMonth],
        queryFn: () => getDashboard(selectedYear, selectedMonth),
    });

    if (dashboardQuery.isLoading) {
        return (
            <div className="dashboard-page">
                <TopBar username={user?.username ?? ''} />
                <p className="dashboard-loading">Loading…</p>
            </div>
        );
    }

    if (dashboardQuery.isError || !dashboardQuery.data) {
        return (
            <div className="dashboard-page">
                <TopBar username={user?.username ?? ''} />
                <p className="dashboard-error">
                    Couldn't load your dashboard. Try refreshing.
                </p>
            </div>
        );
    }

    const dashboard = dashboardQuery.data;
    const stats = computeDashboardStats(
        dashboard.tasks,
        dashboard.activity,
        dashboard.year,
        dashboard.month,
    );
    const gaugeBreakdown = computeGaugeBreakdown(dashboard.tasks);

    return (
        <div className="dashboard-page">
            <TopBar
                username={user?.username ?? ''}
                onMenuClick={() => setMenuOpen((open) => !open)}
                menuOpen={menuOpen}
            />

            <button
                type="button"
                className={`profile-overlay${menuOpen ? ' profile-overlay-visible' : ''}`}
                aria-label="Close menu"
                tabIndex={-1}
                onClick={() => setMenuOpen(false)}
            />

            <div className="dashboard-profile-menu">
                <ProfilePanel
                    username={user?.username ?? ''}
                    isOpen={menuOpen}
                    onLogout={logout}
                    currentPage="dashboard"
                />
            </div>

            <main className="dashboard-content">
                <div className="dashboard-header">
                    <MonthSelector
                        selectedYear={selectedYear}
                        selectedMonth={selectedMonth}
                        createdAt={user?.created_at ?? ''}
                        onChange={(year, month) => {
                            setSelectedYear(year);
                            setSelectedMonth(month);
                        }}
                    />
                </div>

                <div className="dashboard-top-row">
                    <section className="dashboard-stats-panel">
                        <StatsPanel stats={stats} />
                    </section>

                    <section className="dashboard-gauge-card">
                        <Gauge breakdown={gaugeBreakdown} />
                    </section>
                </div>
                <DashboardTaskBoard
                    tasks={dashboard.tasks}
                    collections={dashboard.collections}
                    year={selectedYear}
                    month={selectedMonth}
                />

                {/* Phones only (hidden by CSS on desktop, where the chart lives
                    inside the stats card): the weekly chart in its own card,
                    below the gauge. */}
                <section className="dashboard-weekly-card">
                    <WeeklyChart weeks={stats.weeklyContribution} />
                </section>
            </main>
        </div>
    );
}