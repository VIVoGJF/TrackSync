import { useLayoutEffect, useRef } from 'react';

import type { MonthBlock } from '../lib/heatmap';
import type { HeatmapStats } from '../lib/heatmap';
import './YearlyHeatmap.css';

interface YearlyHeatmapProps {
    months: MonthBlock[];
    stats: HeatmapStats;
}

export function YearlyHeatmap({ months, stats }: YearlyHeatmapProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        const el = scrollRef.current;
        if (el) el.scrollLeft = el.scrollWidth;
    }, []);
    return (
        <div className="yearly-heatmap">
            <div className="heatmap-stats">
                <span>
                    <strong className='total-count'>{stats.totalCount}</strong> tasks completed in the past year
                </span>
                <span>
                    Total active days: <strong className='total=day'>{stats.totalActiveDays}</strong>
                </span>
            </div>

            <div className="heatmap-scroll" ref={scrollRef}>
                <div className="heatmap-months">
                    {months.map((block, i) => (
                        <div className="heatmap-month-block" key={`${block.label}-${i}`}>
                            <div className="heatmap-columns">
                                {block.columns.map((column, colIndex) => (
                                    <div className="heatmap-column" key={colIndex}>
                                        {column.map((day, rowIndex) => (
                                            <div
                                                key={rowIndex}
                                                className={`heatmap-cell${day.date === null ? ' heatmap-cell--empty' : ''}`}
                                                data-level={day.date === null ? undefined : day.level}
                                                title={day.date ?? undefined}
                                            />
                                        ))}
                                    </div>
                                ))}
                            </div>
                            <span className="heatmap-month-label">{block.label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}