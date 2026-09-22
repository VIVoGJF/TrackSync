import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { getDashboard } from '../api/dashboard';
import { computeGaugeBreakdown } from '../lib/gauge';
import { TopBar } from '../components/TopBar';
import { MonthSelector } from '../components/MonthSelector';
import { Gauge } from '../components/Gauge';
import { StatsPanel } from '../components/StatsPanel';
import { computeDashboardStats } from '../lib/dashboardStats';
import { DashboardTaskBoard } from '../components/DashboardTaskBoard';
import './DashboardPage.css';

export function DashboardPage() {
    const { user } = useAuth();

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
            <TopBar username={user?.username ?? ''} />

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
            </main>
        </div>
    );
}