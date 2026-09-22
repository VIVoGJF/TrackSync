import type { DashboardStats } from '../lib/dashboardStats';
import './StatsPanel.css';

interface StatsPanelProps {
    stats: DashboardStats;
}

function getNiceStep(roughStep: number): number {
    if (roughStep <= 0) return 1;
    const exponent = Math.floor(Math.log10(roughStep));
    const fraction = roughStep / Math.pow(10, exponent);

    let niceFraction: number;
    if (fraction <= 1) niceFraction = 1;
    else if (fraction <= 2) niceFraction = 2;
    else if (fraction <= 5) niceFraction = 5;
    else niceFraction = 10;

    return niceFraction * Math.pow(10, exponent);
}

function computeYAxisTicks(maxValue: number, targetTickCount = 5): number[] {
    if (maxValue <= targetTickCount) {
        return Array.from({ length: maxValue + 1 }, (_, i) => maxValue - i);
    }

    const step = getNiceStep(maxValue / (targetTickCount - 1));
    const niceMax = Math.ceil(maxValue / step) * step;

    const ticks: number[] = [];
    for (let value = niceMax; value >= 0; value -= step) {
        ticks.push(value);
    }
    return ticks;
}

export function StatsPanel({ stats }: StatsPanelProps) {
    const maxContribution = Math.max(
        ...stats.weeklyContribution.map((week) => week.completed),
        1,
    );

    const yAxisTicks = computeYAxisTicks(maxContribution);
    const axisMax = yAxisTicks[0];

    return (
        <div className="stats-panel">
            <div className="stats-panel-metrics">
                <div className="stats-metric">
                    <span className="stats-metric-value">{stats.activeDays}</span>
                    <span className="stats-metric-label">Active days</span>
                </div>

                <div className="stats-metric">
                    <span className="stats-metric-value">{stats.currentStreak}</span>
                    <span className="stats-metric-label">Current streak</span>
                </div>

                <div className="stats-metric">
                    <span className="stats-metric-value">{stats.maxStreak}</span>
                    <span className="stats-metric-label">Max streak</span>
                </div>

                <div className="stats-metric">
                    <span className="stats-metric-value">
                        {stats.averageTasksPerDay}
                    </span>
                    <span className="stats-metric-label">Avg. tasks/day</span>
                </div>
            </div>

            <div className="weekly-contribution">
                <h3 className="weekly-contribution-title">
                    Weekly Completion
                </h3>

                <div className="weekly-chart">
                    <div className="weekly-y-axis">
                        <div className="weekly-y-axis-inner">
                            {yAxisTicks.map((tick) => (
                                <span
                                    key={tick}
                                    style={{
                                        top: `${100 - (tick / axisMax) * 100}%`,
                                    }}
                                >
                                    {tick}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="weekly-chart-main">
                        <div className="weekly-bars">
                            {stats.weeklyContribution.map((week) => {
                                const height =
                                    week.completed === 0
                                        ? 3
                                        : (week.completed / axisMax) * 100;

                                return (
                                    <div
                                        className="weekly-bar-wrapper"
                                        key={week.week}
                                    >
                                        <div className="weekly-bar-container">
                                            <div
                                                className="weekly-bar"
                                                style={{
                                                    height: `${height}%`,
                                                }}
                                            >
                                                <span className="weekly-bar-value">
                                                    {week.completed}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="weekly-x-axis">
                            {stats.weeklyContribution.map((week) => (
                                <span key={week.week}>
                                    W{week.week}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}