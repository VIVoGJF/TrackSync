import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { getDashboard } from '../api/dashboard';
import { getActivity } from '../api/dashboard';
import { computeGaugeBreakdown } from '../lib/gauge';
import { buildHeatmapGrid, getHeatmapStats } from '../lib/heatmap';
import { getTasksBoardItems } from '../lib/taskBoard';
import { toLocalDateString } from '../lib/dateIndex';
import { TopBar } from '../components/TopBar';
import { ProfilePanel } from '../components/ProfilePanel';
import { Gauge } from '../components/Gauge';
import { MiniCalendar } from '../components/MiniCalendar';
import { YearlyHeatmap } from '../components/YearlyHeatmap';
import { TaskBoard } from '../components/TaskBoard';
import './HomePage.css';

export function HomePage() {
  const { user, logout } = useAuth();

  // Phones: the profile panel is a slide-in sheet opened from the top bar.
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    // If the window grows back to desktop size, the panel is inline again.
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
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const todayStr = toLocalDateString(today);

  const dashboardQuery = useQuery({
    queryKey: ['dashboard', year, month],
    queryFn: () => getDashboard(year, month),
  });

  const activityQuery = useQuery({
    queryKey: ['activity'],
    queryFn: () => getActivity(),
  });

  if (dashboardQuery.isLoading || activityQuery.isLoading) {
    return (
      <div className="home-page">
        <TopBar username={user?.username ?? ''} />
        <p className="home-loading">Loading…</p>
      </div>
    );
  }

  if (dashboardQuery.isError || !dashboardQuery.data) {
    return (
      <div className="home-page">
        <TopBar username={user?.username ?? ''} />
        <p className="home-error">Couldn't load your dashboard. Try refreshing.</p>
      </div>
    );
  }

  const dashboard = dashboardQuery.data;
  const activity = activityQuery.data?.activity ?? [];

  const yearAgo = new Date(today);
  yearAgo.setFullYear(yearAgo.getFullYear() - 1);
  const yearAgoStr = toLocalDateString(yearAgo);

  const gaugeBreakdown = computeGaugeBreakdown(dashboard.tasks);
  const heatmapMonths = buildHeatmapGrid(activity, yearAgoStr, todayStr);
  const heatmapStats = getHeatmapStats(activity);
  const todaysTasks = getTasksBoardItems(dashboard.tasks, today, todayStr);

  return (
    <div className="home-page">
      <TopBar
        username={user?.username ?? ''}
        onMenuClick={() => setMenuOpen((open) => !open)}
        menuOpen={menuOpen}
        onLogout={logout}
      />

      <button
        type="button"
        className={`profile-overlay${menuOpen ? ' profile-overlay-visible' : ''}`}
        aria-label="Close menu"
        tabIndex={-1}
        onClick={() => setMenuOpen(false)}
      />

      <div className="home-content">
        <ProfilePanel
          username={user?.username ?? ''}
          isOpen={menuOpen}
          onLogout={logout}
        />

        <div className="home-main">
          <div className="home-top-row">
            <div className="home-gauge-panel">
              <Gauge breakdown={gaugeBreakdown} />
            </div>
            <MiniCalendar />
          </div>

          <YearlyHeatmap months={heatmapMonths} stats={heatmapStats} />

          <TaskBoard items={todaysTasks} collections={dashboard.collections} />
        </div>
      </div>
    </div>

  );
}